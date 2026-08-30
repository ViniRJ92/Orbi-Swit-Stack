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
import { BrowserWindow } from 'electron';
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

      // Fase 46 — o aviso passa a ser SEMPRE o toast desenhado pelo próprio
      // app (MessageToast.tsx). A caixa nativa do Windows saiu de vez: o
      // sistema operacional é quem a desenha, então tamanho, cantos, fonte e
      // espaçamento não eram ajustáveis daqui.
      //
      // Nada da detecção mudou: quem decide que existe mensagem nova continua
      // sendo a comparação de contador logo acima, com as mesmas condições de
      // sempre. Só o meio de exibir é que é outro.
      //
      // Consequência assumida: com a janela minimizada na bandeja não aparece
      // aviso visual, porque um toast dentro de uma janela escondida não seria
      // visto. O contador de não lidas na barra lateral continua marcando
      // normalmente quando a janela volta.
      win?.webContents.send('mw:new-messages', {
        accountId: status.id,
        accountName: acc.name,
        count: status.unreadCount - previous,
      });
    }
  }
}
