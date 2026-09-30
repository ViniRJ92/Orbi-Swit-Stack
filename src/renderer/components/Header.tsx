/**
 * Cabeçalho superior. Orbi — Criado por Vinicius Braga
 *
 * Fase 50: o botão "Sobre" saiu daqui. As informações institucionais viraram
 * uma aba dentro de Configurações, e o lugar dele no topo passou a ser do
 * botão "Ajuda", que abre o manual de uso.
 */
import { useEffect, useState } from 'react';
import { Settings, HelpCircle, LayoutGrid, Search, BarChart3, RotateCw, CalendarDays, ArrowLeft, ArrowRight } from 'lucide-react';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Fase 95 — dia e hora à esquerda na faixa de cima ("Ter, 29 set | 14:41"),
 * escolha do usuário na prévia de 2026-09-29. Sem segundos: atualiza na
 * virada de cada minuto. Não é clicável, então a faixa continua servindo
 * para arrastar a janela por cima dela também.
 */
function DataHora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const primeiro = setTimeout(() => {
      setAgora(new Date());
      intervalo = setInterval(() => setAgora(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);
    return () => {
      clearTimeout(primeiro);
      if (intervalo) clearInterval(intervalo);
    };
  }, []);
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface/60 px-2.5 py-[3px] text-[11.5px] text-text-dim">
      <CalendarDays size={12} />
      <span>
        {DIAS[agora.getDay()]}, {agora.getDate()} {MESES[agora.getMonth()]}
      </span>
      <span className="h-3 w-px bg-border" aria-hidden />
      <span className="font-semibold tabular-nums text-text">{hora}</span>
    </div>
  );
}

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
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
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
  /** Fase 96: voltar/avançar página na instância visível (também Alt+← / Alt+→). */
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
}) {
  const botaoSeta =
    'flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-surface-hover hover:text-text disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-dim';
  return (
    <header
      className="flex h-8 min-h-[32px] items-center justify-between border-b border-border bg-header px-4 py-0 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Fase 96: voltar/avançar página, antes do dia e hora (Fase 95). */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button className={botaoSeta} onClick={onGoBack} disabled={!canGoBack} title="Voltar (Alt+←)">
            <ArrowLeft size={15} />
          </button>
          <button className={botaoSeta} onClick={onGoForward} disabled={!canGoForward} title="Avançar (Alt+→)">
            <ArrowRight size={15} />
          </button>
        </div>
        <DataHora />
      </div>
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
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
