/**
 * Preload da janela principal (UI do Orbi Swit Stack). Expõe uma API mínima e segura
 * para o renderer, sem habilitar Node.js diretamente na página.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { contextBridge, ipcRenderer } from 'electron';
import { AccountsChangedPayload, AnalyticsRange } from './types';
import { PerformanceMode, CloseBehavior, SidebarPosition, IconSize } from './settingsStore';
import { AccountService } from './services';
import { UpdateState } from './updateManager';
import { WhatsNewResult } from './releaseNotes';

const api = {
  getAppInfo: () => ipcRenderer.invoke('mw:get-app-info'),
  listAccounts: () => ipcRenderer.invoke('mw:list-accounts'),
  switchAccount: (accountId: string) => ipcRenderer.invoke('mw:switch-account', accountId),
  suspendAccount: (accountId: string) => ipcRenderer.invoke('mw:suspend-account', accountId),
  addAccount: (name: string, color?: string, service?: AccountService, customUrl?: string) =>
    ipcRenderer.invoke('mw:add-account', { name, color, service, customUrl }),
  renameAccount: (id: string, name: string) => ipcRenderer.invoke('mw:rename-account', { id, name }),
  toggleFavorite: (id: string) => ipcRenderer.invoke('mw:toggle-favorite', id),
  reorderAccounts: (orderedIds: string[]) => ipcRenderer.invoke('mw:reorder-accounts', orderedIds),
  removeAccount: (id: string) => ipcRenderer.invoke('mw:remove-account', id),
  reloadAccount: (id: string) => ipcRenderer.invoke('mw:reload-account', id),
  getStartupSetting: () => ipcRenderer.invoke('mw:get-startup-setting'),
  setStartupSetting: (enabled: boolean) => ipcRenderer.invoke('mw:set-startup-setting', enabled),
  getTheme: () => ipcRenderer.invoke('mw:get-theme'),
  setTheme: (theme: 'dark' | 'light' | 'system') => ipcRenderer.invoke('mw:set-theme', theme),
  getPerformanceMode: () => ipcRenderer.invoke('mw:get-performance-mode'),
  setPerformanceMode: (mode: PerformanceMode) => ipcRenderer.invoke('mw:set-performance-mode', mode),
  setCustomMaxLoadedAccounts: (value: number) => ipcRenderer.invoke('mw:set-custom-max-loaded-accounts', value),
  getNotificationsEnabled: () => ipcRenderer.invoke('mw:get-notifications-enabled'),
  setNotificationsEnabled: (enabled: boolean) => ipcRenderer.invoke('mw:set-notifications-enabled', enabled),
  // Fase 48 — preferências de por onde o aviso aparece.
  getWindowsNotificationsEnabled: () => ipcRenderer.invoke('mw:get-windows-notifications-enabled'),
  setWindowsNotificationsEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('mw:set-windows-notifications-enabled', enabled),
  getToastNotificationsEnabled: () => ipcRenderer.invoke('mw:get-toast-notifications-enabled'),
  setToastNotificationsEnabled: (enabled: boolean) => ipcRenderer.invoke('mw:set-toast-notifications-enabled', enabled),
  getDiagnostics: () => ipcRenderer.invoke('mw:get-diagnostics'),
  readRecentLogs: (maxLines: number) => ipcRenderer.invoke('mw:read-recent-logs', maxLines),
  getCloseBehavior: () => ipcRenderer.invoke('mw:get-close-behavior'),
  setCloseBehavior: (behavior: CloseBehavior) => ipcRenderer.invoke('mw:set-close-behavior', behavior),
  getConfirmBeforeRemove: () => ipcRenderer.invoke('mw:get-confirm-before-remove'),
  setConfirmBeforeRemove: (enabled: boolean) => ipcRenderer.invoke('mw:set-confirm-before-remove', enabled),
  setOverlayActive: (active: boolean) => ipcRenderer.invoke('mw:set-overlay-active', active),
  getSidebarWidth: () => ipcRenderer.invoke('mw:get-sidebar-width'),
  setSidebarWidth: (width: number) => ipcRenderer.invoke('mw:set-sidebar-width', width),
  getSidebarPosition: () => ipcRenderer.invoke('mw:get-sidebar-position'),
  setSidebarPosition: (position: SidebarPosition) => ipcRenderer.invoke('mw:set-sidebar-position', position),
  getIconSize: () => ipcRenderer.invoke('mw:get-icon-size'),
  setIconSize: (size: IconSize) => ipcRenderer.invoke('mw:set-icon-size', size),
  listGroups: () => ipcRenderer.invoke('mw:list-groups'),
  createGroup: (name: string) => ipcRenderer.invoke('mw:create-group', name),
  renameGroup: (id: string, name: string) => ipcRenderer.invoke('mw:rename-group', { id, name }),
  reorderGroups: (orderedIds: string[]) => ipcRenderer.invoke('mw:reorder-groups', orderedIds),
  removeGroup: (id: string) => ipcRenderer.invoke('mw:remove-group', id),
  setAccountGroup: (id: string, groupId: string | null) => ipcRenderer.invoke('mw:set-account-group', { id, groupId }),
  pickAccountIcon: (id: string) => ipcRenderer.invoke('mw:pick-account-icon', id),
  resetAccountIcon: (id: string) => ipcRenderer.invoke('mw:reset-account-icon', id),
  exportBackup: () => ipcRenderer.invoke('mw:export-backup'),
  importBackup: () => ipcRenderer.invoke('mw:import-backup'),
  openLogsFolder: () => ipcRenderer.invoke('mw:open-logs-folder'),
  // Fase 43: `groupId` opcional restringe o relatório a um agrupamento.
  getAnalyticsSummary: (range: AnalyticsRange, groupId?: string | null) =>
    ipcRenderer.invoke('mw:get-analytics-summary', range, groupId ?? null),
  getChatActivityDaily: (groupId?: string | null) => ipcRenderer.invoke('mw:get-chat-activity-daily', groupId ?? null),
  exportAnalyticsCsv: (range: AnalyticsRange, groupId?: string | null) =>
    ipcRenderer.invoke('mw:export-analytics-csv', range, groupId ?? null),
  clearAnalytics: () => ipcRenderer.invoke('mw:clear-analytics'),
  onAccountsChanged: (cb: (payload: AccountsChangedPayload) => void) => {
    const listener = (_evt: unknown, payload: AccountsChangedPayload) => cb(payload);
    ipcRenderer.on('mw:accounts-changed', listener);
    return () => ipcRenderer.removeListener('mw:accounts-changed', listener);
  },
  onOpenCommandPalette: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('mw:open-command-palette', listener);
    return () => ipcRenderer.removeListener('mw:open-command-palette', listener);
  },
  getUpdateState: () => ipcRenderer.invoke('mw:get-update-state'),
  checkForUpdate: () => ipcRenderer.invoke('mw:check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('mw:download-update'),
  installUpdate: () => ipcRenderer.invoke('mw:install-update'),
  onUpdateStatusChanged: (cb: (state: UpdateState) => void) => {
    const listener = (_evt: unknown, state: UpdateState) => cb(state);
    ipcRenderer.on('mw:update-status-changed', listener);
    return () => ipcRenderer.removeListener('mw:update-status-changed', listener);
  },
  getWhatsNew: (): Promise<WhatsNewResult> => ipcRenderer.invoke('mw:get-whats-new'),
  ackWhatsNew: () => ipcRenderer.invoke('mw:ack-whats-new'),
  onOpenSettingsUpdates: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('mw:open-settings-updates', listener);
    return () => ipcRenderer.removeListener('mw:open-settings-updates', listener);
  },
  /** Fase 39 — mensagem nova com a janela visível: avisa pelo toast do app (ver MessageToast.tsx). */
  onNewMessages: (cb: (payload: { accountId: string; accountName: string; count: number }) => void) => {
    const listener = (_evt: unknown, payload: { accountId: string; accountName: string; count: number }) => cb(payload);
    ipcRenderer.on('mw:new-messages', listener);
    return () => ipcRenderer.removeListener('mw:new-messages', listener);
  },
};

contextBridge.exposeInMainWorld('multiwhats', api);

export type MultiWhatsApi = typeof api;
