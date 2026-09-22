/**
 * Fase 89 — login com conta Google nas instâncias que NÃO são WhatsApp.
 *
 * Complementa a Fase 87 (viewManager.ts): lá a página de login se apresenta
 * como Firefox pelo user agent, mas o navegador continuava mostrando três
 * sinais de Chrome que um Firefox de verdade não tem — `navigator.userAgentData`,
 * `navigator.vendor = "Google Inc."` e `window.chrome`. O Google via a
 * contradição e recusava o login ("Esse navegador ou app pode não ser
 * seguro"). Aqui esses sinais são escondidos, SÓ em accounts.google.com.
 * Testado pelo usuário em 2026-09-22: Gmail entrou.
 *
 * IMPORTANTE: este arquivo NÃO pode importar nada além de 'electron'. Em
 * algumas navegações o Electron roda o preload em modo restrito, sem acesso
 * aos outros arquivos do projeto ("module not found").
 *
 * Registrado com `session.setPreloads` apenas nas sessões que não são
 * WhatsApp; roda antes dos scripts da página. Não tem relação nenhuma com a
 * leitura de conversas do webviewPreload.ts.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { webFrame } from 'electron';

// Mesmo texto de FIREFOX_USER_AGENT (viewManager.ts). Também é aplicado aqui
// porque, no popup "Continuar com Google", a página abre antes de o Orbi
// conseguir trocar o user agent — e trocar no meio da navegação fecha o
// Electron (bug da v0.49.8).
const FIREFOX_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

if (location.hostname === 'accounts.google.com') {
  webFrame.executeJavaScript(`(() => {
    try { Object.defineProperty(Navigator.prototype, 'userAgent', { get: () => ${JSON.stringify(FIREFOX_USER_AGENT)}, configurable: true }); } catch (e) {}
    try { Object.defineProperty(Navigator.prototype, 'appVersion', { get: () => '5.0 (Windows)', configurable: true }); } catch (e) {}
    try { delete Navigator.prototype.userAgentData; } catch (e) {}
    try { Object.defineProperty(Navigator.prototype, 'vendor', { get: () => '', configurable: true }); } catch (e) {}
    try { delete window.chrome; } catch (e) {}
  })()`);
}
