/**
 * Tipos compartilhados entre o processo principal e o preload/renderer.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { AccountService } from './services';

export interface AccountRecord {
  /** Identificador único e estável da conta (usado também para nomear a partition). */
  id: string;
  /** Nome de exibição, personalizável pelo usuário. */
  name: string;
  /** Número de telefone associado (opcional, informado manualmente pelo usuário por enquanto). */
  phone?: string;
  /** Cor/emoji de identificação visual da conta. */
  color: string;
  /** Ordem de exibição na barra lateral. */
  order: number;
  /** Timestamp de criação. */
  createdAt: number;
  /** Se a sessão está suspensa (BrowserView descarregada) ou ativa. */
  suspended: boolean;
  /** Marcada como favorita pelo usuário — aparece fixada no topo da lista. */
  favorite: boolean;
  /** Qual plataforma esta instância abre (WhatsApp, Gmail, navegador livre, Google Earth ou URL customizada). */
  service: AccountService;
  /** URL usada quando service === 'custom'. */
  customUrl?: string;
  /** Ícone customizado (data URL), escolhido pelo usuário em Configurações > Instâncias. Sem isso, usa o ícone padrão do serviço. */
  iconDataUrl?: string;
  /** Grupo/pasta ao qual a conta pertence (ver groupStore.ts). Ausente/undefined = sem grupo. */
  groupId?: string | null;
}

export interface AccountStatus {
  id: string;
  /** A conta está atualmente selecionada/visível na janela. */
  isActive: boolean;
  /** A sessão já concluiu o login (heurística baseada na URL do WhatsApp Web). */
  isOnline: boolean;
  /** Contagem de mensagens não lidas (lida a partir do título da página, ex: "(3) WhatsApp"). */
  unreadCount: number;
  /** Sessão suspensa (sem BrowserView carregada). */
  suspended: boolean;
  /** Existe uma BrowserView carregada para esta conta neste momento (ativa ou em segundo plano). */
  loaded: boolean;
  /** A última tentativa de carregar o WhatsApp Web falhou (ex.: sem internet). */
  loadError: boolean;
}

/** Metadados exportáveis de uma conta para backup (sem qualquer dado de sessão/autenticação). */
export interface AccountBackupEntry {
  id: string;
  name: string;
  phone?: string;
  color: string;
  order: number;
  favorite?: boolean;
  service?: AccountService;
  customUrl?: string;
  iconDataUrl?: string;
  groupId?: string | null;
}

export interface BackupFile {
  // Aceita o identificador antigo ('whats-control', de antes do rebranding
  // para Orbi Swit Stack) para que backups feitos com versões anteriores
  // do app continuem podendo ser restaurados.
  app: 'orbi-swit-stack' | 'whats-control';
  backupVersion: 1;
  exportedAt: string;
  accounts: AccountBackupEntry[];
}

export type AccountsChangedPayload = {
  accounts: AccountRecord[];
  statuses: AccountStatus[];
};

/** Atalhos de janela de tempo oferecidos na barra de filtros da aba Analytics. */
export type AnalyticsPeriod = 'today' | '7d' | '30d' | 'custom';

/**
 * Intervalo explícito de tempo (em ms desde a época) usado para agregar a
 * Analytics — substitui o antigo `AnalyticsPeriod` como parâmetro de
 * `buildSummary`, permitindo tanto os atalhos rápidos quanto um intervalo
 * customizado (Date Range Picker) e o cálculo do "período anterior" para
 * comparação, todos pela mesma lógica.
 */
export interface AnalyticsRange {
  startTs: number;
  endTs: number;
}

/** Total de "movimento" (mensagens novas detectadas) de uma conta no período selecionado. */
export interface AnalyticsAccountTotal {
  accountId: string;
  name: string;
  color: string;
  total: number;
}

/**
 * Resumo já agregado no processo principal (nunca eventos brutos crus vão
 * para o renderer) — mantém o IPC leve e os gráficos rápidos de renderizar
 * independentemente de quantos eventos existam no histórico local.
 */
export interface AnalyticsSummary {
  range: AnalyticsRange;
  /** Soma de mensagens novas de todas as contas no período. */
  totalVolume: number;
  /** Conta com mais movimento no período (null se não houve nenhum evento). */
  leader: { accountId: string; name: string; total: number } | null;
  /** Média de mensagens por conta com alguma atividade no período. */
  averagePerAccount: number;
  /** Uma entrada por conta com atividade > 0, ordenada da maior para a menor — alimenta o gráfico de barras. */
  byAccount: AnalyticsAccountTotal[];
  /** Soma por hora do dia (0-23), agregada em todos os dias do período — alimenta o gráfico de linha (picos de uso). */
  timeline: { hour: number; count: number }[];
  /** Fase 17: "Novas conversas" x "Mensagens", separado do totalVolume acima (que mistura tudo, inclusive grupos). */
  chatActivity: ChatActivitySummary;
}

/**
 * Fase 17 — separação entre "pessoas únicas que mandaram algo novo" e
 * "quantidade total de mensagens novas dessas pessoas". Grupos nunca entram
 * aqui (ver chatActivityStore.ts). Só contas WhatsApp alimentam isso hoje.
 */
export interface ChatActivityAccountTotal {
  accountId: string;
  name: string;
  color: string;
  /** Quantas pessoas (conversas individuais) diferentes mandaram ao menos 1 mensagem nova no período. */
  newConversations: number;
  /** Total de mensagens novas dessas pessoas no período (uma pessoa pode gerar várias). */
  messages: number;
}

export interface ChatActivitySummary {
  newConversations: number;
  messages: number;
  byAccount: ChatActivityAccountTotal[];
}
