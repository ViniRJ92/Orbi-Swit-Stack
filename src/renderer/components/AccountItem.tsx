/**
 * Um item da lista lateral de contas. A sidebar é só navegação/status —
 * renomear, excluir, trocar ícone e definir agrupamento ficam centralizados
 * em Configurações > Instâncias & Agrupamentos (Fase 8). A única ação rápida
 * que sobrevive aqui é fixar como favorita, porque afeta diretamente a ordem
 * de exibição na própria sidebar.
 *
 * Fase 22 (tamanho dos ícones/cards + correção visual do modo "Topo"): o
 * modo horizontal ganhou um layout PRÓPRIO — um "tile" compacto (ícone em
 * cima, nome embaixo, status reduzido a um indicador colorido + tooltip) em
 * vez de espremer a linha larga do modo "Esquerda" (ícone + duas linhas de
 * texto) dentro de uma barra baixa, que era a causa da falta de "respiro" e
 * do corte visual reportados pelo usuário. O modo "Esquerda" continua com a
 * linha original, só com os tamanhos escaláveis por `ICON_SIZE_SPECS`.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { motion } from 'framer-motion';
import { RotateCw, Star } from 'lucide-react';
import { AccountRecord, AccountStatus, IconSize } from '../types';
import { useAppStore } from '../store/useAppStore';
import { ServiceGlyph } from './ServiceIcon';
import { accountStatusLabel } from '../accountStatusLabel';

/**
 * Especificação de tamanho por `IconSize`, usada nos dois modos de layout.
 * "row*" alimenta a linha do modo "Esquerda" (ícone + coluna de texto);
 * "tile*" alimenta o tile compacto do modo "Topo" (ícone em cima, nome
 * embaixo). Os dois conjuntos são deliberadamente diferentes: o tile
 * precisa ficar bem mais compacto para caber numa barra horizontal baixa
 * sem invadir o cabeçalho — ver o comentário de `TOP_BAR_HEIGHT_BY_ICON_SIZE`
 * em Sidebar.tsx, que deriva da MESMA lógica de tamanho aqui embaixo e
 * precisa continuar batendo com ela se estes números mudarem.
 */
export const ICON_SIZE_SPECS: Record<
  IconSize,
  {
    rowAvatar: number;
    rowGlyph: number;
    rowStatusDot: number;
    rowNameText: string;
    rowStatusText: string;
    rowPadX: string;
    rowPadY: string;
    rowGap: string;
    tileAvatar: number;
    tileGlyph: number;
    tileStatusDot: number;
    tileNameText: string;
    tileWidth: number;
    tilePad: number;
    tileGap: number;
  }
> = {
  small: {
    rowAvatar: 30,
    rowGlyph: 14,
    rowStatusDot: 9,
    rowNameText: 'text-[12px]',
    rowStatusText: 'text-[10px]',
    rowPadX: 'px-2',
    rowPadY: 'py-1.5',
    rowGap: 'gap-2',
    tileAvatar: 22,
    tileGlyph: 10,
    tileStatusDot: 7,
    tileNameText: 'text-[9px]',
    tileWidth: 46,
    tilePad: 4,
    tileGap: 2,
  },
  medium: {
    rowAvatar: 36,
    rowGlyph: 16,
    rowStatusDot: 12,
    rowNameText: 'text-sm',
    rowStatusText: 'text-[11px]',
    rowPadX: 'px-2.5',
    rowPadY: 'py-2.5',
    rowGap: 'gap-2.5',
    tileAvatar: 28,
    tileGlyph: 13,
    tileStatusDot: 9,
    tileNameText: 'text-[10.5px]',
    tileWidth: 58,
    tilePad: 5,
    tileGap: 3,
  },
  large: {
    rowAvatar: 44,
    rowGlyph: 20,
    rowStatusDot: 14,
    rowNameText: 'text-[15px]',
    rowStatusText: 'text-[12px]',
    rowPadX: 'px-3',
    rowPadY: 'py-3',
    rowGap: 'gap-3',
    tileAvatar: 38,
    tileGlyph: 18,
    tileStatusDot: 12,
    tileNameText: 'text-[12px]',
    tileWidth: 72,
    tilePad: 7,
    tileGap: 4,
  },
};

// Fase 25: folga extra no topo do tile do modo "Topo", para o selo de não
// lidas (posicionado em `-top-1.5`, ou seja, 6px acima do ícone) nunca ser
// cortado pela borda superior da barra. PRECISA ser somada também à altura
// da barra em `TOP_BAR_HEIGHT_BY_ICON_SIZE` (Sidebar.tsx e windowManager.ts)
// — mesmo cuidado de sincronia manual já documentado nessas constantes.
const TILE_BADGE_HEADROOM = 6;

