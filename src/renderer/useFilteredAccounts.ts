/**
 * Lógica de busca/filtro/ordenação de contas, compartilhada entre a barra
 * lateral (Sidebar) e a tela de gerenciamento de contas (AccountsDashboard).
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useMemo } from 'react';
import { AccountRecord, AccountStatus } from './types';

export type FilterKey = 'all' | 'online' | 'suspended' | 'error';

/**
 * `label` é o texto curto das abas (ainda usadas na tela de gerenciamento
 * de contas). `selectedLabel` é o texto do menu suspenso da barra lateral
 * (Fase 56), onde há largura para uma frase mais clara.
 */
export const FILTERS: { key: FilterKey; label: string; selectedLabel: string }[] = [
  { key: 'all', label: 'Todas', selectedLabel: 'Todas as contas' },
  { key: 'online', label: 'Conectadas', selectedLabel: 'Conectadas' },
  { key: 'suspended', label: 'Suspensas', selectedLabel: 'Suspensas' },
  // Fase 41: era "Com erro". Encurtado para caber na barra lateral estreita —
  // com o texto longo os filtros quebravam para uma segunda linha, e a linha
  // de cima ("Todas") aparecia cortada.
  { key: 'error', label: 'Erro', selectedLabel: 'Com erro' },
];

export function matchesFilter(filter: FilterKey, status: AccountStatus | undefined): boolean {
  if (filter === 'all') return true;
  if (filter === 'online') return !!status?.isOnline;
  if (filter === 'suspended') return !!status?.suspended;
  if (filter === 'error') return !!status?.loadError;
  return true;
}

/**
 * Quantas instâncias existem em cada estado, ignorando a busca por texto:
 * o menu suspenso mostra o tamanho de cada estado, não quantas sobram da
 * busca atual. Usa exatamente o mesmo `matchesFilter` da listagem, então os
 * números nunca divergem do que o filtro correspondente exibe.
 */
export function useFilterCounts(
  accounts: AccountRecord[],
  statuses: Map<string, AccountStatus>
): Record<FilterKey, number> {
  return useMemo(() => {
    const counts = { all: 0, online: 0, suspended: 0, error: 0 } as Record<FilterKey, number>;
    for (const acc of accounts) {
      const status = statuses.get(acc.id);
      for (const f of FILTERS) {
        if (matchesFilter(f.key, status)) counts[f.key] += 1;
      }
    }
    return counts;
  }, [accounts, statuses]);
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
