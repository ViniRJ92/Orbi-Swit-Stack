/**
 * Cabeçalho superior. Orbi Swit Stack — Criado por Vinicius Braga
 */
import { Settings, Info, LayoutGrid, Search, BarChart3 } from 'lucide-react';

export function Header({
  onOpenAbout,
  onOpenSettings,
  onOpenDashboard,
  onOpenPalette,
  onOpenAnalytics,
  hasUpdate,
}: {
  onOpenAbout: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onOpenPalette: () => void;
  onOpenAnalytics: () => void;
  /** Fase 27: acende um ponto vermelho sobre "Configurações" quando há uma atualização disponível/baixada. */
  hasUpdate?: boolean;
}) {
  return (
    <header
      className="flex h-8 min-h-[32px] items-center justify-end border-b border-border bg-header px-4 py-0 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenPalette}
          title="Buscar e trocar de conta (Ctrl+K)"
        >
          <Search size={14} />
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenAnalytics}
          title="Analytics"
        >
          <BarChart3 size={14} />
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenDashboard}
        >
          <LayoutGrid size={14} />
          Gerenciar contas
        </button>
        <button
          className="relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenSettings}
          title={hasUpdate ? 'Há uma atualização disponível' : undefined}
        >
          <Settings size={14} />
          Configurações
          {hasUpdate && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-header" />
          )}
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenAbout}
        >
          <Info size={14} />
          Sobre
        </button>
      </div>
    </header>
  );
}