function statusDotClass(status: AccountStatus | undefined): string {
  if (status?.loadError) return 'bg-danger';
  if (status?.suspended) return 'bg-text-faint';
  if (status?.isOnline) return 'bg-accent accent-glow';
  return 'bg-text-faint';
}

export function AccountItem({
  account,
  status,
  index,
  drag,
  horizontal,
  iconSize = 'medium',
}: {
  account: AccountRecord;
  status: AccountStatus | undefined;
  index: number;
  /** Arrastar e soltar para reordenar (opcional — sidebar e tela de gerenciamento usam). */
  drag?: {
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onDragEnd: () => void;
    isOver: boolean;
  };
  /** Fase 21: sidebar em modo "Topo" — o item vive numa linha horizontal com rolagem própria, então não pode encolher. */
  horizontal?: boolean;
  /** Fase 22: tamanho do ícone/card, escolhido em Configurações — afeta ambos os modos. */
  iconSize?: IconSize;
}) {
  const switchAccount = useAppStore((s) => s.switchAccount);
  const reloadAccount = useAppStore((s) => s.reloadAccount);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const isActive = !!status?.isActive;
  const spec = ICON_SIZE_SPECS[iconSize];

  const dragProps = {
    draggable: !!drag,
    onDragStart: drag?.onDragStart,
    onDragOver: drag?.onDragOver,
    onDrop: drag
      ? (e: React.DragEvent) => {
          // Sem isso, o drop borbulharia até o contêiner da seção (ver
          // Sidebar.tsx) e disparia o drop "genérico" da zona também —
          // acabaria desfazendo/duplicando a mudança de agrupamento que
          // o drop neste item específico acabou de aplicar.
          e.stopPropagation();
          drag.onDrop();
        }
      : undefined,
    onDragEnd: drag?.onDragEnd,
  };

  // Fase 22: modo "Topo" — tile compacto (ícone em cima, nome embaixo). O
  // texto de status (accountStatusLabel) some da tela, mas continua
  // acessível via `title` (tooltip nativo) — só a APRESENTAÇÃO muda, os
  // mesmos estados (erro, suspensa, online, não lidas, favorita) continuam
  // todos representados visualmente (cor do indicador, selo, badge, ícone).
  if (horizontal) {
    return (
      <li className="list-none shrink-0" {...dragProps}>
        <motion.div
          layout
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          title={`${account.name} — ${accountStatusLabel(account, status)}`}
          // Fase 24: `minWidth` (não `width` fixo) — o tile fica compacto por
          // padrão, mas CRESCE em largura (nunca em altura) para caber o nome
          // inteiro sem cortar. Isso mantém a altura da barra 100% previsível
          // (continua batendo com `TOP_BAR_HEIGHT_BY_ICON_SIZE`), só a
          // largura de cada tile varia conforme o nome da conta.
          //
          // Fase 25: padding-top extra (TILE_BADGE_HEADROOM) — o selo de não
          // lidas (`-top-1.5`, ver abaixo) soma ao ícone e ultrapassava o
          // topo do tile por poucos pixels, sendo cortado pela borda da
          // barra. Esse respiro extra só no topo resolve sem mexer no
          // alinhamento vertical do resto do card.
          style={{
            minWidth: spec.tileWidth,
            paddingTop: spec.tilePad + TILE_BADGE_HEADROOM,
            paddingBottom: spec.tilePad,
            paddingLeft: spec.tilePad,
            paddingRight: spec.tilePad,
            gap: spec.tileGap,
          }}
          className={
            'group relative flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl transition-colors ' +
            (isActive ? 'bg-surface mw-selected' : status?.loadError ? 'bg-danger/5' : 'hover:bg-surface-hover') +
            (drag?.isOver ? ' ring-1 ring-accent' : '')
          }
          onClick={() => switchAccount(account.id)}
        >
          {isActive && (
            <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full accent-gradient" aria-hidden />
          )}

          <div className="relative shrink-0">
            <div
              className="flex items-center justify-center overflow-hidden rounded-full"
              style={{
                width: spec.tileAvatar,
                height: spec.tileAvatar,
                background: account.iconDataUrl ? 'transparent' : account.color,
              }}
            >
              {account.iconDataUrl ? (
                <img src={account.iconDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ServiceGlyph service={account.service} size={spec.tileGlyph} color="#fff" />
              )}
            </div>
            <span
              className={'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-sidebar ' + statusDotClass(status)}
              style={{ width: spec.tileStatusDot, height: spec.tileStatusDot }}
            />
            {account.favorite && (
              <Star size={9} className="absolute -left-1 -top-1 text-accent drop-shadow" fill="currentColor" />
            )}
            {!!status && status.unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-w-[15px] items-center justify-center rounded-full accent-gradient px-1 text-[9px] font-bold leading-tight text-accent-contrast">
                {status.unreadCount > 99 ? '99+' : status.unreadCount}
              </span>
            )}
            {status?.loadError && (
              <button
                className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-danger/40 bg-sidebar text-danger"
                title="Tentar novamente"
                onClick={(e) => {
                  e.stopPropagation();
                  reloadAccount(account.id);
                }}
              >
                <RotateCw size={9} />
              </button>
            )}
          </div>

          {/* Fase 24: sem `truncate` e sem largura máxima — o nome precisa
              ficar 100% visível (pedido explícito do usuário). O tile inteiro
              cresce para acomodá-lo (ver `minWidth` acima), em vez de cortar
              o texto. */}
          <span className={spec.tileNameText + ' whitespace-nowrap px-0.5 text-center text-text'}>{account.name}</span>
        </motion.div>
      </li>
    );
  }

  return (
    <li className="list-none" {...dragProps}>
      {/* O elemento arrastável precisa ser um <li> nativo: o Framer Motion
          reserva onDragStart/onDrag/onDragEnd em componentes motion.* para o
          próprio sistema de gestos dele, então esses eventos nunca chegariam
          como eventos HTML5 nativos se estivessem direto no motion.li — por
          isso a animação fica num <motion.div> interno, só decorativo. */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.18 }}
        className={
          `group relative flex cursor-pointer items-center rounded-xl transition-colors ${spec.rowGap} ${spec.rowPadX} ${spec.rowPadY} ` +
          (isActive ? 'bg-surface mw-selected' : status?.loadError ? 'bg-danger/5' : 'hover:bg-surface-hover') +
          (drag?.isOver ? ' ring-1 ring-accent' : '')
        }
        onClick={() => switchAccount(account.id)}
      >
        {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full accent-gradient" />}

        <div className="relative shrink-0">
          <div
            className="flex items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent"
            style={{
              width: spec.rowAvatar,
              height: spec.rowAvatar,
              background: account.iconDataUrl ? 'transparent' : account.color,
            }}
          >
            {account.iconDataUrl ? (
              <img src={account.iconDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ServiceGlyph service={account.service} size={spec.rowGlyph} color="#fff" />
            )}
          </div>
          <span
            className={
              'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-sidebar ' + statusDotClass(status)
            }
            style={{ width: spec.rowStatusDot, height: spec.rowStatusDot }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className={'flex items-center gap-1 truncate font-medium text-text ' + spec.rowNameText}>
            {account.favorite && <Star size={11} className="shrink-0 text-accent" fill="currentColor" />}
            <span className="truncate">{account.name}</span>
          </div>
          <div className={'flex items-center gap-1.5 ' + spec.rowStatusText + ' ' + (status?.loadError ? 'text-danger' : 'text-text-dim')}>
            <span className="truncate">{accountStatusLabel(account, status)}</span>
            {status?.loadError && (
              <button
                className="ml-0.5 flex items-center gap-1 rounded border border-danger/40 px-1.5 py-0.5 text-[10px] text-danger transition-colors hover:bg-danger/10"
                onClick={(e) => {
                  e.stopPropagation();
                  reloadAccount(account.id);
                }}
              >
                <RotateCw size={10} />
                Tentar de novo
              </button>
            )}
            {index < 9 && !status?.loadError && (
              <span className="rounded border border-border px-1 text-[10px] text-text-faint opacity-0 transition-opacity group-hover:opacity-100">
                Ctrl+{index + 1}
              </span>
            )}
          </div>
        </div>

        {!!status && status.unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full accent-gradient px-1.5 py-0.5 text-[11px] font-bold text-accent-contrast"
          >
            {status.unreadCount}
          </motion.span>
        )}

        <button
          className={
            'hidden shrink-0 rounded-md p-1.5 transition-colors hover:bg-surface group-hover:block ' +
            (account.favorite ? 'text-accent' : 'text-text-dim hover:text-text')
          }
          title={account.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(account.id);
          }}
        >
          <Star size={13} fill={account.favorite ? 'currentColor' : 'none'} />
        </button>
      </motion.div>
    </li>
  );
}
