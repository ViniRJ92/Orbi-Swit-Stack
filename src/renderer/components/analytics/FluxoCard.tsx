/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsPeriod } from '../../types';
import { Dot, LegendItem, CHART_TOOLTIP_STYLE, EmptyChartState } from './shared';
import { SeletorPeriodo, OPCOES_PERIODO } from './SeletorPeriodo';

/**
 * Fase 71 — "Fluxo de mensagens": a mesma série por hora de antes
 * (summary.timeline), agora em área, com o horário de pico no rodapé. O
 * seletor de período deste card é o MESMO estado da barra de filtros do
 * topo; trocar aqui ou lá dá no mesmo. O comparativo com o período anterior
 * continua como linha tracejada.
 */
export function FluxoCard({
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
