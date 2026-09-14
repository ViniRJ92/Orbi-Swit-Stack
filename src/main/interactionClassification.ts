/**
 * Fase 77 — Classificação das Interações.
 *
 * Camada NOVA e separada das métricas existentes. Não recalcula nem altera
 * Interações, Recebidas, Enviadas ou Total (esses continuam vindo de
 * chatActivityStore.ts, intactos). Aqui só se responde: "das pessoas que
 * interagiram no período, qual é o comportamento de cada uma segundo o
 * histórico dela?".
 *
 * Unidade: o mesmo par (instância, contato) que define uma interação em
 * chatActivityStore.buildDayReport — pessoa que mandou pelo menos uma
 * mensagem (recebida) naquele dia/instância. Mensagem enviada não cria
 * interação, então também não entra aqui. Cada par entra em EXATAMENTE uma
 * categoria, por isso a soma das cinco sempre é o total de interações.
 *
 * Referência de cada contato: o PRIMEIRO dia em que ele interagiu dentro do
 * período. O histórico usado é tudo o que existe ANTES desse dia, sem ficar
 * limitado ao período (ver interactionHistoryStore.ts, que guarda 180 dias).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import {
  AnalyticsRange,
  InteractionCategory,
  InteractionCategoryCounts,
  InteractionClassificationSummary,
} from './types';

/**
 * Limites da classificação, num lugar só para ajuste fino.
 *  - REACTIVATION_GAP_DAYS: dias sem interagir para o retorno contar como Reativada.
 *  - FREQUENT_WINDOW_DAYS / FREQUENT_MIN_ACTIVE_DAYS: dias distintos com interação
 *    dentro da janela anterior para ser Frequente.
 *  - SPORADIC_MIN_PRIOR_DAYS / SPORADIC_MIN_AVG_GAP_DAYS: com pelo menos esse
 *    histórico, intervalo médio entre as interações a partir do qual é Esporádica.
 */
export const CLASSIFICATION_RULES = {
  REACTIVATION_GAP_DAYS: 30,
  FREQUENT_WINDOW_DAYS: 30,
  FREQUENT_MIN_ACTIVE_DAYS: 4,
  SPORADIC_MIN_PRIOR_DAYS: 2,
  SPORADIC_MIN_AVG_GAP_DAYS: 10,
} as const;

export const INTERACTION_CATEGORIES: InteractionCategory[] = ['nova', 'recorrente', 'frequente', 'esporadica', 'reativada'];

/** accountId -> contato -> dias "AAAA-MM-DD" com interação, ordenados e sem repetição. */
export type InteractionDays = Record<string, Record<string, string[]>>;

function emptyCounts(): InteractionCategoryCounts {
  return { nova: 0, recorrente: 0, frequente: 0, esporadica: 0, reativada: 0 };
}

/** Chave local "AAAA-MM-DD" — mesma convenção de chatActivityStore.ts. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Diferença em dias inteiros entre duas chaves "AAAA-MM-DD" (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/**
 * Classifica um contato a partir dos dias em que ele interagiu ANTES do dia
 * de referência. Prioridade: Nova → Reativada → Frequente → Esporádica →
 * Recorrente. A ordem importa: quem voltou depois de muito tempo é Reativada
 * mesmo que antes fosse frequente; alta frequência recente vence o critério
 * de irregularidade; Recorrente é o retorno normal que sobra.
 */
export function classifyContact(priorDays: string[], referenceDay: string): InteractionCategory {
  const R = CLASSIFICATION_RULES;
  if (priorDays.length === 0) return 'nova';

  const lastPrior = priorDays[priorDays.length - 1];
  if (daysBetween(lastPrior, referenceDay) >= R.REACTIVATION_GAP_DAYS) return 'reativada';

  const recentActiveDays = priorDays.filter((d) => daysBetween(d, referenceDay) <= R.FREQUENT_WINDOW_DAYS).length;
  if (recentActiveDays >= R.FREQUENT_MIN_ACTIVE_DAYS) return 'frequente';

  if (priorDays.length >= R.SPORADIC_MIN_PRIOR_DAYS) {
    // Intervalo médio entre as interações, contando o próprio dia de referência.
    const averageGap = daysBetween(priorDays[0], referenceDay) / priorDays.length;
    if (averageGap >= R.SPORADIC_MIN_AVG_GAP_DAYS) return 'esporadica';
  }

  return 'recorrente';
}

export function buildInteractionClassification(
  range: AnalyticsRange,
  accounts: { id: string; name: string; color: string }[],
  history: InteractionDays
): InteractionClassificationSummary {
  const startDay = dayKey(new Date(range.startTs));
  const endDay = dayKey(new Date(range.endTs));
  const counts = emptyCounts();

  const byAccount = accounts
    .map((acc) => {
      const accountCounts = emptyCounts();
      let total = 0;
      for (const days of Object.values(history[acc.id] ?? {})) {
        const referenceDay = days.find((d) => d >= startDay && d <= endDay);
        if (!referenceDay) continue;
        const category = classifyContact(
          days.filter((d) => d < referenceDay),
          referenceDay
        );
        accountCounts[category] += 1;
        counts[category] += 1;
        total += 1;
      }
      return { accountId: acc.id, name: acc.name, color: acc.color, counts: accountCounts, total };
    })
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);

  const total = byAccount.reduce((sum, a) => sum + a.total, 0);
  return { range, total, counts, byAccount };
}
