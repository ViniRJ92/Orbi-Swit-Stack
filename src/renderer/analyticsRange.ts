/**
 * Cálculo de intervalos de tempo para a aba Analytics. Vive no renderer (e
 * não no processo principal) porque cada atalho rápido ("Hoje"/"7 dias"/
 * "30 dias") precisa ser recalculado a partir do instante atual a cada
 * consulta — se o intervalo fosse memoizado só a partir da seleção da UI
 * (o botão clicado), o `endTs` congelaria no valor de quando o botão foi
 * clicado, e a atualização automática periódica do painel (ver
 * AnalyticsModal, REFRESH_MS) pararia de fato de trazer dados novos para
 * esses três atalhos. Por isso `quickRange` é chamada direto dentro da
 * função de carregamento a cada tick, nunca guardada num `useMemo` que só
 * depende do que o usuário selecionou.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { AnalyticsRange } from './types';

export function quickRange(period: 'today' | '7d' | '30d'): AnalyticsRange {
  const endTs = Date.now();
  if (period === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { startTs: d.getTime(), endTs };
  }
  if (period === '7d') return { startTs: endTs - 7 * 24 * 60 * 60 * 1000, endTs };
  return { startTs: endTs - 30 * 24 * 60 * 60 * 1000, endTs };
}

/** Início do dia (00:00 local) de uma string 'YYYY-MM-DD' vinda de um <input type="date">. */
export function startOfDateInput(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

/** Fim do dia (23:59:59.999 local) de uma string 'YYYY-MM-DD'. */
export function endOfDateInput(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

/** 'YYYY-MM-DD' de hoje / N dias atrás, para preencher os inputs de data com um padrão razoável. */
export function dateInputValue(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Período imediatamente anterior, de mesma duração — usado pelo toggle
 * "Comparar com Período Anterior" para buscar a segunda série de dados que
 * vira a linha pontilhada de comparação nos gráficos.
 */
export function previousRange(range: AnalyticsRange): AnalyticsRange {
  const duration = range.endTs - range.startTs;
  return { startTs: range.startTs - duration, endTs: range.startTs };
}
