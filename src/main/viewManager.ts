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
  }

  setStatusChangeListener(cb: (accountId: string) => void): void {
    this.onStatusChange = cb;
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

  /**
   * Fase 30 — leitura PASSIVA da conversa ABERTA no momento (painel `#main`),
   * complementar à leitura da lista lateral acima (Fase 17/28). Autorizada
   * explicitamente pelo usuário (2026-08-29) para corrigir o sub-registro de
   * mensagens da conta que está sendo usada em tempo real: o WhatsApp marca
   * como lida uma mensagem que chega numa conversa já aberta quase
   * instantaneamente, então nem o título da aba (analyticsStore.ts) nem o
   * contador de não lidas da lista lateral (getChatEntries acima) chegam a
   * refletir essas mensagens — os dois métodos de badge estruturalmente não
   * as veem. Ver o comentário de `AnalyticsStore.observeOpenChatMessages`
   * para como isso se combina com o método de badge sem contar a mesma
   * mensagem duas vezes.
   *
   * Só lê o que já está desenhado na tela dentro do painel de mensagens da
   * conversa aberta: o atributo `data-id` de cada bolha (identificador opaco
   * da mensagem, não é o texto) e sob qual divisor de data (Hoje/Ontem) ela
   * está agrupada. NUNCA lê o texto, remetente, mídia ou qualquer conteúdo da
   * mensagem em si — só a presença e o identificador de cada bolha já
   * renderizada. NUNCA abre nem clica em nada: só lê a conversa que o próprio
   * WhatsApp Web já está mostrando no momento da leitura.
   *
   * `hasOpenChat` é decidido pela existência do próprio painel `#main`
   * (elemento que só existe quando há uma conversa aberta — a tela inicial
   * "mantenha seu celular conectado" não o renderiza), independente de os
   * seletores mais específicos usados para ler as bolhas terem sucesso ou não
   * — isso importa porque `hasOpenChat` é o sinal usado para desligar
   * temporariamente o método de badge para esta conta; um falso-negativo
   * aqui reabriria risco de dupla contagem, então este sinal usa o indicador
   * mais robusto disponível, mesmo que a leitura fina das mensagens falhe.
   *
   * Limitações conhecidas (mesma natureza das de getChatEntries acima):
   *  - Só enxerga a conversa que já está aberta nesta conta neste instante —
   *    não abre nenhuma outra (seria automação, fora do escopo do projeto).
   *  - A lista de mensagens também é virtualizada pelo WhatsApp Web — só
   *    bolhas próximas da posição de rolagem atual existem no DOM. Mensagens
   *    mais antigas fora da janela visível simplesmente não aparecem aqui, o
   *    que é esperado e não afeta a deduplicação (cada uma só precisa ser
   *    vista 1 vez, em qualquer poll, para ser contada).
   *  - A detecção do divisor de data (texto "HOJE"/"ONTEM"/data) é best-effort
   *    e pode variar por idioma/layout — mensagens fora de Hoje/Ontem são
   *    ignoradas de propósito (não fazem parte do que foi pedido).
   *  - Qualquer falha aqui é silenciosa (retorna sem conversa aberta), nunca
   *    derruba o app nem afeta qualquer outra função.
   */
  async getOpenChatMessages(
    accountId: string
  ): Promise<{ hasOpenChat: boolean; messages: { id: string; bucket: 'today' | 'yesterday' }[] }> {
    const account = this.accountStore.get(accountId);
    if (!account || account.service !== 'whatsapp') return { hasOpenChat: false, messages: [] };
    const managed = this.views.get(accountId);
    if (!managed) return { hasOpenChat: false, messages: [] };

    const script = `
      (() => {
        try {
          const main = document.querySelector('#main');
          if (!main) return { hasOpenChat: false, messages: [] };

          const panel =
            main.querySelector('[data-testid="conversation-panel-messages"]') ||
            main.querySelector('[role="application"]') ||
            main.querySelector('.copyable-area') ||
            main;

          const DIVIDER_RE = /^(hoje|today|ontem|yesterday|\\d{1,2}\\s+de\\s+[a-zç]+\\s+de\\s+\\d{4}|[a-zç]+\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})$/i;

          const nodes = Array.from(panel.querySelectorAll('[data-id], span[aria-label], div[role="button"] span'));
          let bucket = 'other';
          const seenIds = new Set();
          const out = [];

          for (const node of nodes) {
            if (node.hasAttribute && node.hasAttribute('data-id')) {
              const dataId = node.getAttribute('data-id') || '';
              if (!dataId || seenIds.has(dataId)) continue;
              seenIds.add(dataId);
              // Formato usual: "{true|false}_{chatId}_{msgId}" — "true" =
              // enviada por mim (nunca conta, mesma regra do badge de não
              // lidas, que também só reflete mensagens recebidas).
              if (/^true[_-]/i.test(dataId)) continue;
              if (bucket === 'today' || bucket === 'yesterday') {
                out.push({ id: dataId, bucket });
              }
              continue;
            }
            const text = (node.textContent || '').trim();
            if (text.length > 0 && text.length <= 24 && DIVIDER_RE.test(text)) {
              const lower = text.toLowerCase();
              if (lower === 'hoje' || lower === 'today') bucket = 'today';
              else if (lower === 'ontem' || lower === 'yesterday') bucket = 'yesterday';
              else bucket = 'other';
            }
          }
          return { hasOpenChat: true, messages: out };
        } catch (err) {
          return { hasOpenChat: false, messages: [] };
        }
      })()
    `;

    try {
      const result = await managed.view.webContents.executeJavaScript(script, true);
      if (!result || typeof result !== 'object') return { hasOpenChat: false, messages: [] };
      const hasOpenChat = !!(result as any).hasOpenChat;
      const rawMessages = (result as any).messages;
      const messages = Array.isArray(rawMessages)
        ? rawMessages.filter(
            (m: any): m is { id: string; bucket: 'today' | 'yesterday' } =>
              !!m && typeof m.id === 'string' && m.id.length > 0 && (m.bucket === 'today' || m.bucket === 'yesterday')
          )
        : [];
      return { hasOpenChat, messages };
    } catch {
      return { hasOpenChat: false, messages: [] };
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
