/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */


/**
 * Fase 64 — card de indicador no novo arranjo: rótulo à esquerda e ícone à
 * direita no topo, o valor no meio e uma linha de detalhe no rodapé. O
 * detalhe deixou de ser cinza fino, que quase não se lia.
 */
export function KpiCard({
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
