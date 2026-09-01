/**
 * Barra lateral com busca, filtros e a lista de contas (favoritas fixadas
 * no topo). Orbi Swit Stack — Criado por Vinicius Braga
 *
 * Fase 10 (organização em agrupamentos "de verdade"):
 * - Os agrupamentos (pastas) são reordenáveis por arrastar e soltar, como
 *   qualquer gerenciador de arquivos — `reorderGroups` persiste a nova ordem.
 * - Uma instância pode ser arrastada para dentro de outro agrupamento (ou
 *   para fora, de volta pra área sem agrupamento) soltando sobre o cabeçalho
 *   da pasta de destino, além de reordenar dentro da lista atual como antes.
 * - Não existe uma pasta/aba "Sem agrupamento": as instâncias sem
 *   agrupamento aparecem como uma lista simples, sem cabeçalho.
 *
 * Fase 12 (instâncias avulsas fixas no topo): a pedido do usuário, a lista
 * de instâncias sem agrupamento passou a renderizar SEMPRE no topo da
 * sidebar — antes ficava abaixo de todos os agrupamentos (decisão de escopo
 * da Fase 10, revertida aqui). Uma linha divisória sutil aparece entre a
 * área avulsa e os agrupamentos só quando ambas existem ao mesmo tempo
 * (`ungrouped.length > 0 && groups.length > 0`) e some sozinha assim que a
 * última instância avulsa é arrastada para dentro de um agrupamento — não é
 * um estado guardado, é derivado a cada render a partir da própria lista.
 * Isso NÃO exigiu unificar as escalas de ordenação de `GroupStore` e
 * `AccountStore` (que continuam independentes, ver rodapé) — é só uma
 * mudança de ORDEM DE RENDERIZAÇÃO das duas seções já existentes; arrastar
 * uma instância avulsa para uma posição intercalada ENTRE pastas específicas
 * continua fora de escopo, ver decisão de escopo no rodapé.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Folder, Plus, Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { AccountRecord, IconSize, SidebarPosition } from '../types';
import { useAppStore } from '../store/useAppStore';
import { AccountItem } from './AccountItem';
import { AccountFilterSelect } from './AccountFilterSelect';
import { FILTERS, FilterKey, useFilterCounts, useFilteredAccounts } from '../useFilteredAccounts';
import { SIDEBAR_WIDTH_MAX, SIDEBAR_WIDTH_MIN, clampSidebarWidth } from '../constants';

// Fase 22: altura da barra no modo "Topo", PARAMETRIZADA por `iconSize` —
// PRECISA bater, número a número, com `SIDEBAR_TOP_HEIGHT_BY_ICON_SIZE` em
// windowManager.ts (mesmo cuidado do HEADER_HEIGHT, ver comentário lá: se um
// destes números não bater com o real, sobra/falta espaço entre a barra e a
// WebContentsView). Cada valor = o tile de conta daquele tamanho (ver
// `ICON_SIZE_SPECS` em AccountItem.tsx) + uma pequena folga de respiro.
// Fase 25: +6px em cada tamanho — folga extra (`TILE_BADGE_HEADROOM` em
// AccountItem.tsx) para o selo de não lidas nunca ser cortado pela borda
// superior da barra (bug relatado pelo usuário).
const TOP_BAR_HEIGHT_BY_ICON_SIZE: Record<IconSize, number> = {
  small: 60,
  medium: 72,
  large: 88,
};

// Fase 22: distância (px) percorrida por clique nos botões de seta da barra
// horizontal — não precisa ser exata, só uma rolagem confortável por clique.
const ARROW_SCROLL_AMOUNT = 220;

export function Sidebar({ onAdd, position }: { onAdd: () => void; position: SidebarPosition }) {
  // Fase 58: quatro posições. O que muda o LAYOUT INTERNO é o eixo:
  // Topo e Inferior são a mesma barra horizontal, Esquerda e Direita são o
  // mesmo painel vertical. Só as bordas, o lado da alça de redimensionar e
  // a ordem no layout raiz (App.tsx) diferem entre as duas pontas de cada
  // eixo, então `isHorizontal` é o que decide a montagem e `isTop`/`isRight`
  // só ajustam esses detalhes.
  const isHorizontal = position === 'top' || position === 'bottom';
  const isTop = position === 'top';
  const isRight = position === 'right';
  const appInfo = useAppStore((s) => s.appInfo);
  const accounts = useAppStore((s) => s.accounts);
  const statuses = useAppStore((s) => s.statuses);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const reorderAccounts = useAppStore((s) => s.reorderAccounts);
  const setAccountGroup = useAppStore((s) => s.setAccountGroup);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const commitSidebarWidth = useAppStore((s) => s.commitSidebarWidth);
  const isResizingSidebar = useAppStore((s) => s.isResizingSidebar);
  const setIsResizingSidebar = useAppStore((s) => s.setIsResizingSidebar);
  const groups = useAppStore((s) => s.groups);
  const reorderGroups = useAppStore((s) => s.reorderGroups);
  const iconSize = useAppStore((s) => s.iconSize);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const widthRef = useRef(sidebarWidth);
  widthRef.current = sidebarWidth;

  // Fase 22: rolagem horizontal da barra no modo "Topo" — sem conversão
  // automática do scroll vertical do mouse (ver `handleTopBarWheel` abaixo);
  // navegação por arraste/trackpad nativo, pela barra de rolagem visível
  // (ver index.css) ou pelos botões de seta nas pontas.
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fase 26: bloco "CONTAS" + busca + filtros do modo "Topo" pode ser
  // minimizado — quando recolhido, só um quadradinho com a lupa fica
  // visível, sobrando mais largura horizontal para a lista de contas (o
  // ajuste é automático: é só a área de contas ser `flex-1`, ela ocupa
  // sozinha o espaço que o bloco de filtros deixou de usar).
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const expandFilters = () => {
    setFiltersCollapsed(false);
    // Espera o input real voltar a existir no DOM (estava recolhido) antes
    // de focar.
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const updateScrollButtons = useCallback(() => {
    const el = topScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    if (!isHorizontal) return;
    updateScrollButtons();
    const el = topScrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });

    // Bloqueia a conversão automática do navegador de scroll vertical (roda
    // do mouse) em rolagem horizontal quando o eixo Y não tem overflow —
    // esse comportamento nativo do Chromium era exatamente o "evento" que o
    // usuário pediu para remover (navegação passa a ser só por arraste,
    // trackpad horizontal, barra de rolagem visível ou os botões de seta).
    // Precisa ser um listener NATIVO com passive:false — o `onWheel` do
    // React anexa o handler como passivo por padrão, o que faz
    // `preventDefault()` ser ignorado (e gerar aviso no console).
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    // O conteúdo (número/tamanho de contas) muda sem redimensionar a janela,
    // então um ResizeObserver no próprio contêiner cobre os dois gatilhos
    // (mudança de tamanho da janela E mudança de conteúdo) numa coisa só.
    const observer = new ResizeObserver(() => updateScrollButtons());
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [isHorizontal, updateScrollButtons, accounts.length, iconSize]);

  const scrollTopBarBy = (delta: number) => {
    topScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Fase 56: quantidade por estado, exibida dentro do menu suspenso de filtro.
  const filterCounts = useFilterCounts(accounts, statuses);
  const visibleAccounts = useFilteredAccounts(accounts, statuses, searchQuery, filter);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingSidebar(true);
    },
    [setIsResizingSidebar]
  );

  useEffect(() => {
    if (!isResizingSidebar) return;
    const onMove = (e: MouseEvent) => {
      // Fase 58: na Direita a alça fica na borda ESQUERDA do painel, então a
      // largura cresce quando o mouse vai para a esquerda — é a distância
      // do cursor até a borda direita da janela, não até a esquerda.
      setSidebarWidth(clampSidebarWidth(isRight ? window.innerWidth - e.clientX : e.clientX));
    };
    const onUp = () => {
      setIsResizingSidebar(false);
      commitSidebarWidth(widthRef.current);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingSidebar, isRight, setSidebarWidth, setIsResizingSidebar, commitSidebarWidth]);

  /**
   * Solta uma instância sobre outra: reordena usando a lista GLOBAL de contas
   * (já vem ordenada por `order` do processo principal), não a lista filtrada
   * da seção atual — isso é o que permite a mesma operação também mudar de
   * agrupamento quando a conta de destino pertence a outra pasta (ou a
   * nenhuma), em vez de precisar de dois passos separados.
   */
  const handleDropOnAccount = (targetId: string) => {
    const fromId = draggedId;
    setDraggedId(null);
    setOverId(null);
    if (!fromId || fromId === targetId) return;

    const dragged = accounts.find((a) => a.id === fromId);
    const target = accounts.find((a) => a.id === targetId);
    if (!dragged || !target) return;

    if ((dragged.groupId ?? null) !== (target.groupId ?? null)) {
      setAccountGroup(fromId, target.groupId ?? null);
    }

    const ids = accounts.map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from !== -1 && to !== -1) {
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      reorderAccounts(ids);
    }
  };

  /**
   * Solta uma instância sobre o cabeçalho de uma pasta (ou sobre a área sem
   * agrupamento, quando `groupId` é null): só muda o agrupamento — a posição
   * relativa entre os membros daquele destino fica por conta da ordem global
   * já existente (evita reordenar tudo às cegas quando não há um vizinho
   * específico como alvo).
   */
  const handleDropOnGroupZone = (groupId: string | null) => {
    const fromId = draggedId;
    setDraggedId(null);
    setOverId(null);
    if (!fromId) return;
    const dragged = accounts.find((a) => a.id === fromId);
    if (!dragged) return;
    if ((dragged.groupId ?? null) !== groupId) {
      setAccountGroup(fromId, groupId);
    }
  };

  const handleDropOnGroupHeader = (targetGroupId: string) => {
    // Um agrupamento sendo arrastado sobre outro: reordena as pastas.
    if (draggedGroupId) {
      const fromId = draggedGroupId;
      setDraggedGroupId(null);
      setOverGroupId(null);
      if (fromId === targetGroupId) return;
      const ids = groups.map((g) => g.id);
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(targetGroupId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        reorderGroups(ids);
      }
      return;
    }
    // Uma instância sendo arrastada sobre o cabeçalho de uma pasta: entra pra ela.
    handleDropOnGroupZone(targetGroupId);
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const knownGroupIds = new Set(groups.map((g) => g.id));
  const renderAccountList = (list: AccountRecord[]) => (
    <AnimatePresence initial={false}>
      {list.map((acc) => (
        <AccountItem
          key={acc.id}
          account={acc}
          status={statuses.get(acc.id)}
          index={accounts.findIndex((a) => a.id === acc.id)}
          horizontal={isHorizontal}
          iconSize={iconSize}
          drag={{
            onDragStart: () => setDraggedId(acc.id),
            onDragOver: (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedId && draggedId !== acc.id) setOverId(acc.id);
            },
            onDrop: () => handleDropOnAccount(acc.id),
            onDragEnd: () => {
              setDraggedId(null);
              setOverId(null);
            },
            isOver: overId === acc.id,
          }}
        />
      ))}
    </AnimatePresence>
  );
  // Fase 21: listas de conta em coluna (padrão) ou em linha (modo "Topo") — só
  // muda a direção do flex/espaçamento, a lógica de drag-and-drop e os dados
  // renderizados (renderAccountList acima) são exatamente os mesmos.
  const listClassName = isHorizontal ? 'flex shrink-0 items-center gap-1' : 'space-y-0.5';

  const ungrouped = visibleAccounts.filter((a) => !a.groupId || !knownGroupIds.has(a.groupId));

  // Fase 21: divisória entre a área avulsa e os agrupamentos — linha
  // horizontal na coluna (padrão), linha vertical na barra (modo "Topo").
  const groupDivider = isHorizontal ? (
    <div className="mx-1 h-6 w-px shrink-0 self-center bg-border/60" aria-hidden />
  ) : (
    <div className="my-1.5 border-t border-border/60" aria-hidden />
  );

  const accountsArea = (
    <div
      ref={isHorizontal ? topScrollRef : undefined}
      className={
        isHorizontal
          ? 'flex h-full min-w-0 flex-1 items-center gap-3 overflow-x-auto px-1 py-1'
          : 'flex-1 space-y-2 overflow-y-auto px-2'
      }
    >
      {accounts.length === 0 ? (
        <div
          className={
            isHorizontal
              ? 'flex shrink-0 items-center gap-3 px-2 text-left'
              : 'flex h-full flex-col items-center justify-center gap-3 px-4 text-center'
          }
        >
          <p className="text-xs leading-relaxed text-text-faint">
            Nenhuma instância ainda. Adicione a primeira conta para começar.
          </p>
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-lg accent-gradient px-3.5 py-2 text-[13px] font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90"
            onClick={onAdd}
          >
            <Plus size={14} />
            Adicionar primeira conta
          </button>
        </div>
      ) : isHorizontal || groups.length === 0 ? (
        // Fase 25: no modo "Topo", TODAS as instâncias aparecem numa única
        // sequência contínua lado a lado, sem cabeçalho de pasta e sem
        // depender de o usuário clicar para expandir um grupo (pedido
        // explícito do usuário — "ignore as pastas recolhidas/fechadas").
        // O agrupamento em si continua existindo como dado (usado no modo
        // "Esquerda" logo abaixo) — só a apresentação no modo "Topo" é
        // sempre plana.
        <ul
          className={listClassName}
          onDragOver={(e) => draggedId && e.preventDefault()}
          onDrop={() => handleDropOnGroupZone(null)}
        >
          {renderAccountList(visibleAccounts)}
        </ul>
      ) : (
        <>
          {ungrouped.length > 0 && (
            // Instâncias avulsas (sem agrupamento) SEMPRE no topo/início, antes
            // dos agrupamentos — sem cabeçalho/pasta "Sem agrupamento" de
            // propósito, ver decisão de escopo no rodapé deste arquivo.
            // Continuam arrastáveis em ambos os sentidos: soltar uma delas
            // sobre o cabeçalho de uma pasta a agrupa; soltar uma conta
            // agrupada de volta nesta lista a desvincula do agrupamento
            // atual, alternando livremente entre a área avulsa e os
            // agrupamentos organizados ao lado/abaixo.
            <ul
              className={listClassName}
              onDragOver={(e) => draggedId && e.preventDefault()}
              onDrop={() => handleDropOnGroupZone(null)}
            >
              {renderAccountList(ungrouped)}
            </ul>
          )}
          {ungrouped.length > 0 && groups.length > 0 && groupDivider}
          {groups.map((g, i) => {
            const list = visibleAccounts.filter((a) => a.groupId === g.id);
            if (list.length === 0 && !accounts.some((a) => a.groupId === g.id)) return null;
            const collapsed = collapsedGroups.has(g.id);
            return (
              <div key={g.id} className={isHorizontal ? 'flex shrink-0 items-center gap-1' : undefined}>
                {isHorizontal && i > 0 && groupDivider}
                {/* Fase 24: correção do bug de agrupamentos no modo "Topo" —
                    este wrapper precisa ser um flex HORIZONTAL aqui (cabeçalho
                    da pasta ao lado das contas, não empilhado em cima), senão
                    o cabeçalho + a lista de contas ficam um embaixo do outro
                    dentro de uma barra baixa demais para isso, cortando tudo. */}
                <div className={isHorizontal ? 'flex shrink-0 items-center gap-1.5' : undefined}>
                  <button
                    draggable
                    onDragStart={() => setDraggedGroupId(g.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedGroupId && draggedGroupId !== g.id) setOverGroupId(g.id);
                      else if (draggedId) setOverGroupId(g.id);
                    }}
                    onDragLeave={() => setOverGroupId((cur) => (cur === g.id ? null : cur))}
                    onDrop={() => handleDropOnGroupHeader(g.id)}
                    onDragEnd={() => {
                      setDraggedGroupId(null);
                      setOverGroupId(null);
                    }}
                    onClick={() => toggleGroup(g.id)}
                    className={
                      'flex cursor-grab items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] font-semibold text-text-dim transition-colors active:cursor-grabbing hover:bg-surface-hover ' +
                      (isHorizontal ? 'shrink-0 ' : 'w-full ') +
                      (overGroupId === g.id ? 'ring-1 ring-accent' : '')
                    }
                  >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {/* Fase 59: quando o agrupamento tem cor definida, ela
                        tinge a pasta. Sem cor, segue herdando o cinza do
                        botão, exatamente como antes. */}
                    <Folder size={12} style={g.color ? { color: g.color } : undefined} />
                    <span className={isHorizontal ? 'shrink-0' : 'flex-1 truncate'}>{g.name}</span>
                    <span className="text-text-faint">{list.length}</span>
                  </button>
                  {!collapsed && (
                    <ul className={isHorizontal ? 'flex shrink-0 items-center gap-1' : 'mt-0.5 space-y-0.5'}>
                      {renderAccountList(list)}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
      {accounts.length > 0 && visibleAccounts.length === 0 && (
        <p className="px-2 py-6 text-center text-xs text-text-faint">Nenhuma conta encontrada.</p>
      )}
    </div>
  );

  if (isHorizontal) {
    // Fase 22: altura dinâmica por `iconSize` (ver o mapa no topo do
    // arquivo) — sempre a mesma fonte de verdade usada no processo
    // principal, então a WebContentsView nunca fica curta nem sobra vão.
    const topBarHeight = TOP_BAR_HEIGHT_BY_ICON_SIZE[iconSize];
    return (
      <aside
        style={{ height: topBarHeight, minHeight: topBarHeight }}
        className={
          // Fase 58: no Topo a linha divisória fica embaixo (separando da
          // instância); no Inferior fica em cima, pelo mesmo motivo.
          'flex flex-none items-center gap-3 border-border bg-sidebar pl-2.5 pr-4 ' +
          (isTop ? 'border-b' : 'border-t')
        }
      >
        {/* Fase 24/26: bloco "CONTAS" + busca + filtros espremido ao máximo à
            esquerda — gap e paddings internos reduzidos ao mínimo (pedido
            explícito do usuário), como um único grupo compacto encostado na
            borda esquerda da barra. Fase 26: agora pode ser minimizado — só
            o quadradinho de busca fica visível, liberando largura para a
            lista de contas. */}
        <div className="flex shrink-0 items-center gap-1">
          {filtersCollapsed ? (
            <button
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-input text-text-dim transition-colors hover:border-border-strong hover:text-text"
              onClick={expandFilters}
              title="Expandir busca e filtros"
            >
              <Search size={13} />
            </button>
          ) : (
            <>
              <span className="shrink-0 text-[10px] font-bold tracking-wider text-text-faint">CONTAS</span>

              <div className="relative shrink-0">
                <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-24 rounded-lg border border-border bg-input py-1 pl-6 pr-1.5 text-[11px] text-text placeholder:text-text-faint focus:w-32 focus:border-accent"
                />
              </div>

              {/* Fase 56: aqui as abas CONTINUAM como estavam, de propósito.
                  A barra no modo "Topo" tem altura fixa (60 a 88px, ver
                  TOP_BAR_HEIGHT_BY_ICON_SIZE) e logo abaixo dela começa a
                  WebContentsView da instância, que é uma camada NATIVA
                  desenhada na frente desta página. Um menu suspenso aberto
                  aqui cairia justamente nessa faixa e ficaria invisível e
                  sem receber cliques. Na barra lateral esquerda, que ocupa
                  a altura toda, o menu tem para onde abrir — por isso lá a
                  troca foi feita (ver AccountFilterSelect.tsx). */}
              <div className="flex shrink-0 items-center gap-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={
                      // Fase 41: `whitespace-nowrap` para o rótulo nunca
                      // quebrar dentro do próprio botão nesta barra baixa.
                      'shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] transition-colors ' +
                      (filter === f.key ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-surface-hover')
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Fase 26: botão de minimizar/expandir o bloco de filtros —
              recolhido, vira "<<" (ChevronsLeft) apontando pra abrir de
              volta ("expandir pra esquerda"); é o mesmo botão, só o ícone e
              o título trocam conforme o estado. */}
          <button
            className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-text-faint transition-colors hover:bg-surface-hover hover:text-text-dim"
            onClick={() => (filtersCollapsed ? expandFilters() : setFiltersCollapsed(true))}
            title={filtersCollapsed ? 'Expandir filtros' : 'Minimizar filtros'}
          >
            {filtersCollapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>

        <div className="h-6 w-px shrink-0 bg-border" aria-hidden />

        {/* Fase 22: botões de seta nas pontas + rolagem nativa (arraste,
            trackpad, barra de rolagem visível) — o scroll do mouse NÃO
            converte mais em rolagem horizontal (ver o listener de wheel no
            useEffect acima).
            Fase 25: os botões só EXISTEM no DOM quando há de fato para onde
            rolar — antes eram só escondidos com opacidade, mas continuavam
            ocupando espaço reservado (padding do botão), criando um vão vazio
            entre os filtros e a primeira conta mesmo sem nada pra rolar. */}
        {canScrollLeft && (
          <button
            className="flex shrink-0 items-center justify-center rounded-full p-1 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            onClick={() => scrollTopBarBy(-ARROW_SCROLL_AMOUNT)}
            title="Rolar para a esquerda"
          >
            <ChevronLeft size={15} />
          </button>
        )}

        {accountsArea}

        {canScrollRight && (
          <button
            className="flex shrink-0 items-center justify-center rounded-full p-1 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            onClick={() => scrollTopBarBy(ARROW_SCROLL_AMOUNT)}
            title="Rolar para a direita"
          >
            <ChevronRight size={15} />
          </button>
        )}

        {/* Fase 24/26: `ml-auto` garante que este bloco fique sempre
            encostado na extrema direita da barra, mesmo com poucas contas
            (quando a área de contas não preenche todo o espaço disponível
            sozinha). Fase 26: o botão extenso "+ Adicionar conta" e o texto
            da versão viraram só um botão compacto com o ícone "+" — pedido
            explícito do usuário para otimizar o espaço útil da barra para a
            lista de contas. A versão do app continua visível em Configurações,
            na aba "Sobre o Sistema" (Fase 50), não precisa duplicar aqui. */}
        <button
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-text-dim transition-colors hover:border-accent hover:text-accent"
          onClick={onAdd}
          title="Adicionar conta"
        >
          <Plus size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{ width: sidebarWidth, minWidth: SIDEBAR_WIDTH_MIN, maxWidth: SIDEBAR_WIDTH_MAX }}
      className={
        // Fase 58: na Direita a divisória vai para a borda esquerda do
        // painel, que é o lado voltado para a instância.
        'relative flex flex-none flex-col border-border bg-sidebar py-3 ' +
        (isRight ? 'border-l ' : 'border-r ') +
        (isResizingSidebar ? '' : 'transition-[width]')
      }
    >
      <div
        onMouseDown={handleResizeStart}
        className={
          // Fase 58: a alça fica sempre na borda voltada para a instância —
          // direita do painel na Esquerda, esquerda do painel na Direita.
          'absolute top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-accent/40 ' +
          (isRight ? 'left-0 translate-x-1/2 ' : 'right-0 -translate-x-1/2 ') +
          (isResizingSidebar ? 'bg-accent/60' : 'active:bg-accent/60')
        }
        title="Redimensionar barra lateral"
      />
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-[11px] font-bold tracking-wider text-text-faint">CONTAS</span>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conta..."
            className="w-full rounded-lg border border-border bg-input py-1.5 pl-7 pr-2 text-xs text-text placeholder:text-text-faint focus:border-accent"
          />
        </div>
        {/*
          Fase 56: as quatro abas horizontais viraram um menu suspenso. Elas
          não cabiam numa barra lateral estreita: na Fase 41 já tinham
          deixado de quebrar linha para deslizar na horizontal, mas os
          rótulos continuavam cortados. O seletor ocupa a largura inteira em
          qualquer largura de sidebar e encurta o texto com reticências.
        */}
        <AccountFilterSelect
          value={filter}
          onChange={setFilter}
          counts={filterCounts}
          className="mt-2 w-full"
        />
      </div>

      {accountsArea}

      <button
        className="mx-3 mb-1 mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-2 py-2.5 text-[13px] font-medium text-text-dim transition-colors hover:border-accent hover:text-accent"
        onClick={onAdd}
      >
        <Plus size={15} />
        Adicionar conta
      </button>
      <div className="mt-1.5 border-t border-border px-4 pt-2 text-center text-[10px] text-text-faint">
        v{appInfo?.version ?? '—'}
      </div>
    </aside>
  );
}

/**
 * Decisão de escopo (Fase 10, revisada na Fase 12): o pedido original da
 * Fase 10 descrevia arrastar uma instância sem agrupamento para uma posição
 * intercalada com as pastas (ordem unificada entre pastas e instâncias
 * soltas, tipo um explorador de arquivos onde arquivos e pastas convivem na
 * MESMA lista reordenável — ex.: avulsa, pasta A, avulsa, pasta B). Isso
 * continua fora de escopo: exigiria uma única escala de ordenação
 * compartilhada entre `GroupStore` (ordem de pastas, `GroupRecord.order`) e
 * `AccountStore` (ordem de contas, `AccountRecord.order`) — hoje são dois
 * contadores independentes — e um modelo de árvore genuíno na sidebar, não
 * só handlers de drag-and-drop a mais.
 *
 * O que a Fase 12 implementou (pedido específico do usuário) foi mais
 * simples e não precisou dessa unificação: fixar a seção de instâncias
 * avulsas SEMPRE no topo (antes ficava sempre no fim) com uma divisória
 * automática — uma mudança de ORDEM DE RENDERIZAÇÃO de duas seções que já
 * existiam, não de modelo de dados. A interposição arbitrária (avulsa entre
 * duas pastas específicas) continua sendo um pedido legítimo pra um
 * follow-up dedicado, se o usuário quiser especificamente isso no futuro.
 */
