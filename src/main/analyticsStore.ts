/**
 * Coleta discreta de métricas de "movimento" por conta para alimentar a aba
 * Analytics — SEM NUNCA ler conteúdo de conversas. A única fonte de dado é o
 * contador de mensagens não lidas que o próprio accountManager/viewManager já
 * calcula a partir do título da página (a mesma heurística usada pelo selo da
 * bandeja e pelas notificações nativas, ver unreadBadge.ts/notificationManager.ts
 * — nada aqui é novo em termos de "o que é observado", só passa a existir um
 * histórico local com timestamp em vez de descartar o dado a cada atualização.
 *
 * Cada evento registrado é só `{ timestamp, accountId, delta }`, onde `delta`
 * é o quanto o contador de não lidas subiu desde a última observação. Isso dá
 * uma aproximação honesta de "quantas mensagens chegaram" sem jamais tocar em
 * texto de conversa, remetente, ou qualquer dado do WhatsApp/Gmail em si.
 *
 * Fase 13 (baseline persistida + grace period na reativação): a última
 * contagem observada por conta (`lastSeen`) vivia só em memória — reiniciar
 * o app, ou o próprio ciclo de suspensão/reativação em certas janelas de
 * tempo, podia perder essa referência. Sem ela, a primeira leitura de título
 * depois que a conta volta a carregar podia ser interpretada como um salto
 * real (ex.: 0 → 3 vira "3 mensagens novas" mesmo quando as 3 já estavam
 * pendentes antes). Agora `lastSeen` é persistido em `analytics.json` junto
 * dos eventos, e toda vez que uma conta transiciona de "não carregada" para
 * "carregada" (reabrir o app, sair de uma suspensão, ou a view ser recriada
 * por qualquer motivo) a primeira leitura seguinte é tratada como um "grace
 * period": só resincroniza a base salva com o valor atual do título, nunca
 * gera um evento de incremento.
 *
 * Fase 15 (debounce de estabilização — causa raiz real da dupla contagem):
 * a Fase 13 presumia que a PRIMEIRA leitura de título após `loaded: true`
 * já refletia o valor real e definitivo de não lidas. Na prática não é bem
 * assim: o WhatsApp Web às vezes escreve o título em mais de um passo (ex.:
 * título genérico "WhatsApp" primeiro, "(N) WhatsApp" só depois que o React
 * termina de renderizar a lista de conversas) — então tanto a leitura do
 * grace period quanto qualquer leitura normal podem capturar um valor
 * transitório (mais baixo, às vezes 0) antes do valor real se assentar.
 * Reportado pelo usuário: mensagens que já existiam antes (não lidas,
 * paradas, sem o usuário abrir/ler nada) voltavam a ser somadas — exatamente
 * o padrão esperado se a baseline foi sincronizada num instante em que o
 * título ainda não tinha subido para o valor real: a leitura seguinte, já
 * estável, aparece como um "salto" positivo em cima de uma baseline errada
 * por baixo.
 *
 * Correção: `observe()` não decide mais nada na hora — ele só agenda cada
 * leitura (`settling`, ver abaixo) e a decisão real (grace period ou delta)
 * só acontece depois que o MESMO valor de não lidas se repetir sem mudar por
 * `SETTLE_MS` seguidos. Qualquer leitura intermediária (o valor "piscando")
 * reinicia o cronômetro em vez de ser tratada como definitiva. Isso cobre
 * tanto o grace period (a baseline só é gravada com o valor já estabilizado)
 * quanto a comparação normal de delta (só reage a uma mudança que realmente
 * se sustentou, não a um flicker momentâneo do título).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AccountStatus, AnalyticsRange, AnalyticsSummary } from './types';

const STORE_FILE = 'analytics.json';

// Retenção de 30 dias — cobre o maior filtro disponível na UI ("Últimos 30
// dias") sem deixar o arquivo crescer indefinidamente com o tempo de uso do
// app. MAX_EVENTS é um teto de segurança adicional para contas muito
// movimentadas (ex.: várias mensagens por minuto por muitas contas).
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 20_000;

// Fase 15: quanto tempo um valor de não lidas precisa ficar PARADO (sem
// mudar) antes de ser aceito como leitura real — protege contra o título do
// WhatsApp Web sendo escrito em mais de um passo (valor baixo/zero
// transitório antes do valor definitivo). Curto o suficiente pra não
// atrasar perceptivelmente o Analytics, longo o suficiente pra nunca pegar
// um estado intermediário da renderização da página.
const SETTLE_MS = 2500;

interface AnalyticsEvent {
  /** Época em ms (Date.now()) do momento em que o aumento de não lidas foi detectado. */
  t: number;
  /** id da conta. */
  a: string;
  /** Quantas mensagens novas foram detectadas nesta observação. */
  c: number;
}

