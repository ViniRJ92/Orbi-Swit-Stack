/**
 * Tipos compartilhados do lado do renderer. Espelham src/main/types.ts —
 * mantidos separados porque main e renderer têm bases TypeScript/bundlers
 * diferentes (tsc puro vs. Vite), então não compartilham um tsconfig.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */

export type AccountService =
  | 'whatsapp'
  | 'instagram'
  | 'gmail'
  | 'tiktok'
  | 'facebook'
  | 'messenger'
  | 'googlecalendar'
  | 'chrome'
  | 'earth'
  | 'custom'
  | 'threads'
  | 'x'
  | 'openai'
  | 'gemini'
  | 'deepseek'
  | 'claude'
  | 'copilot'
  | 'perplexity'
  | 'grok';

export interface ServiceDefinition {
  id: AccountService;
  label: string;
  defaultUrl: string;
  color: string;
}

/** Espelha SERVICES de src/main/services.ts (só os campos que o renderer precisa). */
export const SERVICES: Record<AccountService, ServiceDefinition> = {
  whatsapp: { id: 'whatsapp', label: 'WhatsApp Web', defaultUrl: 'https://web.whatsapp.com/', color: '#25D366' },
  instagram: { id: 'instagram', label: 'Instagram', defaultUrl: 'https://www.instagram.com/', color: '#E1306C' },
  gmail: { id: 'gmail', label: 'Gmail', defaultUrl: 'https://mail.google.com/mail/', color: '#EA4335' },
  tiktok: { id: 'tiktok', label: 'TikTok', defaultUrl: 'https://www.tiktok.com/', color: '#FE2C55' },
  facebook: { id: 'facebook', label: 'Facebook', defaultUrl: 'https://www.facebook.com/', color: '#1877F2' },
  messenger: { id: 'messenger', label: 'Messenger', defaultUrl: 'https://www.messenger.com/', color: '#0084FF' },
  googlecalendar: {
    id: 'googlecalendar',
    label: 'Google Calendar',
    defaultUrl: 'https://calendar.google.com/calendar/',
    color: '#1A73E8',
  },
  chrome: { id: 'chrome', label: 'Pesquisa Google', defaultUrl: 'https://www.google.com/', color: '#4285F4' },
  earth: { id: 'earth', label: 'Google Earth', defaultUrl: 'https://earth.google.com/web/', color: '#1B9C6E' },
  custom: { id: 'custom', label: 'Web Explorer', defaultUrl: 'https://', color: '#8B5CF6' },
  threads: { id: 'threads', label: 'Threads', defaultUrl: 'https://www.threads.net/', color: '#000000' },
  x: { id: 'x', label: 'X', defaultUrl: 'https://x.com/', color: '#000000' },
  // Fase 23: serviços de IA, adicionados a pedido do usuário.
  openai: { id: 'openai', label: 'ChatGPT', defaultUrl: 'https://chatgpt.com/', color: '#000000' },
  gemini: { id: 'gemini', label: 'Google Gemini', defaultUrl: 'https://gemini.google.com/', color: '#8E75B2' },
  deepseek: { id: 'deepseek', label: 'DeepSeek', defaultUrl: 'https://chat.deepseek.com/', color: '#5786FE' },
  claude: { id: 'claude', label: 'Claude', defaultUrl: 'https://claude.ai/', color: '#D97757' },
  copilot: { id: 'copilot', label: 'Microsoft Copilot', defaultUrl: 'https://copilot.microsoft.com/', color: '#0FAFFF' },
  perplexity: { id: 'perplexity', label: 'Perplexity', defaultUrl: 'https://www.perplexity.ai/', color: '#1FB8CD' },
  grok: { id: 'grok', label: 'Grok', defaultUrl: 'https://grok.com/', color: '#000000' },
};

export interface GroupRecord {
  id: string;
  name: string;
  order: number;
}

