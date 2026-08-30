/**
 * Preload injetado dentro da página de cada instância (uma por conta). Dois
 * objetivos, os dois por observação passiva do DOM, avisando o processo
 * principal via IPC: (1) detectar se a conta está pronta para uso [login
 * concluído], e (2) detectar a CHEGADA de mensagens novas na conversa aberta
 * em tempo real, por evento de inserção no DOM (ver `syncChatPanelState`/
 * `attachMessageObserver` abaixo — Fase 30). Nunca lê, intercepta ou
 * armazena o texto, remetente ou mídia de nenhuma mensagem — apenas
 * presença de elementos de interface da própria página oficial e o
 * identificador opaco (`data-id`) de cada bolha.
 *
 * O conceito de "Aguardando QR Code" só existe no WhatsApp Web (é o próprio
 * WhatsApp que exige escanear um código pra vincular o navegador) — Gmail,
 * Google Earth, navegador livre e URL customizada não têm esse fluxo, então
 * não faz sentido (e é enganoso) tratá-los como se estivessem "esperando
 * QR Code" indefinidamente. Este preload só roda a detecção baseada em QR
 * Code quando a instância é de fato WhatsApp (`--mw-service=whatsapp`,
 * passado pelo processo principal em `viewManager.ts` via
 * `additionalArguments`); para os demais serviços, considera a instância
 * "pronta" assim que a página termina de carregar, e não fica reobservando
 * nada depois disso.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { ipcRenderer } from 'electron';

/** Lê o serviço desta instância a partir do argumento passado por viewManager.ts. */
function currentService(): string {
  const arg = process.argv.find((a) => a.startsWith('--mw-service='));
  return arg ? arg.slice('--mw-service='.length) : 'whatsapp';
}

function report(loggedIn: boolean): void {
  ipcRenderer.send('mw:account-status', { loggedIn });
}

function detectWhatsAppLoggedIn(): boolean {
  // Lista de conversas só existe depois do login bem-sucedido.
  const chatList = document.querySelector('#pane-side');
  const qrCanvas = document.querySelector('canvas[aria-label], div[data-testid="qrcode"]');
  if (chatList) return true;
  if (qrCanvas) return false;
  return false;
}

// Fase 5 (desempenho): o WhatsApp Web mexe no DOM o tempo todo (indicador de
// digitação, relógios de mensagem, etc.), então observar sem debounce dispara
// reportWhatsApp() (e um IPC) dezenas de vezes por segundo à toa. Um pequeno
// atraso agrupa essas rajadas em uma única checagem, sem atrasar
// perceptivelmente a detecção real de login/logout.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function reportWhatsAppDebounced(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => report(detectWhatsAppLoggedIn()), 400);
}

