/**
 * Aba Analytics: visão de "movimento" por conta (mensagens novas detectadas
 * pelo contador de não lidas — nunca conteúdo de conversa, ver
 * analyticsStore.ts no processo principal), agora com filtros de período
 * avançados (atalhos + intervalo customizado + comparação com o período
 * anterior), alertas do sistema em tempo real e cards de saúde da conexão.
 *
 * Decisão de escopo: os dados de "mensagens enviadas" e "status de entrega"
 * (enviada/entregue/lida/falha) NÃO são coletados por este app — a única
 * fonte de dado observada é o contador de não lidas do próprio WhatsApp Web
 * (ver header de analyticsStore.ts), e capturar status de entrega exigiria
 * inspecionar os ticks/DOM interno de cada mensagem, o que vai contra as
 * restrições do projeto (nada de scraping além do já existente). Por isso o
 * bloco "Recebidas vs. Enviadas" / "Status de Entrega" pedido no upgrade de
 * UI/UX foi deliberadamente omitido desta versão.
 *
 * Fase 17: adicionado "Novas conversas" x "Mensagens" — ver
 * chatActivityStore.ts (processo principal) para a explicação completa da
 * métrica e de como ela nunca conta a mesma mensagem duas vezes nem inclui
 * grupos.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
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
import { Modal } from './Modal';
import { useAppStore } from '../store/useAppStore';
import { AccountStatus, AnalyticsPeriod, AnalyticsRange, AnalyticsSummary } from '../types';
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

function formatDelta(current: number, previous: number): { text: string; positive: boolean } | null {
  const diff = current - previous;
  if (diff === 0) return { text: 'igual ao período anterior', positive: true };
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : null;
  const sign = diff > 0 ? '+' : '';
  const pctText = pct !== null ? ` (${sign}${pct}%)` : '';
  return { text: `${sign}${diff}${pctText} vs. período anterior`, positive: diff >= 0 };
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  deltaPositive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  deltaPositive?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center gap-2 text-text-faint">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-hover text-accent">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div>
        <p className="text-xl font-semibold text-text">{value}</p>
        {detail && (
          <p
            className={
              'mt-0.5 truncate text-[11px] ' +
              (deltaPositive === undefined ? 'text-text-dim' : deltaPositive ? 'text-emerald-400' : 'text-red-400')
            }
          >
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface p-4">
      <p className="mb-2 shrink-0 text-[12px] font-semibold text-text-dim">{title}</p>
      <div className="min-h-0 flex-1">{children}</div>
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

export function AnalyticsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  const prevStatusesRef = useRef<Map<string, AccountStatus>>(new Map());

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
        const result = await window.multiwhats.getAnalyticsSummary(range);
        if (cancelled) return;
        setSummary(result);
        if (compare) {
          const prevResult = await window.multiwhats.getAnalyticsSummary(previousRange(range));
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
  }, [open, quick, customStart, customEnd, compare]);

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
    () => (summary?.byAccount ?? []).map((a) => ({ name: a.name, total: a.total, color: a.color })),
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

  function dismissAlert(id: string) {
    setAlerts((list) => list.filter((a) => a.id !== id));
  }

  function reconnect(alert: SystemAlert) {
    reloadAccount(alert.accountId);
    switchAccount(alert.accountId);
    dismissAlert(alert.id);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Analytics"
      icon={<BarChart3 size={15} />}
      size="lg"
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
    >
      {/* Barra superior: atalhos rápidos + intervalo customizado + comparação */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-input p-1">
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

        <label className="ml-auto flex items-center gap-2 text-[12px] font-medium text-text-dim">
          Comparar com período anterior
          <button
            role="switch"
            aria-checked={compare}
            onClick={() => setCompare((v) => !v)}
            className={
              'relative h-5 w-9 rounded-full transition-colors ' + (compare ? 'accent-gradient' : 'bg-input')
            }
          >
            <span
              className={
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ' +
                (compare ? 'translate-x-4' : 'translate-x-0.5')
              }
            />
          </button>
        </label>
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

      {/* Topo do painel: saúde da conexão */}
      <div className="flex shrink-0 gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
            <Wifi size={13} />
          </span>
          <div>
            <p className="text-lg font-semibold text-text">{healthCounts.online}</p>
            <p className="text-[11px] text-text-faint">Online</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 text-red-400">
            <WifiOff size={13} />
          </span>
          <div>
            <p className="text-lg font-semibold text-text">{healthCounts.offline}</p>
            <p className="text-[11px] text-text-faint">Offline</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
            <RefreshCw size={13} />
          </span>
          <div>
            <p className="text-lg font-semibold text-text">{healthCounts.reconnecting}</p>
            <p className="text-[11px] text-text-faint">Reconectando</p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-3">
        <KpiCard
          icon={<BarChart3 size={13} />}
          label="Volume total"
          value={String(summary?.totalVolume ?? 0)}
          detail={volumeDelta ? volumeDelta.text : 'mensagens no período'}
          deltaPositive={volumeDelta ? volumeDelta.positive : undefined}
        />
        <KpiCard
          icon={<TrendingUp size={13} />}
          label="Instância líder"
          value={summary?.leader ? summary.leader.name : '—'}
          detail={summary?.leader ? `${summary.leader.total} mensagens` : 'sem movimento no período'}
        />
        <KpiCard
          icon={<Users size={13} />}
          label="Média por conta"
          value={summary ? summary.averagePerAccount.toFixed(1) : '0'}
          detail="entre as contas com atividade"
        />
      </div>

      {/*
        Fase 17: "Novas conversas" (pessoas únicas) x "Mensagens" (total),
        contando só conversas individuais — grupos nunca entram aqui (ver
        chatActivityStore.ts). Métrica separada do "Volume total" acima, que
        soma tudo, inclusive grupos, por conta.
      */}
      <div className="flex shrink-0 gap-3">
        <KpiCard
          icon={<UserPlus size={13} />}
          label="Novas conversas"
          value={String(summary?.chatActivity.newConversations ?? 0)}
          detail="pessoas diferentes que mandaram algo novo (sem contar grupos)"
        />
        <KpiCard
          icon={<MessageSquare size={13} />}
          label="Mensagens"
          value={String(summary?.chatActivity.messages ?? 0)}
          detail="total de mensagens novas dessas pessoas"
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <ChartCard title="Movimento por instância">
          {barData.length === 0 ? (
            <EmptyChartState loading={loading} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-surface-hover)' }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: 'var(--color-text)' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={18} fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Horários de pico">
          {timelineData.every((t) => t.count === 0) ? (
            <EmptyChartState loading={loading} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ left: -12, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="hour"
                  interval={2}
                  tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text)' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-accent-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {compare && (
                  <Line
                    type="monotone"
                    dataKey="prevCount"
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
    </Modal>
  );
}

function EmptyChartState({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-[12px] text-text-faint">
      {loading ? 'Carregando…' : 'Sem movimento suficiente neste período ainda.'}
    </div>
  );
}
