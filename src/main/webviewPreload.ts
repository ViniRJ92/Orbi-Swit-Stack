/**
 * Preload injetado dentro da página de cada instância (uma por conta). Dois
 * objetivos, os dois por observação passiva do DOM, avisando o processo
 * principal via IPC: (1) detectar se a conta está pronta para uso [login
 * concluído], e (2) detectar a CHEGADA de mensagens novas na conversa aberta
 * em tempo real, por evento de inserção no DOM (ver `syncChatPanelState`/
 * `attachMessageObserver` abaixo — Fase 30). Nunca lê, intercepta ou
 * armazena o texto, remetente ou mídia de nenhuma mensagem — apenas
 * presença de elementos de interface da própria página oficial e o
 * identificador opaco (`data-id`) de cada bolha.
 *
 * O conceito de "Aguardando QR Code" só existe no WhatsApp Web (é o próprio
 * WhatsApp que exige escanear um código pra vincular o navegador) — Gmail,
 * Google Earth, navegador livre e URL customizada não têm esse fluxo, então
 * não faz sentido (e é enganoso) tratá-los como se estivessem "esperando
 * QR Code" indefinidamente. Este preload só roda a detecção baseada em QR
 * Code quando a instância é de fato WhatsApp (`--mw-service=whatsapp`,
 * passado pelo processo principal em `viewManager.ts` via
 * `additionalArguments`); para os demais serviços, considera a instância
 * "pronta" assim que a página termina de carregar, e não fica reobservando
 * nada depois disso.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { ipcRenderer } from 'electron';

/** Lê o serviço desta instância a partir do argumento passado por viewManager.ts. */
function currentService(): string {
  const arg = process.argv.find((a) => a.startsWith('--mw-service='));
  return arg ? arg.slice('--mw-service='.length) : 'whatsapp';
}

function report(loggedIn: boolean): void {
  ipcRenderer.send('mw:account-status', { loggedIn });
}

function detectWhatsAppLoggedIn(): boolean {
  // Lista de conversas só existe depois do login bem-sucedido.
  const chatList = document.querySelector('#pane-side');
  const qrCanvas = document.querySelector('canvas[aria-label], div[data-testid="qrcode"]');
  if (chatList) return true;
  if (qrCanvas) return false;
  return false;
}

// Fase 5 (desempenho): o WhatsApp Web mexe no DOM o tempo todo (indicador de
// digitação, relógios de mensagem, etc.), então observar sem debounce dispara
// reportWhatsApp() (e um IPC) dezenas de vezes por segundo à toa. Um pequeno
// atraso agrupa essas rajadas em uma única checagem, sem atrasar
// perceptivelmente a detecção real de login/logout.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function reportWhatsAppDebounced(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => report(detectWhatsAppLoggedIn()), 400);
}

/**
 * Fase 30.6 (2026-08-29, versão definitiva) — detecção de mensagens por
 * EVENTO (nunca por polling), unificada num único mecanismo: toda vez que
 * ALGO muda na conversa aberta (mensagem nova chegando, troca de conversa,
 * ou até rolar a tela pra ver o histórico), a conversa inteira visível
 * agora é reclassificada do zero usando o divisor de data que o próprio
 * WhatsApp Web já desenha ("HOJE"/"ONTEM") — nunca o texto da mensagem.
 *
 * Por que reclassificar tudo de novo a cada mudança, em vez de só olhar o
 * que foi inserido: o WhatsApp Web usa uma lista VIRTUALIZADA — rolar pra
 * cima pra ver mensagens antigas faz ele inserir essas mensagens antigas de
 * novo no HTML (é assim que listas longas ficam leves). Um desenho que só
 * perguntasse "isso é um elemento novo no DOM?" confundiria isso com
 * mensagem nova de verdade — bug real identificado em uso ao vivo
 * (2026-08-29). Reclassificar pelo DIVISOR DE DATA em vez de "quando
 * apareceu no DOM" resolve isso de vez: uma mensagem de antes de ontem
 * nunca conta, não importa se ela aparece no HTML agora (rolagem) ou há
 * dias — e uma mensagem de hoje conta, não importa se ela já estava
 * carregada quando a conversa abriu ou acabou de chegar.
 *
 * Deduplicação por identidade (`data-id`, nunca o texto) é o que garante
 * "nunca recontar": cada bolha só pode gerar 1 evento na vida do app,
 * guardado numa lista persistida (`seenMessageIds` aqui + a lista
 * equivalente em analyticsStore.ts/chatActivityStore.ts do lado do processo
 * principal) — reprocessar a conversa inteira de novo a cada mudança é
 * seguro e propositalmente redundante: rodar 1 vez ou 100 vezes no mesmo
 * dia dá exatamente o mesmo resultado, porque tudo que já foi visto antes é
 * ignorado.
 *
 * Cada bolha aceita (dentro de Hoje ou Ontem, nunca mais antiga) é reportada
 * com `{ dataId, bucket }` — o processo principal decide o dia exato
 * (`todayKey()`/`yesterdayKey()`) a partir do bucket, nunca de um timestamp
 * de "quando o app percebeu isso", que é exatamente a fonte do bug anterior.
 *
 * Identificação da conversa: cada evento de "conversa aberta" carrega o
 * NOME lido da lista lateral (`chatKey`, ver `extractChatKey` — reaproveita
 * o mesmo campo `span[title]` da linha selecionada, já comprovado
 * funcionando) e se é grupo (`isGroup`) — necessário para o relatório
 * "Hoje x Ontem" por pessoa (chatActivityStore.ts) saber a quem atribuir
 * cada mensagem. `syncChatPanelState` reage à mudança de nome mesmo quando
 * `#main` continua o mesmo elemento entre duas conversas diferentes.
 *
 * NUNCA lê texto, remetente ou mídia de nenhuma mensagem — só o atributo
 * `data-id` (identificador opaco) de cada bolha e o texto do divisor de
 * data (elemento de interface, não conteúdo de mensagem). Mensagens
 * enviadas pelo próprio usuário (`data-id` começando com `true_`) nunca são
 * reportadas, mesma regra do contador de não lidas.
 *
 * Registra o observador de imediato quando a página carrega — não depende
 * do usuário clicar ou trocar de aba para essa conta: a própria conta que
 * já abre com o app (a primeira instância) começa a escutar sozinha.
 */
