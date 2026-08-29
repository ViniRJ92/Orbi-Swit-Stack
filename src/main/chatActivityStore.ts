/**
 * Fase 17 -- "Novas conversas" x "Mensagens" no Analytics.
 * Fase 28 -- relatorio separado por DIA (Hoje x Ontem), usando o proprio
 * rotulo de data que o WhatsApp Web mostra ao lado de cada conversa, em vez
 * de so o instante em que o app detectou a mudanca.
 *
 * Isto e uma metrica SEPARADA do que o analyticsStore.ts ja faz (total de
 * mensagens nao lidas por CONTA, a partir do titulo da pagina). Aqui a
 * granularidade e por CONVERSA dentro de cada conta WhatsApp:
 *
 *  - "Novas interacoes" = quantas pessoas diferentes mandaram pelo menos 1
 *    mensagem nova naquele dia (cada pessoa conta so 1 vez, nao importa
 *    quantas mensagens mandou naquele dia).
 *  - "Mensagens" = soma de todas as mensagens novas dessas pessoas naquele dia.
 *  - Grupos nunca entram em nenhuma das duas metricas.
 *
 * Fonte do dado: viewManager.getChatEntries() faz uma leitura PASSIVA da
 * lista de conversas ja visivel na tela do WhatsApp Web (nome da conversa,
 * o contador de nao lidas e o rotulo "HH:MM"/"Ontem" que ja aparecem do
 * lado dela, igual ao que qualquer usuario ve) -- nunca abre uma conversa,
 * nunca le o texto de nenhuma mensagem, nunca clica em nada. Ver o
 * comentario daquele metodo para os detalhes e limitacoes de como isso e lido.
 *
 * A logica de "nao contar de novo uma mensagem que ja apareceu antes" e
 * EXATAMENTE a mesma da Fase 13/15 do analyticsStore.ts, so que aplicada por
 * (conta + conversa) em vez de so por conta:
 *
 *  - Cada (conta, conversa) guarda a ultima contagem de nao lidas vista
 *    (`lastSeen`), persistida em disco -- sobrevive a reiniciar o app e a
 *    trocar de instancia (ativar/suspender contas ja passa pelo grace
 *    period abaixo).
 *  - So um AUMENTO nessa contagem vira mensagem nova; nunca uma releitura
 *    do mesmo valor -- navegar sem receber nada novo nunca soma de novo.
 *  - A primeira leitura de uma conversa depois que a conta carrega (boot,
 *    saida de suspensao, etc.) e um "grace period": so resincroniza a
 *    baseline, nunca gera mensagem nova a partir de nao lidas que ja
 *    existiam antes do app comecar a observar.
 *  - Cada leitura so e aceita depois de ficar parada (sem mudar) por
 *    `SETTLE_MS` -- protege contra a mesma race de escrita em duas etapas
 *    que motivou a Fase 15 no analyticsStore.ts.
 *
 * Atribuicao de dia (Fase 28): cada mensagem nova (delta > 0) e gravada no
 * dia indicado pelo PROPRIO rotulo que o WhatsApp mostra para aquela
 * conversa no instante da leitura (`dateTag`: 'today' | 'yesterday' |
 * 'other') -- nao no dia em que o app rodou o polling. Isso cobre o cenario
 * pedido: uma conversa que ja tinha mensagens de ontem (rotulo "Ontem")
 * aberta hoje sem nada novo nao soma nada em nenhum relatorio; se ela
 * receber algo novo hoje, so a mensagem de hoje entra no relatorio de hoje.
 * Limitacao conhecida e assumida: se o app ficar fechado e varias mensagens
 * de dias diferentes se acumularem na mesma conversa antes de reabrir, o
 * WhatsApp Web so mostra UM rotulo por conversa (o da mensagem mais
 * recente) -- nesse caso todo o backlog acumulado e atribuido ao dia desse
 * rotulo mais recente, porque nao ha como saber pela lista quantas dessas
 * mensagens sao de qual dia. Isso nao afeta o uso normal (app rodando
 * continuamente, minimizado na bandeja), so o caso de ficar dias fechado.
 *
 * Fase 30 (2026-08-29) — segundo canal, por EVENTO, para a conversa ABERTA:
 * o canal acima (lista lateral, badge de não lidas por conversa) tem o MESMO
 * problema estrutural do badge de conta inteira em analyticsStore.ts — uma
 * conversa que o usuário está de fato respondendo em tempo real é marcada
 * como lida pelo WhatsApp quase instantaneamente, então o contador de não
 * lidas daquela conversa específica nunca chega a subir, e mensagens
 * trocadas ao vivo nunca eram contadas. `markChatOpen()`/`recordLiveMessage()`
 * (alimentados por `viewManager.setChatOpenStateListener`/
 * `setNewMessageListener`, que por sua vez vêm do `MutationObserver` de
 * `webviewPreload.ts` — nunca polling) cobrem exatamente essa lacuna: cada
 * `data-id` de mensagem já visível na conversa aberta vira 1 evento na hora
 * exata da chegada (timestamp real, não mais rótulo "Hoje"/"Ontem" por
 * texto), atribuído ao NOME lido do cabeçalho da conversa (`chatKey`).
 *
 * As duas fontes nunca contam a mesma conversa ao mesmo tempo: enquanto uma
 * conta+conversa está em `openChats` (evento ativo), `observe()` (lista
 * lateral) ignora especificamente aquela conversa — as OUTRAS conversas da
 * mesma conta continuam sendo seguidas normalmente pela lista lateral, já
 * que só a conversa aberta tem o problema de nunca marcar não lida.
 *
 * Orbi Swit Stack -- Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ChatActivityDailySummary, ChatActivityDayReport } from './types';

const STORE_FILE = 'chatActivity.json';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 20_000;
const SETTLE_MS = 2500;
const SEPARATOR = ' ';
// Fase 30: teto de IDs de mensagem (canal de evento) lembrados por conta —
// só precisa cobrir a janela de rolagem realista de uma conversa. Mesmo
// espírito do MAX_EVENTS acima e do MAX_PROCESSED_IDS_PER_ACCOUNT de
// analyticsStore.ts.
const MAX_PROCESSED_LIVE_IDS_PER_ACCOUNT = 3000;

/** Uma linha da lista de conversas, ja filtrada/lida por viewManager.getChatEntries(). */
export interface ChatEntry {
  /** Nome da conversa como aparece na lista (usado como identificador -- ver limitacoes no comentario do viewManager). */
  key: string;
  /** true = e um grupo (deve ser sempre ignorado). */
  isGroup: boolean;
  /** Contador de nao lidas dessa conversa, ja visivel na tela. */
  unread: number;
  /** Rotulo de data da ultima mensagem dessa conversa, lido do proprio WhatsApp Web. */
  dateTag: 'today' | 'yesterday' | 'other';
}

