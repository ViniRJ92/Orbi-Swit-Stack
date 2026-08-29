/**
 * Gerencia as WebContentsView isoladas do WhatsApp Web, uma por conta.
 *
 * O ISOLAMENTO é feito através da propriedade `partition` da sessão de cada
 * view: cada conta usa `persist:account-<id>`, uma partition própria e
 * persistente em disco. O Electron cuida sozinho de manter cookies,
 * localStorage, IndexedDB, Service Workers e cache totalmente separados
 * entre partitions diferentes — não há necessidade (nem seria seguro)
 * implementar isso manualmente.
 *
 * `WebContentsView` (em vez de `BrowserView`, depreciada desde o Electron 30)
 * é a API atual recomendada pelo Electron para o mesmo propósito — mesmo
 * modelo de isolamento, anexada à janela via `window.contentView`.
 *
 * Carregamento sob demanda: a view de uma conta só é criada na primeira vez
 * que ela é selecionada.
 *
 * Suspensão (Fase 3): para não manter muitas WebContents pesadas vivas ao
 * mesmo tempo, apenas um pequeno número de contas fica carregado
 * simultaneamente (ver accountManager.ts). Suspender uma conta destrói sua
 * view/WebContents (liberando RAM e CPU), mas a partition em disco
 * (`persist:account-<id>`) não é tocada — por isso reativar uma conta
 * suspensa recria a view do zero e o WhatsApp Web volta autenticado, sem
 * pedir QR Code novamente. Só a remoção definitiva de uma conta
 * (`wipeAndDestroy`) apaga os dados da partition.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { BrowserWindow, WebContentsView, ipcMain, session } from 'electron';
import * as path from 'path';
import { AccountStore } from './accountStore';
import { SERVICES, isHostAllowed, resolveAccountUrl } from './services';
import { logger } from './logger';

/**
 * Cada serviço define seus próprios domínios permitidos para navegação (ver
 * services.ts) — o WhatsApp mantém a trava mais estrita (só o domínio dele
 * mesmo); "Navegador livre" e "URL customizada" não têm restrição, já que
 * essa é a finalidade deles. Isso não altera em nada a conversa, o
 * protocolo ou a interface de nenhum serviço — que continuam 100% os
 * oficiais — apenas reduz a superfície de ataque quando faz sentido.
 */
function isNavigationAllowed(allowedHosts: string[] | null, targetUrl: string): boolean {
  try {
    const host = new URL(targetUrl).hostname;
    return isHostAllowed(allowedHosts, host);
  } catch {
    return false;
  }
}

/**
 * O WhatsApp Web verifica a versão do navegador pelo user agent e bloqueia
 * (com a tela "atualize o Chrome") qualquer string que não reconheça —
 * inclusive o Chromium real e atualizado que vem dentro do Electron, porque
 * o Electron acrescenta um token extra ("Electron/x.y.z") no user agent
 * padrão. A correção é anunciar um user agent de Chrome puro, sem esse
 * token — não é uma forma de burlar nenhuma trava do WhatsApp (a conversa,
 * o protocolo e a interface continuam 100% os oficiais), só corrige uma
 * informação de identificação que fazia o WhatsApp Web errar a detecção.
 */
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Permissões que o próprio WhatsApp Web pode pedir para chamadas de voz/vídeo oficiais. */
const ALLOWED_PERMISSIONS = new Set(['media', 'display-capture', 'notifications']);

interface ManagedView {
  view: WebContentsView;
  accountId: string;
}

