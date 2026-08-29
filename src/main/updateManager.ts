/**
 * Verificação e aplicação de atualizações do próprio app, usando o
 * `electron-updater` apontado para as GitHub Releases do repositório
 * (ver package.json -> build.publish). Nada disso baixa ou instala nada
 * sozinho: a verificação roda automaticamente ao abrir o app (só para
 * SABER se existe uma versão nova — não baixa nada nessa hora), e tanto o
 * download quanto a instalação só acontecem quando o usuário clica no
 * indicador em Configurações → Atualizações.
 *
 * Cada nova versão publicada precisa ser enviada como uma GitHub Release de
 * verdade (o instalador .exe + o `latest.yml` gerado pelo electron-builder
 * na pasta `release/`), não basta dar `git push` do código-fonte — só
 * instalações que já tiverem esta função (a partir desta versão) passam a
 * enxergar atualizações futuras automaticamente.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { logger } from './logger';

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'not-available' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string };

/**
 * Um repositório do GitHub sem NENHUMA Release publicada ainda faz o feed
 * que o electron-updater lê (`/releases.atom`) responder 404 — não é uma
 * falha de verdade, é só "não existe nada pra atualizar ainda" (o mesmo
 * resultado de "não há versão nova"). Reconhecido pela mensagem de erro
 * específica do provider do GitHub para não confundir com um 404 genuíno de
 * rede/configuração.
 */
function isNoReleasesYet(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('404') && message.includes('releases.atom');
}

/**
 * Reduz qualquer erro do electron-updater a uma frase curta e em português
 * pro usuário — nunca o corpo técnico (headers HTTP, cookies, JSON bruto)
 * que a própria lib inclui na mensagem. O texto completo sempre vai pro log
 * de diagnóstico (ver logger.ts), então nada de detalhe é perdido — só não
 * aparece cru na tela.
 */
function friendlyErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('ENOTFOUND') || message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED')) {
    return 'Não foi possível conectar à internet para verificar atualizações.';
  }
  if (message.includes('404')) {
    return 'Não foi possível encontrar uma atualização publicada no momento.';
  }
  return 'Não foi possível verificar/baixar a atualização agora. Tente novamente mais tarde.';
}

export class UpdateManager {
  private state: UpdateState = { phase: 'idle' };

  constructor(private readonly onStateChange: (state: UpdateState) => void) {
    // Nunca baixa nem instala por conta própria — cada uma dessas duas ações
    // só acontece quando o usuário clica explicitamente (ver download()/
    // install() abaixo, chamados pela UI via IPC).
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => this.setState({ phase: 'checking' }));
    autoUpdater.on('update-available', (info: UpdateInfo) =>
      this.setState({ phase: 'available', version: info.version })
    );
    autoUpdater.on('update-not-available', () => this.setState({ phase: 'not-available' }));
    autoUpdater.on('download-progress', (progress: ProgressInfo) =>
      this.setState({ phase: 'downloading', percent: Math.round(progress.percent) })
    );
    autoUpdater.on('update-downloaded', (info: UpdateInfo) =>
      this.setState({ phase: 'downloaded', version: info.version })
    );
    autoUpdater.on('error', (err) => {
      // Sempre logado por completo (com todo o detalhe técnico) para
      // diagnóstico — só a tela é que fica com a versão curta/amigável.
      logger.error(`Atualização: ${String(err)}`);
      if (isNoReleasesYet(err)) {
        this.setState({ phase: 'not-available' });
        return;
      }
      this.setState({ phase: 'error', message: friendlyErrorMessage(err) });
    });
  }

  private setState(state: UpdateState): void {
    this.state = state;
    this.onStateChange(state);
  }

  getState(): UpdateState {
    return this.state;
  }

  /**
   * Verificação silenciosa contra as GitHub Releases — só descobre se há
   * versão nova e atualiza o estado (que acende o indicador na UI); nunca
   * baixa nada sozinha. Chamada automaticamente ao abrir o app e também
   * manualmente pelo botão "Verificar agora" em Configurações.
   */
  async check(): Promise<void> {
    // Fora de um instalador gerado pelo electron-builder (ex.: rodando via
    // `electron .` em desenvolvimento) não há o que verificar, e o
    // electron-updater lançaria um erro ruidoso sem sentido nesse cenário.
    if (!app.isPackaged) {
      this.setState({ phase: 'not-available' });
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      logger.error(`Falha ao verificar atualização: ${String(err)}`);
      if (isNoReleasesYet(err)) {
        this.setState({ phase: 'not-available' });
        return;
      }
      this.setState({ phase: 'error', message: friendlyErrorMessage(err) });
    }
  }

  /** Início do download da versão já detectada — só roda quando o usuário clica. */
  async download(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      logger.error(`Falha ao baixar atualização: ${String(err)}`);
      this.setState({ phase: 'error', message: friendlyErrorMessage(err) });
    }
  }

  /** Fecha o app e roda o instalador já baixado — só chamado quando o usuário clica em "Reiniciar e instalar". */
  install(): void {
    autoUpdater.quitAndInstall(false, true);
  }
}