interface ChatEvent {
  /** Instante real da leitura (usado so para poda por retencao). */
  t: number;
  /** Dia ao qual esta mensagem foi atribuida (chave local "AAAA-MM-DD"), ver comentario de topo. */
  day: string;
  a: string;
  k: string;
  c: number;
}

interface StoreShape {
  events: ChatEvent[];
  lastSeen: Record<string, Record<string, number>>;
  /** Fase 30 — `data-id` de cada mensagem já contabilizada pelo canal de evento (conversa aberta), por conta. */
  processedLiveMessageIds: Record<string, string[]>;
}

/** Chave local "AAAA-MM-DD" para uma data -- usa o fuso horario do proprio computador do usuario. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return dayKey(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Resolve o dia a gravar para um evento novo, a partir do rotulo lido na tela. */
function resolveDay(dateTag: 'today' | 'yesterday' | 'other'): string {
  if (dateTag === 'yesterday') return yesterdayKey();
  // 'today' e 'other' (rotulo nao reconhecido) caem no dia da propria
  // leitura -- 'other' e o fallback seguro quando o seletor nao encontrou
  // nenhum rotulo reconhecivel, o que na pratica e raro.
  return todayKey();
}

interface SettlingEntry {
  value: number;
  isGrace: boolean;
  dateTag: 'today' | 'yesterday' | 'other';
  timer: ReturnType<typeof setTimeout>;
}

function compositeKey(accountId: string, chatKey: string): string {
  return `${accountId}${SEPARATOR}${chatKey}`;
}