export class ViewManager {
  private window: BrowserWindow;
  private views: Map<string, ManagedView> = new Map();
  private activeAccountId: string | null = null;
  private contentBounds: Electron.Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  /**
   * Uma WebContentsView é uma camada nativa separada, sempre desenhada NA
   * FRENTE da página HTML da janela (Configurações, tela de gerenciamento,
   * assistente de conta etc. são todos HTML dessa página) — não existe forma
   * de pedir pro Electron desenhar a view "atrás". Por isso, sempre que um
   * modal em tela cheia abrir no renderer, ele avisa aqui (via IPC) e a view
   * ativa é escondida (bounds zerados) até o modal fechar; sem isso, o
   * WhatsApp Web cobriria e roubaria os cliques destinados ao modal.
   */
  private overlayActive = false;
  private onStatusChange?: (accountId: string) => void;
  private webContentsIdToAccount: Map<number, string> = new Map();
  private loggedInState: Map<string, boolean> = new Map();
  private loadErrorState: Map<string, boolean> = new Map();
  private onShortcut?: (input: Electron.Input) => void;
  // Fase 30 (reescrita) — ver comentário de topo de webviewPreload.ts.
  private onNewMessage?: (accountId: string, chatKey: string | null, isGroup: boolean, dataId: string, ts: number) => void;
  private onChatOpenStateChange?: (accountId: string, open: boolean, chatKey: string | null, isGroup: boolean) => void;
  // Fase 30.5 — ver comentário de scanCatchupMessages em webviewPreload.ts.
  private onCatchupMessages?: (
    accountId: string,
    chatKey: string | null,
    isGroup: boolean,
    items: { dataId: string; bucket: 'today' | 'yesterday' }[]
  ) => void;
  // Qual conversa (nome + se é grupo) está aberta agora em cada conta —
  // atualizado por `mw:chat-open-state`, consultado quando `mw:new-message`
  // chega (esse evento não repete o nome a cada mensagem, só no momento em
  // que a conversa abre/troca).
  private currentChat: Map<string, { chatKey: string | null; isGroup: boolean }> = new Map();

  constructor(
    window: BrowserWindow,
    private readonly accountStore: AccountStore
  ) {
    this.window = window;
    ipcMain.on('mw:account-status', (event, payload: { loggedIn: boolean }) => {
      const accountId = this.webContentsIdToAccount.get(event.sender.id);
      if (!accountId) return;
      this.loggedInState.set(accountId, !!payload?.loggedIn);
      this.onStatusChange?.(accountId);
    });
    // Fase 30 (reescrita) — evento empurrado pelo próprio webviewPreload no
    // instante em que uma nova bolha de mensagem é inserida no DOM da
    // conversa aberta (MutationObserver, nunca polling). Ver o comentário de
    // topo de webviewPreload.ts para o desenho completo (baseline por
    // conversa, nunca reconta histórico).
    ipcMain.on('mw:new-message', (event, payload: { dataId: string; ts: number }) => {
      const accountId = this.webContentsIdToAccount.get(event.sender.id);
      if (!accountId || !payload?.dataId) return;
      const chat = this.currentChat.get(accountId);
      this.onNewMessage?.(accountId, chat?.chatKey ?? null, chat?.isGroup ?? false, payload.dataId, payload.ts ?? Date.now());
    });
    // Fase 30 (reescrita) — avisa quando a conversa aberta desta conta
    // aparece/desaparece/troca (usado para ligar/desligar o canal de badge
    // enquanto uma conversa está sendo observada em tempo real, e para saber
    // a quem atribuir as mensagens novas que chegarem em seguida).
    ipcMain.on('mw:chat-open-state', (event, payload: { open: boolean; chatKey: string | null; isGroup: boolean }) => {
      const accountId = this.webContentsIdToAccount.get(event.sender.id);
      if (!accountId) return;
      const open = !!payload?.open;
      const chatKey = open ? payload?.chatKey ?? null : null;
      const isGroup = open ? !!payload?.isGroup : false;
      this.currentChat.set(accountId, { chatKey, isGroup });
      this.onChatOpenStateChange?.(accountId, open, chatKey, isGroup);
    });
    // Fase 30.5 — varredura única (não é polling) de mensagens de Hoje/Ontem
    // que já estavam carregadas quando a conversa foi aberta. Usa o
    // chatKey/isGroup já rastreado desta conta (o mesmo da conversa que
    // acabou de disparar este catch-up).
    ipcMain.on(
      'mw:catchup-messages',
      (event, payload: { items: { dataId: string; bucket: 'today' | 'yesterday' }[] }) => {
        const accountId = this.webContentsIdToAccount.get(event.sender.id);
        if (!accountId || !Array.isArray(payload?.items) || payload.items.length === 0) return;
        const chat = this.currentChat.get(accountId);
        this.onCatchupMessages?.(accountId, chat?.chatKey ?? null, chat?.isGroup ?? false, payload.items);
      }
    );
  }

