/**
 * Ciclo de vida da janela principal: criação, cálculo da área reservada para
 * a WebContentsView do WhatsApp Web, redimensionamento, e o comportamento de
 * "fechar minimiza para a bandeja" (a saída de verdade só acontece pelo menu
 * da bandeja — ver trayManager.ts).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { BrowserWindow, Menu, dialog } from 'electron';
import * as path from 'path';
import { CloseBehavior, IconSize, SIDEBAR_WIDTH_DEFAULT, SidebarPosition } from './settingsStore';
import { buildUnreadBadge } from './unreadBadge';

// Precisa bater EXATAMENTE com a altura real do <header> em Header.tsx
// (h-8 min-h-[32px], reduzida na Fase 18) — esta constante é a única fonte
// de verdade que o processo principal tem sobre onde a barra termina; se
// ficar desatualizada, sobra (ou falta) uma faixa preta entre a barra e a
// WebContentsView, que é exatamente o bug relatado pelo usuário (Fase 20).
const HEADER_HEIGHT = 32;

// Fase 21/22: altura real da sidebar quando `sidebarPosition === 'top'',
// PARAMETRIZADA por `iconSize` (Fase 22 — ver Sidebar.tsx). Precisa bater
// EXATAMENTE, para cada tamanho, com a altura real renderizada do <aside>
// horizontal em Sidebar.tsx (constante irmã `TOP_BAR_HEIGHT_BY_ICON_SIZE`
// lá) — mesmo cuidado do HEADER_HEIGHT acima: se um número aqui não bater
// com o CSS real daquele tamanho, sobra (ou falta) espaço entre a barra
// horizontal e a WebContentsView.
// Fase 25: +6px em cada tamanho — folga extra (`TILE_BADGE_HEADROOM` em
// AccountItem.tsx) para o selo de não lidas nunca ser cortado pela borda
// superior da barra (bug relatado pelo usuário).
const SIDEBAR_TOP_HEIGHT_BY_ICON_SIZE: Record<IconSize, number> = {
  small: 60,
  medium: 72,
  large: 88,
};

function getContentBounds(
  win: BrowserWindow,
  sidebarWidth: number,
  sidebarPosition: SidebarPosition,
  iconSize: IconSize
): Electron.Rectangle {
  const [width, height] = win.getContentSize();
  if (sidebarPosition === 'top') {
    // Header (topo, largura total) → sidebar horizontal (largura total,
    // logo abaixo) → conteúdo ocupando o resto — ver App.tsx/Sidebar.tsx.
    const y = HEADER_HEIGHT + SIDEBAR_TOP_HEIGHT_BY_ICON_SIZE[iconSize];
    return { x: 0, y, width, height: Math.max(0, height - y) };
  }
  // "left" (padrão): sidebar com altura total ao lado do header — o header,
  // nesse modo, só ocupa a coluna à direita da sidebar (ver App.tsx), então
  // a WebContentsView começa em x = largura da sidebar, y = altura do header.
  return {
    x: sidebarWidth,
    y: HEADER_HEIGHT,
    width: Math.max(0, width - sidebarWidth),
    height: Math.max(0, height - HEADER_HEIGHT),
  };
}

export class WindowManager {
  private window: BrowserWindow | null = null;
  private isQuitting = false;
  private sidebarWidth: number = SIDEBAR_WIDTH_DEFAULT;
  private sidebarPosition: SidebarPosition = 'left';
  private iconSize: IconSize = 'medium';

  constructor(
    private readonly appName: string,
    private readonly creatorName: string,
    private readonly iconPath: string,
    private readonly onContentBoundsChanged: (bounds: Electron.Rectangle) => void,
    private readonly onInputEvent: (input: Electron.Input) => void,
    private readonly onReady: () => void,
    private readonly getCloseBehavior: () => CloseBehavior,
    private readonly onRequestQuit: () => void,
    initialSidebarWidth?: number,
    initialSidebarPosition?: SidebarPosition,
    initialIconSize?: IconSize
  ) {
    if (initialSidebarWidth) this.sidebarWidth = initialSidebarWidth;
    if (initialSidebarPosition) this.sidebarPosition = initialSidebarPosition;
    if (initialIconSize) this.iconSize = initialIconSize;
  }

  markQuitting(): void {
    this.isQuitting = true;
  }

  get(): BrowserWindow | null {
    return this.window;
  }

  create(): BrowserWindow {
    const win = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 960,
      minHeight: 600,
      title: `${this.appName} · ${this.creatorName}`,
      icon: this.iconPath,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    this.window = win;

    Menu.setApplicationMenu(null);

    win.webContents.on('before-input-event', (_event, input) => this.onInputEvent(input));

    win.on('resize', () => this.onContentBoundsChanged(getContentBounds(win, this.sidebarWidth, this.sidebarPosition, this.iconSize)));

    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    win.webContents.on('did-finish-load', () => {
      this.onContentBoundsChanged(getContentBounds(win, this.sidebarWidth, this.sidebarPosition, this.iconSize));
      this.onReady();
    });

    // Fechar a janela (botão X): por padrão minimiza para a bandeja, mas o
    // usuário pode preferir que sempre pergunte ou que já encerre o app de
    // verdade (Configurações → Comportamento). "isQuitting" continua sendo o
    // jeito de fechar de fato (via menu Sair da bandeja ou "quit" abaixo).
    win.on('close', (event) => {
      if (this.isQuitting) return;
      const behavior = this.getCloseBehavior();

      if (behavior === 'tray') {
        event.preventDefault();
        win.hide();
        return;
      }

      if (behavior === 'quit') {
        event.preventDefault();
        this.onRequestQuit();
        return;
      }

      // 'ask': impede o fechamento imediato e pergunta antes de decidir.
      event.preventDefault();
      dialog
        .showMessageBox(win, {
          type: 'question',
          buttons: ['Minimizar para a bandeja', 'Sair do programa', 'Cancelar'],
          defaultId: 0,
          cancelId: 2,
          title: this.appName,
          message: 'O que você quer fazer?',
          detail: 'Minimizar mantém as contas ativas em segundo plano. Sair encerra o programa completamente.',
        })
        .then(({ response }) => {
          if (response === 0) {
            win.hide();
          } else if (response === 1) {
            this.onRequestQuit();
          }
        });
    });

    win.on('closed', () => {
      this.window = null;
    });

    return win;
  }

  show(): void {
    const win = this.window;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();
  }

  toggle(): void {
    const win = this.window;
    if (!win) return;
    if (win.isVisible() && win.isFocused()) {
      win.hide();
    } else {
      this.show();
    }
  }

  /** Aplica uma nova largura de sidebar e recalcula os bounds da view ativa imediatamente (sem precisar redimensionar a janela). */
  setSidebarWidth(width: number): void {
    this.sidebarWidth = width;
    const win = this.window;
    if (!win) return;
    this.onContentBoundsChanged(getContentBounds(win, this.sidebarWidth, this.sidebarPosition, this.iconSize));
  }

  /** Aplica uma nova posição de sidebar (Fase 21) e recalcula os bounds imediatamente. */
  setSidebarPosition(position: SidebarPosition): void {
    this.sidebarPosition = position;
    const win = this.window;
    if (!win) return;
    this.onContentBoundsChanged(getContentBounds(win, this.sidebarWidth, this.sidebarPosition, this.iconSize));
  }

  /**
   * Aplica um novo tamanho de ícone/card (Fase 22) e recalcula os bounds
   * imediatamente — só afeta a altura reservada quando `sidebarPosition ===
   * 'top'` (no modo "left" a largura da sidebar continua sendo a mesma,
   * independente do tamanho do ícone), mas recalculamos sempre por
   * simplicidade/consistência.
   */
  setIconSize(size: IconSize): void {
    this.iconSize = size;
    const win = this.window;
    if (!win) return;
    this.onContentBoundsChanged(getContentBounds(win, this.sidebarWidth, this.sidebarPosition, this.iconSize));
  }

  /** Selo com o total de não lidas no ícone da barra de tarefas (só Windows). */
  updateUnreadBadge(count: number): void {
    const win = this.window;
    if (!win || process.platform !== 'win32') return;
    const icon = buildUnreadBadge(count);
    if (icon) {
      win.setOverlayIcon(icon, `${count} mensagem(ns) não lida(s)`);
    } else {
      win.setOverlayIcon(null, '');
    }
  }
}
