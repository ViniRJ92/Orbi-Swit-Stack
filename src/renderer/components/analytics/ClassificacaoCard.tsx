/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { CircleDashed, RefreshCw, RotateCcw, UserPlus, Zap } from 'lucide-react';
import { AnalyticsPeriod, InteractionCategory, InteractionClassificationSummary } from '../../types';
import { dateInputValue } from '../../analyticsRange';
import { Dot } from './shared';
import { SeletorPeriodo, OPCOES_PERIODO } from './SeletorPeriodo';

/**
 * Fase 77 — Classificação das Interações. Camada separada: os números vêm de
 * mw:get-interaction-classification (interactionClassification.ts) e nunca
 * substituem Interações, Recebidas, Enviadas ou Total. A soma das cinco
 * categorias é, por construção, o total de interações do período.
 */
export const CLASSIFICACAO: { key: InteractionCategory; label: string; hint: string; color: string; Icon: typeof UserPlus }[] = [
  { key: 'nova', label: 'Novas', hint: 'Primeiro contato registrado', color: '#25D366', Icon: UserPlus },
  { key: 'recorrente', label: 'Recorrentes', hint: 'Já falou antes e voltou', color: '#1FB8A8', Icon: RefreshCw },
  { key: 'frequente', label: 'Frequentes', hint: 'Fala com regularidade', color: '#8B6FF5', Icon: Zap },
  { key: 'esporadica', label: 'Esporádicas', hint: 'Aparece com intervalos longos', color: '#F29A38', Icon: CircleDashed },
  { key: 'reativada', label: 'Reativadas', hint: 'Voltou após ficar inativo', color: '#3AA0E8', Icon: RotateCcw },
];

export function ClassificacaoCard({
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
