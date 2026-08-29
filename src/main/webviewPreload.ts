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
 * Fase 30 (reescrita) — detecção de mensagens novas por EVENTO de inserção no
 * DOM, não por releitura periódica. Corrige o desenho anterior desta fase
 * (polling a cada 4s em viewManager.ts, reexecutando um script que varria
 * TODA a conversa aberta a cada leitura) — aquele desenho podia recontar
 * mensagens ao trocar de instância/reabrir o app se a deduplicação por ID
 * falhasse em qualquer ponta; este não tem esse problema por construção,
 * porque nunca reprocessa uma mensagem que já existia no DOM antes do
 * observador começar a olhar para ela.
 *
 * Como funciona:
 *  1. Assim que o painel de conversa (`#main`) aparece, TODAS as bolhas já
 *     presentes viram "baseline" (`seenMessageIds`) — nunca são reportadas
 *     como novas. Isso vale tanto para a primeira conversa aberta quando o
 *     app inicia quanto para qualquer troca de conversa depois.
 *  2. Um `MutationObserver` passa a vigiar esse painel. Só os nós
 *     REALMENTE inseridos depois disso (`addedNodes`) são inspecionados; se
 *     tiverem `data-id` e ainda não tiverem sido vistos, são reportados na
 *     hora, com o timestamp exato do instante da inserção (`Date.now()`
 *     dentro do próprio callback do observer) — não existe mais parsing de
 *     rótulo "Hoje"/"Ontem" para decidir a data: o timestamp já é o
 *     momento real de chegada.
 *  3. Quando a conversa muda (o painel `#main` é trocado/desmontado e
 *     remontado por outro), o observador antigo é desligado e a baseline é
 *     resetada para a conversa nova — nunca soma o que já estava carregado
 *     nela.
 *
 * Correção (2026-08-29, bug encontrado em uso real): o WhatsApp Web não
 * popula o histórico da conversa no MESMO instante em que o painel `#main`
 * aparece — o container nasce vazio e as mensagens do histórico chegam um
 * instante depois, em um único lote assíncrono. Sem uma janela de espera,
 * esse lote inteiro (mensagens antigas, já lidas) era capturado como se
 * fossem "novas" — ver `MESSAGE_ARM_DELAY_MS` abaixo. Limitação assumida:
 * uma mensagem genuinamente nova que chegue durante essa janela (2s desde
 * a conversa abrir) não é contada — troca deliberada para nunca mais
 * contar o histórico da conversa como mensagem nova, que era o problema
 * relatado. Ver o comentário de `attachMessageObserver` para o detalhe.
 *
 * Catch-up de Hoje/Ontem (2026-08-29, Fase 30.5): a baseline acima descarta
 * QUALQUER coisa já carregada quando a conversa abre — inclusive mensagens
 * de HOJE/ONTEM genuinamente reais que só não tinham sido vistas ainda por
 * este mecanismo (ex.: conversa aberta antes desta versão existir, ou
 * marcada como "não lida" só como lembrete pessoal, sem ser mensagem nova de
 * verdade). `scanCatchupMessages` cobre esse caso: 1 varredura, só depois do
 * histórico estabilizar, usando os divisores "HOJE"/"ONTEM" que o WhatsApp
 * já desenha na conversa (texto de interface, não conteúdo de mensagem) pra
 * recuperar essas mensagens sem nunca recontar as mais antigas que isso nem
 * as que já tiverem sido processadas antes (mesma lista de deduplicação do
 * canal ao vivo, em chatActivityStore.ts).
 *
 * Identificação da conversa (2026-08-29): além do `data-id`/timestamp, cada
 * evento de "conversa aberta" agora também carrega o NOME lido do cabeçalho
 * (`chatKey`, ver `extractChatKey`) e se é um grupo (`isGroup`) — necessário
 * para o relatório "Hoje x Ontem" por pessoa (chatActivityStore.ts) saber a
 * quem atribuir cada mensagem, do mesmo jeito que a leitura da lista lateral
 * (getChatEntries) já fazia. `syncChatPanelState` reage a essa mudança de
 * nome mesmo quando `#main` continua o mesmo elemento entre duas conversas
 * diferentes — ver comentário de `currentChatKey` abaixo.
 *
 * Continua NUNCA lendo texto, remetente ou mídia de nenhuma mensagem — só o
 * atributo `data-id` (identificador opaco) de cada bolha, exatamente como a
 * leitura da lista lateral (getChatEntries) já fazia. Mensagens enviadas
 * pelo próprio usuário (`data-id` começando com `true_`) nunca são
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
// reiniciaria a baseline e o histórico da conversa nova seria capturado como
// mensagem nova (o mesmo bug de carregamento, só que disparado por troca de
// conversa em vez de abertura inicial).
let currentChatKey: string | null = null;
const seenMessageIds = new Set<string>();

