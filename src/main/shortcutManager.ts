/**
 * Atalhos de teclado globais de navegação entre contas (Ctrl+1..9,
 * Ctrl+Tab / Ctrl+Shift+Tab) e recarregar a instância ativa (F5 / Ctrl+R).
 * Precisa ser registrado tanto na WebContents da janela principal quanto na
 * de cada view — ver ViewManager.setShortcutHandler.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { AccountStore } from './accountStore';

export class ShortcutManager {
  constructor(
    private readonly accountStore: AccountStore,
    private readonly getActiveAccountId: () => string | null,
    private readonly switchTo: (accountId: string) => void,
    private readonly openCommandPalette?: () => void,
    /** Fase 31: recarrega a instância visível no momento (F5 / Ctrl+R). */
    private readonly reloadActive?: (accountId: string) => void,
    /** Fase 96: abre/fecha as ferramentas de desenvolvedor da instância visível (F12). */
    private readonly toggleDevTools?: (accountId: string) => void,
    /** Fase 96: F11, Orbi em tela cheia. */
    private readonly toggleFullScreen?: () => void,
    /** Fase 96: Alt+← / Alt+→, página anterior/seguinte da instância visível. */
    private readonly goBack?: (accountId: string) => void,
    private readonly goForward?: (accountId: string) => void
  ) {}

  handleNavigationShortcut(input: Electron.Input): void {
    if (input.type !== 'keyDown') return;

    // F5 (sem modificador) e Ctrl+R: recarregam a instância em exibição —
    // mesmo gesto que o usuário já espera de qualquer navegador. Fica antes
    // da checagem de Ctrl porque F5 não usa modificador nenhum.
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      const activeId = this.getActiveAccountId();
      if (activeId) this.reloadActive?.(activeId);
      return;
    }

    // Fase 96: F11 (tela cheia) e Alt+setas (voltar/avançar), como no navegador.
    if (input.key === 'F11') {
      this.toggleFullScreen?.();
      return;
    }
    if (input.alt && !input.control && (input.key === 'ArrowLeft' || input.key === 'ArrowRight')) {
      const activeId = this.getActiveAccountId();
      if (activeId) (input.key === 'ArrowLeft' ? this.goBack : this.goForward)?.(activeId);
      return;
    }

    // Fase 96: F12, como em qualquer navegador.
    if (input.key === 'F12') {
      const activeId = this.getActiveAccountId();
      if (activeId) this.toggleDevTools?.(activeId);
      return;
    }

    if (!input.control) return;

    if (/^[1-9]$/.test(input.key)) {
      const index = parseInt(input.key, 10) - 1;
      const list = this.accountStore.list();
      if (list[index]) this.switchTo(list[index].id);
      return;
    }

    if (input.key === 'Tab') {
      this.cycleAccount(input.shift ? -1 : 1);
      return;
    }

    if (input.key.toLowerCase() === 'k') {
      this.openCommandPalette?.();
    }
  }

  cycleAccount(direction: 1 | -1): void {
    const list = this.accountStore.list();
    if (list.length === 0) return;
    const currentIndex = Math.max(
      0,
      list.findIndex((a) => a.id === this.getActiveAccountId())
    );
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    this.switchTo(list[nextIndex].id);
  }
}
