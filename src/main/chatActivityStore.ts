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
 * trocadas ao vivo nunca eram contadas. `markChatOpen()`/`recordChatMessages()`
 * (alimentados por `viewManager.setChatOpenStateListener`/
 * `setChatMessagesListener`, que por sua vez vêm do `MutationObserver`/
 * classificação por divisor de data em `webviewPreload.ts` — nunca polling)
 * cobrem exatamente essa lacuna: cada `data-id` de mensagem de Hoje/Ontem já
 * visível na conversa aberta vira 1 evento, atribuído ao dia certo (pelo
 * divisor "Hoje"/"Ontem" já desenhado na tela) e ao NOME lido da lista
 * lateral (`chatKey`).
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
import { AnalyticsRange, AnalyticsSummary, ChatActivityDailySummary, ChatActivityDayReport } from './types';

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
  /**
   * Fase 33 (2026-08-30) — de qual dos dois canais este evento veio:
   *  - 'l' (live): lido balão a balão, por `data-id` — verdade exata.
   *  - ausente/'b' (badge): inferido pela variação do contador de não lidas
   *    na lista lateral, para conversas que nunca foram abertas (o WhatsApp
   *    Web só renderiza balões da conversa aberta, então não há `data-id`
   *    para ler nas outras).
   *
   * Necessário porque os dois canais contavam a MESMA mensagem duas vezes:
   * chegavam 5 mensagens numa conversa fechada (badge grava +5) e, ao abrir
   * a conversa, o canal de balões via 5 `data-id` inéditos e gravava +5 de
   * novo. Ver `recordChatMessages`, que agora descarta os eventos de badge
   * daquela conversa/dia assim que a leitura por balão acontece.
   * Eventos gravados por versões anteriores não têm o campo e são tratados
   * como 'badge' — é o comportamento seguro, já que são justamente os que
   * podem ter sido inflados.
   */
  s?: 'l' | 'b';
  /**
   * Fase 40 — direção da mensagem.
   *  'in'  = chegou do contato.
   *  'out' = enviada pela operação. Só existe em evento vindo da conversa
   *          ABERTA: o contador de não lidas da lista lateral nunca enxerga
   *          envio, então conversa fechada nunca produz 'out'.
   * Ausente = gravado por versão anterior, quando não havia separação —
   * tratado como 'in' na agregação (era o comportamento pretendido lá:
   * as enviadas deveriam ter sido descartadas).
   */
  d?: 'in' | 'out';
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
      // Fase 34 — "nunca vi esta conversa antes" é diferente de "só estou
      // reabrindo o app". `syncedSinceLoad` é só da sessão atual, mas
      // `lastSeen` é persistido: se já existe baseline gravada, estas não
      // lidas já foram contabilizadas numa sessão anterior e semear de novo
      // duplicaria a cada reinício do app.
      const hadBaseline = accountMap[chatKey] !== undefined;
      if (accountMap[chatKey] !== value) {
        accountMap[chatKey] = value;
        this.data.lastSeen[accountId] = accountMap;
        changed = true;
      }
      // Sem baseline anterior (primeiro uso, conversa nova, ou logo depois de
      // "Limpar dados do Analytics") + rótulo de dia visível na lista lateral:
      // estas não lidas SÃO mensagens daquele dia que ninguém contou ainda.
      // Sem isto, limpar os dados jogava fora a atividade real do dia e só
      // voltava a contar se o usuário abrisse cada conversa manualmente.
      // Fica marcado como 'b' (estimativa): abrir a conversa depois descarta
      // isto e regrava o número exato pelos balões.
      // Rótulo mais antigo que ontem nunca semeia — seriam mensagens velhas.
      if (!hadBaseline && value > 0 && (dateTag === 'today' || dateTag === 'yesterday')) {
        this.data.events.push({
          t: Date.now(),
          day: resolveDay(dateTag),
          a: accountId,
          k: chatKey,
          c: value,
          s: 'b',
          d: 'in',
        });
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
        // Fase 33: marcado como 'b' (estimativa por badge). Se a conversa for
        // aberta depois, `recordChatMessages` descarta estes eventos e
        // reescreve o dia pelo que os balões mostram.
        this.data.events.push({ t: Date.now(), day: resolveDay(dateTag), a: accountId, k: chatKey, c: delta, s: 'b', d: 'in' });
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
   * Fase 30.6 (versão definitiva) — canal de evento único: chamado toda vez
   * que `webviewPreload.ts` reclassifica a conversa aberta (mensagem nova,
   * troca de conversa, ou rolagem revelando histórico antigo — ver
   * comentário de topo daquele arquivo). `items` já vem filtrado (só
   * Hoje/Ontem, nunca mais antigo) e deduplicado NAQUELA sessão da página;
   * aqui a deduplicação é permanente, por `data-id`, entre reinícios do app
   * (`processedLiveMessageIds`) — rodar isto 1 vez ou 100 vezes por dia pro
   * mesmo conjunto de mensagens dá exatamente o mesmo resultado. `bucket`
   * (não um timestamp) decide o dia via `todayKey()`/`yesterdayKey()`.
   */
  recordChatMessages(accountId: string, chatKey: string, items: { dataId: string; bucket: 'today' | 'yesterday'; direction: 'in' | 'out' }[]): void {
    if (items.length === 0) return;

    const now = Date.now();
    const purgedDays = new Set<string>();
    let addedAny = false;
    let purgedAny = false;

    for (const item of items) {
      const processed = this.data.processedLiveMessageIds[accountId] ?? [];
      // Já contabilizada por balão antes (dedup permanente, entre reinícios
      // do app): nunca conta de novo, aconteça o que acontecer.
      if (processed.includes(item.dataId)) continue;
      const day = item.bucket === 'yesterday' ? yesterdayKey() : todayKey();

      // Fase 33 — primeira mensagem INÉDITA deste dia nesta varredura: é a
      // prova de que o badge (estimativa pela lista lateral) pode ter contado
      // estas mesmas mensagens antes de a conversa ser aberta. A leitura por
      // balão é a verdade, então o que o badge estimou para esta
      // conversa+dia é descartado agora, em vez de somar por cima — era daqui
      // que vinha a dupla contagem (5 mensagens viravam 10).
      //
      // Por que só quando há mensagem inédita, e por que sem estado
      // persistente de "já coberto": entre uma abertura e outra da conversa,
      // o badge volta a ser a única fonte possível (o WhatsApp Web só
      // renderiza balões da conversa aberta). Bloquear o badge de vez faria
      // o app PERDER mensagens que chegassem depois numa conversa que o
      // usuário não reabrisse. Deste jeito o badge segue contando entre as
      // aberturas, e cada nova abertura reescreve o dia pelo que os balões
      // mostram — converge para o número certo sem nunca inflar.
      if (!purgedDays.has(day)) {
        purgedDays.add(day);
        const before = this.data.events.length;
        // Só descarta o que está EXPLICITAMENTE marcado como estimativa de
        // badge ('b'). Eventos gravados por versões anteriores a esta não têm
        // a marca de origem e por isso nunca são apagados: entre eles há
        // contagens reais por balão (Fases 30–32), e apagá-las seria perder
        // número verdadeiro — o histórico antigo pode ficar inflado, mas
        // nunca é destruído por esta correção.
        this.data.events = this.data.events.filter(
          (e) => !(e.a === accountId && e.k === chatKey && e.day === day && e.s === 'b')
        );
        if (this.data.events.length !== before) purgedAny = true;
      }

      processed.push(item.dataId);
      this.data.processedLiveMessageIds[accountId] =
        processed.length > MAX_PROCESSED_LIVE_IDS_PER_ACCOUNT
          ? processed.slice(processed.length - MAX_PROCESSED_LIVE_IDS_PER_ACCOUNT)
          : processed;
      this.data.events.push({ t: now, day, a: accountId, k: chatKey, c: 1, s: 'l', d: item.direction });
      addedAny = true;
    }

    if (!addedAny && !purgedAny) return;
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
    const receivedByAccount = new Map<string, number>();
    const sentByAccount = new Map<string, number>();

    for (const e of this.data.events) {
      if (e.day !== day) continue;
      // Fase 40: evento sem direção veio de versão anterior à separação —
      // conta como recebida, que era a intenção original daquele código.
      if (e.d === 'out') {
        sentByAccount.set(e.a, (sentByAccount.get(e.a) ?? 0) + e.c);
        // Mensagem ENVIADA não cria interação: interação é pessoa que falou
        // com você. Mandar mensagem para alguém que não respondeu não conta.
        continue;
      }
      receivedByAccount.set(e.a, (receivedByAccount.get(e.a) ?? 0) + e.c);
      if (!conversationsByAccount.has(e.a)) conversationsByAccount.set(e.a, new Set());
      conversationsByAccount.get(e.a)!.add(e.k);
    }

    const byAccount = accounts
      .map((acc) => {
        const received = receivedByAccount.get(acc.id) ?? 0;
        const sent = sentByAccount.get(acc.id) ?? 0;
        return {
          accountId: acc.id,
          name: acc.name,
          color: acc.color,
          newConversations: conversationsByAccount.get(acc.id)?.size ?? 0,
          received,
          sent,
          messages: received + sent,
        };
      })
      .filter((a) => a.newConversations > 0 || a.messages > 0)
      .sort((a, b) => b.messages - a.messages);

    const totalConversations = byAccount.reduce((sum, a) => sum + a.newConversations, 0);
    const totalReceived = byAccount.reduce((sum, a) => sum + a.received, 0);
    const totalSent = byAccount.reduce((sum, a) => sum + a.sent, 0);

    return {
      totalConversations,
      totalMessages: totalReceived + totalSent,
      totalReceived,
      totalSent,
      byAccount,
    };
  }

  /** Relatório fixo de Hoje x Ontem (Fase 28) — independente do seletor de período geral do Analytics. */
  buildDailyReport(accounts: { id: string; name: string; color: string }[]): ChatActivityDailySummary {
    return {
      today: this.buildDayReport(todayKey(), accounts),
      yesterday: this.buildDayReport(yesterdayKey(), accounts),
    };
  }

  /**
   * Fase 32 (2026-08-30) — FONTE ÚNICA dos números do painel de Analytics.
   *
   * Antes, o painel misturava duas contagens independentes na mesma tela:
   * "Volume total / Instância líder / Média / Movimento por instância /
   * Horários de pico" vinham de analyticsStore.ts (que conta pelo contador de
   * não lidas da CONTA inteira), enquanto "Atividade de hoje/ontem" vinha
   * daqui (que conta mensagem por mensagem, por CONVERSA). Como medem coisas
   * diferentes, os dois blocos nunca fechavam entre si — foi exatamente a
   * divergência que o usuário reportou ("Volume total 17" ao lado de
   * "Atividade de hoje: 8 mensagens", 2026-08-30).
   *
   * Agora o painel inteiro deriva DESTES eventos, então "Volume total" é, por
   * construção, a soma exata do que aparece por instância, e o período "Hoje"
   * bate com o card "Atividade de hoje" (os dois usam a mesma chave de dia).
   *
   * Duas consequências assumidas de propósito:
   *  - Grupos continuam fora da conta (regra desta métrica desde a Fase 17),
   *    então o volume passa a refletir só conversas com pessoas.
   *  - O filtro de período usa a CHAVE DE DIA do evento (`day`, o dia real da
   *    mensagem segundo o próprio WhatsApp), não o instante em que o app
   *    percebeu (`t`). É o que faz "Hoje" bater exatamente com o card de
   *    hoje mesmo para mensagens de ontem detectadas hoje. `t` continua sendo
   *    usado só para o gráfico de horários de pico, que é por hora do dia.
   */
  buildAnalyticsSummary(range: AnalyticsRange, accounts: { id: string; name: string; color: string }[]): AnalyticsSummary {
    const startDay = dayKey(new Date(range.startTs));
    const endDay = dayKey(new Date(range.endTs));
    const receivedByAccount = new Map<string, number>();
    const sentByAccount = new Map<string, number>();
    const hourly = new Array(24).fill(0) as number[];

    for (const e of this.data.events) {
      // Comparação de string funciona porque a chave é AAAA-MM-DD (ordem
      // lexicográfica = ordem cronológica).
      if (e.day < startDay || e.day > endDay) continue;
      // Fase 40: evento sem direção (versão anterior à separação) conta como recebida.
      const target = e.d === 'out' ? sentByAccount : receivedByAccount;
      target.set(e.a, (target.get(e.a) ?? 0) + e.c);
      hourly[new Date(e.t).getHours()] += e.c;
    }

    const byAccount = accounts
      .map((acc) => {
        const received = receivedByAccount.get(acc.id) ?? 0;
        const sent = sentByAccount.get(acc.id) ?? 0;
        return { accountId: acc.id, name: acc.name, color: acc.color, received, sent, total: received + sent };
      })
      .filter((a) => a.total > 0)
      .sort((a, b) => b.total - a.total);

    const totalVolume = byAccount.reduce((sum, a) => sum + a.total, 0);
    const totalReceived = byAccount.reduce((sum, a) => sum + a.received, 0);
    const totalSent = byAccount.reduce((sum, a) => sum + a.sent, 0);
    const leader = byAccount[0]
      ? { accountId: byAccount[0].accountId, name: byAccount[0].name, total: byAccount[0].total }
      : null;
    const averagePerAccount = byAccount.length > 0 ? totalVolume / byAccount.length : 0;

    return {
      range,
      totalVolume,
      totalReceived,
      totalSent,
      leader,
      averagePerAccount,
      byAccount,
      timeline: hourly.map((count, hour) => ({ hour, count })),
    };
  }
}
