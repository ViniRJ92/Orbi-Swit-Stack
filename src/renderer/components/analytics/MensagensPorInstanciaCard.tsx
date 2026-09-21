/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useState } from 'react';
import { Dot, UpdatedAgo, EmptyChartState } from './shared';

/**
 * Fase 71 — "Mensagens por instância": lista com uma barra dividida entre
 * enviadas e recebidas, no lugar do gráfico de barras. Mesmos dados de antes
 * (summary.byAccount), ordenados por volume. Mostra as 6 mais ativas e o
 * "Ver todas" expande para a lista inteira, então nenhuma instância some.
 */
export function MensagensPorInstanciaCard({
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
