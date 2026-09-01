/**
 * Seletor de filtro por estado das contas (Todas / Conectadas / Suspensas /
 * Erro) no formato de menu suspenso. Orbi — Criado por Vinicius Braga
 *
 * Fase 56: substitui as antigas abas horizontais da barra lateral. Motivo:
 * eram quatro botões numa faixa muito estreita, então em barra lateral fina
 * a faixa precisava deslizar na horizontal e os rótulos ficavam cortados
 * (paliativo da Fase 41). Um seletor único ocupa a largura inteira do
 * contêiner em qualquer largura de sidebar, sem cortar texto.
 *
 * A LÓGICA DE FILTRAGEM NÃO MUDA: continua sendo `FILTERS` + `matchesFilter`
 * de useFilteredAccounts.ts. Este componente só troca a forma de escolher.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FILTERS, FilterKey } from '../useFilteredAccounts';

export function AccountFilterSelect({
  value,
  onChange,
  counts,
  className = '',
  compact = false,
}: {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
  /** Quantas instâncias existem em cada estado (ver `filterCounts` na Sidebar). */
  counts: Record<FilterKey, number>;
  /** Largura/posicionamento ficam a cargo de quem usa (a sidebar passa `w-full`). */
  className?: string;
  /** Barra no modo "Topo": a faixa é baixa, então o controle vem menor. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = FILTERS.find((f) => f.key === value) ?? FILTERS[0];

  // Fecha ao clicar fora. `mousedown` (e não `click`) para o menu já sumir no
  // apertar do botão, sem piscar junto com o clique que abriu outra coisa.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Esc fecha só o menu. `stopPropagation` para o Esc não vazar e fechar
  // alguma tela por baixo junto (mesmo cuidado já adotado na Fase 50).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const texto = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div ref={containerRef} className={'relative ' + className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Filtrar por estado: ${selected.selectedLabel}`}
        className={
          // `w-full` + `min-w-0` + `truncate` no rótulo: em barra lateral
          // estreita o texto encurta com reticências em vez de estourar o
          // contêiner ou empurrar o contador para fora.
          'flex w-full min-w-0 items-center gap-1.5 rounded-lg border bg-input px-2 text-left transition-colors ' +
          (compact ? 'py-1 ' : 'py-1.5 ') +
          texto +
          ' ' +
          (open ? 'border-accent text-text' : 'border-border text-text hover:border-border-strong')
        }
      >
        <span className="min-w-0 flex-1 truncate">{selected.selectedLabel}</span>
        <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-px text-[10px] font-medium text-text-dim">
          {counts[selected.key]}
        </span>
        <ChevronDown
          size={compact ? 12 : 13}
          className={'shrink-0 text-text-faint transition-transform ' + (open ? 'rotate-180' : '')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {FILTERS.map((f) => {
            const ativo = f.key === value;
            return (
              <button
                key={f.key}
                type="button"
                role="option"
                aria-selected={ativo}
                onClick={() => {
                  onChange(f.key);
                  setOpen(false);
                }}
                className={
                  'flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors ' +
                  texto +
                  ' ' +
                  (ativo ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover hover:text-text')
                }
              >
                <Check size={12} className={'shrink-0 ' + (ativo ? '' : 'opacity-0')} />
                <span className="min-w-0 flex-1 truncate">{f.selectedLabel}</span>
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-text-faint">{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
