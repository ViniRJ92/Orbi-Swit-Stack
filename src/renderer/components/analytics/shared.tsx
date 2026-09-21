/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useEffect, useState } from 'react';

export const PERIODS: { key: 'today' | '7d' | '30d'; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
];

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

/**
 * Fase 64 — variação percentual do volume contra o período anterior, no
 * formato curto do card ("-90.9% vs anterior"). Sem base anterior não existe
 * porcentagem, então mostra a diferença absoluta.
 */
export function formatDelta(current: number, previous: number): { text: string; positive: boolean } | null {
  if (previous === 0) {
    if (current === 0) return { text: 'igual ao anterior', positive: true };
    return { text: `+${current} vs anterior`, positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(1)}% vs anterior`, positive: pct >= 0 };
}

/** Bolinha de cor usada nas legendas e nos rodapés dos cards. */
export function Dot({ color, className = '' }: { color?: string; className?: string }) {
  return (
    <span
      className={'inline-block h-1.5 w-1.5 shrink-0 rounded-full ' + className}
      style={color ? { background: color } : undefined}
      aria-hidden
    />
  );
}

/** Item de legenda no cabeçalho dos gráficos. */
export function LegendItem({ color, label, kind }: { color: string; label: string; kind: 'square' | 'line' | 'dashed' }) {
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
export function UpdatedAgo({ at }: { at: number | null }) {
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
export function formatDateBR(ts: number): string {
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
export function ChartCard({
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

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--color-surface-hover)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-text)',
};

export function EmptyChartState({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-[12px] text-text-faint">
      {loading ? 'Carregando…' : 'Sem movimento suficiente neste período ainda.'}
    </div>
  );
}