function findMessagePanel(main: Element): Element {
  return (
    main.querySelector('[data-testid="conversation-panel-messages"]') ||
    main.querySelector('[role="application"]') ||
    main.querySelector('.copyable-area') ||
    main
  );
}

function extractDataIds(node: Node): string[] {
  if (!(node instanceof Element)) return [];
  const ids: string[] = [];
  if (node.hasAttribute('data-id')) ids.push(node.getAttribute('data-id') || '');
  node.querySelectorAll?.('[data-id]').forEach((el) => {
    const id = el.getAttribute('data-id');
    if (id) ids.push(id);
  });
  return ids.filter((id) => id.length > 0);
}

function reportNewMessage(dataId: string, ts: number): void {
  ipcRenderer.send('mw:new-message', { dataId, ts });
}

/**
 * Fase 30.5 (2026-08-29) — "catch-up": mensagens de HOJE ou ONTEM que já
 * estavam carregadas na tela antes do observador começar a olhar pra essa
 * conversa (ex.: você abriu a conversa mais cedo, antes do app começar a
 * rastreá-la; ou marcou como "não lida" pra lembrete, mas a mensagem já
 * tinha chegado de verdade hoje). Sem isso, essas mensagens ficavam de fora
 * pra sempre, mesmo sendo reais e do dia — a baseline da Fase 30.1/30.2 as
 * tratava como "histórico" simplesmente por já estarem lá, sem olhar a data.
 *
 * Não é releitura periódica nem contradiz "nunca recontar histórico": roda
 * só 1 vez por conversa aberta (depois do histórico terminar de carregar,
 * mesma janela de `MESSAGE_ARM_DELAY_MS`), e cada mensagem encontrada só é
 * aceita pelo processo principal se o `data-id` dela NUNCA tiver sido
 * processado antes (mesma lista persistida usada pelas mensagens ao vivo) —
 * ou seja, roda de novo a cada troca/reabertura, mas só a primeira vez que
 * vê cada ID de verdade conta.
 *
 * O "dia" de cada mensagem aqui vem do PRÓPRIO divisor de data que o
 * WhatsApp Web já desenha na conversa ("HOJE"/"ONTEM") — texto de interface,
 * não conteúdo de mensagem, mesmo princípio já usado pelo `dateTag` da
 * leitura da lista lateral (getChatEntries). Mensagens antes de "Ontem"
 * (rótulo de data mais antigo, ou nenhum rótulo reconhecido) são ignoradas
 * de propósito — não fazem parte do relatório Hoje x Ontem.
 */
const CATCHUP_DIVIDER_RE = /^(hoje|today|ontem|yesterday)$/i;

