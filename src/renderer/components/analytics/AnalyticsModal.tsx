/**
 * Aba Analytics: visão de "movimento" por conta (mensagens novas recebidas,
 * detectadas pelo contador de não lidas e, para a conversa aberta no
 * momento, pelo identificador de cada mensagem — nunca o texto/remetente,
 * ver analyticsStore.ts no processo principal), agora com filtros de período
 * avançados (atalhos + intervalo customizado + comparação com o período
 * anterior), alertas do sistema em tempo real e cards de saúde da conexão.
 *
 * Decisão de escopo: os dados de "mensagens enviadas" e "status de entrega"
 * (enviada/entregue/lida/falha) NÃO são coletados por este app — capturar
 * status de entrega exigiria inspecionar os ticks de cada mensagem, o que
 * vai além do que foi autorizado (ver header de analyticsStore.ts para o que
 * é lido hoje e por quê). Por isso o bloco "Recebidas vs. Enviadas" / "Status
 * de Entrega" pedido no upgrade de UI/UX foi deliberadamente omitido desta
 * versão.
 *
 * Fase 28: a seção "Atividade por instância — Hoje/Ontem" (ver
 * DailyActivityCard abaixo) substituiu os dois KPIs soltos da Fase 17
 * ("Novas conversas"/"Mensagens", que ficavam presos ao seletor de período
 * geral) por um relatório fixo separado por dia — ver chatActivityStore.ts
 * (processo principal) para a explicação completa da métrica, de como ela
 * nunca conta a mesma mensagem duas vezes, nunca inclui grupos, e de como o
 * dia de cada mensagem é decidido pelo próprio rótulo "Hoje"/"Ontem" do
 * WhatsApp Web.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpDown, BarChart3, Download, Gauge, Radio, RefreshCw, Trophy, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AccountStatus, AnalyticsPeriod, AnalyticsRange, AnalyticsSummary, ChatActivityDailySummary, InteractionClassificationSummary } from '../../types';
import { dateInputValue, endOfDateInput, previousRange, quickRange, startOfDateInput } from '../../analyticsRange';
import { formatHour, formatDelta, Dot, formatDateBR } from './shared';
import { KpiCard } from './KpiCard';
import { MensagensPorInstanciaCard } from './MensagensPorInstanciaCard';
import { FluxoCard } from './FluxoCard';
import { AtividadeCard } from './AtividadeCard';
import { ClassificacaoCard } from './ClassificacaoCard';
import { SeletorPeriodo, OPCOES_PERIODO } from './SeletorPeriodo';

// Intervalo de atualização automática enquanto o painel está aberto — leve o
// bastante para não pesar (é só um agregado pequeno vindo do processo
// principal, ver mw:get-analytics-summary), mas suficiente pra sentir o
// painel "vivo" caso uma mensagem chegue com o painel em tela.
const REFRESH_MS = 20_000;

/** Fase 86 — onde fica guardada a escolha de "Comparar com período anterior". */
const COMPARE_STORAGE_KEY = 'orbi.analytics.compare';

// Quantos alertas manter em tela no máximo — evita que o painel encha de
// banners numa sessão muito instável e vire ruído em vez de sinal.
const MAX_ALERTS = 8;

interface SystemAlert {
  id: string;
  accountId: string;
  name: string;
  message: string;
  ts: number;
}

/** Classifica uma conta em uma das três badges de saúde de conexão do painel. */
function connectionCategory(status: AccountStatus | undefined): 'online' | 'offline' | 'reconnecting' {
  if (!status) return 'reconnecting';
  if (status.loadError) return 'offline';
  if (status.suspended) return 'offline';
  if (!status.loaded) return 'reconnecting';
  return status.isOnline ? 'online' : 'reconnecting';
}

