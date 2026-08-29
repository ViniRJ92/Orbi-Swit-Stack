/**
 * Lógica de busca/filtro/ordenação de contas, compartilhada entre a barra
 * lateral (Sidebar) e a tela de gerenciamento de contas (AccountsDashboard).
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useMemo } from 'react';
import { AccountRecord, AccountStatus } from './types';

export type FilterKey = 'all' | 'online' | 'suspended' | 'error';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'online', label: 'Conectadas' },
  { key: 'suspended', label: 'Suspensas' },
  { key: 'error', label: 'Com erro' },
];

export function matchesFilter(filter: FilterKey, status: AccountStatus | undefined): boolean {
  if (filter === 'all') return true;
  if (filter === 'online') return !!status?.isOnline;
  if (filter === 'suspended') return !!status?.suspended;
  if (filter === 'error') return !!status?.loadError;
  return true;
}

/**
 * Aplica busca por nome/telefone, filtro por status e ordenação
 * (favoritas primeiro, depois pela ordem definida pelo usuário).
 */
export function useFilteredAccounts(
  accounts: AccountRecord[],
  statuses: Map<string, AccountStatus>,
  searchQuery: string,
  filter: FilterKey
): AccountRecord[] {
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts
      .filter((acc) => !query || acc.name.toLowerCase().includes(query) || acc.phone?.toLowerCase().includes(query))
      .filter((acc) => matchesFilter(filter, statuses.get(acc.id)))
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return a.order - b.order;
      });
  }, [accounts, searchQuery, filter, statuses]);
}
