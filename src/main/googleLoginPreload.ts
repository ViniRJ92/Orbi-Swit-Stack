/**
 * Fase 89/91 — proteções das instâncias que NÃO são WhatsApp.
 *
 * 1. Chave de acesso (passkey) desligada em TODOS os sites. No Electron 44 o
 *    Chromium passou a entregar a "chave de acesso" do Windows aos sites, e a
 *    janela "Segurança do Windows" abria sozinha no login do Google. O
 *    usuário pediu que ela não apareça em momento algum. No Electron 31 esse
 *    recurso já não aparecia, então nada muda para quem usa o Orbi.
 * 2. Login do Google: em accounts.google.com a página se apresenta como
 *    Firefox e esconde os sinais de Chrome (`userAgentData`, `vendor`,
 *    `window.chrome`), senão o Google recusa o login ("Esse navegador ou app
 *    pode não ser seguro").
 *
 * Aplicação: `contextBridge.executeInMainWorld` roda na hora, antes dos
 * scripts da página. O `webFrame.executeJavaScript` (usado antes) é
 * assíncrono e em algumas páginas não chegava a valer, por isso a janela
 * continuava aparecendo. Ele fica só como reserva.
 *
 * Carregado de dois jeitos: como preload das views que não são WhatsApp
 * (servicePreload.ts, página principal) e como preload da sessão (quadros
 * internos e popups). Rodar duas vezes não tem efeito extra.
 *
 * IMPORTANTE: este arquivo NÃO pode importar nada além de 'electron'. Em
 * algumas navegações o Electron roda o preload em modo restrito, sem acesso
 * aos outros arquivos do projeto ("module not found").
 *
 * Orbi — Criado por Vinicius Braga
 */
import { contextBridge, webFrame } from 'electron';

// Mesmo texto de FIREFOX_USER_AGENT (viewManager.ts).
const FIREFOX_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101 Firefox/156.0';

/** Roda dentro da página (mundo principal). Precisa ser autossuficiente. */
function protecao(noLoginDoGoogle: boolean, firefoxUserAgent: string): void {
  const w = window as unknown as Record<string, unknown>;
  if (w.__orbiProtegido) return;
  w.__orbiProtegido = true;

  try {
    delete w.PublicKeyCredential;
  } catch (e) {
    /* ignora */
  }
  try {
    const credenciais = navigator.credentials;
    const semChave =
      (original: (...a: unknown[]) => Promise<unknown>) =>
      function (this: unknown, opcoes?: { publicKey?: unknown }, ...resto: unknown[]) {
        if (opcoes && opcoes.publicKey) return Promise.reject(new DOMException('Indisponível', 'NotAllowedError'));
        return original.call(credenciais, opcoes, ...resto);
      };
    credenciais.get = semChave(credenciais.get as never) as never;
    credenciais.create = semChave(credenciais.create as never) as never;
  } catch (e) {
    /* ignora */
  }

  if (!noLoginDoGoogle) return;
  const definir = (nome: string, valor: string) => {
    try {
      Object.defineProperty(Navigator.prototype, nome, { get: () => valor, configurable: true });
    } catch (e) {
      /* ignora */
    }
  };
  definir('userAgent', firefoxUserAgent);
  definir('appVersion', '5.0 (Windows)');
  definir('vendor', '');
  try {
    delete (Navigator.prototype as unknown as Record<string, unknown>).userAgentData;
  } catch (e) {
    /* ignora */
  }
  try {
    delete w.chrome;
  } catch (e) {
    /* ignora */
  }
}

if (typeof location !== 'undefined') {
  // Fase 91: todas as telas do Google (mesma lista de viewManager.ts), não só
  // accounts.google.com — o site e o login precisam se apresentar igual.
  const dominios = ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'ytimg.com', 'googlevideo.com', 'gstatic.com', 'googleapis.com', 'googleusercontent.com', 'ggpht.com', 'gmail.com', 'withgoogle.com'];
  const host = location.hostname.toLowerCase();
  const noLogin = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) || dominios.some((d) => host === d || host.endsWith(`.${d}`));
  let aplicado = false;
  try {
    const executar = (contextBridge as unknown as { executeInMainWorld?: (s: { func: (...a: never[]) => void; args?: unknown[] }) => unknown }).executeInMainWorld;
    if (executar) {
      executar.call(contextBridge, { func: protecao as never, args: [noLogin, FIREFOX_USER_AGENT] });
      aplicado = true;
    }
  } catch (e) {
    aplicado = false;
  }
  if (!aplicado) {
    webFrame.executeJavaScript(`(${protecao.toString()})(${JSON.stringify(noLogin)}, ${JSON.stringify(FIREFOX_USER_AGENT)})`);
  }
}
