/**
 * Paleta de comando (Ctrl+K): busca rápida por nome/telefone salvo da conta
 * e troca direto para ela, sem precisar do mouse. Não lê nem busca dentro
 * do conteúdo do WhatsApp Web — só nos metadados da conta (nome/telefone
 * que o próprio usuário cadastrou), os mesmos já usados na busca da sidebar.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Star, CornerDownLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useFilteredAccounts } from '../useFilteredAccounts';
import { ServiceGlyph } from './ServiceIcon';
import { accountStatusLabel } from '../accountStatusLabel';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useAppStore((s) => s.accounts);
  const statuses = useAppStore((s) => s.statuses);
  const switchAccount = useAppStore((s) => s.switchAccount);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useFilteredAccounts(accounts, statuses, query, 'all');

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (id: string) => {
    switchAccount(id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const acc = results[activeIndex];
      if (acc) select(acc.id);
    }
  };

  const hint = useMemo(() => (query ? `${results.length} resultado(s)` : 'Digite para buscar por nome ou telefone'), [
    query,
    results.length,
  ]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-start justify-center bg-overlay pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="flex w-[440px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search size={15} className="text-text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ir para uma conta..."
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
              />
              <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[10px] text-text-faint">Esc</kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-text-faint">{hint}</div>
              ) : (
                results.map((acc, i) => {
                  const status = statuses.get(acc.id);
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={acc.id}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => select(acc.id)}
                      className={
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ' +
                        (isActive ? 'bg-accent/10' : 'hover:bg-surface-hover')
                      }
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
                        style={{ background: acc.iconDataUrl ? 'transparent' : acc.color }}
                      >
                        {acc.iconDataUrl ? (
                          <img src={acc.iconDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ServiceGlyph service={acc.service} size={13} color="#fff" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 truncate text-[13px] text-text">
                          {acc.favorite && <Star size={10} className="shrink-0 text-accent" fill="currentColor" />}
                          <span className="truncate">{acc.name}</span>
                        </div>
                        <div className="truncate text-[11px] text-text-dim">{accountStatusLabel(acc, status)}</div>
                      </div>
                      {isActive && <CornerDownLeft size={13} className="shrink-0 text-text-faint" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
