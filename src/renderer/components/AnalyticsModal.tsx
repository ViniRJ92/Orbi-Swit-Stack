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
  BarChart3,
  CalendarRange,
  RefreshCw,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
    <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center gap-2 text-text-faint">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-hover text-accent">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-text">{value}</p>
        {detail && (
          <p
            className={
              'mt-1 truncate text-[11.5px] font-light ' +
              (deltaPositive === undefined ? 'text-text-faint' : deltaPositive ? 'text-emerald-400' : 'text-red-400')
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
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <p className="mb-3 shrink-0 text-[12.5px] font-semibold text-text-dim">{title}</p>
      <div className="min-h-0 flex-1">{children}</div>
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
function DailyActivityCard({ title, report }: { title: string; report: ChatActivityDayReport | undefined }) {
  const rows = report?.byAccount ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[13.5px] font-semibold text-text">{title}</p>
        <span className="text-[11.5px] font-light text-text-faint">
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
  const [chatDaily, setChatDaily] = useState<ChatActivityDailySummary | null>(null);

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

  // Fase 28: relatório fixo de Hoje x Ontem — busca independente do
  // seletor de período geral acima (não faz sentido esse relatório
  // "seguir" o filtro de Hoje/7 dias/30 dias/personalizado).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadDaily = async () => {
      try {
        const result = await window.multiwhats.getChatActivityDaily();
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
  }, [open]);

  // Fase 34.1 — Esc fecha o Analytics. Enquanto era um modal, isso vinha
  // pronto do componente Modal; virando página, precisou ser reimplementado
  // aqui. A WebContentsView da instância fica escondida enquanto esta página
  // está aberta, então o foco de teclado é desta janela e o listener pega.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
      {/*
        Barra superior: atalhos rápidos + intervalo customizado + comparação.
        Fase 39: `w-full` + `pb-1` garantem que esta linha ocupe exatamente a
        mesma largura dos cards abaixo e nunca encoste neles — o switch de
        comparação, por ficar no extremo direito, era o primeiro a aparentar
        invadir a borda do card de baixo.
      */}
      <div className="flex w-full shrink-0 flex-wrap items-center gap-3 pb-1">
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

        {/*
          `shrink-0`: sem isto o flex encolhia este bloco abaixo da largura do
          próprio conteúdo (itens de flex encolhem por padrão), e o botão do
          switch — que tem largura fixa — vazava para fora da área da página,
          sobrepondo a borda direita. Com `shrink-0` ele mantém o tamanho e,
          quando não cabe, o `flex-wrap` do pai joga a linha inteira para
          baixo, que é o comportamento certo.
        */}
        <label className="ml-auto flex shrink-0 items-center gap-2 text-[12px] font-medium text-text-dim">
          Comparar com período anterior
          <button
            role="switch"
            aria-checked={compare}
            onClick={() => setCompare((v) => !v)}
            className={
              'relative h-5 w-9 shrink-0 rounded-full transition-colors ' + (compare ? 'accent-gradient' : 'bg-input')
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
      <div className="flex shrink-0 gap-4">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-5 py-3.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
            <Wifi size={13} />
          </span>
          <div>
            <p className="text-xl font-semibold text-text">{healthCounts.online}</p>
            <p className="text-[11px] font-light text-text-faint">Online</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-5 py-3.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 text-red-400">
            <WifiOff size={13} />
          </span>
          <div>
            <p className="text-xl font-semibold text-text">{healthCounts.offline}</p>
            <p className="text-[11px] font-light text-text-faint">Offline</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-5 py-3.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
            <RefreshCw size={13} />
          </span>
          <div>
            <p className="text-xl font-semibold text-text">{healthCounts.reconnecting}</p>
            <p className="text-[11px] font-light text-text-faint">Reconectando</p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-4">
        <KpiCard
          icon={<BarChart3 size={13} />}
          label="Volume total"
          value={String(summary?.totalVolume ?? 0)}
          // Fase 40: a divisão recebidas/enviadas fica sempre visível aqui,
          // e a comparação com o período anterior vai junto quando ligada.
          detail={`${summary?.totalReceived ?? 0} recebidas · ${summary?.totalSent ?? 0} enviadas${
            volumeDelta ? ` · ${volumeDelta.text}` : ''
          }`}
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
        Fase 28: relatório fixo de Hoje x Ontem por instância, separado do
        seletor de período acima de propósito (ver chatActivityStore.ts) —
        "Praça Seca 1 teve 4 novas interações — 13 mensagens", nunca
        misturando os dois dias e nunca contando de novo o que já foi visto.
      */}
      <div className="flex min-h-[190px] shrink-0 gap-4">
        <DailyActivityCard title="Atividade de hoje" report={chatDaily?.today} />
        <DailyActivityCard title="Atividade de ontem" report={chatDaily?.yesterday} />
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <ChartCard title="Movimento por instância">
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
            <div className="h-full overflow-y-auto">
              <div style={{ height: Math.max(barData.length * 34 + 28, 170) }}>
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
                  // Fase 32: sem isto o Recharts descarta rótulos quando o
                  // card fica baixo — aparecia barra sem nome (duas barras,
                  // um nome só), fazendo parecer que a instância líder do
                  // card ao lado nem estava no gráfico.
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
                  fatia arredonda a ponta direita, para a barra parecer uma
                  peça só.
                */}
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={22}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: 'var(--color-text-faint)' }}
                />
                <Bar dataKey="received" stackId="dir" name="Recebidas" maxBarSize={22} fill="var(--color-accent)" />
                <Bar dataKey="sent" stackId="dir" name="Enviadas" radius={[0, 4, 4, 0]} maxBarSize={22} fill="#8B6FF5" />
              </BarChart>
            </ResponsiveContainer>
              </div>
            </div>
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