  setStatusChangeListener(cb: (accountId: string) => void): void {
    this.onStatusChange = cb;
  }

  /** Fase 30 (reescrita) — chamado a cada mensagem nova detectada por evento na conversa aberta de qualquer conta. */
  setNewMessageListener(
    cb: (accountId: string, chatKey: string | null, isGroup: boolean, dataId: string, ts: number) => void
  ): void {
    this.onNewMessage = cb;
  }

  /** Fase 30 (reescrita) — chamado sempre que a conversa aberta de uma conta aparece/desaparece/troca. */
  setChatOpenStateListener(cb: (accountId: string, open: boolean, chatKey: string | null, isGroup: boolean) => void): void {
    this.onChatOpenStateChange = cb;
  }

  /** Fase 30.5 — chamado 1 vez por conversa aberta, com as mensagens de Hoje/Ontem que já estavam carregadas. */
  setCatchupMessagesListener(
    cb: (
      accountId: string,
      chatKey: string | null,
      isGroup: boolean,
      items: { dataId: string; bucket: 'today' | 'yesterday' }[]
    ) => void
  ): void {
    this.onCatchupMessages = cb;
  }

  /**
   * Registra um handler para atalhos de teclado globais (ex.: Ctrl+1..9 para
   * trocar de conta). Precisa ser propagado para cada view porque, quando
   * uma conta está em foco, é a WebContents dela — não a da janela
   * principal — quem recebe os eventos de teclado primeiro.
   */
  setShortcutHandler(cb: (input: Electron.Input) => void): void {
    this.onShortcut = cb;
  }

  /** Define a área (em coordenadas da janela) onde o conteúdo do WhatsApp Web deve ser desenhado. */
  setContentBounds(bounds: Electron.Rectangle): void {
    this.contentBounds = bounds;
    if (this.overlayActive) return; // mantém escondida enquanto um modal estiver aberto
    const active = this.activeAccountId ? this.views.get(this.activeAccountId) : undefined;
    if (active) {
      active.view.setBounds(this.contentBounds);
    }
  }

  /**
   * Esconde (bounds zerados) ou reexibe a view ativa. Chamado pelo renderer
   * sempre que qualquer modal em tela cheia abre/fecha — ver comentário do
   * campo `overlayActive` acima.
   */
  setOverlayActive(active: boolean): void {
    this.overlayActive = active;
    const managed = this.activeAccountId ? this.views.get(this.activeAccountId) : undefined;
    if (!managed) return;
    managed.view.setBounds(active ? { x: 0, y: 0, width: 0, height: 0 } : this.contentBounds);
  }

  hasView(accountId: string): boolean {
    return this.views.has(accountId);
  }

  /** IDs de todas as contas com view atualmente carregada (ativa ou apenas em segundo plano). */
  getLoadedAccountIds(): string[] {
    return Array.from(this.views.keys());
  }