let chatMessageObserver: MutationObserver | null = null;
let mainPanelPresent = false;
// Nome da conversa atualmente rastreada — não só a presença de `#main`, que
// pode continuar montado (mesmo elemento) quando o usuário troca de uma
// conversa pra outra sem fechar o painel; sem isso, trocar de contato não
// seria detectado como troca de conversa.
let currentChatKey: string | null = null;
// IDs já reportados NESTA sessão da página (whatsapp reload = zera, o que é
// seguro porque o processo principal também deduplica de forma persistida).
const seenMessageIds = new Set<string>();

function findMessagePanel(main: Element): Element {
  return (
    main.querySelector('[data-testid="conversation-panel-messages"]') ||
    main.querySelector('[role="application"]') ||
    main.querySelector('.copyable-area') ||
    main
  );
}

const DATE_DIVIDER_RE = /^(hoje|today|ontem|yesterday)$/i;

/**
 * Caminha TODA a conversa visível agora, em ordem, classificando cada bolha
 * pelo divisor de data mais próximo ANTES dela (nunca por quando apareceu no
 * DOM). Retorna só as de Hoje/Ontem, nunca vistas antes nesta sessão da
 * página, nunca enviadas pelo próprio usuário.
 */
function scanChatMessages(panel: Element): { dataId: string; bucket: 'today' | 'yesterday' }[] {
  const nodes = Array.from(panel.querySelectorAll('[data-id], span[aria-label], div[role="button"] span'));
  let bucket: 'today' | 'yesterday' | 'other' = 'other';
  const out: { dataId: string; bucket: 'today' | 'yesterday' }[] = [];

  for (const node of nodes) {
    if (node.hasAttribute && node.hasAttribute('data-id')) {
      const dataId = node.getAttribute('data-id') || '';
      if (!dataId || seenMessageIds.has(dataId)) continue;
      if (/^true[_-]/i.test(dataId)) {
        seenMessageIds.add(dataId); // enviada por mim: nunca conta, mas marca vista pra não reprocessar sempre
        continue;
      }
      if (bucket === 'other') continue; // mais antiga que ontem: nunca conta, não marca visto (barato reavaliar)
      seenMessageIds.add(dataId);
      out.push({ dataId, bucket });
      continue;
    }
    const text = (node.textContent || '').trim();
    if (text.length > 0 && text.length <= 12 && DATE_DIVIDER_RE.test(text)) {
      const lower = text.toLowerCase();
      bucket = lower === 'hoje' || lower === 'today' ? 'today' : 'yesterday';
    }
  }
  return out;
}

function reportChatMessages(items: { dataId: string; bucket: 'today' | 'yesterday' }[]): void {
  if (items.length === 0) return;
  ipcRenderer.send('mw:chat-messages', { items });
}

/**
 * `chatKey` identifica QUAL conversa está aberta (nome do contato/grupo,
 * lido do cabeçalho da conversa — mesmo campo/seletor que a lista lateral já
 * usa) — necessário para o relatório "Hoje x Ontem" por pessoa
 * (chatActivityStore.ts) saber a quem atribuir cada mensagem nova, exatamente
 * como a leitura da lista lateral já fazia. `isGroup` segue a mesma regra de
 * sempre: grupos nunca entram nesse relatório.
 */
function reportChatOpenState(open: boolean, chatKey: string | null, isGroup: boolean): void {
  ipcRenderer.send('mw:chat-open-state', { open, chatKey, isGroup });
}