export class ChatActivityStore {
  private filePath: string;
  private data: StoreShape;
  private readonly syncedSinceLoad: Set<string> = new Set();
  private readonly settling: Map<string, SettlingEntry> = new Map();
  // Fase 30 — accountId -> chatKey da conversa com o canal de evento ativo
  // agora mesmo. Enquanto uma (conta, conversa) está aqui, `observe()`
  // (lista lateral) ignora especificamente essa conversa.
  private readonly openChats: Map<string, string> = new Map();

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.data = this.load();
    if (this.prune()) this.persist();
  }

  private load(): StoreShape {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StoreShape>;
        if (Array.isArray(parsed.events)) {
          const lastSeen = parsed.lastSeen && typeof parsed.lastSeen === 'object' ? parsed.lastSeen : {};
          // `processedLiveMessageIds` não existia antes da Fase 30 — arquivos
          // salvos por versões anteriores simplesmente não têm o campo.
          const processedLiveMessageIds =
            parsed.processedLiveMessageIds && typeof parsed.processedLiveMessageIds === 'object'
              ? parsed.processedLiveMessageIds
              : {};
          return { events: parsed.events, lastSeen, processedLiveMessageIds };
        }
      }
    } catch (err) {
      console.error('[ChatActivityStore] Falha ao ler chatActivity.json, iniciando vazio:', err);
    }
    return { events: [], lastSeen: {}, processedLiveMessageIds: {} };
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[ChatActivityStore] Falha ao salvar chatActivity.json:', err);
    }
  }

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
   * Chamado periodicamente (ver main.ts) para cada conta WhatsApp carregada,
   * com a lista de conversas lida naquele instante. `isGroup: true` é
   * filtrado aqui de novo por segurança, mesmo que quem chamou já devesse
   * ter filtrado — esta classe nunca deve depender disso.
   */
  observe(accountId: string, entries: ChatEntry[]): void {
    for (const entry of entries) {
      if (entry.isGroup) continue;
      const chatKey = entry.key;
      if (!chatKey) continue;
      // Fase 30: esta conversa específica tem o canal de evento ativo agora
      // (é a que está aberta na tela) — o badge da lista lateral nunca sobe
      // pra ela enquanto isso dura, então nem vale a pena processar a
      // leitura aqui; evita também qualquer risco de dupla contagem.
      if (this.openChats.get(accountId) === chatKey) continue;
      const compositeK = compositeKey(accountId, chatKey);

      const isGrace = !this.syncedSinceLoad.has(compositeK);
      const current = this.settling.get(compositeK);

      if (current && current.value === entry.unread) {
        // Mesmo valor de não lidas — mas o rótulo pode ter avançado
        // (ex.: era "Ontem" e virou uma data mais antiga sem mudar a
        // contagem). Atualiza só o dateTag guardado, sem reiniciar o
        // cronômetro de estabilização.
        current.dateTag = entry.dateTag;
        continue;
      }
      if (current) clearTimeout(current.timer);
      const timer = setTimeout(
        () => this.commitObservation(accountId, chatKey, entry.unread, isGrace),
        SETTLE_MS
      );
      this.settling.set(compositeK, { value: entry.unread, isGrace, dateTag: entry.dateTag, timer });
    }
  }

  private commitObservation(accountId: string, chatKey: string, value: number, isGrace: boolean): void {
    const compositeK = compositeKey(accountId, chatKey);
    const settled = this.settling.get(compositeK);
    const dateTag = settled?.dateTag ?? 'other';
    this.settling.delete(compositeK);
    let changed = false;
    const accountMap = this.data.lastSeen[accountId] ?? {};

    if (isGrace) {
      this.syncedSinceLoad.add(compositeK);
      if (accountMap[chatKey] !== value) {
        accountMap[chatKey] = value;
        this.data.lastSeen[accountId] = accountMap;
        changed = true;
      }
    } else {
      const previous = accountMap[chatKey] ?? value;
      if (value !== previous) {
        accountMap[chatKey] = value;
        this.data.lastSeen[accountId] = accountMap;
        changed = true;
      }
      const delta = value - previous;
      if (delta > 0) {
        this.data.events.push({ t: Date.now(), day: resolveDay(dateTag), a: accountId, k: chatKey, c: delta });
      }
    }

    if (changed) {
      this.prune();
      this.persist();
    }
  }

  /**
   * Fase 30 — chamado quando `viewManager` reporta que uma conversa
   * (não-grupo) abriu numa conta (evento `mw:chat-open-state`, originado do
   * `webviewPreload.ts`). Ativa o canal de evento para essa conversa
   * específica, desligando `observe()` (lista lateral) só para ela — as
   * outras conversas da mesma conta continuam normalmente.
   */
  markChatOpen(accountId: string, chatKey: string): void {
    this.openChats.set(accountId, chatKey);
    const compositeK = compositeKey(accountId, chatKey);
    const pending = this.settling.get(compositeK);
    if (pending) {
      clearTimeout(pending.timer);
      this.settling.delete(compositeK);
    }
  }

  /**
   * Fase 30 — chamado quando a conversa aberta de uma conta fecha, troca
   * para outra, ou a conta é descarregada. Devolve a conversa que estava
   * ativa para o canal de lista lateral normal.
   */
  onChatClosed(accountId: string): void {
    this.openChats.delete(accountId);
  }

  /**
   * Fase 30 — 1 chamada por mensagem nova detectada por evento na conversa
   * aberta (nunca por polling — ver comentário de topo do arquivo e de
   * `webviewPreload.ts`). `ts` é o timestamp real do instante da inserção no
   * DOM, usado diretamente para decidir o dia (`dayKey`) — elimina a
   * limitação de "rótulo Hoje/Ontem por texto" que o canal de lista lateral
   * ainda tem. Deduplicação por identidade (`data-id`), não por delta —
   * mesmo padrão de `processedMessageIds` em analyticsStore.ts.
   */
  recordLiveMessage(accountId: string, chatKey: string, dataId: string, ts: number): void {
    const processed = this.data.processedLiveMessageIds[accountId] ?? [];
    if (processed.includes(dataId)) return;

    processed.push(dataId);
    this.data.events.push({ t: ts, day: dayKey(new Date(ts)), a: accountId, k: chatKey, c: 1 });
    this.data.processedLiveMessageIds[accountId] =
      processed.length > MAX_PROCESSED_LIVE_IDS_PER_ACCOUNT
        ? processed.slice(processed.length - MAX_PROCESSED_LIVE_IDS_PER_ACCOUNT)
        : processed;
    this.prune();
    this.persist();
  }

  /** Conta descarregada (suspensa, ou app fechando) — cancela leituras pendentes e força novo grace period ao recarregar. */
  onAccountUnloaded(accountId: string): void {
    const prefix = `${accountId}${SEPARATOR}`;
    for (const [compositeK, entry] of this.settling.entries()) {
      if (compositeK.startsWith(prefix)) {
        clearTimeout(entry.timer);
        this.settling.delete(compositeK);
      }
    }
    for (const compositeK of Array.from(this.syncedSinceLoad)) {
      if (compositeK.startsWith(prefix)) this.syncedSinceLoad.delete(compositeK);
    }
    this.openChats.delete(accountId);
  }

  /** Conta removida de vez — apaga a baseline salva, para não gerar pico falso se um novo id reaproveitar o nome. */
  forget(accountId: string): void {
    this.onAccountUnloaded(accountId);
    delete this.data.lastSeen[accountId];
    delete this.data.processedLiveMessageIds[accountId];
    this.persist();
  }

  /** Apaga todo o histórico (junto com o "Limpar histórico" do Analytics normal). */
  clear(): void {
    for (const entry of this.settling.values()) clearTimeout(entry.timer);
    this.settling.clear();
    this.syncedSinceLoad.clear();
    this.openChats.clear();
    this.data = { events: [], lastSeen: {}, processedLiveMessageIds: {} };
    this.persist();
  }

  /** Monta o relatório de um único dia (chave "AAAA-MM-DD") a partir dos eventos já atribuídos a ele. */
  private buildDayReport(day: string, accounts: { id: string; name: string; color: string }[]): ChatActivityDayReport {
    const conversationsByAccount = new Map<string, Set<string>>();
    const messagesByAccount = new Map<string, number>();

    for (const e of this.data.events) {
      if (e.day !== day) continue;
      messagesByAccount.set(e.a, (messagesByAccount.get(e.a) ?? 0) + e.c);
      if (!conversationsByAccount.has(e.a)) conversationsByAccount.set(e.a, new Set());
      conversationsByAccount.get(e.a)!.add(e.k);
    }

    const byAccount = accounts
      .map((acc) => ({
        accountId: acc.id,
        name: acc.name,
        color: acc.color,
        newConversations: conversationsByAccount.get(acc.id)?.size ?? 0,
        messages: messagesByAccount.get(acc.id) ?? 0,
      }))
      .filter((a) => a.newConversations > 0 || a.messages > 0)
      .sort((a, b) => b.messages - a.messages);

    const totalConversations = byAccount.reduce((sum, a) => sum + a.newConversations, 0);
    const totalMessages = byAccount.reduce((sum, a) => sum + a.messages, 0);

    return { totalConversations, totalMessages, byAccount };
  }

  /** Relatório fixo de Hoje x Ontem (Fase 28) — independente do seletor de período geral do Analytics. */
  buildDailyReport(accounts: { id: string; name: string; color: string }[]): ChatActivityDailySummary {
    return {
      today: this.buildDayReport(todayKey(), accounts),
      yesterday: this.buildDayReport(yesterdayKey(), accounts),
    };
  }
}
