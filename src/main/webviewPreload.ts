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

function reportChatOpenState(open: boolean): void {
  ipcRenderer.send('mw:chat-open-state', { open });
}

function detachMessageObserver(): void {
  chatMessageObserver?.disconnect();
  chatMessageObserver = null;
  seenMessageIds.clear();
}

function attachMessageObserver(panel: Element): void {
  // Baseline: tudo que já está na tela agora nunca conta como "novo".
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
          // "true_..." = enviada por mim; nunca conta (mesma regra do
          // contador de não lidas, que só reflete mensagens recebidas).
          if (/^true[_-]/i.test(dataId)) continue;
          reportNewMessage(dataId, ts);
        }
      });
    }
  });
  chatMessageObserver.observe(panel, { childList: true, subtree: true });
}

/** Liga/desliga o observador de mensagens conforme o painel de conversa aparece/some/troca. */
function syncChatPanelState(): void {
  const main = document.querySelector('#main');
  const nowPresent = !!main;
  if (nowPresent === mainPanelPresent) return;
  mainPanelPresent = nowPresent;
  reportChatOpenState(nowPresent);
  detachMessageObserver();
  if (main) attachMessageObserver(findMessagePanel(main));
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
