/**
 * Tela de gerenciamento de contas: visão em grade de todas as contas, com
 * busca, filtros, ordenação, seleção múltipla e ações em lote. Diferente dos
 * modais pequenos (Modal.tsx), ocupa a tela quase inteira porque lista até
 * MAX_ACCOUNTS contas (ver main/accountManager.ts) com mais detalhes do que
 * cabe na barra lateral.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Search,
  Star,
  Pause,
  RotateCw,
  Trash2,
  ExternalLink,
  CheckSquare,
  Square,
  LayoutGrid,
  ArrowDownAZ,
  Clock,
  Activity,
} from 'lucide-react';
import { AccountRecord } from '../types';
import { useAppStore } from '../store/useAppStore';
import { FILTERS, FilterKey, useFilteredAccounts } from '../useFilteredAccounts';
import { ServiceGlyph } from './ServiceIcon';
import { accountStatusLabel } from '../accountStatusLabel';

type SortKey = 'order' | 'name' | 'created' | 'status';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'order', label: 'Padrão', icon: <LayoutGrid size={13} /> },
  { key: 'name', label: 'Nome', icon: <ArrowDownAZ size={13} /> },
  { key: 'created', label: 'Criação', icon: <Clock size={13} /> },
  { key: 'status', label: 'Status', icon: <Activity size={13} /> },
];

export function AccountsDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useAppStore((s) => s.accounts);
  const appInfo = useAppStore((s) => s.appInfo);
  const statuses = useAppStore((s) => s.statuses);
  const switchAccount = useAppStore((s) => s.switchAccount);
  const suspendAccount = useAppStore((s) => s.suspendAccount);
  const reloadAccount = useAppStore((s) => s.reloadAccount);
  const removeAccountWithConfirm = useAppStore((s) => s.removeAccountWithConfirm);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const reorderAccounts = useAppStore((s) => s.reorderAccounts);
  const groups = useAppStore((s) => s.groups);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const filteredByQuery = useFilteredAccounts(accounts, statuses, query, filter);
  const knownGroupIds = new Set(groups.map((g) => g.id));
  const filtered = filteredByQuery.filter((a) => {
    if (groupFilter === 'all') return true;
    if (groupFilter === '__none__') return !a.groupId || !knownGroupIds.has(a.groupId);
    return a.groupId === groupFilter;
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === 'created') list.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortKey === 'status') {
      const rank = (id: string) => {
        const st = statuses.get(id);
        if (st?.loadError) return 0;
        if (st?.isOnline) return 1;
        if (st?.suspended) return 3;
        return 2;
      };
      list.sort((a, b) => rank(a.id) - rank(b.id));
    }
    return list;
  }, [filtered, sortKey, statuses]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDrop = (targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      const ids = sorted.map((a) => a.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        reorderAccounts(ids);
      }
    }
    setDraggedId(null);
    setOverId(null);
  };

  const selectAll = () => setSelected(new Set(sorted.map((a) => a.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkSuspend = async () => {
    for (const id of selected) {
      const st = statuses.get(id);
      if (st?.loaded) await suspendAccount(id);
    }
    clearSelection();
  };

  const bulkRemove = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Remover ${selected.size} conta(s) selecionada(s)?\n\nIsso apaga permanentemente os dados de sessão dessas contas.`
    );
    if (!confirmed) return;
    for (const id of selected) {
      await removeAccountWithConfirm(id, accounts.find((a) => a.id === id)?.name ?? '');
    }
    clearSelection();
  };

  const openAccount = (id: string) => {
    switchAccount(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="flex h-full w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">
                  <LayoutGrid size={15} />
                </span>
                <h2 className="text-[15px] font-semibold text-text">Gerenciar contas</h2>
                <span className="rounded-full bg-input px-2 py-0.5 text-[11px] font-medium text-text-dim">
                  {accounts.length}/{appInfo?.maxAccounts ?? 30}
                </span>
              </div>
              <button
                className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
                onClick={onClose}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <div className="relative min-w-[200px] flex-1">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar conta..."
                  className="w-full rounded-lg border border-border bg-input py-1.5 pl-7 pr-2 text-xs text-text placeholder:text-text-faint focus:border-accent"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
                      (filter === f.key ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {groups.length > 0 && (
                <div className="flex flex-wrap gap-1 border-l border-border pl-2">
                  <button
                    onClick={() => setGroupFilter('all')}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
                      (groupFilter === 'all' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                    }
                  >
                    Todos os agrupamentos
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGroupFilter(g.id)}
                      className={
                        'rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
                        (groupFilter === g.id ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                      }
                    >
                      {g.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setGroupFilter('__none__')}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
                      (groupFilter === '__none__' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                    }
                  >
                    Sem agrupamento
                  </button>
                </div>
              )}
              <div className="flex gap-1 border-l border-border pl-2">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSortKey(s.key)}
                    title={`Ordenar por ${s.label}`}
                    className={
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors ' +
                      (sortKey === s.key ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                    }
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-input/50 px-5 py-2.5">
                <span className="text-xs text-text-dim">{selected.size} selecionada(s)</span>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-text transition-colors hover:border-border-strong hover:bg-surface-hover"
                  onClick={bulkSuspend}
                >
                  <Pause size={12} />
                  Suspender selecionadas
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-danger/40 px-2.5 py-1.5 text-[11px] text-danger transition-colors hover:bg-danger/10"
                  onClick={bulkRemove}
                >
                  <Trash2 size={12} />
                  Remover selecionadas
                </button>
                <button className="ml-auto text-[11px] text-text-faint hover:text-text-dim" onClick={clearSelection}>
                  Limpar seleção
                </button>
              </div>
            )}
            {selected.size === 0 && sorted.length > 0 && (
              <div className="flex items-center gap-2 border-b border-border px-5 py-2">
                <button className="flex items-center gap-1.5 text-[11px] text-text-faint hover:text-text-dim" onClick={selectAll}>
                  <CheckSquare size={12} />
                  Selecionar tudo
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {sorted.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-text-faint">Nenhuma conta encontrada.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {sorted.map((acc) => {
                    const status = statuses.get(acc.id);
                    const isSelected = selected.has(acc.id);
                    const canDrag = sortKey === 'order';
                    return (
                      <div
                        key={acc.id}
                        draggable={canDrag}
                        onDragStart={canDrag ? () => setDraggedId(acc.id) : undefined}
                        onDragOver={
                          canDrag
                            ? (e) => {
                                e.preventDefault();
                                if (draggedId && draggedId !== acc.id) setOverId(acc.id);
                              }
                            : undefined
                        }
                        onDrop={canDrag ? () => handleDrop(acc.id) : undefined}
                        onDragEnd={
                          canDrag
                            ? () => {
                                setDraggedId(null);
                                setOverId(null);
                              }
                            : undefined
                        }
                        className={
                          'flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors ' +
                          (isSelected
                            ? 'border-accent bg-accent/5'
                            : overId === acc.id
                            ? 'border-accent ring-1 ring-accent'
                            : 'border-border hover:border-border-strong') +
                          (canDrag ? ' cursor-grab active:cursor-grabbing' : '')
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="relative shrink-0">
                            <div
                              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full"
                              style={{ background: acc.iconDataUrl ? 'transparent' : acc.color }}
                            >
                              {acc.iconDataUrl ? (
                                <img src={acc.iconDataUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <ServiceGlyph service={acc.service} size={16} color="#fff" />
                              )}
                            </div>
                            <span
                              className={
                                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ' +
                                (status?.loadError
                                  ? 'bg-danger'
                                  : status?.suspended
                                  ? 'bg-text-faint'
                                  : status?.isOnline
                                  ? 'bg-accent accent-glow'
                                  : 'bg-text-faint')
                              }
                            />
                          </div>
                          <button
                            className="rounded-md p-1 text-text-dim transition-colors hover:bg-surface-hover"
                            onClick={() => toggleSelect(acc.id)}
                            title={isSelected ? 'Desmarcar' : 'Selecionar'}
                          >
                            {isSelected ? <CheckSquare size={15} className="text-accent" /> : <Square size={15} />}
                          </button>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate text-sm font-medium text-text">
                            {acc.favorite && <Star size={11} className="shrink-0 text-accent" fill="currentColor" />}
                            <span className="truncate">{acc.name}</span>
                          </div>
                          <div className={'truncate text-[11px] ' + (status?.loadError ? 'text-danger' : 'text-text-dim')}>
                            {accountStatusLabel(acc, status)}
                          </div>
                          {acc.groupId && knownGroupIds.has(acc.groupId) && (
                            <div className="mt-0.5 truncate text-[10px] text-text-faint">
                              {groups.find((g) => g.id === acc.groupId)?.name}
                            </div>
                          )}
                        </div>

                        <div className="mt-auto flex flex-wrap gap-1">
                          <button
                            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-border-strong hover:text-text"
                            onClick={() => openAccount(acc.id)}
                          >
                            <ExternalLink size={11} />
                            Abrir
                          </button>
                          <button
                            className={
                              'flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] transition-colors hover:border-border-strong ' +
                              (acc.favorite ? 'text-accent' : 'text-text-dim hover:text-text')
                            }
                            onClick={() => toggleFavorite(acc.id)}
                          >
                            <Star size={11} fill={acc.favorite ? 'currentColor' : 'none'} />
                          </button>
                          {status?.loaded && (
                            <button
                              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-border-strong hover:text-text"
                              onClick={() => suspendAccount(acc.id)}
                              title="Suspender"
                            >
                              <Pause size={11} />
                            </button>
                          )}
                          {status?.loadError && (
                            <button
                              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-border-strong hover:text-text"
                              onClick={() => reloadAccount(acc.id)}
                              title="Tentar de novo"
                            >
                              <RotateCw size={11} />
                            </button>
                          )}
                          <button
                            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-danger/40 hover:text-danger"
                            onClick={() => removeAccountWithConfirm(acc.id, acc.name)}
                            title="Remover"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
