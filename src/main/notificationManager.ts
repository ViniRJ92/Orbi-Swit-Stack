/**
 * Notificações nativas de novas mensagens. Só compara o contador de não
 * lidas já calculado por accountManager/viewManager — nenhum conteúdo de
 * mensagem é lido ou armazenado aqui.
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
    private readonly isEnabled: () => boolean
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

      // Fase 39 — se a janela do app está visível, quem avisa é o toast
      // desenhado pelo próprio app (MessageToast.tsx), que segue a identidade
      // visual da interface. A notificação nativa do Windows fica só para
      // quando a janela está escondida ou minimizada na bandeja — aí um aviso
      // dentro da janela não seria visto por ninguém.
      const windowVisible = !!win && win.isVisible() && !win.isMinimized();
      if (windowVisible) {
        win.webContents.send('mw:new-messages', {
          accountId: status.id,
          accountName: acc.name,
          count: status.unreadCount - previous,
        });
        continue;
      }

      if (Notification.isSupported()) {
        const notification = new Notification({
          title: `${this.appName} · ${acc.name}`,
          body: status.unreadCount === 1 ? 'Nova mensagem' : `${status.unreadCount} mensagens não lidas`,
          icon: nativeImage.createFromPath(this.iconPath),
          silent: false,
        });
        notification.on('click', () => this.onNotificationClicked(status.id));
        notification.show();
      }
    }
  }
}
