/**
 * Persistência das preferências gerais do app (tema visual, modo de
 * desempenho, notificações). Mesmo padrão do AccountStore: JSON simples em
 * userData, sem dados sensíveis.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export type ThemePreference = 'dark' | 'light' | 'system';

/** Fase 21: posição da sidebar de contas — "left" (padrão, altura total, ao lado do header) ou "top" (barra horizontal). */
export type SidebarPosition = 'left' | 'top';

/** Fase 22: tamanho dos ícones/cards de conta na sidebar — afeta ambos os modos (Esquerda/Topo). */
export type IconSize = 'small' | 'medium' | 'large';

/**
 * Controla quantas contas ficam com a WebContents carregada ao mesmo tempo e
 * depois de quanto tempo ociosas uma conta em segundo plano é suspensa
 * automaticamente (ver accountManager.ts). "Economia" prioriza RAM/CPU
 * baixos; "Desempenho" prioriza trocar de conta sem esperar recarregar.
 */
export type PerformanceMode = 'economy' | 'balanced' | 'performance' | 'custom';

// Fase 16: valores atualizados a pedido do usuário (Economia 1 / Equilibrado
// 6 / Desempenho 10, eram 1/2/4) + novo perfil "Personalizado", que não tem
// um preset fixo aqui — usa `customMaxLoadedAccounts` (ver SettingsShape
// abaixo), configurável de 1 a `MAX_ACCOUNTS` (30, main/accountManager.ts).
export const PERFORMANCE_PRESETS: Record<Exclude<PerformanceMode, 'custom'>, { maxLoadedAccounts: number; idleSuspendMinutes: number }> = {
  economy: { maxLoadedAccounts: 1, idleSuspendMinutes: 5 },
  balanced: { maxLoadedAccounts: 6, idleSuspendMinutes: 15 },
  performance: { maxLoadedAccounts: 10, idleSuspendMinutes: 30 },
};

// Perfil "Personalizado": sem suspensão automática por ociosidade — só o
// limite de contas simultâneas (campo livre) se aplica. Motivo: suspender
// por ociosidade destrói e recria a WebContents da conta (ver
// accountManager.ts/viewManager.ts), forçando o WhatsApp Web a reconectar do
// zero; para quem já escolheu um limite alto de propósito (ex.: 20 contas
// para só 13 reais), essa reconexão forçada gera instabilidade real de
// sessão sem nenhum ganho de RAM/CPU, já que a conta nunca chega perto do
// limite configurado.
const CUSTOM_IDLE_SUSPEND_MINUTES = Infinity;
export const CUSTOM_MAX_LOADED_MIN = 1;
export const CUSTOM_MAX_LOADED_MAX = 30;
const CUSTOM_MAX_LOADED_DEFAULT = 6;

function clampCustomMaxLoaded(value: number): number {
  return Math.min(CUSTOM_MAX_LOADED_MAX, Math.max(CUSTOM_MAX_LOADED_MIN, Math.round(value) || CUSTOM_MAX_LOADED_DEFAULT));
}

/** Resolve o preset efetivo (contas simultâneas + tempo de ociosidade) para qualquer modo, incluindo "custom". */
export function resolvePerformancePreset(
  mode: PerformanceMode,
  customMaxLoadedAccounts: number
): { maxLoadedAccounts: number; idleSuspendMinutes: number } {
  if (mode === 'custom') {
    return { maxLoadedAccounts: clampCustomMaxLoaded(customMaxLoadedAccounts), idleSuspendMinutes: CUSTOM_IDLE_SUSPEND_MINUTES };
  }
  return PERFORMANCE_PRESETS[mode];
}

/**
 * O que acontece ao clicar no X da janela: "tray" minimiza (padrão, contas
 * continuam ativas em segundo plano), "ask" pergunta toda vez, "quit" encerra
 * o app de verdade (equivalente a usar o menu Sair da bandeja).
 */
export type CloseBehavior = 'tray' | 'ask' | 'quit';

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 450;
export const SIDEBAR_WIDTH_DEFAULT = 268;

interface SettingsShape {
  theme: ThemePreference;
  performanceMode: PerformanceMode;
  /** Quantidade de instâncias simultâneas do perfil "Personalizado" (1-30). Só usado quando performanceMode === 'custom'. */
  customMaxLoadedAccounts: number;
  notificationsEnabled: boolean;
  /**
   * Fase 48 — por onde o aviso de mensagem nova aparece. As duas chaves são
   * independentes e cada uma cobre uma situação diferente:
   *
   *  - `windowsNotificationsEnabled`: caixa nativa do Windows, usada quando a
   *    janela está minimizada ou em segundo plano. É o único aviso que o
   *    usuário enxerga com o app na bandeja.
   *  - `toastNotificationsEnabled`: aviso flutuante desenhado pelo próprio
   *    app (MessageToast.tsx), usado com a janela em primeiro plano.
   *
   * Desligar as duas silencia os avisos por completo, sem afetar em nada a
   * detecção de mensagem nova nem o contador de não lidas.
   *
   * `notificationsEnabled` acima continua sendo a chave geral: com ela
   * desligada, nenhuma das duas dispara.
   */
  windowsNotificationsEnabled: boolean;
  toastNotificationsEnabled: boolean;
  closeBehavior: CloseBehavior;
  confirmBeforeRemove: boolean;
  sidebarWidth: number;
  sidebarPosition: SidebarPosition;
  iconSize: IconSize;
  /**
   * Última versão do app (`app.getVersion()`) que o usuário já viu o modal
   * "O que há de novo" — usada para decidir se essa tela aparece de novo
   * (ver main/releaseNotes.ts). String vazia = nunca viu nenhuma (inclui
   * instalações anteriores a este recurso).
   */
  lastSeenVersion: string;
}