  private createView(accountId: string): ManagedView {
    const account = this.accountStore.get(accountId);
    const service = SERVICES[account?.service ?? 'whatsapp'] ?? SERVICES.whatsapp;
    const startUrl = resolveAccountUrl(service.id, account?.customUrl);

    const partition = AccountStore.partitionFor(accountId);
    // Sessão isolada e persistente por conta — este é o ponto central do isolamento.
    const ses = session.fromPartition(partition, { cache: true });
    // Ver comentário de CHROME_USER_AGENT acima do arquivo.
    ses.setUserAgent(CHROME_USER_AGENT);

    // Concede apenas as permissões que o próprio WhatsApp Web usa para
    // funções oficiais (chamada de voz/vídeo, compartilhamento de tela,
    // notificações) — sem isso o navegador nega silenciosamente e essas
    // funções param de funcionar sem nenhum erro visível ao usuário.
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(ALLOWED_PERMISSIONS.has(permission));
    });
    ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        preload: path.join(__dirname, 'webviewPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // O preload usa isso pra saber se está dentro de uma instância
        // WhatsApp (única que tem QR Code/lista de conversas pra detectar) ou
        // de outro serviço (Gmail, Google Earth, navegador livre, URL
        // customizada) — que não tem esse conceito e não deve ficar preso no
        // estado "Aguardando QR Code" pra sempre. Ver webviewPreload.ts.
        additionalArguments: [`--mw-service=${service.id}`],
      },
    });

    view.webContents.setUserAgent(CHROME_USER_AGENT);
    view.webContents.loadURL(startUrl).catch((err) => {
      logger.error(`Falha ao carregar "${service.label}" para a conta ${accountId}: ${String(err)}`);
    });

    // Allowlist de navegação por serviço (ver services.ts) — null = sem
    // restrição, usado por "Navegador livre" e "URL customizada".
    view.webContents.on('will-navigate', (event, targetUrl) => {
      if (!isNavigationAllowed(service.allowedHosts, targetUrl)) {
        logger.warn(`Navegação bloqueada (fora do domínio permitido de "${service.label}") na conta ${accountId}: ${targetUrl}`);
        event.preventDefault();
      }
    });
    view.webContents.setWindowOpenHandler(({ url }) => {
      // Nada abre em uma janela do sistema operacional separada — isso
      // escaparia do isolamento por partition. Para o WhatsApp (que nunca
      // precisa disso para sua função oficial) o link é só recusado; para os
      // demais serviços, que legitimamente usam links "abrir em nova aba"
      // (ex.: um resultado de busca), a navegação acontece na própria view.
      if (service.id !== 'whatsapp' && isNavigationAllowed(service.allowedHosts, url)) {
        view.webContents.loadURL(url).catch(() => {});
      } else {
        logger.warn(`Tentativa de abrir nova janela bloqueada na conta ${accountId}: ${url}`);
      }
      return { action: 'deny' };
    });

    view.webContents.on('page-title-updated', () => {
      this.onStatusChange?.(accountId);
    });

    view.webContents.on('did-navigate', () => this.onStatusChange?.(accountId));
    view.webContents.on('did-navigate-in-page', () => this.onStatusChange?.(accountId));
    view.webContents.on('before-input-event', (_event, input) => this.onShortcut?.(input));

    // Tratamento de erros: se o WhatsApp Web falhar ao carregar (ex.: sem
    // internet), sinaliza a conta em erro para a UI mostrar um estado
    // claro com opção de tentar de novo, em vez de uma tela em branco.
    view.webContents.on('did-fail-load', (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      if (errorCode === -3) return; // ERR_ABORTED: normalmente só uma navegação cancelada, não um erro real
      logger.warn(`Falha ao carregar o WhatsApp Web da conta ${accountId} (código ${errorCode}).`);
      this.loadErrorState.set(accountId, true);
      this.onStatusChange?.(accountId);
    });
    view.webContents.on('did-finish-load', () => {
      this.loadErrorState.set(accountId, false);
      this.onStatusChange?.(accountId);
    });

    this.webContentsIdToAccount.set(view.webContents.id, accountId);
    const managed: ManagedView = { view, accountId };
    this.views.set(accountId, managed);
    return managed;
  }

  /** Ativa (criando se necessário) a view da conta informada e a exibe na janela. */
  activate(accountId: string): void {
    // Desanexa a view atualmente visível (mas não a destrói).
    if (this.activeAccountId && this.activeAccountId !== accountId) {
      const current = this.views.get(this.activeAccountId);
      if (current) {
        this.window.contentView.removeChildView(current.view);
      }
    }

    let managed = this.views.get(accountId);
    if (!managed) {
      managed = this.createView(accountId);
    }

    this.window.contentView.addChildView(managed.view);
    managed.view.setBounds(this.overlayActive ? { x: 0, y: 0, width: 0, height: 0 } : this.contentBounds);
    this.activeAccountId = accountId;
  }

  /** Desanexa e destrói a WebContents da conta, sem tocar nos dados da partition em disco. */
  private teardownView(accountId: string): ManagedView | undefined {
    const managed = this.views.get(accountId);
    if (!managed) return undefined;
    this.window.contentView.removeChildView(managed.view);
    this.webContentsIdToAccount.delete(managed.view.webContents.id);
    (managed.view.webContents as any).close?.();
    this.views.delete(accountId);
    this.loggedInState.delete(accountId);
    this.loadErrorState.delete(accountId);
    this.currentChat.delete(accountId);
    if (this.activeAccountId === accountId) {
      this.activeAccountId = null;
    }
    return managed;
  }

  /**
   * Suspende uma conta: libera a RAM/CPU da sua WebContents, mas mantém a
   * sessão intacta em disco. Reativar (via `activate`) recria a view e
   * restaura o login automaticamente, sem novo QR Code.
   */
  suspend(accountId: string): void {
    this.teardownView(accountId);
  }

  /** Remove definitivamente a view de uma conta (ao excluir a conta). Não apaga os dados da partition em disco. */
  destroyView(accountId: string): void {
    this.teardownView(accountId);
  }

  /**
   * Remove a conta E apaga permanentemente os dados da sua sessão isolada
   * (cookies, localStorage, IndexedDB, cache) — usado apenas quando o
   * usuário exclui a conta de propósito. As demais partitions não são
   * afetadas de forma alguma.
   */
  async wipeAndDestroy(accountId: string): Promise<void> {
    this.teardownView(accountId);
    const partition = AccountStore.partitionFor(accountId);
    const ses = session.fromPartition(partition, { cache: true });
    try {
      await ses.clearStorageData();
      await ses.clearCache();
    } catch (err) {
      logger.error(`Falha ao apagar dados da conta ${accountId}: ${String(err)}`);
    }
  }

  getTitle(accountId: string): string {
    const managed = this.views.get(accountId);
    return managed?.view.webContents.getTitle() ?? '';
  }

  /** Heurística simples: WhatsApp Web coloca "(N)" no título quando há mensagens não lidas. Só se aplica a contas WhatsApp. */
  getUnreadCount(accountId: string): number {
    const account = this.accountStore.get(accountId);
    if (account && account.service !== 'whatsapp') return 0;
    const title = this.getTitle(accountId);
    const match = title.match(/^\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Fase 17 — leitura PASSIVA da lista de conversas do WhatsApp Web, usada
   * só para separar "novas conversas" (pessoas únicas) de "mensagens" no
   * Analytics (ver chatActivityStore.ts). Só lê o que já está desenhado na
   * tela: o nome de cada conversa e o número de não lidas que já aparece do
   * lado dela — o mesmo tipo de informação que getUnreadCount() já lê do
   * título da página, só que por conversa em vez de um total da conta.
   * NUNCA abre uma conversa, nunca lê o texto de nenhuma mensagem, nunca
   * clica em nada. Só se aplica a contas WhatsApp.
   *
   * Limitações conhecidas (documentando de propósito, porque isso depende
   * da estrutura interna da página oficial do WhatsApp Web, que a Meta pode
   * mudar a qualquer momento sem aviso):
   *  - A lista de conversas é "virtualizada" pelo próprio WhatsApp Web: só
   *    as conversas perto do topo/visíveis existem no DOM a cada instante.
   *    Isso não é um problema para o nosso caso porque uma conversa com
   *    mensagem nova sempre sobe pro topo da lista automaticamente — mas
   *    conversas mais antigas, sem nada novo, podem não aparecer nesta
   *    leitura, o que é esperado e sem efeito no resultado final.
   *  - A identificação de "isto é um grupo" usa múltiplos indícios (ícone
   *    padrão de grupo sem foto, atributos internos de id que terminam em
   *    "g.us", texto "grupo"/"group" em rótulos de acessibilidade). Nenhum
   *    desses sinais sozinho é garantido — se algum grupo específico
   *    escapar dessa detecção, ele pode aparecer incorretamente como uma
   *    "conversa individual" no Analytics. Se isso acontecer na prática,
   *    é um ajuste de seletor, não um redesenho da lógica.
   *  - Qualquer falha aqui (seletor não encontrado, mudança de layout) é
   *    silenciosa — retorna lista vazia — e nunca derruba o app nem afeta
   *    qualquer outra função.
   */
  async getChatEntries(
    accountId: string
  ): Promise<{ key: string; isGroup: boolean; unread: number; dateTag: 'today' | 'yesterday' | 'other' }[]> {
    const account = this.accountStore.get(accountId);
    if (!account || account.service !== 'whatsapp') return [];
    const managed = this.views.get(accountId);
    if (!managed) return [];

    const script = `
      (() => {
        try {
          const pane =
            document.querySelector('#pane-side') ||
            document.querySelector('[data-testid="chat-list"]') ||
            document.querySelector('[aria-label="Lista de conversas"]') ||
            document.querySelector('[aria-label="Chat list"]');
          if (!pane) return [];

          const rows = Array.from(
            pane.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]')
          );

          const out = [];
          for (const row of rows) {
            const nameEl = row.querySelector('span[title]');
            const name = nameEl ? (nameEl.getAttribute('title') || nameEl.textContent || '').trim() : '';
            if (!name) continue;

            let unread = 0;
            const badge = row.querySelector(
              '[data-testid="icon-unread-count"], span[aria-label*="unread" i], span[aria-label*="não lida" i], span[aria-label*="nao lida" i]'
            );
            if (badge) {
              const label = badge.getAttribute('aria-label') || badge.textContent || '';
              const m = label.match(/\\d+/);
              if (m) unread = parseInt(m[0], 10);
            }
            if (!unread) {
              const spans = row.querySelectorAll('span');
              for (const s of spans) {
                const t = (s.textContent || '').trim();
                if (/^\\d{1,4}$/.test(t)) { unread = parseInt(t, 10); break; }
              }
            }

            let isGroup = !!row.querySelector('[data-icon="default-group"], [aria-label*="grupo" i], [aria-label*="group" i]');
            if (!isGroup) {
              const idHolder = row.closest('[data-id]') || row.querySelector('[data-id]');
              const dataId = idHolder ? idHolder.getAttribute('data-id') || '' : '';
              if (dataId.includes('g.us')) isGroup = true;
            }

            // Rótulo de data/hora da última mensagem, ao lado do nome — o
            // WhatsApp Web mostra "HH:MM" quando a última mensagem é de
            // hoje, "Ontem"/"Yesterday" quando é do dia anterior, ou uma
            // data/dia da semana quando é mais antiga. Lido aqui só para
            // decidir em qual "dia" (hoje/ontem) a mensagem entra no
            // relatório — nunca para identificar a pessoa.
            let dateTag = 'other';
            const timeCandidates = row.querySelectorAll('span, div');
            for (const el of timeCandidates) {
              const t = (el.textContent || '').trim();
              if (!t || t.length > 12) continue;
              if (/^\\d{1,2}:\\d{2}$/.test(t)) { dateTag = 'today'; break; }
              if (/^(ontem|yesterday)$/i.test(t)) { dateTag = 'yesterday'; break; }
            }

            out.push({ key: name, isGroup, unread, dateTag });
          }
          return out;
        } catch (err) {
          return [];
        }
      })()
    `;

    try {
      const result = await managed.view.webContents.executeJavaScript(script, true);
      if (!Array.isArray(result)) return [];
      return result
        .filter(
          (e): e is { key: string; isGroup: boolean; unread: number; dateTag: string } =>
            !!e && typeof e.key === 'string' && e.key.length > 0
        )
        .map((e) => ({
          key: e.key,
          isGroup: e.isGroup,
          unread: e.unread,
          dateTag: (e.dateTag === 'today' || e.dateTag === 'yesterday' ? e.dateTag : 'other') as
            | 'today'
            | 'yesterday'
            | 'other',
        }));
    } catch {
      return [];
    }
  }

  isOnline(accountId: string): boolean {
    return this.loggedInState.get(accountId) ?? false;
  }

  hasLoadError(accountId: string): boolean {
    return this.loadErrorState.get(accountId) ?? false;
  }

  /** Recarrega a página do WhatsApp Web de uma conta já carregada (ex.: depois de um erro de rede). */
  reload(accountId: string): void {
    const managed = this.views.get(accountId);
    managed?.view.webContents.reload();
  }
}
