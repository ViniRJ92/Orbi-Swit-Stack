/**
 * Preload injetado dentro da página de cada instância (uma por conta). Único
 * objetivo: observar o DOM para detectar se a conta está pronta para uso, e
 * avisar o processo principal via IPC. Não lê, intercepta nem armazena
 * nenhuma mensagem — apenas presença de elementos de interface da própria
 * página oficial.
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

function startWhatsApp(): void {
  report(detectWhatsAppLoggedIn());
  const observer = new MutationObserver(() => reportWhatsAppDebounced());
  observer.observe(document.body, { childList: true, subtree: true });
  // Rede de segurança independente do debounce, caso o observer perca algum estado.
  setInterval(() => report(detectWhatsAppLoggedIn()), 5000);
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
