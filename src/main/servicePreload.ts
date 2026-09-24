/**
 * Fase 91 — preload das instâncias que NÃO são WhatsApp.
 *
 * Essas views usam `nodeIntegrationInSubFrames: true` (ver viewManager.ts),
 * então este arquivo roda na página principal E nos quadros internos:
 *  - as proteções de googleLoginPreload.ts valem em todos eles;
 *  - o webviewPreload (status da conta, atalhos) só na página principal,
 *    exatamente como antes.
 *
 * Por que os quadros internos: sites do Google carregam um quadro invisível
 * de accounts.google.com. No Electron 44, quando a página vai para o login,
 * ela reaproveita o processo desse quadro, e sem esta opção o preload não
 * rodava na página de login (a janela "Segurança do Windows" aparecia e o
 * login podia ser recusado). Reproduzido com páginas locais em 2026-09-24.
 *
 * O WhatsApp continua usando só o webviewPreload.js, sem nenhuma mudança (a
 * leitura das conversas e a contagem do Analytics não passam por aqui).
 *
 * Orbi — Criado por Vinicius Braga
 */
import './googleLoginPreload';

if (process.isMainFrame) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./webviewPreload');
}
