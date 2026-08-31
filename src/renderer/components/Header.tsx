/**
 * Cabeçalho superior. Orbi — Criado por Vinicius Braga
 *
 * Fase 50: o botão "Sobre" saiu daqui. As informações institucionais viraram
 * uma aba dentro de Configurações, e o lugar dele no topo passou a ser do
 * botão "Ajuda", que abre o manual de uso.
 */
import { Settings, HelpCircle, LayoutGrid, Search, BarChart3, RotateCw, CalendarDays } from 'lucide-react';

export function Header({
  onOpenHelp,
  onOpenCalendar,
  onOpenSettings,
  onOpenDashboard,
  onOpenPalette,
  onOpenAnalytics,
  onReloadActive,
  canReload,
  hasUpdate,
}: {
  /** Fase 50: abre o manual de uso (HelpModal). */
  onOpenHelp: () => void;
  /** Fase 54: abre a Agenda. */
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onOpenPalette: () => void;
  onOpenAnalytics: () => void;
  /** Fase 31: recarrega a instância em exibição (mesmo efeito de F5 / Ctrl+R). */
  onReloadActive: () => void;
  /** Fase 31: só há o que recarregar quando alguma instância está aberta. */
  canReload: boolean;
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
        {/* Fase 54: Agenda fica logo depois do Analytics, como pedido. */}
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onOpenCalendar}
          title="Agenda"
        >
          <CalendarDays size={14} />
          Agenda
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-dim"
          onClick={onReloadActive}
          disabled={!canReload}
          title={canReload ? 'Recarregar esta instância (F5)' : 'Nenhuma instância aberta para recarregar'}
        >
          <RotateCw size={14} />
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
          onClick={onOpenHelp}
          title="Manual de uso do aplicativo"
        >
          <HelpCircle size={14} />
          Ajuda
        </button>
      </div>
    </header>
  );
}