export function AnalyticsModal({
  open,
  onClose,
  escEnabled = true,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Fase 50 — o Analytics é uma PÁGINA, e modais como Ajuda e Configurações
   * abrem por cima dela. Como os dois ouvem Esc na janela, um único toque
   * fecharia o modal e a página junto. Quem monta a tela (App.tsx) desliga
   * este ouvinte enquanto houver algo aberto na frente, então Esc fecha só o
   * que está por cima. O fechamento do Analytics em si não mudou.
   */
  escEnabled?: boolean;
}) {
  const accounts = useAppStore((s) => s.accounts);
  const statuses = useAppStore((s) => s.statuses);
  const reloadAccount = useAppStore((s) => s.reloadAccount);
  const switchAccount = useAppStore((s) => s.switchAccount);

  const [quick, setQuick] = useState<AnalyticsPeriod>('today');
  const [customStart, setCustomStart] = useState(() => dateInputValue(7));
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(0));
  // Fase 86 — "Comparar com período anterior" fica marcado entre aberturas do
  // Analytics (e depois de reiniciar o app), guardado neste computador.
  const [compare, setCompare] = useState(() => {
    try {
      return localStorage.getItem(COMPARE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, compare ? '1' : '0');
    } catch {
      // Sem acesso ao armazenamento local: só não lembra a escolha.
    }
  }, [compare]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [chatDaily, setChatDaily] = useState<ChatActivityDailySummary | null>(null);
  const [classification, setClassification] = useState<InteractionClassificationSummary | null>(null);
  const [prevClassification, setPrevClassification] = useState<InteractionClassificationSummary | null>(null);  // Fase 43 — `null` = todos os agrupamentos.
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Fase 64 — instante da última atualização bem-sucedida, para o "Atualizado há".
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const groups = useAppStore((s) => s.groups);

  const prevStatusesRef = useRef<Map<string, AccountStatus>>(new Map());

  /** Fase 43 — salva o período selecionado em CSV, respeitando o agrupamento. */
  async function exportCsv() {
    setExporting(true);
    try {
      const result = await window.multiwhats.exportAnalyticsCsv(currentRange(), groupFilter);
      if (result.error) window.alert(result.error);
    } finally {
      setExporting(false);
    }
  }

  // Recalculada a cada chamada (nunca memoizada só a partir da seleção da
  // UI) — ver comentário de topo de analyticsRange.ts sobre por que isso é
  // necessário para "Hoje/7 dias/30 dias" continuarem avançando a cada
  // atualização automática de 20s em vez de congelar no instante do clique.
  function currentRange(): AnalyticsRange {
    if (quick === 'custom' && customStart && customEnd) {
      const startTs = startOfDateInput(customStart);
      const endTs = endOfDateInput(customEnd);
      if (endTs > startTs) return { startTs, endTs };
    }
    return quickRange(quick === 'custom' ? 'today' : quick);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const range = currentRange();
        const result = await window.multiwhats.getAnalyticsSummary(range, groupFilter);
        if (cancelled) return;
        setSummary(result);
        setUpdatedAt(Date.now());
        if (compare) {
          const prevResult = await window.multiwhats.getAnalyticsSummary(previousRange(range), groupFilter);
          if (!cancelled) setPrevSummary(prevResult);
        } else if (!cancelled) {
          setPrevSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quick, customStart, customEnd, compare, groupFilter]);

  // Fase 28: relatório fixo de Hoje x Ontem — busca independente do
  // seletor de período geral acima (não faz sentido esse relatório
  // "seguir" o filtro de Hoje/7 dias/30 dias/personalizado).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadDaily = async () => {
      try {
        const result = await window.multiwhats.getChatActivityDaily(groupFilter);
        if (!cancelled) setChatDaily(result);
      } catch {
        // Silencioso — a UI só mostra "sem novas interações" se isto falhar.
      }
    };
    loadDaily();
    const interval = setInterval(loadDaily, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, groupFilter]);

  // Fase 77 — Classificação das Interações: busca própria, com o mesmo
  // período, comparação e agrupamento dos cards acima. Não mexe no `load`
  // das métricas existentes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadClassification = async () => {
      try {
        const range = currentRange();
        const result = await window.multiwhats.getInteractionClassification(range, groupFilter);
        if (cancelled) return;
        setClassification(result);
        if (compare) {
          const prevResult = await window.multiwhats.getInteractionClassification(previousRange(range), groupFilter);
          if (!cancelled) setPrevClassification(prevResult);
        } else {
          setPrevClassification(null);
        }
      } catch {
        // Silencioso — o card mostra "Sem interações no período" se isto falhar.
      }
    };
    loadClassification();
    const interval = setInterval(loadClassification, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quick, customStart, customEnd, compare, groupFilter]);

  // Fase 34.1 — Esc fecha o Analytics. Enquanto era um modal, isso vinha
  // pronto do componente Modal; virando página, precisou ser reimplementado
  // aqui. A WebContentsView da instância fica escondida enquanto esta página
  // está aberta, então o foco de teclado é desta janela e o listener pega.
  useEffect(() => {
    if (!open || !escEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, escEnabled, onClose]);

  // Alertas em tempo real: detecta transições de status (não faz nenhuma
  // leitura nova — usa exatamente os mesmos campos de AccountStatus que já
  // chegam via onAccountsChanged) e gera um banner dispensável por evento.
  useEffect(() => {
    if (!open) return;
    const prevMap = prevStatusesRef.current;
    const fresh: SystemAlert[] = [];
    for (const acc of accounts) {
      const curr = statuses.get(acc.id);
      const prev = prevMap.get(acc.id);
      if (!curr || !prev) continue;
      if (prev.isOnline && !curr.isOnline && curr.loaded && !curr.suspended) {
        fresh.push({
          id: `${acc.id}-drop-${curr.unreadCount}-${prevMap.size}-${Date.now()}`,
          accountId: acc.id,
          name: acc.name,
          message: `${acc.name}: a sessão caiu ou o QR Code expirou`,
          ts: Date.now(),
        });
      }
      if (!prev.loadError && curr.loadError) {
        fresh.push({
          id: `${acc.id}-error-${Date.now()}`,
          accountId: acc.id,
          name: acc.name,
          message: `${acc.name}: falha ao carregar a sessão`,
          ts: Date.now(),
        });
      }
    }
    if (fresh.length > 0) {
      setAlerts((list) => [...fresh, ...list].slice(0, MAX_ALERTS));
    }
    prevStatusesRef.current = new Map(statuses);
  }, [accounts, statuses, open]);

  const healthCounts = useMemo(() => {
    let online = 0;
    let offline = 0;
    let reconnecting = 0;
    for (const acc of accounts) {
      const category = connectionCategory(statuses.get(acc.id));
      if (category === 'online') online++;
      else if (category === 'offline') offline++;
      else reconnecting++;
    }
    return { online, offline, reconnecting };
  }, [accounts, statuses]);

  const barData = useMemo(
    () =>
      (summary?.byAccount ?? []).map((a) => ({
        name: a.name,
        total: a.total,
        received: a.received,
        sent: a.sent,
        color: a.color,
      })),
    [summary]
  );
  const timelineData = useMemo(() => {
    const current = summary?.timeline ?? [];
    const prev = prevSummary?.timeline ?? [];
    return current.map((t, i) => ({
      hour: formatHour(t.hour),
      count: t.count,
      prevCount: compare ? prev[i]?.count ?? 0 : undefined,
    }));
  }, [summary, prevSummary, compare]);

  const volumeDelta = compare && summary && prevSummary ? formatDelta(summary.totalVolume, prevSummary.totalVolume) : null;

  // Fase 64 — só apresentação: cor, participação no volume e quantas contas
  // tiveram movimento, tudo derivado do mesmo resumo já carregado.
  const leaderInfo = useMemo(() => {
    if (!summary?.leader) return null;
    const leader = summary.leader;
    const row = summary.byAccount.find((a) => a.accountId === leader.accountId);
    const pct = summary.totalVolume > 0 ? Math.round((leader.total / summary.totalVolume) * 100) : 0;
    return { name: leader.name, total: leader.total, color: row?.color ?? 'var(--color-accent)', pct };
  }, [summary]);
  const activeAccounts = summary ? summary.byAccount.filter((a) => a.total > 0).length : 0;
  const periodo = summary?.range ?? currentRange();

  function dismissAlert(id: string) {
    setAlerts((list) => list.filter((a) => a.id !== id));
  }

  function reconnect(alert: SystemAlert) {
    reloadAccount(alert.accountId);
    switchAccount(alert.accountId);
    dismissAlert(alert.id);
  }

  // Fase 32: deixou de ser janela flutuante (modal) e virou PÁGINA — ocupa
  // toda a área de conteúdo (largura e altura), no lugar da instância, para
  // caber o painel inteiro sem aperto. Quem esconde a WebContentsView por
  // baixo continua sendo o mesmo mecanismo de sempre (setOverlayActive em
  // App.tsx), então nada muda no processo principal.
  if (!open) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-content">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">
            <BarChart3 size={15} />
          </span>
          <h1 className="text-[15px] font-semibold text-text">Analytics</h1>
        </div>
        <button
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
      {/*
        Fase 64 — nova disposição, a pedido do usuário: filtros numa barra só,
        indicadores em quatro cards, gráficos ANTES das tabelas (a visão geral
        vem primeiro, o detalhe depois) e uma barra de status no rodapé.
        Só muda a apresentação: os dados continuam vindo exatamente das mesmas
        chamadas (getAnalyticsSummary e getChatActivityDaily).

        A barra de filtros usa `flex-wrap` dentro de um card com preenchimento.
        O problema da Fase 41 (o switch escapando pela borda) vinha de um item
        que não podia encolher; aqui nenhum item passa da largura do card, e o
        "Comparar" virou caixa de seleção comum.
      */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-2">
        <SeletorPeriodo opcoes={OPCOES_PERIODO} valor={quick} onChange={setQuick} ariaLabel="Período" />

        {quick === 'custom' && (
          <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
            />
            <span>até</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={dateInputValue(0)}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-border bg-input px-2 py-1 text-[12px] text-text outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Fase 43 — filtro por agrupamento. */}
        {groups.length > 0 && (
          <label className="flex items-center gap-2 rounded-lg border border-border bg-input py-1 pl-2.5 pr-1.5 text-[12px] text-text-dim">
            Agrupamento
            <select
              value={groupFilter ?? ''}
              onChange={(e) => setGroupFilter(e.target.value || null)}
              className="bg-input py-0.5 text-[12.5px] font-medium text-text outline-none"
              aria-label="Filtrar por agrupamento"
            >
              <option value="">Todas as instâncias</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex cursor-pointer items-center gap-2 px-1 text-[12.5px] text-text-dim">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Comparar com período anterior
        </label>

        {/* Fase 43 — exporta o período em CSV, pela mesma agregação da tela. */}
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-hover disabled:opacity-50"
          title="Salvar o período selecionado em CSV"
        >
          <Download size={14} />
          {exporting ? 'Salvando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Sub-topo: alertas do sistema em tempo real */}
      {alerts.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200"
            >
              <AlertTriangle size={14} className="shrink-0 text-amber-400" />
              <span className="flex-1 truncate">{alert.message}</span>
              <button
                onClick={() => reconnect(alert)}
                className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:bg-amber-500/30"
              >
                <RefreshCw size={11} />
                Reconectar
              </button>
              <button
                onClick={() => dismissAlert(alert.id)}
                aria-label="Dispensar alerta"
                className="shrink-0 rounded-md p-1 text-amber-300/70 transition-colors hover:bg-amber-500/20 hover:text-amber-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/*
        Fase 64 — quatro indicadores. Os antigos cards separados de Online,
        Offline e Reconectando viraram "Sessões ativas", com os outros dois
        estados no rodapé. Duas colunas em janela estreita, quatro a partir
        de 1280px, para nenhum número ficar espremido.
      */}
      <div className="grid shrink-0 grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon={<Radio size={16} />}
          label="Sessões ativas"
          footer={
            <>
              <span className="flex items-center gap-1.5">
                <Dot className="bg-red-400" />
                {healthCounts.offline} Offline
              </span>
              <span className="flex items-center gap-1.5">
                <Dot className="bg-amber-400" />
                {healthCounts.reconnecting} Reconectando
              </span>
            </>
          }
        >
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-text">{healthCounts.online}</span>
            <span className="text-[12px] text-text-dim">online</span>
          </p>
        </KpiCard>

        <KpiCard
          icon={<ArrowUpDown size={16} />}
          label="Volume total"
          footer={
            <>
              <span className="flex items-center gap-1.5">
                <Dot color="var(--color-accent)" />
                {summary?.totalReceived ?? 0} recebidas
              </span>
              <span className="flex items-center gap-1.5">
                <Dot color="#8B6FF5" />
                {summary?.totalSent ?? 0} enviadas
              </span>
            </>
          }
        >
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="text-2xl font-semibold text-text">{summary?.totalVolume ?? 0}</span>
            {volumeDelta && (
              <span
                className={
                  'truncate text-[12px] font-medium ' + (volumeDelta.positive ? 'text-emerald-400' : 'text-red-400')
                }
              >
                {volumeDelta.text}
              </span>
            )}
          </p>
        </KpiCard>

        <KpiCard
          icon={<Trophy size={16} />}
          label="Instância líder"
          footer={
            leaderInfo ? (
              <>
                <span>{leaderInfo.pct}% do volume</span>
                <span className="ml-auto">{activeAccounts} com atividade</span>
              </>
            ) : (
              <span>sem movimento no período</span>
            )
          }
        >
          {leaderInfo ? (
            <>
              <p className="flex min-w-0 items-center gap-2">
                <Dot color={leaderInfo.color} />
                <span className="truncate text-[15px] font-semibold text-text">{leaderInfo.name}</span>
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-text">{leaderInfo.total}</span>
                <span className="text-[12px] text-text-dim">mensagens</span>
              </p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-text">—</p>
          )}
        </KpiCard>

        <KpiCard icon={<Gauge size={16} />} label="Média por conta" footer={<span>Entre as contas com atividade</span>}>
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-text">
              {summary ? summary.averagePerAccount.toFixed(1) : '0'}
            </span>
            <span className="text-[12px] text-text-dim">msg / conta</span>
          </p>
        </KpiCard>
      </div>

      {/* Fase 71 — os dois cards de cima, lado a lado, na disposição da referência. */}
      <div className="flex shrink-0 gap-4">
        <MensagensPorInstanciaCard
          dados={barData}
          loading={loading}
          updatedAt={updatedAt}
          totalVolume={summary?.totalVolume ?? 0}
        />
        <FluxoCard dados={timelineData} compare={compare} loading={loading} quick={quick} onQuick={setQuick} />
      </div>

      {/*
        Fase 28: relatório fixo de Hoje x Ontem por instância, separado do
        seletor de período acima de propósito (ver chatActivityStore.ts),
        nunca misturando os dois dias e nunca contando de novo o que já foi
        visto. Fase 71: um card só, com Hoje e Ontem alternáveis.
      */}
      <AtividadeCard hoje={chatDaily?.today} ontem={chatDaily?.yesterday} />

      {/* Fase 77 — Classificação das Interações, camada separada das métricas acima. */}
      <ClassificacaoCard
        dados={classification}
        anterior={compare ? prevClassification : null}
        quick={quick}
        onQuick={setQuick}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStart={setCustomStart}
        onCustomEnd={setCustomEnd}
      />

      {/* Fase 64 — barra de status: quantas instâncias estão online e qual período está na tela. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-[12px] text-text-dim">
        <span className="flex items-center gap-2">
          <Dot color="var(--color-accent)" />
          Instâncias Online:
          <span className="font-semibold text-accent">
            {healthCounts.online} / {accounts.length}
          </span>
        </span>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <span>
          Período:{' '}
          <span className="font-semibold text-text">
            {formatDateBR(periodo.startTs)} a {formatDateBR(periodo.endTs)}
          </span>
        </span>
        <span className="ml-auto text-text-faint">Só conversas com pessoas. Grupos ficam fora da contagem.</span>
      </div>
      </div>
    </section>
  );
}