export interface AccountRecord {
  id: string;
  name: string;
  phone?: string;
  color: string;
  order: number;
  createdAt: number;
  suspended: boolean;
  favorite: boolean;
  service: AccountService;
  customUrl?: string;
  iconDataUrl?: string;
  groupId?: string | null;
}

export interface AccountStatus {
  id: string;
  isActive: boolean;
  isOnline: boolean;
  unreadCount: number;
  suspended: boolean;
  loaded: boolean;
  loadError: boolean;
}

export interface AccountsChangedPayload {
  accounts: AccountRecord[];
  statuses: AccountStatus[];
}

export type ThemePreference = 'dark' | 'light' | 'system';

export type CloseBehavior = 'tray' | 'ask' | 'quit';

/** Fase 21: posição da sidebar de contas — "left" (padrão) ou "top" (barra horizontal). */
export type SidebarPosition = 'left' | 'top';

/** Fase 22: tamanho dos ícones/cards de conta na sidebar — afeta ambos os modos (Esquerda/Topo). */
export type IconSize = 'small' | 'medium' | 'large';

export type PerformanceMode = 'economy' | 'balanced' | 'performance' | 'custom';

export interface PerformancePreset {
  maxLoadedAccounts: number;
  idleSuspendMinutes: number;
}

export interface PerformanceModeInfo {
  mode: PerformanceMode;
  presets: Record<Exclude<PerformanceMode, 'custom'>, PerformancePreset>;
  customMaxLoadedAccounts: number;
  customMaxLoadedRange: { min: number; max: number };
}

export interface DiagnosticsInfo {
  appVersion: string;
  totalAccounts: number;
  loadedAccounts: number;
  suspendedAccounts: number;
  logDir: string;
  logSizeBytes: number;
}

export interface BackupResult {
  canceled?: boolean;
  error?: string;
  savedTo?: string;
  restored?: number;
  updated?: number;
}

export interface AppInfo {
  appName: string;
  creator: string;
  version: string;
  /** Limite máximo de instâncias simultâneas (ver main/accountManager.ts) — nunca hardcode esse número na UI. */
  maxAccounts: number;
}

/** Atalhos de janela de tempo oferecidos na barra de filtros da aba Analytics. */
export type AnalyticsPeriod = 'today' | '7d' | '30d' | 'custom';

/** Intervalo explícito (ms desde a época) usado para pedir um resumo de Analytics. */
export interface AnalyticsRange {
  startTs: number;
  endTs: number;
}

export interface AnalyticsAccountTotal {
  accountId: string;
  name: string;
  color: string;
  total: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  totalVolume: number;
  leader: { accountId: string; name: string; total: number } | null;
  averagePerAccount: number;
  byAccount: AnalyticsAccountTotal[];
  timeline: { hour: number; count: number }[];
}

/** Fase 17/28 — ver main/types.ts para a explicação completa da métrica (relatório fixo Hoje x Ontem). */
export interface ChatActivityAccountDaily {
  accountId: string;
  name: string;
  color: string;
  newConversations: number;
  messages: number;
}

export interface ChatActivityDayReport {
  totalConversations: number;
  totalMessages: number;
  byAccount: ChatActivityAccountDaily[];
}

export interface ChatActivityDailySummary {
  today: ChatActivityDayReport;
  yesterday: ChatActivityDayReport;
}

/** Fase 27 — espelha UpdateState de src/main/updateManager.ts. */
export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'not-available' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string };

/** Fase 29 — espelha WhatsNewResult de src/main/releaseNotes.ts. */
export interface WhatsNewResult {
  version: string;
  notes: string | null;
  shouldShow: boolean;
}