/**
 * Fase 30.6 (2026-08-29, versão definitiva) — detecção de mensagens por
 * EVENTO (nunca por polling), unificada num único mecanismo: toda vez que
 * ALGO muda na conversa aberta (mensagem nova chegando, troca de conversa,
 * ou até rolar a tela pra ver o histórico), a conversa inteira visível
 * agora é reclassificada do zero usando o divisor de data que o próprio
 * WhatsApp Web já desenha ("HOJE"/"ONTEM") — nunca o texto da mensagem.
 *
 * Por que reclassificar tudo de novo a cada mudança, em vez de só olhar o
 * que foi inserido: o WhatsApp Web usa uma lista VIRTUALIZADA — rolar pra
 * cima pra ver mensagens antigas faz ele inserir essas mensagens antigas de
 * novo no HTML (é assim que listas longas ficam leves). Um desenho que só
 * perguntasse "isso é um elemento novo no DOM?" confundiria isso com
 * mensagem nova de verdade — bug real identificado em uso ao vivo
 * (2026-08-29). Reclassificar pelo DIVISOR DE DATA em vez de "quando
 * apareceu no DOM" resolve isso de vez: uma mensagem de antes de ontem
 * nunca conta, não importa se ela aparece no HTML agora (rolagem) ou há
 * dias — e uma mensagem de hoje conta, não importa se ela já estava
 * carregada quando a conversa abriu ou acabou de chegar.
 *
 * Deduplicação por identidade (`data-id`, nunca o texto) é o que garante
 * "nunca recontar": cada bolha só pode gerar 1 evento na vida do app,
 * guardado numa lista persistida (`seenMessageIds` aqui + a lista
 * equivalente em analyticsStore.ts/chatActivityStore.ts do lado do processo
 * principal) — reprocessar a conversa inteira de novo a cada mudança é
 * seguro e propositalmente redundante: rodar 1 vez ou 100 vezes no mesmo
 * dia dá exatamente o mesmo resultado, porque tudo que já foi visto antes é
 * ignorado.
 *
 * Cada bolha aceita (dentro de Hoje ou Ontem, nunca mais antiga) é reportada
 * com `{ dataId, bucket }` — o processo principal decide o dia exato
 * (`todayKey()`/`yesterdayKey()`) a partir do bucket, nunca de um timestamp
 * de "quando o app percebeu isso", que é exatamente a fonte do bug anterior.
 *
 * Identificação da conversa: cada evento de "conversa aberta" carrega o
 * NOME lido da lista lateral (`chatKey`, ver `extractChatKey` — reaproveita
 * o mesmo campo `span[title]` da linha selecionada, já comprovado
 * funcionando) e se é grupo (`isGroup`) — necessário para o relatório
 * "Hoje x Ontem" por pessoa (chatActivityStore.ts) saber a quem atribuir
 * cada mensagem. `syncChatPanelState` reage à mudança de nome mesmo quando
 * `#main` continua o mesmo elemento entre duas conversas diferentes.
 *
 * NUNCA lê texto, remetente ou mídia de nenhuma mensagem — só o atributo
 * `data-id` (identificador opaco) de cada bolha e o texto do divisor de
 * data (elemento de interface, não conteúdo de mensagem). Mensagens
 * enviadas pelo próprio usuário (`data-id` começando com `true_`) nunca são
 * reportadas, mesma regra do contador de não lidas.
 *
 * Registra o observador de imediato quando a página carrega — não depende
 * do usuário clicar ou trocar de aba para essa conta: a própria conta que
 * já abre com o app (a primeira instância) começa a escutar sozinha.
 */
let chatMessageObserver: MutationObserver | null = null;
let mainPanelPresent = false;
// Nome da conversa atualmente rastreada — não só a presença de `#main`, que
// pode continuar montado (mesmo elemento) quando o usuário troca de uma
// conversa pra outra sem fechar o painel; sem isso, trocar de contato não
// seria detectado como troca de conversa.
let currentChatKey: string | null = null;
// IDs já reportados NESTA sessão da página (whatsapp reload = zera, o que é
// seguro porque o processo principal também deduplica de forma persistida).
const seenMessageIds = new Set<string>();

function findMessagePanel(main: Element): Element {
  return (
    main.querySelector('[data-testid="conversation-panel-messages"]') ||
    main.querySelector('[role="application"]') ||
    main.querySelector('.copyable-area') ||
    main
  );
}

const DATE_DIVIDER_RE = /^(hoje|today|ontem|yesterday)$/i;

/**
 * Fase 40 — uma mensagem lida da conversa aberta.
 * `direction`: 'in' = chegou do contato; 'out' = enviada pela operação.
 */
