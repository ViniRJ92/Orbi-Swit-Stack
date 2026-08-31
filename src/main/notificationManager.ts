/**
 * Aviso de mensagem nova. Só compara o contador de não lidas já calculado por
 * accountManager/viewManager. Nenhum conteúdo de mensagem é lido ou
 * armazenado aqui.
 *
 * Fase 46: a caixa nativa do Windows foi substituída pelo toast do próprio
 * app (ver MessageToast.tsx). A detecção continua exatamente a mesma; mudou
 * só por onde o aviso aparece.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { BrowserWindow, Notification, nativeImage } from 'electron';
import { AccountStatus } from './types';
import { AccountStore } from './accountStore';

export class NotificationManager {
  // Último contador de não lidas observado por conta, só para saber quando
  // uma notificação deve ser disparada (uma nova mensagem chegou desde a
  // última observação) — não guarda nenhum conteúdo de mensagem.
  private readonly lastSeenUnread: Map<string, number> = new Map();

  constructor(
    private readonly appName: string,
    private readonly iconPath: string,
    private readonly accountStore: AccountStore,
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly onNotificationClicked: (accountId: string) => void,
    private readonly isEnabled: () => boolean,
    /** Fase 48 — chave da caixa nativa do Windows (janela minimizada/segundo plano). */
    private readonly isWindowsNotificationEnabled: () => boolean,
    /** Fase 48 — chave do aviso interno flutuante (janela em primeiro plano). */
    private readonly isToastEnabled: () => boolean
  ) {}

  forget(accountId: string): void {
    this.lastSeenUnread.delete(accountId);
  }

  notifyIfNewMessages(statuses: AccountStatus[]): void {
    for (const status of statuses) {
      const previous = this.lastSeenUnread.get(status.id);
      this.lastSeenUnread.set(status.id, status.unreadCount);

      // Primeira observação desta conta nesta execução: apenas estabelece a
      // base de comparação, para não notificar retroativamente ao abrir o app.
      if (previous === undefined) continue;
      if (status.unreadCount <= previous) continue;
      // Notificações desativadas globalmente pelo usuário (Configurações) —
      // ainda assim continuamos rastreando lastSeenUnread acima, pra não
      // gerar uma rajada de notificações atrasadas se ele reativar depois.
      if (!this.isEnabled()) continue;

      // Evita notificar a conta que já está visível e com a janela em foco.
      const win = this.getMainWindow();
      const windowFocused = !!win && win.isFocused() && win.isVisible();
      if (status.isActive && windowFocused) continue;

      const acc = this.accountStore.get(status.id);
      if (!acc) continue;

      // Fase 48 — a partir daqui é só ESCOLHA DE ONDE MOSTRAR. Toda a
      // detecção (comparação de contador, primeira observação, chave geral de
      // notificações, conta ativa em foco) já aconteceu acima e não mudou.
      //
      // A janela em primeiro plano recebe o aviso interno; minimizada ou em
      // segundo plano recebe a caixa do Windows, que é a única visível nessa
      // situação. Cada uma respeita sua própria chave em Configurações.
      const janelaEmPrimeiroPlano = !!win && win.isVisible() && !win.isMinimized();
      const contagem = status.unreadCount - previous;

      if (janelaEmPrimeiroPlano) {
        if (!this.isToastEnabled()) continue;
        win.webContents.send('mw:new-messages', {
          accountId: status.id,
          accountName: acc.name,
          count: contagem,
        });
        continue;
      }

      if (!this.isWindowsNotificationEnabled()) continue;
      if (!Notification.isSupported()) continue;
      const notification = new Notification({
        title: `${this.appName} · ${acc.name}`,
        body: contagem === 1 ? 'Nova mensagem' : `${contagem} mensagens novas`,
        icon: nativeImage.createFromPath(this.iconPath),
        silent: false,
      });
      notification.on('click', () => this.onNotificationClicked(status.id));
      notification.show();
    }
  }
}
