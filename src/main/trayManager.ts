/**
 * Bandeja do Windows: ícone, menu de contexto e o atalho de clique para
 * mostrar/esconder a janela principal.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app, Menu, Tray, nativeImage } from 'electron';

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly appName: string,
    private readonly creatorName: string,
    private readonly iconPath: string,
    private readonly onToggleWindow: () => void,
    private readonly onShowWindow: () => void,
    private readonly onQuit: () => void
  ) {}

  create(): void {
    const trayIcon = nativeImage.createFromPath(this.iconPath).resize({ width: 16, height: 16 });
    this.tray = new Tray(trayIcon);
    this.tray.setToolTip(`${this.appName} · ${this.creatorName}`);
    this.tray.on('click', () => this.onToggleWindow());
    this.updateMenu();
  }

  updateMenu(): void {
    if (!this.tray) return;
    const openAtLogin = app.getLoginItemSettings().openAtLogin;
    const contextMenu = Menu.buildFromTemplate([
      { label: `${this.appName} · ${this.creatorName}`, enabled: false },
      { type: 'separator' },
      { label: `Mostrar ${this.appName}`, click: () => this.onShowWindow() },
      { type: 'separator' },
      {
        label: 'Iniciar com o Windows',
        type: 'checkbox',
        checked: openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        },
      },
      { type: 'separator' },
      {
        label: `Sair do ${this.appName}`,
        click: () => this.onQuit(),
      },
    ]);
    this.tray.setContextMenu(contextMenu);
  }
}
