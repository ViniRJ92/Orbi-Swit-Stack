/**
 * Aba Analytics: visão de "movimento" por conta (mensagens novas recebidas,
 * detectadas pelo contador de não lidas e, para a conversa aberta no
 * momento, pelo identificador de cada mensagem — nunca o texto/remetente,
 * ver analyticsStore.ts no processo principal), agora com filtros de período
 * avançados (atalhos + intervalo customizado + comparação com o período
 * anterior), alertas do sistema em tempo real e cards de saúde da conexão.
 *
 * Decisão de escopo: os dados de "mensagens enviadas" e "status de entrega"
 * (enviada/entregue/lida/falha) NÃO são coletados por este app — capturar
 * status de entrega exigiria inspecionar os ticks de cada mensagem, o que
 * vai além do que foi autorizado (ver header de analyticsStore.ts para o que
 * é lido hoje e por quê). Por isso o bloco "Recebidas vs. Enviadas" / "Status
 * de Entrega" pedido no upgrade de UI/UX foi deliberadamente omitido desta
 * versão.
 *
 * Fase 28: a seção "Atividade por instância — Hoje/Ontem" (ver
 * DailyActivityCard abaixo) substituiu os dois KPIs soltos da Fase 17
 * ("Novas conversas"/"Mensagens", que ficavam presos ao seletor de período
 * geral) por um relatório fixo separado por dia — ver chatActivityStore.ts
 * (processo principal) para a explicação completa da métrica, de como ela
 * nunca conta a mesma mensagem duas vezes, nunca inclui grupos, e de como o
 * dia de cada mensagem é decidido pelo próprio rótulo "Hoje"/"Ontem" do
 * WhatsApp Web.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  CalendarRange,
  Download,
  Gauge,
  Radio,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import {
  AccountStatus,
  AnalyticsPeriod,
  AnalyticsRange,
  AnalyticsSummary,
  ChatActivityDailySummary,
  ChatActivityDayReport,
} from '../types';
import { dateInputValue, endOfDateInput, previousRange, quickRange, startOfDateInput } from '../analyticsRange';

const PERIODS: { key: 'today' | '7d' | '30d'; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
];

// Intervalo de atualização automática enquanto o painel está aberto — leve o
// bastante para não pesar (é só um agregado pequeno vindo do processo
// principal, ver mw:get-analytics-summary), mas suficiente pra sentir o
// painel "vivo" caso uma mensagem chegue com o painel em tela.
const REFRESH_MS = 20_000;

// Quantos alertas manter em tela no máximo — evita que o painel encha de
// banners numa sessão muito instável e vire ruído em vez de sinal.
const MAX_ALERTS = 8;

interface SystemAlert {
  id: string;
  accountId: string;
  name: string;
  message: string;
  ts: number;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

/**
 * Fase 64 — variação percentual do volume contra o período anterior, no
 * formato curto do card ("-90.9% vs anterior"). Sem base anterior não existe
 * porcentagem, então mostra a diferença absoluta.
 */