interface ScannedMessage {
  dataId: string;
  bucket: 'today' | 'yesterday';
  direction: 'in' | 'out';
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function formatDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const PRE_PLAIN_TEXT_DATE_RE = /\[\d{1,2}:\d{2},\s*(\d{2}\/\d{2}\/\d{4})\]/;

/**
 * Fase 30.8 (2026-08-29) — cada bolha do WhatsApp Web carrega, no mesmo
 * atributo que a própria função "copiar" da interface já usa
 * (`data-pre-plain-text`, ex.: "[21:27, 29/08/2026] Fulano: "), a data e hora
 * DAQUELA mensagem específica — nunca o texto dela. Diferente do divisor
 * visual "Hoje"/"Ontem" (que pode sair do HTML por causa da lista
 * virtualizada em conversas com bastante histórico — bug real identificado
 * em uso ao vivo: conversas grandes paravam de contar porque o divisor não
 * estava mais renderizado quando a conversa era aberta já rolada até o
 * fim), esse atributo viaja junto de cada bolha individualmente, então a
 * classificação de uma mensagem nunca depende do que mais está renderizado
 * na tela no momento.
 */
function classifyByOwnDate(node: Element): 'today' | 'yesterday' | 'other' | null {
  const withAttr = node.hasAttribute('data-pre-plain-text') ? node : node.querySelector('[data-pre-plain-text]');
  const raw = withAttr ? withAttr.getAttribute('data-pre-plain-text') : null;
  if (!raw) return null;
  const match = PRE_PLAIN_TEXT_DATE_RE.exec(raw);
  if (!match) return null;
  const dateStr = match[1];
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dateStr === formatDDMMYYYY(now)) return 'today';
  if (dateStr === formatDDMMYYYY(yesterday)) return 'yesterday';
  return 'other';
}

/**
 * Fase 35 (2026-08-30) — a mensagem foi ENVIADA PELO USUÁRIO? Essas nunca
 * entram na contagem (o relatório é de movimento recebido).
 *
 * Bug real encontrado em dados de produção: o único teste que existia era o
 * prefixo `true_` do `data-id`, herdado do formato antigo
 * (`{true|false}_{chat}_{msg}`). Inspecionando o arquivo salvo do usuário,
 * os `data-id` reais estavam vindo como identificador puro
 * (ex.: `3EB09E166A5D3D7D43DE6E`), SEM prefixo nenhum — então o teste nunca
 * dava positivo e todas as mensagens enviadas pelo próprio usuário estavam
 * sendo contadas como recebidas, inflando o relatório. O filtro existia
 * desde o início (pedido explícito do usuário), mas só no papel: nunca
 * chegou a excluir nada de verdade.
 *
 * Correção: usar a classe que o próprio WhatsApp Web coloca na bolha para
 * alinhá-la à direita (`message-out`) ou à esquerda (`message-in`) — é
 * marcação de interface visível, não conteúdo de mensagem.
 *
 * Direção segura de falha: só EXCLUI quando identifica positivamente que é
 * enviada. Se um dia essa marcação sumir, volta a contar tudo (o
 * comportamento de antes) em vez de parar de contar — errar para mais é
 * corrigível olhando o relatório; parar de contar passa despercebido.
 */
function isOutgoing(node: Element, dataId: string): boolean {
  // Sinal 1 — formato antigo do identificador (`true_...`).
  if (/^true[_-]/i.test(dataId)) return true;
  if (/^false[_-]/i.test(dataId)) return false;

  // Sinal 2 — classe de alinhamento da bolha (`message-out` à direita,
  // `message-in` à esquerda).
  //
  // CORREÇÃO (verificada nos dados reais do usuário, 2026-08-30): a versão
  // anterior só usava `closest()`, que procura nos elementos ACIMA na árvore.
  // No WhatsApp Web essa classe fica num elemento ABAIXO do que carrega o
  // `data-id`, então `closest()` nunca achava nada e toda mensagem enviada
  // era contada como recebida. Agora procura nos dois sentidos.
  const above = node.closest('.message-out, .message-in');
  if (above) return above.classList.contains('message-out');
  const below = node.querySelector('.message-out, .message-in');
  if (below) return below.classList.contains('message-out');

  // Sinal 3 — indicador de entrega. Só a SUA mensagem tem relógio de
  // "enviando", tique simples ou tique duplo. Recebida nunca tem.
  if (node.querySelector('[data-icon^="msg-"], [data-icon^="status-"]')) return true;

  // Sinal 4 — prefixo do identificador. O WhatsApp Web gera identificador
  // começando com "3EB0" para as mensagens que ELE mesmo envia. Confirmado
  // no arquivo real do usuário: todos os `3EB0...` gravados eram mensagens
  // dele, e os `AC...` eram recebidas. Fica por último por ser um padrão
  // observado, não documentado.
  if (/^3EB0/i.test(dataId)) return true;

  return false;
}

