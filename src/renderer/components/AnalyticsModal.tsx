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
  CircleDashed,
  Download,
  Gauge,
  Radio,
  RefreshCw,
  RotateCcw,
  Trophy,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '../store/useAppStore';
import {
  AccountStatus,
  AnalyticsPeriod,
  AnalyticsRange,
  AnalyticsSummary,
  ChatActivityDailySummary,
  ChatActivityDayReport,
  InteractionCategory,
  InteractionClassificationSummary,
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
 * Fase 71 — "Mensagens por instância": lista com uma barra dividida entre
 * enviadas e recebidas, no lugar do gráfico de barras. Mesmos dados de antes
 * (summary.byAccount), ordenados por volume. Mostra as 6 mais ativas e o
 * "Ver todas" expande para a lista inteira, então nenhuma instância some.
 */
function MensagensPorInstanciaCard({
  dados,
  loading,
  updatedAt,
  totalVolume,
}: {
  dados: { name: string; total: number; received: number; sent: number; color: string }[];
  loading: boolean;
  updatedAt: number | null;
  totalVolume: number;
}) {
  const [verTodas, setVerTodas] = useState(false);
  const LIMITE = 6;
  const ordenados = [...dados].sort((a, b) => b.total - a.total);
  const visiveis = verTodas ? ordenados : ordenados.slice(0, LIMITE);
  const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);

  return (
    <div className="flex min-h-[350px] min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
          <Dot color="var(--color-accent)" />
          Mensagens por instância
        </p>
        {ordenados.length > LIMITE && (
          <button onClick={() => setVerTodas((v) => !v)} className="text-[12px] font-medium text-accent hover:underline">
            {verTodas ? 'Ver menos' : 'Ver todas'}
          </button>
        )}
      </div>

      {ordenados.length === 0 ? (
        <div className="min-h-0 flex-1">
          <EmptyChartState loading={loading} />
        </div>
      ) : (
        <div className="mw-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {visiveis.map((a, i) => {
            const pe = pct(a.sent, a.total);
            const pr = pct(a.received, a.total);
            return (
              <div key={a.name + i} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <Dot color={a.color} />
                    <span className="truncate font-medium text-text">{a.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-dim">
                    <span className="font-semibold text-text">{a.total}</span> total ({a.sent} env / {a.received} rec)
                  </span>
                </div>
                <div className="flex h-3.5 overflow-hidden rounded-sm bg-input text-[9.5px] font-semibold leading-[14px]">
                  {a.sent > 0 && (
                    <div
                      className="overflow-hidden whitespace-nowrap px-1 text-white/90"
                      style={{ width: `${pe}%`, background: '#8B6FF5' }}
                      title={`${a.sent} enviadas`}
                    >
                      {pe}%
                    </div>
                  )}
                  {a.received > 0 && (
                    <div
                      className="overflow-hidden whitespace-nowrap px-1 text-right text-accent-contrast"
                      style={{ width: `${pr}%`, background: 'var(--color-accent)' }}
                      title={`${a.received} recebidas`}
                    >
                      {pr}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex shrink-0 items-center justify-between gap-3 text-[11.5px]">
        <span className="min-w-0 truncate text-text-dim">
          {verTodas
            ? `Exibindo todas as ${ordenados.length} instâncias`
            : `Exibindo as ${Math.min(LIMITE, ordenados.length)} instâncias mais ativas`}
          {updatedAt !== null && (
            <span className="text-text-faint">
              {' · '}
              <UpdatedAgo at={updatedAt} />
            </span>
          )}
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-accent">Total: {totalVolume} msgs no período</span>
      </div>
    </div>
  );
}

/**
 * Fase 71 — "Fluxo de mensagens": a mesma série por hora de antes
 * (summary.timeline), agora em área, com o horário de pico no rodapé. O
 * seletor de período deste card é o MESMO estado da barra de filtros do
 * topo; trocar aqui ou lá dá no mesmo. O comparativo com o período anterior
 * continua como linha tracejada.
 */
function FluxoCard({
  dados,
  compare,
  loading,
  quick,
  onQuick,
}: {
  dados: { hour: string; count: number; prevCount?: number }[];
  compare: boolean;
  loading: boolean;
  quick: AnalyticsPeriod;
  onQuick: (p: AnalyticsPeriod) => void;
}) {
  const pico = useMemo(() => {
    let melhor: { hora: number; max: number } | null = null;
    for (const d of dados) {
      if (d.count > (melhor?.max ?? 0)) melhor = { hora: parseInt(d.hour, 10), max: d.count };
    }
    return melhor;
  }, [dados]);
  const p2 = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex min-h-[350px] min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
          <Dot color="var(--color-accent-2)" />
          Fluxo de mensagens
        </p>
        <div className="flex items-center gap-3">
          {compare && (
            <div className="flex items-center gap-3 text-[11px] text-text-dim">
              <LegendItem kind="line" color="var(--color-accent-2)" label="Atual" />
              <LegendItem kind="dashed" color="var(--color-text-faint)" label="Anterior" />
            </div>
          )}
          <SeletorPeriodo opcoes={OPCOES_PERIODO} valor={quick} onChange={onQuick} ariaLabel="Período do gráfico" />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {dados.every((t) => t.count === 0) ? (
          <EmptyChartState loading={loading} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ left: 0, right: 12, top: 16, bottom: 4 }}>
              <defs>
                <linearGradient id="fluxoGradiente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: 'var(--color-accent-2)', stopOpacity: 0.35 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--color-accent-2)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="hour"
                interval={2}
                tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              {/* Fase 45: topo da escala 20% acima do maior valor (mínimo 4). */}
              <YAxis hide allowDecimals={false} domain={[0, (dataMax: number) => Math.max(4, Math.ceil((dataMax || 0) * 1.2))]} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text)' }} />
              <Area
                type="monotone"
                dataKey="count"
                name="Atual"
                stroke="var(--color-accent-2)"
                strokeWidth={2}
                fill="url(#fluxoGradiente)"
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
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {pico && (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3 text-[12px]">
          <span className="text-text-dim">
            Pico registrado entre {p2(pico.hora)}:00 e {p2((pico.hora + 1) % 24)}:00
          </span>
          <span className="font-semibold tabular-nums text-accent">{pico.max} msgs nesse horário</span>
        </div>
      )}
    </div>
  );
}

/**
 * Fase 71 — "Atividade das instâncias": um card só, com Hoje e Ontem
 * alternáveis (Hoje ao abrir). Os relatórios são os mesmos de sempre
 * (chatDaily.today e chatDaily.yesterday, ver chatActivityStore.ts), só
 * exibidos um de cada vez: as linhas se dividem em duas colunas iguais e o
 * total atravessa o card. Nenhuma linha é descartada: com mais de 10
 * instâncias, cada coluna fica com a metade.
 */
function AtividadeCard({
  hoje,
  ontem,
}: {
  hoje: ChatActivityDayReport | undefined;
  ontem: ChatActivityDayReport | undefined;
}) {
  const [dia, setDia] = useState<'hoje' | 'ontem'>('hoje');
  const report = dia === 'hoje' ? hoje : ontem;
  const rows = report?.byAccount ?? [];
  const meio = Math.ceil(rows.length / 2);
  const colunas = [rows.slice(0, meio), rows.slice(meio)];

  const tabela = (lista: ChatActivityDayReport['byAccount']) => (
    <table className="w-full table-fixed border-collapse text-[12.5px]">
      <colgroup>
        <col style={{ width: '36%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
      </colgroup>
      <thead>
        <tr className="text-[10.5px] font-medium uppercase tracking-wide text-text-faint">
          <th className="pb-2 pr-2 text-left font-medium">Instância</th>
          <th className="pb-2 px-1.5 text-right font-medium">Interações</th>
          <th className="pb-2 px-1.5 text-right font-medium">Recebidas</th>
          <th className="pb-2 px-1.5 text-right font-medium">Enviadas</th>
          <th className="pb-2 pl-1.5 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((a) => (
          <tr key={a.accountId} className="border-t border-border/60">
            <td className="py-2.5 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="truncate font-medium text-text">{a.name}</span>
              </div>
            </td>
            <td className="py-2.5 px-1.5 text-right tabular-nums text-text-dim">{a.newConversations}</td>
            <td className="py-2.5 px-1.5 text-right tabular-nums text-accent">{a.received}</td>
            <td className="py-2.5 px-1.5 text-right tabular-nums" style={{ color: '#8B6FF5' }}>
              {a.sent}
            </td>
            <td className="py-2.5 pl-1.5 text-right font-semibold tabular-nums text-text">{a.messages}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-text">
            <Dot color="var(--color-accent)" />
            Atividade das instâncias
          </p>
          <p className="mt-1 text-[12px] text-text-dim">
            {report?.totalConversations ?? 0} interações · {report?.totalMessages ?? 0} mensagens registradas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Fase 78: mesmo seletor do topo. Aqui só Hoje e Ontem, que é a regra deste relatório (ver Fase 28). */}
          <SeletorPeriodo
            opcoes={[
              { key: 'hoje', label: 'Hoje' },
              { key: 'ontem', label: 'Ontem' },
            ]}
            valor={dia}
            onChange={setDia}
            ariaLabel="Dia do relatório"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-center text-[12px] font-light text-text-faint">
          Sem novas interações.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 rounded-lg border border-border p-3">{tabela(colunas[0])}</div>
          <div className="min-w-0 rounded-lg border border-border p-3">{tabela(colunas[1])}</div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center rounded-lg bg-input px-4 py-3 text-[13px] font-semibold tabular-nums">
        <span className="truncate text-accent">
          Total {dia === 'hoje' ? 'Hoje' : 'Ontem'} ({rows.length} {rows.length === 1 ? 'instância' : 'instâncias'})
        </span>
        <span className="text-right text-text" title="Interações">
          {report?.totalConversations ?? 0}
        </span>
        <span className="text-right text-accent" title="Recebidas">
          {report?.totalReceived ?? 0}
        </span>
        <span className="text-right" style={{ color: '#8B6FF5' }} title="Enviadas">
          {report?.totalSent ?? 0}
        </span>
        <span className="text-right text-text" title="Total">
          {report?.totalMessages ?? 0}
        </span>
      </div>
    </div>
  );
}

/**
 * Fase 77 — Classificação das Interações. Camada separada: os números vêm de
 * mw:get-interaction-classification (interactionClassification.ts) e nunca
 * substituem Interações, Recebidas, Enviadas ou Total. A soma das cinco
 * categorias é, por construção, o total de interações do período.
 */
const CLASSIFICACAO: { key: InteractionCategory; label: string; hint: string; color: string; Icon: typeof UserPlus }[] = [
  { key: 'nova', label: 'Novas', hint: 'Primeiro contato registrado', color: '#25D366', Icon: UserPlus },
  { key: 'recorrente', label: 'Recorrentes', hint: 'Já falou antes e voltou', color: '#1FB8A8', Icon: RefreshCw },
  { key: 'frequente', label: 'Frequentes', hint: 'Fala com regularidade', color: '#8B6FF5', Icon: Zap },
  { key: 'esporadica', label: 'Esporádicas', hint: 'Aparece com intervalos longos', color: '#F29A38', Icon: CircleDashed },
  { key: 'reativada', label: 'Reativadas', hint: 'Voltou após ficar inativo', color: '#3AA0E8', Icon: RotateCcw },
];

function ClassificacaoCard({
  dados,
  anterior,
  quick,
  onQuick,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
}: {
  dados: InteractionClassificationSummary | null;
  anterior: InteractionClassificationSummary | null;
  /** Mesmo seletor de período do topo, como no card "Fluxo de mensagens". */
  quick: AnalyticsPeriod;
  onQuick: (p: AnalyticsPeriod) => void;
  /** Datas do Personalizado — as mesmas do topo, editáveis também aqui. */
  customStart: string;
  customEnd: string;
  onCustomStart: (v: string) => void;
  onCustomEnd: (v: string) => void;
}) {
  const total = dados?.total ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-text">
            <Dot color="var(--color-accent)" />
            Classificação das interações
          </p>
          <p className="mt-1 text-[12px] text-text-dim">
            As mesmas {total} {total === 1 ? 'interação' : 'interações'} do período, separadas pelo histórico de cada contato. Não é contagem de mensagens.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {quick === 'custom' && (
            <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => onCustomStart(e.target.value)}
                aria-label="Data inicial da classificação"
                className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
              />
              <span>até</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={dateInputValue(0)}
                onChange={(e) => onCustomEnd(e.target.value)}
                aria-label="Data final da classificação"
                className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
              />
            </div>
          )}
          <SeletorPeriodo opcoes={OPCOES_PERIODO} valor={quick} onChange={onQuick} ariaLabel="Período da classificação" />
        </div>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center py-8 text-center text-[12px] font-light text-text-faint">
          Sem interações no período.
        </div>
      ) : (
        <>
          <div>
            <div className="flex h-1.5 gap-1">
              {CLASSIFICACAO.filter((c) => (dados?.counts[c.key] ?? 0) > 0).map((c) => (
                <div key={c.key} className="rounded-full" style={{ flexGrow: dados!.counts[c.key], background: c.color }} />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11.5px]">
              {CLASSIFICACAO.map((c) => (
                <span key={c.key} className="flex items-center gap-1.5" style={{ color: c.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                  {c.label}: {pct(dados!.counts[c.key])}% ({dados!.counts[c.key]})
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {CLASSIFICACAO.map(({ key, label, hint, color, Icon }) => {
              const n = dados!.counts[key];
              const diff = anterior ? n - anterior.counts[key] : null;
              return (
                <div key={key} className="rounded-lg border border-border bg-input px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
                      <Icon size={13} />
                      {label}
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums" style={{ color, background: color + '22' }}>
                      {pct(n)}%
                    </span>
                  </div>
                  <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums" style={{ color }}>
                    {n}
                  </p>
                  <p className="mt-2 text-[11.5px] text-text-dim">{hint}</p>
                  {diff !== null && (
                    <p className="mt-1 text-[11px] tabular-nums text-text-faint">
                      {diff > 0 ? '+' : ''}
                      {diff} vs anterior
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full table-fixed border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-input text-[10.5px] font-semibold uppercase tracking-wide">
                  <th className="w-[24%] px-3 py-2.5 text-left text-text-faint">Instância</th>
                  {CLASSIFICACAO.map((c) => (
                    <th key={c.key} className="truncate px-2 py-2.5 text-right" style={{ color: c.color }}>
                      {c.label}
                    </th>
                  ))}
                  <th className="truncate px-3 py-2.5 text-right text-text-faint">Interações</th>
                </tr>
              </thead>
              <tbody>
                {dados!.byAccount.map((a) => (
                  <tr key={a.accountId} className="border-t border-border/60">
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span className="truncate font-medium text-text">{a.name}</span>
                      </div>
                    </td>
                    {CLASSIFICACAO.map((c) => {
                      const x = a.counts[c.key];
                      return (
                        <td key={c.key} className="px-2 py-2.5 text-right tabular-nums" style={x ? { color: c.color } : undefined}>
                          <span className={x ? 'font-medium' : 'text-text-faint'}>{x}</span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-text">{a.total}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-input font-semibold">
                  <td className="truncate px-3 py-2.5 text-accent">
                    Total ({dados!.byAccount.length} {dados!.byAccount.length === 1 ? 'instância' : 'instâncias'})
                  </td>
                  {CLASSIFICACAO.map((c) => (
                    <td key={c.key} className="px-2 py-2.5 text-right tabular-nums" style={{ color: c.color }}>
                      {dados!.counts[c.key]}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular-nums text-text">{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Fase 78 — o seletor de período do topo, extraído sem mudar o visual, para
 * que todo lugar do Analytics que escolhe período use exatamente o mesmo
 * componente (topo, Fluxo de mensagens, Atividade das instâncias e
 * Classificação das interações). Cada seção continua com as próprias opções.
 */
function SeletorPeriodo<K extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
}: {
  opcoes: { key: K; label: string; icon?: React.ReactNode }[];
  valor: K;
  onChange: (k: K) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-1 rounded-lg bg-input p-1">
      {opcoes.map((o) => (
        <button
          key={o.key}
          aria-pressed={valor === o.key}
          className={
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ' +
            (valor === o.key ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
          }
          onClick={() => onChange(o.key)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const OPCOES_PERIODO: { key: AnalyticsPeriod; label: string; icon?: React.ReactNode }[] = [
  ...PERIODS,
  { key: 'custom', label: 'Personalizado', icon: <CalendarRange size={13} /> },
];

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
  const [classification, setClassification] = useState<InteractionClassificationSummary | null>(null);
  const [prevClassification, setPrevClassification] = useState<InteractionClassificationSummary | null>(null);
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

  // Fase 77 — Classificação das Interações: busca própria, com o mesmo
  // período, comparação e agrupamento dos cards acima. Não mexe no `load`
  // das métricas existentes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadClassification = async () => {
      try {
        const range = currentRange();
        const result = await window.multiwhats.getInteractionClassification(range, groupFilter);
        if (cancelled) return;
        setClassification(result);
        if (compare) {
          const prevResult = await window.multiwhats.getInteractionClassification(previousRange(range), groupFilter);
          if (!cancelled) setPrevClassification(prevResult);
        } else {
          setPrevClassification(null);
        }
      } catch {
        // Silencioso — o card mostra "Sem interações no período" se isto falhar.
      }
    };
    loadClassification();
    const interval = setInterval(loadClassification, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quick, customStart, customEnd, compare, groupFilter]);

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
        <SeletorPeriodo opcoes={OPCOES_PERIODO} valor={quick} onChange={setQuick} ariaLabel="Período" />

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

      {/* Fase 71 — os dois cards de cima, lado a lado, na disposição da referência. */}
      <div className="flex shrink-0 gap-4">
        <MensagensPorInstanciaCard
          dados={barData}
          loading={loading}
          updatedAt={updatedAt}
          totalVolume={summary?.totalVolume ?? 0}
        />
        <FluxoCard dados={timelineData} compare={compare} loading={loading} quick={quick} onQuick={setQuick} />
      </div>

      {/*
        Fase 28: relatório fixo de Hoje x Ontem por instância, separado do
        seletor de período acima de propósito (ver chatActivityStore.ts),
        nunca misturando os dois dias e nunca contando de novo o que já foi
        visto. Fase 71: um card só, com Hoje e Ontem alternáveis.
      */}
      <AtividadeCard hoje={chatDaily?.today} ontem={chatDaily?.yesterday} />

      {/* Fase 77 — Classificação das Interações, camada separada das métricas acima. */}
      <ClassificacaoCard
        dados={classification}
        anterior={compare ? prevClassification : null}
        quick={quick}
        onQuick={setQuick}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStart={setCustomStart}
        onCustomEnd={setCustomEnd}
      />

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