function formatDelta(current: number, previous: number): { text: string; positive: boolean } | null {
  if (previous === 0) {
    if (current === 0) return { text: 'igual ao anterior', positive: true };
    return { text: `+${current} vs anterior`, positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(1)}% vs anterior`, positive: pct >= 0 };
}

/** Bolinha de cor usada nas legendas e nos rodapés dos cards. */
function Dot({ color, className = '' }: { color?: string; className?: string }) {
  return (
    <span
      className={'inline-block h-1.5 w-1.5 shrink-0 rounded-full ' + className}
      style={color ? { background: color } : undefined}
      aria-hidden
    />
  );
}

/**
 * Fase 64 — card de indicador no novo arranjo: rótulo à esquerda e ícone à
 * direita no topo, o valor no meio e uma linha de detalhe no rodapé. O
 * detalhe deixou de ser cinza fino, que quase não se lia.
 */
function KpiCard({
  icon,
  label,
  children,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-text-dim">{label}</span>
        <span className="shrink-0 text-accent">{icon}</span>
      </div>
      <div className="min-w-0">{children}</div>
      <div className="mt-auto flex min-w-0 items-center gap-3 text-[11.5px] text-text-dim">{footer}</div>
    </div>
  );
}

/** Item de legenda no cabeçalho dos gráficos. */
function LegendItem({ color, label, kind }: { color: string; label: string; kind: 'square' | 'line' | 'dashed' }) {
  return (
    <span className="flex items-center gap-1.5">
      {kind === 'square' ? (
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} aria-hidden />
      ) : (
        <span
          className={'w-3.5 border-t-2 ' + (kind === 'dashed' ? 'border-dashed' : '')}
          style={{ borderColor: color }}
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}

/** "Atualizado há 12s". Só este texto se redesenha a cada segundo, não a página inteira. */
function UpdatedAgo({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (at === null) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  return <>{s < 60 ? `Atualizado há ${s}s` : `Atualizado há ${Math.floor(s / 60)} min`}</>;
}

/** dd/mm/aaaa no fuso do próprio computador. */
function formatDateBR(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Fase 45 — altura mínima de 350px. Antes o card herdava a altura que
 * sobrasse na página; ao diminuir a janela ele era espremido e as barras e
 * rótulos apareciam cortados. Agora ele nunca encolhe abaixo desse piso, e a
 * própria página rola quando não couber.
 *
 * Fase 64 — cabeçalho com título, subtítulo e legenda à direita, e um rodapé
 * opcional. A legenda saiu de dentro do gráfico para este cabeçalho.
 */
function ChartCard({
  title,
  subtitle,
  legend,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  legend?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[350px] min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-text">{title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-text-dim">{subtitle}</p>
        </div>
        {legend && <div className="flex shrink-0 items-center gap-3 text-[11px] text-text-dim">{legend}</div>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {footer && <div className="mt-2 shrink-0 text-right text-[11px] text-text-faint">{footer}</div>}
    </div>
  );
}

/**
 * Fase 28: um card de relatório diário (Hoje ou Ontem) — uma linha por
 * instância com atividade, no formato "Nome teve N novas interações — M
 * mensagens", mais os totais do dia inteiro. Nunca mostra nome/telefone de
 * pessoa nenhuma, só o nome da própria instância (conta) e números
 * agregados — ver chatActivityStore.ts para a fonte do dado.
 */
function DailyActivityCard({
  title,
  tone,
  report,
}: {
  title: string;
  /** Fase 64 — cor da bolinha ao lado do título: destaque para hoje, neutra para ontem. */
  tone: 'today' | 'yesterday';
  report: ChatActivityDayReport | undefined;
}) {
  const rows = report?.byAccount ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex shrink-0 items-center justify-between">
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
          <Dot className={tone === 'today' ? 'bg-accent' : 'bg-text-faint'} />
          {title}
        </p>
        <span className="text-[11.5px] text-text-dim">
          {report?.totalConversations ?? 0} interações · {report?.totalMessages ?? 0} mensagens
        </span>
      </div>
      {/*
        Fase 40 — tabela no lugar da lista de texto corrido. Colunas
        numéricas alinhadas à direita e linha TOTAL fixa no rodapé, para
        comparar instâncias sem precisar ler frase por frase.
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        {rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-[12px] font-light text-text-faint">
            Sem novas interações.
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <colgroup>
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-[10.5px] font-medium uppercase tracking-wide text-text-faint">
                    <th className="pb-2 pr-2 text-left font-medium">Instância</th>
                    <th className="pb-2 px-1.5 text-right font-medium">Interações</th>
                    <th className="pb-2 px-1.5 text-right font-medium">Recebidas</th>
                    <th className="pb-2 px-1.5 text-right font-medium">Enviadas</th>
                    <th className="pb-2 pl-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.accountId} className="border-t border-border/60">
                      <td className="py-2 pr-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                          <span className="truncate font-medium text-text">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-1.5 text-right tabular-nums text-text-dim">{a.newConversations}</td>
                      <td className="py-2 px-1.5 text-right tabular-nums text-text-dim">{a.received}</td>
                      <td className="py-2 px-1.5 text-right tabular-nums text-text-dim">{a.sent}</td>
                      <td className="py-2 pl-1.5 text-right font-semibold tabular-nums text-text">{a.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mesmas larguras da tabela acima para as colunas baterem. */}
            <table className="w-full shrink-0 table-fixed border-collapse border-t-2 border-border text-[12px]">
              <colgroup>
                <col style={{ width: '36%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="py-2 pr-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-dim">Total</td>
                  <td className="py-2 px-1.5 text-right font-semibold tabular-nums text-text">
                    {report?.totalConversations ?? 0}
                  </td>
                  <td className="py-2 px-1.5 text-right font-semibold tabular-nums text-text">
                    {report?.totalReceived ?? 0}
                  </td>
                  <td className="py-2 px-1.5 text-right font-semibold tabular-nums text-text">{report?.totalSent ?? 0}</td>
                  <td className="py-2 pl-1.5 text-right font-semibold tabular-nums text-text">
                    {report?.totalMessages ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--color-surface-hover)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-text)',
};

/** Classifica uma conta em uma das três badges de saúde de conexão do painel. */
function connectionCategory(status: AccountStatus | undefined): 'online' | 'offline' | 'reconnecting' {
  if (!status) return 'reconnecting';
  if (status.loadError) return 'offline';
  if (status.suspended) return 'offline';
  if (!status.loaded) return 'reconnecting';
  return status.isOnline ? 'online' : 'reconnecting';
}

export function AnalyticsModal({
  open,
  onClose,
  escEnabled = true,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Fase 50 — o Analytics é uma PÁGINA, e modais como Ajuda e Configurações
   * abrem por cima dela. Como os dois ouvem Esc na janela, um único toque
   * fecharia o modal e a página junto. Quem monta a tela (App.tsx) desliga
   * este ouvinte enquanto houver algo aberto na frente, então Esc fecha só o
   * que está por cima. O fechamento do Analytics em si não mudou.
   */
  escEnabled?: boolean;
}) {
  const accounts = useAppStore((s) => s.accounts);
  const statuses = useAppStore((s) => s.statuses);
  const reloadAccount = useAppStore((s) => s.reloadAccount);
  const switchAccount = useAppStore((s) => s.switchAccount);

  const [quick, setQuick] = useState<AnalyticsPeriod>('today');
  const [customStart, setCustomStart] = useState(() => dateInputValue(7));
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(0));
  const [compare, setCompare] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [chatDaily, setChatDaily] = useState<ChatActivityDailySummary | null>(null);
  // Fase 43 — `null` = todos os agrupamentos.
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Fase 64 — instante da última atualização bem-sucedida, para o "Atualizado há".
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const groups = useAppStore((s) => s.groups);

  const prevStatusesRef = useRef<Map<string, AccountStatus>>(new Map());

  /** Fase 43 — salva o período selecionado em CSV, respeitando o agrupamento. */
  async function exportCsv() {
    setExporting(true);
    try {
      const result = await window.multiwhats.exportAnalyticsCsv(currentRange(), groupFilter);
      if (result.error) window.alert(result.error);
    } finally {
      setExporting(false);
    }
  }

  // Recalculada a cada chamada (nunca memoizada só a partir da seleção da
  // UI) — ver comentário de topo de analyticsRange.ts sobre por que isso é
  // necessário para "Hoje/7 dias/30 dias" continuarem avançando a cada
  // atualização automática de 20s em vez de congelar no instante do clique.
  function currentRange(): AnalyticsRange {
    if (quick === 'custom' && customStart && customEnd) {
      const startTs = startOfDateInput(customStart);
      const endTs = endOfDateInput(customEnd);
      if (endTs > startTs) return { startTs, endTs };
    }
    return quickRange(quick === 'custom' ? 'today' : quick);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const range = currentRange();
        const result = await window.multiwhats.getAnalyticsSummary(range, groupFilter);
        if (cancelled) return;
        setSummary(result);
        setUpdatedAt(Date.now());
        if (compare) {
          const prevResult = await window.multiwhats.getAnalyticsSummary(previousRange(range), groupFilter);
          if (!cancelled) setPrevSummary(prevResult);
        } else if (!cancelled) {
          setPrevSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quick, customStart, customEnd, compare, groupFilter]);

  // Fase 28: relatório fixo de Hoje x Ontem — busca independente do
  // seletor de período geral acima (não faz sentido esse relatório
  // "seguir" o filtro de Hoje/7 dias/30 dias/personalizado).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadDaily = async () => {
      try {
        const result = await window.multiwhats.getChatActivityDaily(groupFilter);
        if (!cancelled) setChatDaily(result);
      } catch {
        // Silencioso — a UI só mostra "sem novas interações" se isto falhar.
      }
    };
    loadDaily();
    const interval = setInterval(loadDaily, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, groupFilter]);

  // Fase 34.1 — Esc fecha o Analytics. Enquanto era um modal, isso vinha
  // pronto do componente Modal; virando página, precisou ser reimplementado
  // aqui. A WebContentsView da instância fica escondida enquanto esta página
  // está aberta, então o foco de teclado é desta janela e o listener pega.
  useEffect(() => {
    if (!open || !escEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, escEnabled, onClose]);

  // Alertas em tempo real: detecta transições de status (não faz nenhuma
  // leitura nova — usa exatamente os mesmos campos de AccountStatus que já
  // chegam via onAccountsChanged) e gera um banner dispensável por evento.
  useEffect(() => {
    if (!open) return;
    const prevMap = prevStatusesRef.current;
    const fresh: SystemAlert[] = [];
    for (const acc of accounts) {
      const curr = statuses.get(acc.id);
      const prev = prevMap.get(acc.id);
      if (!curr || !prev) continue;
      if (prev.isOnline && !curr.isOnline && curr.loaded && !curr.suspended) {
        fresh.push({
          id: `${acc.id}-drop-${curr.unreadCount}-${prevMap.size}-${Date.now()}`,
          accountId: acc.id,
          name: acc.name,
          message: `${acc.name}: a sessão caiu ou o QR Code expirou`,
          ts: Date.now(),
        });
      }
      if (!prev.loadError && curr.loadError) {
        fresh.push({
          id: `${acc.id}-error-${Date.now()}`,
          accountId: acc.id,
          name: acc.name,
          message: `${acc.name}: falha ao carregar a sessão`,
          ts: Date.now(),
        });
      }
    }
    if (fresh.length > 0) {
      setAlerts((list) => [...fresh, ...list].slice(0, MAX_ALERTS));
    }
    prevStatusesRef.current = new Map(statuses);
  }, [accounts, statuses, open]);

  const healthCounts = useMemo(() => {
    let online = 0;
    let offline = 0;
    let reconnecting = 0;
    for (const acc of accounts) {
      const category = connectionCategory(statuses.get(acc.id));
      if (category === 'online') online++;
      else if (category === 'offline') offline++;
      else reconnecting++;
    }
    return { online, offline, reconnecting };
  }, [accounts, statuses]);

  const barData = useMemo(
    () =>
      (summary?.byAccount ?? []).map((a) => ({
        name: a.name,
        total: a.total,
        received: a.received,
        sent: a.sent,
        color: a.color,
      })),
    [summary]
  );
  const timelineData = useMemo(() => {
    const current = summary?.timeline ?? [];
    const prev = prevSummary?.timeline ?? [];
    return current.map((t, i) => ({
      hour: formatHour(t.hour),
      count: t.count,
      prevCount: compare ? prev[i]?.count ?? 0 : undefined,
    }));
  }, [summary, prevSummary, compare]);

  const volumeDelta = compare && summary && prevSummary ? formatDelta(summary.totalVolume, prevSummary.totalVolume) : null;

  // Fase 64 — só apresentação: cor, participação no volume e quantas contas
  // tiveram movimento, tudo derivado do mesmo resumo já carregado.
  const leaderInfo = useMemo(() => {
    if (!summary?.leader) return null;
    const leader = summary.leader;
    const row = summary.byAccount.find((a) => a.accountId === leader.accountId);
    const pct = summary.totalVolume > 0 ? Math.round((leader.total / summary.totalVolume) * 100) : 0;
    return { name: leader.name, total: leader.total, color: row?.color ?? 'var(--color-accent)', pct };
  }, [summary]);
  const activeAccounts = summary ? summary.byAccount.filter((a) => a.total > 0).length : 0;
  const periodo = summary?.range ?? currentRange();

  function dismissAlert(id: string) {
    setAlerts((list) => list.filter((a) => a.id !== id));
  }

  function reconnect(alert: SystemAlert) {
    reloadAccount(alert.accountId);
    switchAccount(alert.accountId);
    dismissAlert(alert.id);
  }

  // Fase 32: deixou de ser janela flutuante (modal) e virou PÁGINA — ocupa
  // toda a área de conteúdo (largura e altura), no lugar da instância, para
  // caber o painel inteiro sem aperto. Quem esconde a WebContentsView por
  // baixo continua sendo o mesmo mecanismo de sempre (setOverlayActive em
  // App.tsx), então nada muda no processo principal.
  if (!open) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-content">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">
            <BarChart3 size={15} />
          </span>
          <h1 className="text-[15px] font-semibold text-text">Analytics</h1>
        </div>
        <button
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
      {/*
        Fase 64 — nova disposição, a pedido do usuário: filtros numa barra só,
        indicadores em quatro cards, gráficos ANTES das tabelas (a visão geral
        vem primeiro, o detalhe depois) e uma barra de status no rodapé.
        Só muda a apresentação: os dados continuam vindo exatamente das mesmas
        chamadas (getAnalyticsSummary e getChatActivityDaily).

        A barra de filtros usa `flex-wrap` dentro de um card com preenchimento.
        O problema da Fase 41 (o switch escapando pela borda) vinha de um item
        que não podia encolher; aqui nenhum item passa da largura do card, e o
        "Comparar" virou caixa de seleção comum.
      */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-2">
        <div className="flex items-center gap-1 rounded-lg bg-input p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={
                'rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ' +
                (quick === p.key ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
              }
              onClick={() => setQuick(p.key)}
            >
              {p.label}
            </button>
          ))}
          <button
            className={
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ' +
              (quick === 'custom' ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
            }
            onClick={() => setQuick('custom')}
          >
            <CalendarRange size={13} />
            Personalizado
          </button>
        </div>

        {quick === 'custom' && (
          <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
            />
            <span>até</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={dateInputValue(0)}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Fase 43 — filtro por agrupamento. */}
        {groups.length > 0 && (
          <label className="flex items-center gap-2 rounded-lg border border-border bg-input py-1 pl-2.5 pr-1.5 text-[12px] text-text-dim">
            Agrupamento
            <select
              value={groupFilter ?? ''}
              onChange={(e) => setGroupFilter(e.target.value || null)}
              className="bg-input py-0.5 text-[12.5px] font-medium text-text outline-none"
              aria-label="Filtrar por agrupamento"
            >
              <option value="">Todas as instâncias</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex cursor-pointer items-center gap-2 px-1 text-[12.5px] text-text-dim">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Comparar com período anterior
        </label>

        {/* Fase 43 — exporta o período em CSV, pela mesma agregação da tela. */}
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-50"
          title="Salvar o período selecionado em CSV"
        >
          <Download size={14} />
          {exporting ? 'Salvando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Sub-topo: alertas do sistema em tempo real */}
      {alerts.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200"
            >
              <AlertTriangle size={14} className="shrink-0 text-amber-400" />
              <span className="flex-1 truncate">{alert.message}</span>
              <button
                onClick={() => reconnect(alert)}
                className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:bg-amber-500/30"
              >
                <RefreshCw size={11} />
                Reconectar
              </button>
              <button
                onClick={() => dismissAlert(alert.id)}
                aria-label="Dispensar alerta"
                className="shrink-0 rounded-md p-1 text-amber-300/70 transition-colors hover:bg-amber-500/20 hover:text-amber-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/*
        Fase 64 — quatro indicadores. Os antigos cards separados de Online,
        Offline e Reconectando viraram "Sessões ativas", com os outros dois
        estados no rodapé. Duas colunas em janela estreita, quatro a partir
        de 1280px, para nenhum número ficar espremido.
      */}
      <div className="grid shrink-0 grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon={<Radio size={16} />}
          label="Sessões ativas"
          footer={
            <>
              <span className="flex items-center gap-1.5">
                <Dot className="bg-red-400" />
                {healthCounts.offline} Offline
              </span>
              <span className="flex items-center gap-1.5">
                <Dot className="bg-amber-400" />
                {healthCounts.reconnecting} Reconectando
              </span>
            </>
          }
        >
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-text">{healthCounts.online}</span>
            <span className="text-[12px] text-text-dim">online</span>
          </p>
        </KpiCard>

        <KpiCard
          icon={<ArrowUpDown size={16} />}
          label="Volume total"
          footer={
            <>
              <span className="flex items-center gap-1.5">
                <Dot color="var(--color-accent)" />
                {summary?.totalReceived ?? 0} recebidas
              </span>
              <span className="flex items-center gap-1.5">
                <Dot color="#8B6FF5" />
                {summary?.totalSent ?? 0} enviadas
              </span>
            </>
          }
        >
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="text-2xl font-semibold text-text">{summary?.totalVolume ?? 0}</span>
            {volumeDelta && (
              <span
                className={
                  'truncate text-[12px] font-medium ' + (volumeDelta.positive ? 'text-emerald-400' : 'text-red-400')
                }
              >
                {volumeDelta.text}
              </span>
            )}
          </p>
        </KpiCard>

        <KpiCard
          icon={<Trophy size={16} />}
          label="Instância líder"
          footer={
            leaderInfo ? (
              <>
                <span>{leaderInfo.pct}% do volume</span>
                <span className="ml-auto">{activeAccounts} com atividade</span>
              </>
            ) : (
              <span>sem movimento no período</span>
            )
          }
        >
          {leaderInfo ? (
            <>
              <p className="flex min-w-0 items-center gap-2">
                <Dot color={leaderInfo.color} />
                <span className="truncate text-[15px] font-semibold text-text">{leaderInfo.name}</span>
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-text">{leaderInfo.total}</span>
                <span className="text-[12px] text-text-dim">mensagens</span>
              </p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-text">—</p>
          )}
        </KpiCard>

        <KpiCard icon={<Gauge size={16} />} label="Média por conta" footer={<span>Entre as contas com atividade</span>}>
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-text">
              {summary ? summary.averagePerAccount.toFixed(1) : '0'}
            </span>
            <span className="text-[12px] text-text-dim">msg / conta</span>
          </p>
        </KpiCard>
      </div>

      {/*
        Fase 45: `shrink-0` no lugar de `min-h-0 flex-1`. Antes esta linha
        dividia o que sobrasse de altura com o resto da página, e ao diminuir
        a janela os dois cards eram achatados. Agora eles mantêm a altura
        própria e é a página que rola.
      */}
      <div className="flex shrink-0 gap-4">
        <ChartCard
          title="Movimento por instância"
          subtitle="Comparativo de mensagens recebidas e enviadas"
          legend={
            <>
              <LegendItem kind="square" color="var(--color-accent)" label="Recebidas" />
              <LegendItem kind="square" color="#8B6FF5" label="Enviadas" />
            </>
          }
          footer={<UpdatedAgo at={updatedAt} />}
        >
          {barData.length === 0 ? (
            <EmptyChartState loading={loading} />
          ) : (
            /*
              Fase 38: com muitas instâncias os nomes do eixo se encavalavam —
              efeito colateral do `interval={0}` da Fase 32, que passou a
              forçar TODOS os rótulos a aparecer (antes o Recharts escondia
              alguns, e barra ficava sem nome). Aqui a altura do gráfico
              cresce junto com a quantidade de barras, e o card rola por
              dentro quando não couber. Assim nenhum nome some nem se
              sobrepõe, seja com 2 instâncias ou com 30.
            */
            <div className="mw-scroll h-full overflow-y-auto pr-1">
              {/* Fase 45: 38px por barra (era 34) e piso maior, para as barras
                  respirarem e o rótulo nunca encostar na de baixo. */}
              <div style={{ height: Math.max(barData.length * 38 + 40, 260) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      // Fase 45: 150px (era 110) para caber o nome completo da
                      // instância sem cortar em "...".
                      width={150}
                      tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      // Fase 32: sem isto o Recharts descarta rótulos quando o
                      // card fica baixo — aparecia barra sem nome.
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--color-surface-hover)' }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--color-text)' }}
                    />
                    {/*
                      Fase 40 — barras empilhadas: cada instância mostra quanto
                      do volume foi recebido e quanto foi enviado. Só a última
                      fatia arredonda a ponta direita. Fase 64: a legenda saiu
                      daqui para o cabeçalho do card.
                    */}
                    <Bar dataKey="received" stackId="dir" name="Recebidas" maxBarSize={22} fill="var(--color-accent)" />
                    <Bar
                      dataKey="sent"
                      stackId="dir"
                      name="Enviadas"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      fill="#8B6FF5"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Horários de pico"
          subtitle={
            compare
              ? 'Distribuição horária do tráfego (período atual vs anterior)'
              : 'Distribuição horária do tráfego no período'
          }
          legend={
            <>
              <LegendItem kind="line" color="var(--color-accent-2)" label="Atual" />
              {compare && <LegendItem kind="dashed" color="var(--color-text-faint)" label="Anterior" />}
            </>
          }
        >
          {timelineData.every((t) => t.count === 0) ? (
            <EmptyChartState loading={loading} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {/* Fase 45: `top: 16` reserva respiro acima da curva, para o
                  pico não encostar na borda de cima do card. */}
              <LineChart data={timelineData} margin={{ left: -12, right: 12, top: 16, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="hour"
                  interval={2}
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                {/*
                  Fase 45: o topo da escala passa a ser 20% acima do maior
                  valor do período (mínimo 4), para o pico não colar na borda.
                */}
                <YAxis
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(4, Math.ceil((dataMax || 0) * 1.2))]}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text)' }} />
                {/* Fase 64: `name` dá o rótulo do tooltip. Sem ele aparecia
                    "count", o nome interno do campo. */}
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Atual"
                  stroke="var(--color-accent-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {compare && (
                  <Line
                    type="monotone"
                    dataKey="prevCount"
                    name="Anterior"
                    stroke="var(--color-text-faint)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/*
        Fase 28: relatório fixo de Hoje x Ontem por instância, separado do
        seletor de período acima de propósito (ver chatActivityStore.ts),
        nunca misturando os dois dias e nunca contando de novo o que já foi
        visto. Fase 64: passou para depois dos gráficos.
      */}
      <div className="flex min-h-[190px] shrink-0 gap-4">
        <DailyActivityCard title="Atividade de hoje" tone="today" report={chatDaily?.today} />
        <DailyActivityCard title="Atividade de ontem" tone="yesterday" report={chatDaily?.yesterday} />
      </div>

      {/* Fase 64 — barra de status: quantas instâncias estão online e qual período está na tela. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-[12px] text-text-dim">
        <span className="flex items-center gap-2">
          <Dot color="var(--color-accent)" />
          Instâncias Online:
          <span className="font-semibold text-accent">
            {healthCounts.online} / {accounts.length}
          </span>
        </span>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <span>
          Período:{' '}
          <span className="font-semibold text-text">
            {formatDateBR(periodo.startTs)} a {formatDateBR(periodo.endTs)}
          </span>
        </span>
        <span className="ml-auto text-text-faint">Só conversas com pessoas. Grupos ficam fora da contagem.</span>
      </div>
      </div>
    </section>
  );
}

function EmptyChartState({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-[12px] text-text-faint">
      {loading ? 'Carregando…' : 'Sem movimento suficiente neste período ainda.'}
    </div>
  );
}