/**
 * Caminha TODA a conversa visível agora, em ordem. Prioridade de
 * classificação por bolha: (1) a data própria dela (`data-pre-plain-text`,
 * ver `classifyByOwnDate`), confiável mesmo com virtualização; (2) se essa
 * bolha não tiver esse atributo por algum motivo, o divisor de data mais
 * próximo ANTES dela (comportamento anterior, mantido como reserva). Retorna
 * só as de Hoje/Ontem, nunca vistas antes nesta sessão da página, nunca
 * enviadas pelo próprio usuário.
 */
function scanChatMessages(panel: Element): ScannedMessage[] {
  // CORREÇÃO (2026-08-30, confirmada nos dados reais): o seletor anterior
  // procurava o divisor de data em `span[aria-label]` e `div[role="button"]
  // span`. O divisor comum do WhatsApp ("Hoje", "Ontem") não tem `aria-label`
  // nem fica dentro de um botão, então nunca era encontrado. Consequência: as
  // primeiras mídias logo abaixo do divisor herdavam o dia da última mensagem
  // datada anterior, que é do dia de ONTEM, e sumiam do relatório de hoje.
  //
  // Agora percorre também elementos-folha (sem filhos), que é onde o texto do
  // divisor de fato mora. A checagem de folha vem antes de ler o texto, para
  // não pagar `textContent` em contêineres grandes.
  const nodes = Array.from(panel.querySelectorAll('[data-id], span, div'));
  let bucket: 'today' | 'yesterday' | 'other' = 'other';
  const out: ScannedMessage[] = [];

  for (const node of nodes) {
    if (node.hasAttribute && node.hasAttribute('data-id')) {
      const dataId = node.getAttribute('data-id') || '';
      if (!dataId || seenMessageIds.has(dataId)) continue;
      // Fase 40: a mensagem enviada deixou de ser descartada — agora é
      // reportada com direção 'out', para o relatório poder separar
      // "Recebidas" de "Enviadas". Continua fora da contagem de interações
      // (interação é pessoa que FALOU com você).
      const direction: 'in' | 'out' = isOutgoing(node, dataId) ? 'out' : 'in';
      // Data própria da bolha quando existe. Imagem, figurinha e áudio
      // normalmente NÃO têm esse dado — só mensagem de texto tem.
      const ownDate = classifyByOwnDate(node);
      if (ownDate) {
        // Mensagem datada: além de classificar a si mesma, ela passa a ser a
        // referência de dia para as próximas bolhas sem data. É o que faz uma
        // imagem entre duas mensagens de hoje ser contada como hoje.
        bucket = ownDate;
      }
      // CORREÇÃO (2026-08-30): antes, bolha sem data própria dependia só do
      // divisor "Hoje"/"Ontem" estar carregado. Numa conversa rolada, esse
      // divisor costuma estar fora do trecho renderizado, então imagens e
      // figurinhas viravam "mais antiga que ontem" e sumiam da contagem —
      // no caso real do usuário, 16 mensagens viraram 7. Agora a referência
      // também vem da última mensagem datada vista antes dela, na ordem da
      // tela.
      const effectiveBucket = ownDate ?? bucket;
      if (effectiveBucket === 'other') continue; // mais antiga que ontem: nunca conta, não marca visto (barato reavaliar)
      seenMessageIds.add(dataId);
      out.push({ dataId, bucket: effectiveBucket, direction });
      continue;
    }
    // Só elementos-folha podem ser o divisor. Filtrar antes evita ler o texto
    // de contêineres inteiros a cada varredura.
    if (node.childElementCount > 0) continue;
    const text = (node.textContent || '').trim();
    if (text.length > 0 && text.length <= 12 && DATE_DIVIDER_RE.test(text)) {
      const lower = text.toLowerCase();
      bucket = lower === 'hoje' || lower === 'today' ? 'today' : 'yesterday';
    }
  }
  return out;
}

