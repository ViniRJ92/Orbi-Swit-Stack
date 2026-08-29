/**
 * Atalhos de teclado globais de navegação entre contas (Ctrl+1..9,
 * Ctrl+Tab / Ctrl+Shift+Tab). Precisa ser registrado tanto na WebContents da
 * janela principal quanto na de cada view — ver ViewManager.setShortcutHandler.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { AccountStore } from './accountStore';

export class ShortcutManager {
  constructor(
    private readonly accountStore: AccountStore,
    private readonly getActiveAccountId: () => string | null,
    private readonly switchTo: (accountId: string) => void,
    private readonly openCommandPalette?: () => void
  ) {}

  handleNavigationShortcut(input: Electron.Input): void {
    if (input.type !== 'keyDown' || !input.control) return;

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
