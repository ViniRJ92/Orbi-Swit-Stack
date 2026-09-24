/**
 * Fase 92 — quem mandou cada balão, pela "pontinha" (tail) que o próprio
 * WhatsApp Web desenha.
 *
 * Bug real (2026-09-24, conversa conferida pelo usuário): mensagens enviadas
 * PELO CELULAR eram contadas como recebidas. Os sinais antigos (ver
 * `isOutgoing` em webviewPreload.ts) só reconheciam como "sua" a mensagem
 * enviada pelo computador (identificador começando com "3EB0") ou com ícone
 * de entregue, que o WhatsApp não põe mais na página. Resultado na conversa
 * conferida: 9 recebidas + 10 enviadas viraram 16 recebidas + 3 enviadas.
 *
 * O WhatsApp desenha a pontinha no PRIMEIRO balão de cada sequência do mesmo
 * lado (`data-icon="tail-out"` nas suas, `"tail-in"` nas do contato); os
 * balões seguintes da sequência não têm pontinha e são do mesmo lado. Por
 * isso cada balão herda o lado da última pontinha vista antes dele.
 *
 * Direção segura de falha: balão sem nenhuma pontinha antes dele (ou se um
 * dia o WhatsApp deixar de desenhá-la) fica `null`, e a decisão volta para os
 * sinais antigos, exatamente como antes desta fase. Nunca para de contar.
 *
 * Função pura, sem DOM, para ser testada em scripts/test-analytics.js.
 *
 * Orbi — Criado por Vinicius Braga
 */
export type LadoDoBalao = 'in' | 'out';

/**
 * Recebe, em ordem de tela, a pontinha de cada balão (`null` quando o balão
 * não tem) e devolve o lado de cada um, herdando da última pontinha anterior.
 */
export function herdarLadoPelaPontinha(pontinhas: Array<LadoDoBalao | null>): Array<LadoDoBalao | null> {
  let atual: LadoDoBalao | null = null;
  return pontinhas.map((pontinha) => {
    if (pontinha) atual = pontinha;
    return atual;
  });
}