export interface OrbiSwitStackApi {
  getAppInfo: () => Promise<AppInfo>;
  listAccounts: () => Promise<AccountsChangedPayload>;
  switchAccount: (accountId: string) => Promise<boolean>;
  suspendAccount: (accountId: string) => Promise<boolean>;
  addAccount: (
    name: string,
    color?: string,
    service?: AccountService,
    customUrl?: string
  ) => Promise<AccountRecord | { error: string }>;
  renameAccount: (id: string, name: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  reorderAccounts: (orderedIds: string[]) => Promise<boolean>;
  removeAccount: (id: string) => Promise<boolean>;
  reloadAccount: (id: string) => Promise<boolean>;
  getStartupSetting: () => Promise<boolean>;
  setStartupSetting: (enabled: boolean) => Promise<boolean>;
  getTheme: () => Promise<ThemePreference>;
  setTheme: (theme: ThemePreference) => Promise<ThemePreference>;
  getPerformanceMode: () => Promise<PerformanceModeInfo>;
  setPerformanceMode: (mode: PerformanceMode) => Promise<PerformanceMode>;
  setCustomMaxLoadedAccounts: (value: number) => Promise<number>;
  getNotificationsEnabled: () => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  getDiagnostics: () => Promise<DiagnosticsInfo>;
  readRecentLogs: (maxLines: number) => Promise<string[]>;
  getCloseBehavior: () => Promise<CloseBehavior>;
  setCloseBehavior: (behavior: CloseBehavior) => Promise<CloseBehavior>;
  getConfirmBeforeRemove: () => Promise<boolean>;
  setConfirmBeforeRemove: (enabled: boolean) => Promise<boolean>;
  setOverlayActive: (active: boolean) => Promise<boolean>;
  getSidebarWidth: () => Promise<number>;
  setSidebarWidth: (width: number) => Promise<number>;
  getSidebarPosition: () => Promise<SidebarPosition>;
  setSidebarPosition: (position: SidebarPosition) => Promise<SidebarPosition>;
  getIconSize: () => Promise<IconSize>;
  setIconSize: (size: IconSize) => Promise<IconSize>;
  listGroups: () => Promise<GroupRecord[]>;
  createGroup: (name: string) => Promise<GroupRecord | { error: string }>;
  renameGroup: (id: string, name: string) => Promise<{ error: string } | { ok: true }>;
  reorderGroups: (orderedIds: string[]) => Promise<boolean>;
  removeGroup: (id: string) => Promise<boolean>;
  setAccountGroup: (id: string, groupId: string | null) => Promise<boolean>;
  pickAccountIcon: (id: string) => Promise<{ dataUrl?: string; error?: string; canceled?: boolean }>;
  resetAccountIcon: (id: string) => Promise<boolean>;
  exportBackup: () => Promise<BackupResult>;
  importBackup: () => Promise<BackupResult>;
  openLogsFolder: () => Promise<boolean>;
  getAnalyticsSummary: (range: AnalyticsRange) => Promise<AnalyticsSummary>;
  /** Fase 28: relatório fixo de Hoje x Ontem por instância — independente do período geral do Analytics. */
  getChatActivityDaily: () => Promise<ChatActivityDailySummary>;
  clearAnalytics: () => Promise<boolean>;
  onAccountsChanged: (cb: (payload: AccountsChangedPayload) => void) => () => void;
  onOpenCommandPalette: (cb: () => void) => () => void;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdate: () => Promise<boolean>;
  downloadUpdate: () => Promise<boolean>;
  installUpdate: () => Promise<boolean>;
  onUpdateStatusChanged: (cb: (state: UpdateState) => void) => () => void;
  /** Fase 29: decide/consulta se o modal "O que há de novo" deve abrir para a versão atual. */
  getWhatsNew: () => Promise<WhatsNewResult>;
  /** Fase 29: marca a versão atual como já vista — não mostra o modal de novo para ela. */
  ackWhatsNew: () => Promise<boolean>;
  /** Fase 29: disparado quando o usuário clica na notificação nativa de atualização disponível. */
  onOpenSettingsUpdates: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    multiwhats: OrbiSwitStackApi;
  }
}