/**
 * Lê só o NOME já visível (do contato/grupo da conversa aberta) — nunca
 * telefone, status ou qualquer outro dado.
 *
 * Prioridade 1 (2026-08-29, correção): a linha marcada como SELECIONADA na
 * lista lateral (`aria-selected="true"`, atributo de acessibilidade que o
 * WhatsApp Web já usa para indicar qual conversa está aberta) — reaproveita
 * exatamente o mesmo seletor (`span[title]`) que `getChatEntries`
 * (viewManager.ts) já usa pra lista lateral, e que já está comprovado
 * funcionando contra o WhatsApp Web real (é como os nomes já aparecem
 * corretamente no relatório Hoje/Ontem hoje). Evita depender de um seletor
 * novo e não testado para o cabeçalho da conversa.
 *
 * Prioridade 2 (reserva): o cabeçalho da própria conversa aberta, caso a
 * linha selecionada não seja encontrada por qualquer motivo (ex.: lista
 * lateral minimizada/oculta).
 */
function extractChatKey(main: Element): { key: string | null; isGroup: boolean } {
  const activeRow =
    document.querySelector('#pane-side [aria-selected="true"]') ||
    document.querySelector('[data-testid="chat-list"] [aria-selected="true"]') ||
    document.querySelector('[aria-selected="true"][role="row"]');
  if (activeRow) {
    const nameEl = activeRow.querySelector('span[title]');
    const raw = nameEl ? (nameEl.getAttribute('title') || nameEl.textContent || '').trim() : '';
    if (raw.length > 0) {
      const isGroup = !!activeRow.querySelector(
        '[data-icon="default-group"], [aria-label*="grupo" i], [aria-label*="group" i]'
      );
      return { key: raw, isGroup };
    }
  }

  const header = main.querySelector('header');
  if (!header) return { key: null, isGroup: false };
  const nameEl = header.querySelector('span[title]');
  const raw = nameEl ? (nameEl.getAttribute('title') || nameEl.textContent || '').trim() : '';
  const isGroup = !!header.querySelector('[data-icon="default-group"], [aria-label*="grupo" i], [aria-label*="group" i]');
  return { key: raw.length > 0 ? raw : null, isGroup };
}

// Agrupa rajadas de mutação (WhatsApp mexe no DOM várias vezes por segundo)
// numa única varredura, mesmo espírito do debounce de `reportWhatsAppDebounced`.
const SCAN_DEBOUNCE_MS = 400;
let scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function detachMessageObserver(): void {
  chatMessageObserver?.disconnect();
  chatMessageObserver = null;
  seenMessageIds.clear();
  if (scanDebounceTimer) {
    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = null;
  }
}

function attachMessageObserver(panel: Element): void {
  const scan = () => reportChatMessages(scanChatMessages(panel));
  const scanDebounced = () => {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(scan, SCAN_DEBOUNCE_MS);
  };

  scan(); // varredura imediata: cobre o que já estiver carregado agora mesmo
  chatMessageObserver = new MutationObserver(scanDebounced);
  chatMessageObserver.observe(panel, { childList: true, subtree: true });
}

/**
 * Liga/desliga o observador de mensagens conforme o painel de conversa
 * aparece/some/troca. Roda a CADA tick (não só quando a presença de `#main`
 * muda) porque `#main` pode continuar o mesmo elemento entre duas conversas
 * diferentes — o que de fato identifica "a conversa mudou" é o nome lido do
 * cabeçalho (`chatKey`), não a existência do container.
 */
function syncChatPanelState(): void {
  const main = document.querySelector('#main');
  if (!main) {
    if (mainPanelPresent) {
      mainPanelPresent = false;
      currentChatKey = null;
      reportChatOpenState(false, null, false);
      detachMessageObserver();
    }
    return;
  }
  const { key, isGroup } = extractChatKey(main);
  const changed = !mainPanelPresent || key !== currentChatKey;
  if (!changed) return;
  mainPanelPresent = true;
  currentChatKey = key;
  reportChatOpenState(true, key, isGroup);
  detachMessageObserver();
  attachMessageObserver(findMessagePanel(main));
}

function startWhatsApp(): void {
  report(detectWhatsAppLoggedIn());
  const observer = new MutationObserver(() => {
    reportWhatsAppDebounced();
    syncChatPanelState();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // Rede de segurança independente do debounce, caso o observer perca algum estado.
  setInterval(() => report(detectWhatsAppLoggedIn()), 5000);
  // Checagem leve e independente: só existência do painel `#main` (não o
  // conteúdo de mensagens), para nunca perder uma troca de conversa mesmo
  // que, por qualquer motivo, ela não dispare uma mutação em document.body.
  setInterval(syncChatPanelState, 1000);
  syncChatPanelState();
}

/**
 * Gmail, Google Earth, navegador livre e URL customizada: não existe um
 * estado de "login pendente" que possamos observar de forma genérica e
 * confiável sem depender do DOM interno de sites de terceiros (o que seria
 * engenharia reversa, fora do escopo do projeto). Cada um desses serviços já
 * cuida do próprio fluxo de login (ex.: Gmail mostra a tela de login do
 * Google normalmente dentro da própria instância) — o app só precisa parar
 * de rotular isso como "Aguardando QR Code". Reportar "pronta" assim que a
 * página termina de carregar é suficiente para isso.
 */
function startOtherService(): void {
  report(true);
}

function start(): void {
  if (currentService() === 'whatsapp') {
    startWhatsApp();
  } else {
    startOtherService();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  window.addEventListener('DOMContentLoaded', start);
}
