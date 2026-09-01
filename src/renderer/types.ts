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

/**
 * Posição da barra de contas. Fase 21: "left" (padrão) e "top". Fase 58:
 * "right" e "bottom". "left"/"right" são painéis verticais redimensionáveis;
 * "top"/"bottom" são barras horizontais de altura fixa por tamanho de ícone.
 */
export type SidebarPosition = 'left' | 'top' | 'right' | 'bottom';

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
  /** Fase 43 — medição real do Electron, somando todos os processos do app. */
  memoryBytes: number;
  /** Soma do uso de CPU de todos os processos. Pode passar de 100% com vários núcleos. */
  cpuPercent: number;
  processCount: number;
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
  /** Fase 40 — divisão por direção (ver main/types.ts). */
  received: number;
  sent: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  totalVolume: number;
  totalReceived: number;
  totalSent: number;
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
  /** Fase 40 — "sent" só é capturável na conversa aberta; 0 pode significar "não deu para ler". */
  received: number;
  sent: number;
}

export interface ChatActivityDayReport {
  totalConversations: number;
  totalMessages: number;
  totalReceived: number;
  totalSent: number;
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

/** Fase 54 — Agenda. Espelha src/main/calendarStore.ts e holidays.ts. */
export const EVENT_CATEGORIES = [
  { id: 'trabalho', label: 'Trabalho', color: '#3B82F6' },
  { id: 'reuniao', label: 'Reunião', color: '#8B5CF6' },
  { id: 'pessoal', label: 'Pessoal', color: '#10B981' },
  { id: 'atendimento', label: 'Atendimento', color: '#F59E0B' },
  { id: 'outro', label: 'Outro', color: '#64748B' },
] as const;

export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]['id'];

export interface EventReminder {
  id: string;
  /** Antecedência em minutos. 0 = na hora do evento. */
  minutesBefore: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  category: EventCategoryId;
  accountId?: string | null;
  description?: string;
  reminders: EventReminder[];
  createdAt: number;
  updatedAt: number;
}

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;

export interface Holiday {
  date: string;
  name: string;
  kind: 'fixed' | 'movable';
}

export interface ReminderDuePayload {
  key: string;
  eventId: string;
  title: string;
  start: number;
  minutesBefore: number;
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
  /** Fase 48 — caixa nativa do Windows (janela minimizada ou em segundo plano). */
  getWindowsNotificationsEnabled: () => Promise<boolean>;
  setWindowsNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  /** Fase 48 — aviso interno flutuante (janela em primeiro plano). */
  getToastNotificationsEnabled: () => Promise<boolean>;
  setToastNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
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
  /** Fase 52 — limpa o cache de disco das instâncias e devolve quanto foi liberado. */
  clearCache: () => Promise<{ freedBytes: number; accounts: number }>;
  /** Fase 43: `groupId` opcional restringe o relatório a um agrupamento (Vendas, Suporte). */
  getAnalyticsSummary: (range: AnalyticsRange, groupId?: string | null) => Promise<AnalyticsSummary>;
  /** Fase 28: relatório fixo de Hoje x Ontem por instância — independente do período geral do Analytics. */
  getChatActivityDaily: (groupId?: string | null) => Promise<ChatActivityDailySummary>;
  /** Fase 43: salva o período selecionado em CSV, pela mesma agregação que a tela mostra. */
  exportAnalyticsCsv: (
    range: AnalyticsRange,
    groupId?: string | null
  ) => Promise<{ canceled: boolean; filePath?: string; error?: string }>;
  clearAnalytics: () => Promise<boolean>;
  // --- Agenda (Fase 54) ---
  listEvents: (range?: { startTs: number; endTs: number }) => Promise<CalendarEvent[]>;
  createEvent: (input: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, patch: Partial<CalendarEventInput>) => Promise<CalendarEvent | null>;
  removeEvent: (id: string) => Promise<boolean>;
  listHolidays: (startKey: string, endKey: string) => Promise<Holiday[]>;
  snoozeReminder: (key: string, minutes: number) => Promise<boolean>;
  dismissReminder: (key: string) => Promise<boolean>;
  onReminderDue: (cb: (payload: ReminderDuePayload) => void) => () => void;
  onAccountsChanged: (cb: (payload: AccountsChangedPayload) => void) => () => void;
  onOpenCommandPalette: (cb: () => void) => () => void;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdate: () => Promise<boolean>;
  downloadUpdate: () => Promise<boolean>;
  installUpdate: () => Promise<boolean>;
  onUpdateStatusChanged: (cb: (state: UpdateState) => void) => () => void;
  /** Fase 39: mensagem nova com a janela visível — alimenta o toast do app (MessageToast.tsx). */
  onNewMessages: (cb: (payload: { accountId: string; accountName: string; count: number }) => void) => () => void;
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