function reportChatMessages(items: ScannedMessage[]): void {
  if (items.length === 0) return;
  ipcRenderer.send('mw:chat-messages', { items });
}

/**
 * Fase 37 (2026-08-30) — CARREGAR HOJE E ONTEM POR INTEIRO.
 *
 * Buraco real que isto fecha: ao abrir uma conversa, o WhatsApp Web só
 * desenha as mensagens mais recentes (lista virtualizada). Numa conversa com
 * bastante movimento, boa parte das mensagens DE HOJE simplesmente não está
 * na página — não tem identificador, não tem nada — e por isso nunca era
 * contada. Era o caso do Jorge Pereira: mensagens de hoje visíveis na
 * conversa, e o relatório sem elas.
 *
 * Como resolve: rola o painel para cima em passos, o que faz o WhatsApp
 * carregar mais mensagens, e PARA assim que encontrar a primeira mensagem
 * mais antiga que ontem. Nunca carrega o histórico inteiro — o alvo é
 * exatamente a janela pedida (hoje e ontem), nada além.
 *
 * A posição da tela é devolvida ao ponto onde estava, medindo a distância
 * até o fim da conversa (que não muda quando mensagens antigas entram por
 * cima). Ainda assim o movimento é perceptível enquanto acontece.
 *
 * Roda uma vez por conversa aberta, não a cada varredura.
 */
const HISTORY_MAX_STEPS = 15;
const HISTORY_STEP_MS = 350;
let historyLoadRunning = false;

function findScroller(panel: Element): HTMLElement | null {
  const candidates = [panel, ...Array.from(panel.querySelectorAll('div'))] as HTMLElement[];
  for (const el of candidates) {
    if (el.scrollHeight > el.clientHeight + 40) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el;
    }
  }
  return null;
}

/** Já existe na página alguma mensagem mais antiga que ontem? Então hoje e ontem estão completos. */
function hasLoadedBeyondYesterday(panel: Element): boolean {
  const nodes = panel.querySelectorAll('[data-id]');
  for (const node of Array.from(nodes)) {
    if (classifyByOwnDate(node) === 'other') return true;
  }
  return false;
}

async function loadTodayAndYesterday(panel: Element, onProgress: () => void): Promise<void> {
  if (historyLoadRunning) return;
  const scroller = findScroller(panel);
  if (!scroller) return;

  historyLoadRunning = true;
  // Distância até o fim: referência estável mesmo quando entram mensagens
  // antigas no topo (que empurram tudo para baixo).
  const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop;

  try {
    for (let step = 0; step < HISTORY_MAX_STEPS; step++) {
      if (hasLoadedBeyondYesterday(panel)) break;
      const heightBefore = scroller.scrollHeight;
      scroller.scrollTop = 0;
      await new Promise((resolve) => setTimeout(resolve, HISTORY_STEP_MS));
      onProgress(); // conta o que acabou de entrar, sem esperar terminar tudo
      // Nada novo carregou: chegou no começo da conversa.
      if (scroller.scrollHeight === heightBefore) break;
    }
  } finally {
    scroller.scrollTop = Math.max(0, scroller.scrollHeight - distanceFromBottom);
    historyLoadRunning = false;
  }
}

/**
 * `chatKey` identifica QUAL conversa está aberta (nome do contato/grupo,
 * lido do cabeçalho da conversa — mesmo campo/seletor que a lista lateral já
 * usa) — necessário para o relatório "Hoje x Ontem" por pessoa
 * (chatActivityStore.ts) saber a quem atribuir cada mensagem nova, exatamente
 * como a leitura da lista lateral já fazia. `isGroup` segue a mesma regra de
 * sempre: grupos nunca entram nesse relatório.
 */