const STORE_FILE = 'settings.json';
const DEFAULTS: SettingsShape = {
  theme: 'dark',
  performanceMode: 'balanced',
  customMaxLoadedAccounts: CUSTOM_MAX_LOADED_DEFAULT,
  notificationsEnabled: true,
  // Fase 48: as duas ligadas por padrão — o comportamento que o usuário já
  // esperava (aviso na janela quando está usando, caixa do Windows quando não).
  windowsNotificationsEnabled: true,
  toastNotificationsEnabled: true,
  closeBehavior: 'tray',
  confirmBeforeRemove: true,
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  sidebarPosition: 'left',
  iconSize: 'medium',
  lastSeenVersion: '',
};

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)));
}

export class SettingsStore {
  private filePath: string;
  private data: SettingsShape;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.data = this.load();
  }

  private load(): SettingsShape {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        return { ...DEFAULTS, ...raw };
      }
    } catch (err) {
      console.error('[SettingsStore] Falha ao ler settings.json, usando padrão:', err);
    }
    return { ...DEFAULTS };
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[SettingsStore] Falha ao salvar settings.json:', err);
    }
  }

  getTheme(): ThemePreference {
    return this.data.theme;
  }

  setTheme(theme: ThemePreference): void {
    this.data.theme = theme;
    this.persist();
  }

  getPerformanceMode(): PerformanceMode {
    return this.data.performanceMode;
  }

  setPerformanceMode(mode: PerformanceMode): void {
    this.data.performanceMode = mode;
    this.persist();
  }

  getCustomMaxLoadedAccounts(): number {
    return clampCustomMaxLoaded(this.data.customMaxLoadedAccounts ?? CUSTOM_MAX_LOADED_DEFAULT);
  }

  setCustomMaxLoadedAccounts(value: number): number {
    this.data.customMaxLoadedAccounts = clampCustomMaxLoaded(value);
    this.persist();
    return this.data.customMaxLoadedAccounts;
  }

  getNotificationsEnabled(): boolean {
    return this.data.notificationsEnabled;
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.data.notificationsEnabled = enabled;
    this.persist();
  }

  /**
   * Fase 48 — `?? true` porque quem já tinha o app instalado não tem estes
   * campos no settings.json salvo. Sem isso, uma configuração antiga leria
   * `undefined` e os avisos apareceriam desligados sem o usuário ter pedido.
   */
  getWindowsNotificationsEnabled(): boolean {
    return this.data.windowsNotificationsEnabled ?? true;
  }

  setWindowsNotificationsEnabled(enabled: boolean): void {
    this.data.windowsNotificationsEnabled = enabled;
    this.persist();
  }

  getToastNotificationsEnabled(): boolean {
    return this.data.toastNotificationsEnabled ?? true;
  }

  setToastNotificationsEnabled(enabled: boolean): void {
    this.data.toastNotificationsEnabled = enabled;
    this.persist();
  }

  getCloseBehavior(): CloseBehavior {
    return this.data.closeBehavior;
  }

  setCloseBehavior(behavior: CloseBehavior): void {
    this.data.closeBehavior = behavior;
    this.persist();
  }

  getConfirmBeforeRemove(): boolean {
    return this.data.confirmBeforeRemove;
  }

  setConfirmBeforeRemove(enabled: boolean): void {
    this.data.confirmBeforeRemove = enabled;
    this.persist();
  }

  getSidebarWidth(): number {
    return clampSidebarWidth(this.data.sidebarWidth ?? SIDEBAR_WIDTH_DEFAULT);
  }

  setSidebarWidth(width: number): number {
    this.data.sidebarWidth = clampSidebarWidth(width);
    this.persist();
    return this.data.sidebarWidth;
  }

  getSidebarPosition(): SidebarPosition {
    return this.data.sidebarPosition ?? 'left';
  }

  setSidebarPosition(position: SidebarPosition): void {
    this.data.sidebarPosition = position;
    this.persist();
  }

  getIconSize(): IconSize {
    return this.data.iconSize ?? 'medium';
  }

  setIconSize(size: IconSize): void {
    this.data.iconSize = size;
    this.persist();
  }

  getLastSeenVersion(): string {
    return this.data.lastSeenVersion ?? '';
  }

  setLastSeenVersion(version: string): void {
    this.data.lastSeenVersion = version;
    this.persist();
  }
}