function scanCatchupMessages(panel: Element): { dataId: string; bucket: 'today' | 'yesterday' }[] {
  const nodes = Array.from(panel.querySelectorAll('[data-id], span[aria-label], div[role="button"] span'));
  let bucket: 'today' | 'yesterday' | 'other' = 'other';
  const seen = new Set<string>();
  const out: { dataId: string; bucket: 'today' | 'yesterday' }[] = [];

  for (const node of nodes) {
    if (node.hasAttribute && node.hasAttribute('data-id')) {
      const dataId = node.getAttribute('data-id') || '';
      if (!dataId || seen.has(dataId)) continue;
      seen.add(dataId);
      if (/^true[_-]/i.test(dataId)) continue; // enviada por mim, nunca conta
      if (bucket !== 'other') out.push({ dataId, bucket });
      continue;
    }
    const text = (node.textContent || '').trim();
    if (text.length > 0 && text.length <= 12 && CATCHUP_DIVIDER_RE.test(text)) {
      const lower = text.toLowerCase();
      bucket = lower === 'hoje' || lower === 'today' ? 'today' : 'yesterday';
    }
  }
  return out;
}

function reportCatchupMessages(items: { dataId: string; bucket: 'today' | 'yesterday' }[]): void {
  if (items.length === 0) return;
  ipcRenderer.send('mw:catchup-messages', { items });
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

let armMessageTimer: ReturnType<typeof setTimeout> | null = null;

function detachMessageObserver(): void {
  chatMessageObserver?.disconnect();
  chatMessageObserver = null;
  seenMessageIds.clear();
  if (armMessageTimer) {
    clearTimeout(armMessageTimer);
    armMessageTimer = null;
  }
}

// Quanto tempo esperar, a partir do instante em que o painel de conversa
// aparece, antes de tratar uma bolha inserida como mensagem NOVA de verdade.
// Motivo (bug real encontrado em uso ao vivo, 2026-08-29): o WhatsApp Web
// não popula o histórico da conversa no mesmo instante em que o container
// `#main`/painel de mensagens aparece — o container nasce vazio e o React
// deles insere as mensagens do histórico um instante depois, em um único
// lote. Sem essa janela de espera, esse lote inteiro (mensagens antigas,
// já lidas) era capturado pelo `MutationObserver` como se fossem mensagens
// novas — sintoma observado: dezenas de eventos gravados com o EXATO MESMO
// timestamp, muito acima do número real de mensagens novas recebidas.
// Mesma classe de problema, mesma solução, do `SETTLE_MS` de
// analyticsStore.ts (Fase 15) — lá era o título escrito em mais de um
// passo; aqui é a lista de mensagens populada em mais de um passo.
const MESSAGE_ARM_DELAY_MS = 2000;

function attachMessageObserver(panel: Element): void {
  let armed = false;

  // Baseline: tudo que já está na tela agora (ou que aparecer durante a
  // janela de estabilização abaixo) nunca conta como "novo" — é o
  // histórico da conversa, não uma chegada em tempo real.
  panel.querySelectorAll('[data-id]').forEach((el) => {
    const id = el.getAttribute('data-id');
    if (id) seenMessageIds.add(id);
  });

  chatMessageObserver = new MutationObserver((mutations) => {
    const ts = Date.now();
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        for (const dataId of extractDataIds(node)) {
          if (seenMessageIds.has(dataId)) continue;
          seenMessageIds.add(dataId);
          if (!armed) continue; // ainda dentro da janela de carregamento do histórico
          // "true_..." = enviada por mim; nunca conta (mesma regra do
          // contador de não lidas, que só reflete mensagens recebidas).
          if (/^true[_-]/i.test(dataId)) continue;
          reportNewMessage(dataId, ts);
        }
      });
    }
  });
  chatMessageObserver.observe(panel, { childList: true, subtree: true });

  armMessageTimer = setTimeout(() => {
    armed = true;
    armMessageTimer = null;
    // Fase 30.5: só agora, com o histórico já estabilizado (mesma espera
    // que evita o bug da Fase 30.2), varre o que está na tela procurando
    // mensagens de Hoje/Ontem que a baseline acima descartou só por já
    // estarem carregadas — ver comentário de `scanCatchupMessages`.
    reportCatchupMessages(scanCatchupMessages(panel));
  }, MESSAGE_ARM_DELAY_MS);
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