function reportChatOpenState(open: boolean, chatKey: string | null, isGroup: boolean): void {
  ipcRenderer.send('mw:chat-open-state', { open, chatKey, isGroup });
}

/**
 * Lê só o NOME já visível (do contato/grupo da conversa aberta) — nunca
 * telefone, status ou qualquer outro dado.
 *
 * Prioridade 1 (2026-08-29, correção): a linha marcada como SELECIONADA na
 * lista lateral (`aria-selected="true"`, atributo de acessibilidade que o
 * WhatsApp Web já usa para indicar qual conversa está aberta) — reaproveita
 * exatamente o mesmo seletor (`span[title]`) que `getChatEntries`
 * (viewManager.ts) já usa pra lista lateral, e que já está comprovado
 * funcionando contra o WhatsApp Web real (é como os nomes já aparecem
 * corretamente no relatório Hoje/Ontem hoje). Evita depender de um seletor
 * novo e não testado para o cabeçalho da conversa.
 *
 * Prioridade 2 (reserva): o cabeçalho da própria conversa aberta, caso a
 * linha selecionada não seja encontrada por qualquer motivo (ex.: lista
 * lateral minimizada/oculta).
 */
function extractChatKey(main: Element): { key: string | null; isGroup: boolean } {
  const activeRow =
    document.querySelector('#pane-side [aria-selected="true"]') ||
    document.querySelector('[data-testid="chat-list"] [aria-selected="true"]') ||
    document.querySelector('[aria-selected="true"][role="row"]');
  if (activeRow) {
    const nameEl = activeRow.querySelector('span[title]');
    const raw = nameEl ? (nameEl.getAttribute('title') || nameEl.textContent || '').trim() : '';
    if (raw.length > 0) {
      const isGroup = !!activeRow.querySelector(
        '[data-icon="default-group"], [aria-label*="grupo" i], [aria-label*="group" i]'
      );
      return { key: raw, isGroup };
    }
  }

  const header = main.querySelector('header');
  if (!header) return { key: null, isGroup: false };
  const nameEl = header.querySelector('span[title]');
  const raw = nameEl ? (nameEl.getAttribute('title') || nameEl.textContent || '').trim() : '';
  const isGroup = !!header.querySelector('[data-icon="default-group"], [aria-label*="grupo" i], [aria-label*="group" i]');
  return { key: raw.length > 0 ? raw : null, isGroup };
}

// Agrupa rajadas de mutação (WhatsApp mexe no DOM várias vezes por segundo)
// numa única varredura, mesmo espírito do debounce de `reportWhatsAppDebounced`.
const SCAN_DEBOUNCE_MS = 400;
let scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function detachMessageObserver(): void {
  chatMessageObserver?.disconnect();
  chatMessageObserver = null;
  seenMessageIds.clear();
  if (scanDebounceTimer) {
    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = null;
  }
}

function attachMessageObserver(panel: Element): void {
  const scan = () => reportChatMessages(scanChatMessages(panel));
  const scanDebounced = () => {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(scan, SCAN_DEBOUNCE_MS);
  };

  scan(); // varredura imediata: cobre o que já estiver carregado agora mesmo
  chatMessageObserver = new MutationObserver(scanDebounced);
  chatMessageObserver.observe(panel, { childList: true, subtree: true });
  // Fase 37: em seguida completa hoje e ontem, carregando o que o WhatsApp
  // não desenhou de início. Vai contando a cada passo, não só no fim.
  void loadTodayAndYesterday(panel, scan);
}

/**
 * Liga/desliga o observador de mensagens conforme o painel de conversa
 * aparece/some/troca. Roda a CADA tick (não só quando a presença de `#main`
 * muda) porque `#main` pode continuar o mesmo elemento entre duas conversas
 * diferentes — o que de fato identifica "a conversa mudou" é o nome lido do
 * cabeçalho (`chatKey`), não a existência do container.
 */