interface StoreShape {
  events: AnalyticsEvent[];
  /**
   * Última contagem de não lidas observada por conta (accountId → contagem),
   * persistida em disco desde a Fase 13 — sobrevive a fechar o app e a
   * suspender/reativar uma conta, exatamente para permitir a comparação
   * correta de delta descrita no comentário de topo do arquivo.
   */
  lastSeen: Record<string, number>;
}

/** Leitura de não lidas aguardando estabilizar antes de virar grace period ou delta (Fase 15). */
interface SettlingEntry {
  value: number;
  isGrace: boolean;
  timer: ReturnType<typeof setTimeout>;
}

export class AnalyticsStore {
  private filePath: string;
  private data: StoreShape;
  // Contas já "sincronizadas" nesta execução — isto é, que já passaram pela
  // primeira leitura ESTÁVEL de título desde que ficaram `loaded === true`.
  // Guardado só em memória de propósito: um reinício do app zera este Set, o
  // que é exatamente o comportamento desejado (toda conta recém-carregada no
  // boot também passa pelo grace period, mesmo já tendo uma baseline
  // persistida de uma execução anterior — ver `observe()`).
  private readonly syncedSinceLoad: Set<string> = new Set();
  // Fase 15: leituras aguardando `SETTLE_MS` sem mudar de valor antes de
  // serem aceitas como reais — ver comentário de topo do arquivo.
  private readonly settling: Map<string, SettlingEntry> = new Map();

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.data = this.load();
    if (this.prune()) this.persist();
  }

  private cancelSettling(accountId: string): void {
    const entry = this.settling.get(accountId);
    if (entry) {
      clearTimeout(entry.timer);
      this.settling.delete(accountId);
    }
  }

  private load(): StoreShape {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StoreShape>;
        if (Array.isArray(parsed.events)) {
          // `lastSeen` não existia antes da Fase 13 — arquivos salvos por
          // versões anteriores do app simplesmente não têm o campo, então
          // entram aqui com a baseline vazia (equivalente a nunca ter
          // observado nenhuma conta ainda, o que é seguro: a primeira
          // observação de cada conta vira grace period, sem gerar delta).
          const lastSeen = parsed.lastSeen && typeof parsed.lastSeen === 'object' ? parsed.lastSeen : {};
          return { events: parsed.events, lastSeen };
        }
      }
    } catch (err) {
      console.error('[AnalyticsStore] Falha ao ler analytics.json, iniciando vazio:', err);
    }
    return { events: [], lastSeen: {} };
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[AnalyticsStore] Falha ao salvar analytics.json:', err);
    }
  }

  /** Remove eventos fora da janela de retenção. Retorna true se algo mudou. */
  private prune(): boolean {
    const before = this.data.events.length;
    const cutoff = Date.now() - RETENTION_MS;
    this.data.events = this.data.events.filter((e) => e.t >= cutoff);
    if (this.data.events.length > MAX_EVENTS) {
      this.data.events = this.data.events.slice(this.data.events.length - MAX_EVENTS);
    }
    return this.data.events.length !== before;
  }

  /**
   * Chamado a cada atualização de status das contas (ver pushAccountsUpdate
   * em main.ts) — compara o não-lidas atual de cada conta com a última
   * observação persistida e só registra um evento quando ele SOBE.
   *
   * Duas regras evitam contagem duplicada/retroativa (Fase 13):
   *
   * 1. Conta suspensa/descarregada não tem WebContentsView ativa, então
   *    `accountManager.buildStatuses()` força `unreadCount` a 0 pra ela (não
   *    é "zerou de verdade", é "não dá pra ler agora"). Essa conta é
   *    simplesmente ignorada aqui enquanto `loaded === false` — a última
   *    contagem real permanece intacta em `lastSeen` (em disco), e a marca
   *    de "já sincronizada" é removida (`syncedSinceLoad.delete`) para forçar
   *    um novo grace period assim que ela recarregar.
   * 2. Toda vez que uma conta aparece com `loaded === true` sem ainda ter
   *    sido sincronizada nesta execução — a app acabou de abrir, a conta
   *    acabou de sair de uma suspensão, ou a view foi recriada por qualquer
   *    outro motivo — a leitura é tratada como "grace period": a baseline em
   *    `lastSeen` é resincronizada com o valor atual do título, mas NENHUM
   *    evento de delta é gerado nessa rodada. Isso cobre tanto o caso de
   *    reabrir o app com mensagens já pendentes (não conta retroativamente)
   *    quanto uma possível leitura transitória do título logo no início do
   *    carregamento da página (não gera um pico falso). A comparação normal
   *    de delta só volta a valer da leitura seguinte em diante, com a conta
   *    já establemente carregada.
   *
   * Como só grava em disco quando `lastSeen` de fato muda de valor (delta
   * real ou resincronização de baseline) — não a cada verificação periódica
   * sem mudança nenhuma —, a frequência de escrita continua acompanhando o
   * volume real de mensagens/transições, não o intervalo de polling.
   */
  observe(statuses: AccountStatus[]): void {
    for (const status of statuses) {
      if (!status.loaded) {
        // Conta descarregada: cancela qualquer leitura em estabilização (não
        // vale mais) e força um novo grace period assim que ela recarregar.
        this.cancelSettling(status.id);
        this.syncedSinceLoad.delete(status.id);
        continue;
      }

      const isGrace = !this.syncedSinceLoad.has(status.id);
      const current = this.settling.get(status.id);

      if (current && current.value === status.unreadCount) {
        // Mesmo valor de quando começamos a esperar — deixa o cronômetro
        // correr, não reinicia.
        continue;
      }

      // Valor novo ou mudou desde a última leitura: (re)inicia a espera de
      // estabilização do zero. Enquanto o título "piscar", nunca comita.
      if (current) clearTimeout(current.timer);
      const timer = setTimeout(() => this.commitObservation(status.id, status.unreadCount, isGrace), SETTLE_MS);
      this.settling.set(status.id, { value: status.unreadCount, isGrace, timer });
    }
  }

  /**
   * Chamado quando uma leitura de não lidas ficou parada por `SETTLE_MS` sem
   * mudar — só então ela é tratada como real (Fase 15). `isGrace` foi
   * decidido no momento em que a espera começou (`observe()`), então mesmo
   * que a conta já tenha sido sincronizada por outro caminho nesse meio
   * tempo, o comportamento agendado é respeitado.
   */
  private commitObservation(accountId: string, value: number, isGrace: boolean): void {
    this.settling.delete(accountId);
    let changed = false;

    if (isGrace) {
      this.syncedSinceLoad.add(accountId);
      if (this.data.lastSeen[accountId] !== value) {
        this.data.lastSeen[accountId] = value;
        changed = true;
      }
    } else {
      const previous = this.data.lastSeen[accountId] ?? value;
      if (value !== previous) {
        this.data.lastSeen[accountId] = value;
        changed = true;
      }
      const delta = value - previous;
      if (delta > 0) {
        this.data.events.push({ t: Date.now(), a: accountId, c: delta });
      }
    }

    if (changed) {
      this.prune();
      this.persist();
    }
  }

  /** Esquece uma conta removida, para não gerar um pico falso se um novo id reaproveitar o mesmo nome depois. */
  forget(accountId: string): void {
    this.cancelSettling(accountId);
    delete this.data.lastSeen[accountId];
    this.syncedSinceLoad.delete(accountId);
    this.persist();
  }

  /**
   * Apaga todo o histórico de Analytics (Fase 14) — eventos e baseline salva.
   * Também limpa `syncedSinceLoad` em memória: assim, a próxima leitura de
   * cada conta já carregada passa de novo pelo grace period (resincroniza a
   * baseline com o valor atual do título sem gerar um delta falso), em vez
   * de comparar contra a baseline zerada e contar tudo que já estava
   * pendente como "mensagem nova". Ação irreversível — a confirmação fica a
   * cargo da UI antes de chamar isto.
   */
  clear(): void {
    for (const entry of this.settling.values()) clearTimeout(entry.timer);
    this.settling.clear();
    this.data = { events: [], lastSeen: {} };
    this.syncedSinceLoad.clear();
    this.persist();
  }

  /**
   * Traduz um atalho rápido ('today'/'7d'/'30d') num intervalo explícito
   * `{ startTs, endTs }` ancorado em "agora". Chamado no processo principal
   * só como conveniência para quem ainda não tem um intervalo pronto — o
   * renderer também sabe montar isso sozinho para o Date Range Picker
   * customizado e para o cálculo do "período anterior" (ver AnalyticsModal).
   */
  static rangeForPeriod(period: 'today' | '7d' | '30d'): AnalyticsRange {
    const endTs = Date.now();
    if (period === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { startTs: d.getTime(), endTs };
    }
    if (period === '7d') return { startTs: endTs - 7 * 24 * 60 * 60 * 1000, endTs };
    return { startTs: endTs - 30 * 24 * 60 * 60 * 1000, endTs };
  }

  /**
   * Agrega tudo no processo principal antes de mandar pro renderer — o
   * histórico bruto nunca cruza o IPC, então a tela de Analytics renderiza
   * rápido e de forma estável independente de quantos eventos existirem.
   * Recebe um intervalo explícito (em vez do antigo enum de período) para
   * suportar tanto os atalhos rápidos quanto um intervalo customizado e o
   * "período anterior" usado na comparação — a mesma agregação serve para
   * os três casos, só muda o `range` recebido.
   */
  buildSummary(range: AnalyticsRange, accounts: { id: string; name: string; color: string }[]): AnalyticsSummary {
    const { startTs, endTs } = range;
    const totalsByAccount = new Map<string, number>();
    const hourly = new Array(24).fill(0) as number[];

    for (const e of this.data.events) {
      if (e.t < startTs || e.t > endTs) continue;
      totalsByAccount.set(e.a, (totalsByAccount.get(e.a) ?? 0) + e.c);
      const hour = new Date(e.t).getHours();
      hourly[hour] += e.c;
    }

    const byAccount = accounts
      .map((acc) => ({ accountId: acc.id, name: acc.name, color: acc.color, total: totalsByAccount.get(acc.id) ?? 0 }))
      .filter((a) => a.total > 0)
      .sort((a, b) => b.total - a.total);

    const totalVolume = byAccount.reduce((sum, a) => sum + a.total, 0);
    const leader = byAccount[0] ? { accountId: byAccount[0].accountId, name: byAccount[0].name, total: byAccount[0].total } : null;
    const averagePerAccount = byAccount.length > 0 ? totalVolume / byAccount.length : 0;

    return {
      range,
      totalVolume,
      leader,
      averagePerAccount,
      byAccount,
      timeline: hourly.map((count, hour) => ({ hour, count })),
    };
  }
}