function syncChatPanelState(): void {
  const main = document.querySelector('#main');
  if (!main) {
    if (mainPanelPresent) {
      mainPanelPresent = false;
      currentChatKey = null;
      reportChatOpenState(false, null, false);
      detachMessageObserver();
    }
    return;
  }
  const { key, isGroup } = extractChatKey(main);
  const changed = !mainPanelPresent || key !== currentChatKey;
  if (!changed) return;
  mainPanelPresent = true;
  currentChatKey = key;
  reportChatOpenState(true, key, isGroup);
  detachMessageObserver();
  attachMessageObserver(findMessagePanel(main));
}

// Fase 30.7 (2026-08-29, correcao de desempenho): syncChatPanelState() faz
// varias buscas no DOM (extractChatKey) e rodava sem debounce, disparada por
// TODA mutacao em document.body. Numa conta parada isso e raro, mas numa
// conta com bastante mensagem chegando o WhatsApp mexe no DOM dezenas de
// vezes por segundo (relogio, confirmacao de leitura, digitando) - com varias
// contas carregadas ao mesmo tempo em segundo plano, isso gerava carga real
// de CPU o suficiente pra travar o processo da conta mais ativa e derrubar a
// conexao de verdade dela com o WhatsApp (bug real identificado em uso ao
// vivo, 2026-08-29 - a conta com mais atividade era a que caia). Agrupada no
// mesmo debounce de reportWhatsAppDebounced: perde no maximo 400ms de
// latencia de deteccao, sem nunca perder um evento (o setInterval de 1s e o
// MutationObserver do painel de mensagens continuam cobrindo o resto).
let panelSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function syncChatPanelStateDebounced(): void {
  if (panelSyncDebounceTimer) clearTimeout(panelSyncDebounceTimer);
  panelSyncDebounceTimer = setTimeout(syncChatPanelState, 400);
}

// Fase 33.2 — "Limpar dados do Analytics" zera o processo principal; sem
// isto a página continuaria lembrando quais balões já reportou e a conversa
// aberta no momento só voltaria a ser contada ao trocar de conversa ou
// recarregar. Depois de esquecer, uma varredura imediata reporta de novo o
// que está visível, já contra o histórico zerado.
ipcRenderer.on('mw:reset-message-tracking', () => {
  seenMessageIds.clear();
  currentChatKey = null;
  mainPanelPresent = false;
  syncChatPanelState();
});

function startWhatsApp(): void {
  report(detectWhatsAppLoggedIn());
  const observer = new MutationObserver(() => {
    reportWhatsAppDebounced();
    syncChatPanelStateDebounced();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // Rede de segurança independente do debounce, caso o observer perca algum estado.
  setInterval(() => report(detectWhatsAppLoggedIn()), 5000);
  // Checagem leve e independente: só existência do painel `#main` (não o
  // conteúdo de mensagens), para nunca perder uma troca de conversa mesmo
  // que, por qualquer motivo, ela não dispare uma mutação em document.body.
  setInterval(syncChatPanelState, 1000);
  syncChatPanelState();
}

/**
 * Gmail, Google Earth, navegador livre e URL customizada: não existe um
 * estado de "login pendente" que possamos observar de forma genérica e
 * confiável sem depender do DOM interno de sites de terceiros (o que seria
 * engenharia reversa, fora do escopo do projeto). Cada um desses serviços já
 * cuida do próprio fluxo de login (ex.: Gmail mostra a tela de login do
 * Google normalmente dentro da própria instância) — o app só precisa parar
 * de rotular isso como "Aguardando QR Code". Reportar "pronta" assim que a
 * página termina de carregar é suficiente para isso.
 */
function startOtherService(): void {
  report(true);
}

function start(): void {
  if (currentService() === 'whatsapp') {
    startWhatsApp();
  } else {
    startOtherService();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  window.addEventListener('DOMContentLoaded', start);
}
