/**
 * Modal de configurações, em abas (Fase 8): Geral & Aparência, Instâncias &
 * Agrupamentos, Desempenho & Notificações, Backup & Diagnóstico. Cada aba
 * tem sua própria rolagem interna — o rail de abas e o cabeçalho do modal
 * nunca rolam, só o conteúdo da aba ativa quando excede a altura disponível.
 *
 * A aba "Instâncias & Agrupamentos" é a central administrativa única de
 * cada conta: renomear, trocar ícone, definir agrupamento e excluir. A
 * sidebar principal do app não tem mais nenhuma dessas ações — só a estrela
 * de favorito, que afeta a própria ordenação da sidebar.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  DownloadCloud,
  UploadCloud,
  FileText,
  Power,
  Zap,
  Gauge,
  Leaf,
  Bell,
  BellOff,
  Minimize2,
  HelpCircle,
  LogOut,
  ShieldAlert,
  ImagePlus,
  Search,
  RotateCcw,
  FolderPlus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Layers,
  Gauge as GaugeIcon,
  DatabaseBackup,
  Keyboard,
  Play,
  Pause,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  DownloadCloud as DownloadCloudIcon,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  AccountRecord,
  CloseBehavior,
  DiagnosticsInfo,
  IconSize,
  PerformanceMode,
  SERVICES,
  SidebarPosition,
  ThemePreference,
  UpdateState,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './Modal';
import { ServiceGlyph } from './ServiceIcon';
import { ColorSwatchButton } from './ColorSwatchButton';
import { OrbiLogo } from './OrbiLogo';
import { accountStatusLabel } from '../accountStatusLabel';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'dark', label: 'Escuro', icon: <Moon size={15} /> },
  { value: 'light', label: 'Claro', icon: <Sun size={15} /> },
  { value: 'system', label: 'Sistema', icon: <Monitor size={15} /> },
];

// Fase 21: posição da sidebar de contas — pedido explícito do usuário.
// Fase 58: Direita e Inferior. A ordem segue os pares de cada eixo
// (Esquerda/Direita são o painel vertical, Topo/Inferior a barra
// horizontal), então a grade de 2 colunas deixa cada par lado a lado.
const SIDEBAR_POSITION_OPTIONS: { value: SidebarPosition; label: string; icon: ReactNode }[] = [
  { value: 'left', label: 'Esquerda', icon: <PanelLeft size={15} /> },
  { value: 'right', label: 'Direita', icon: <PanelRight size={15} /> },
  { value: 'top', label: 'Topo', icon: <PanelTop size={15} /> },
  { value: 'bottom', label: 'Inferior', icon: <PanelBottom size={15} /> },
];

// Fase 22: tamanho dos ícones/cards de conta — pedido explícito do usuário
// junto da correção visual do modo "Topo". Os quadrados em tamanhos
// crescentes dão uma pista visual direta do que cada opção faz.
const ICON_SIZE_OPTIONS: { value: IconSize; label: string; icon: ReactNode }[] = [
  { value: 'small', label: 'Pequeno', icon: <Square size={11} /> },
  { value: 'medium', label: 'Médio', icon: <Square size={15} /> },
  { value: 'large', label: 'Grande', icon: <Square size={19} /> },
];

const PERFORMANCE_OPTIONS: { value: PerformanceMode; label: string; description: string; icon: ReactNode }[] = [
  { value: 'economy', label: 'Economia', description: 'Mantém no máximo 1 instância ativa.', icon: <Leaf size={15} /> },
  { value: 'balanced', label: 'Equilibrado', description: 'Mantém no máximo 6 instâncias ativas.', icon: <Gauge size={15} /> },
  { value: 'performance', label: 'Desempenho', description: 'Mantém no máximo 10 instâncias ativas.', icon: <Zap size={15} /> },
  { value: 'custom', label: 'Personalizado', description: 'Você escolhe a quantidade (1-30).', icon: <SlidersHorizontal size={15} /> },
];

// Fase 67 — detalhe visível de cada perfil. Os números batem com
// PERFORMANCE_PRESETS em main/settingsStore.ts (1/6/10 instâncias e 5/15/30
// minutos de ociosidade; o Personalizado não suspende por ociosidade).
const PERFIL_INFO: Record<PerformanceMode, { max: string; linha1: string; linha2: string }> = {
  economy: { max: 'Máx. 1', linha1: 'Até 1 instância carregada.', linha2: 'Suspende ociosas após 5 min.' },
  balanced: { max: 'Máx. 6', linha1: 'Até 6 instâncias carregadas.', linha2: 'Suspende ociosas após 15 min.' },
  performance: { max: 'Máx. 10', linha1: 'Até 10 instâncias carregadas.', linha2: 'Suspende ociosas após 30 min.' },
  custom: { max: '1 a 30', linha1: 'Você escolhe o limite.', linha2: 'Sem suspensão por ociosidade.' },
};

const CLOSE_OPTIONS: { value: CloseBehavior; label: string; description: string; icon: ReactNode }[] = [
  { value: 'tray', label: 'Bandeja', description: 'Minimiza e mantém as contas ativas.', icon: <Minimize2 size={15} /> },
  { value: 'ask', label: 'Perguntar', description: 'Mostra uma opção toda vez.', icon: <HelpCircle size={15} /> },
  { value: 'quit', label: 'Sair', description: 'Encerra o programa por completo.', icon: <LogOut size={15} /> },
];

// Fase 50: "about" é nova — as informações institucionais saíram do botão
// "Sobre" do topo (que deu lugar a "Ajuda") e viraram uma aba aqui.
type TabKey = 'general' | 'instances' | 'performance' | 'backup' | 'updates' | 'about';

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'general', label: 'Geral & Aparência', icon: <SlidersHorizontal size={14} /> },
  { key: 'instances', label: 'Instâncias & Agrupamentos', icon: <Layers size={14} /> },
  { key: 'performance', label: 'Desempenho & Notificações', icon: <GaugeIcon size={14} /> },
  { key: 'backup', label: 'Backup & Diagnóstico', icon: <DatabaseBackup size={14} /> },
  { key: 'updates', label: 'Atualizações', icon: <RefreshCw size={14} /> },
  { key: 'about', label: 'Sobre o Sistema', icon: <Info size={14} /> },
];

/**
 * Fase 65 — cabeçalho de cada aba: ícone, título e uma linha dizendo o que a
 * aba reúne. Antes a aba começava direto no primeiro controle.
 */
function TabHeader({
  icon,
  title,
  description,
  aside,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  /** Fase 66 — informação curta à direita do cabeçalho. */
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 pb-1">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-text-dim">{description}</p>
        </div>
      </div>
      {aside && <div className="shrink-0 pt-1 text-right text-[12px] tabular-nums text-text-dim">{aside}</div>}
    </div>
  );
}

/**
 * Fase 66 — CPU do Orbi com gráfico de linha das últimas leituras. As
 * leituras vêm do mesmo getDiagnostics de sempre, repetido a cada 2s
 * enquanto as Configurações estão abertas. A escala vai até 100% ou até o
 * maior valor lido, porque a soma dos processos pode passar de 100% com
 * vários núcleos.
 */
function CpuChip({ history }: { history: number[] }) {
  const atual = history.length > 0 ? history[history.length - 1] : null;
  const max = Math.max(100, ...history);
  const w = 90;
  const h = 26;
  const pontos = history
    .map((v, i) => `${history.length === 1 ? w : (i / (history.length - 1)) * w},${h - (v / max) * h}`)
    .join(' ');
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-input px-3 py-1.5">
      <div className="text-right leading-tight">
        <div className="text-[11px] text-text-dim">CPU do Orbi</div>
        <div className="text-[13px] font-semibold tabular-nums text-accent">{atual === null ? '—' : `${atual}%`}</div>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
        {history.length > 1 && (
          <polyline
            points={pontos}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

/** Fase 66 — anel com quantas instâncias estão carregadas diante do limite escolhido. */
function LoadedRing({ loaded, limit }: { loaded: number; limit: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const frac = limit > 0 ? Math.min(1, loaded / limit) : 0;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-2.5 py-1.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
        />
      </svg>
      <div className="leading-tight">
        <div className="text-[11px] text-text-dim">Carregadas</div>
        <div className="text-[12.5px] font-semibold tabular-nums text-text">
          {loaded} / {limit}
        </div>
      </div>
    </div>
  );
}

/**
 * Fase 65 — bloco de configuração. Substitui a antiga `Section` (título em
 * caixa alta e fio separador): cada grupo de ajustes vira um cartão com
 * título, descrição e, quando faz sentido, a ação principal à direita.
 *
 * Sem `overflow-hidden` de propósito. A tabela de instâncias fica dentro de
 * um destes cartões, e o cabeçalho fixo dela precisa se prender ao painel
 * rolável das Configurações; um ancestral recortando o conteúdo quebraria o
 * `sticky`.
 */
function Card({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-app/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 text-[13.5px] font-semibold text-text">
            {icon && <span className="shrink-0 text-text-dim">{icon}</span>}
            {title}
          </h4>
          {description && <p className="mt-1 text-[12px] leading-snug text-text-dim">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

/**
 * Fase 65 — linha de liga/desliga: texto à esquerda, caixa de seleção à
 * direita. A linha inteira continua clicável, como era antes.
 */
function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-input text-accent">{icon}</span>
        )}
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium text-text">{title}</span>
          {description && <span className="mt-0.5 block text-[12px] leading-snug text-text-dim">{description}</span>}
        </span>
      </span>
      {/* Fase 67 — chave de liga/desliga. A caixa de seleção continua sendo o
          controle de verdade (clicar na linha a aciona, como antes); só fica
          invisível, e a chave desenhada acompanha o estado dela. A bolinha
          tem 20px e anda 20px dentro de uma área útil de 40px, então nunca
          escapa da cápsula (lição da Fase 44). */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input p-0.5 ring-1 ring-border transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
      >
        <span
          className={'h-5 w-5 rounded-full bg-white shadow transition-transform ' + (checked ? 'translate-x-5' : 'translate-x-0')}
        />
      </span>
    </label>
  );
}

/**
 * Fase 65 — opção de escolha única. Mesmo destaque de seleção de antes
 * (borda e fundo no acento); só ganhou a variação em linha para caber em
 * cartões mais estreitos.
 */
function OptionTile({
  active,
  onClick,
  icon,
  label,
  title,
  layout = 'column',
  segment = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  title?: string;
  layout?: 'column' | 'row';
  /** Fase 68 — opção dentro de um controle segmentado (sem borda quando não escolhida). */
  segment?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={
        'flex items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition-colors ' +
        (layout === 'column' ? (segment ? 'flex-col py-2 ' : 'flex-col py-3 ') : segment ? 'py-2 ' : 'py-2.5 ') +
        (active
          ? 'border-accent bg-accent/10 font-semibold text-accent'
          : segment
            ? 'border-transparent text-text-dim hover:text-text'
            : 'border-border text-text-dim hover:border-border-strong hover:text-text')
      }
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Fase 68 — miniatura de cada tema. Usa as cores reais de cada tema
 * (index.css), não os tokens do tema atual, porque mostra como o OUTRO fica.
 */
function ThemePreview({ kind }: { kind: ThemePreference }) {
  if (kind === 'system') {
    return (
      <div className="relative h-20" style={{ background: 'linear-gradient(90deg, #0d1418 50%, #e9edef 50%)' }}>
        <div className="absolute inset-0 flex items-center justify-center text-text-faint">
          <Monitor size={20} />
        </div>
      </div>
    );
  }
  const escuro = kind === 'dark';
  const fundo = escuro ? '#0d1418' : '#e9edef';
  const painel = escuro ? '#1a252c' : '#ffffff';
  const linha = escuro ? '#26333b' : '#d3d8db';
  const acento = escuro ? '#25d366' : '#0e9c86';
  return (
    <div className="flex h-20 flex-col gap-1.5 p-2" style={{ background: fundo }}>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>
      <div className="flex flex-1 gap-1.5">
        <div className="w-1/3 rounded" style={{ background: painel }} />
        <div className="flex flex-1 flex-col gap-1 rounded p-1.5" style={{ background: painel }}>
          <span className="h-1.5 w-3/4 rounded-full" style={{ background: acento }} />
          <span className="h-1 w-full rounded-full" style={{ background: linha }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Fase 69 — uma linha do log no formato "[data ISO] [NÍVEL] mensagem" (ver
 * main/logger.ts). Mostra a data local curta, o nível em etiqueta colorida e
 * a mensagem. Linhas que não seguem o formato (continuação de um erro com
 * várias linhas) aparecem só como texto.
 */
/**
 * Fase 70 — junta cada entrada do log com as linhas de continuação dela
 * (erros com várias linhas), para poder inverter a ordem sem separá-las.
 */
function agruparLog(linhas: string[]): string[][] {
  const grupos: string[][] = [];
  for (const l of linhas) {
    if (grupos.length === 0 || /^\[[^\]]+\]\s+\[\w+\]/.test(l)) grupos.push([l]);
    else grupos[grupos.length - 1].push(l);
  }
  return grupos;
}

function LogLine({ linha }: { linha: string }) {
  const m = /^\[([^\]]+)\]\s+\[(\w+)\]\s+(.*)$/.exec(linha);
  if (!m) return <div className="truncate pl-[170px] text-text-faint">{linha}</div>;
  const d = new Date(m[1]);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const quando = Number.isNaN(d.getTime())
    ? m[1]
    : `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  const nivel = m[2].toUpperCase();
  const cor =
    nivel === 'ERROR' ? 'bg-red-500/15 text-red-400' : nivel === 'WARN' ? 'bg-amber-500/15 text-amber-400' : 'bg-accent/15 text-accent';
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="w-[112px] shrink-0 whitespace-nowrap tabular-nums text-text-faint">{quando}</span>
      <span className={'w-[46px] shrink-0 rounded px-1 text-center text-[10px] font-bold ' + cor}>{nivel}</span>
      <span className="min-w-0 truncate text-text" title={m[3]}>
        {m[3]}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">{children}</kbd>;
}

/**
 * Fase 41: o número é o dado, então ganha o destaque (20px, peso 700, cor
 * principal) e o rótulo recua para o cinza secundário. Fase 65: rótulo em
 * cima e uma dica curta embaixo, dentro de cada quadro.
 */
function Metric({
  label,
  value,
  hint,
  percent,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  percent?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-text-dim">{label}</span>
        {icon && <span className="shrink-0 text-accent">{icon}</span>}
      </div>
      <div className="mt-1 text-[20px] font-bold leading-tight text-text">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-text-faint" title={hint}>
        {hint}
      </div>
      {/* Fase 66 — barra de proporção, só quando existe um total de verdade para comparar. */}
      {percent !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-input">
          <div
            className="h-full rounded-full accent-gradient transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SecondaryButton({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-[13px] text-text transition-colors hover:border-border-strong hover:bg-surface-hover"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Uma linha da tabela de instâncias: nome editável, agrupamento, serviço, status e ações. */
function InstanceRow({
  account,
  groups,
  selected,
  onToggleSelected,
}: {
  account: AccountRecord;
  groups: { id: string; name: string }[];
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
}) {
  const renameAccount = useAppStore((s) => s.renameAccount);
  const setAccountColor = useAppStore((s) => s.setAccountColor);
  const setAccountGroup = useAppStore((s) => s.setAccountGroup);
  const pickAccountIcon = useAppStore((s) => s.pickAccountIcon);
  const resetAccountIcon = useAppStore((s) => s.resetAccountIcon);
  const removeAccountWithConfirm = useAppStore((s) => s.removeAccountWithConfirm);
  const suspendAccount = useAppStore((s) => s.suspendAccount);
  const switchAccount = useAppStore((s) => s.switchAccount);
  const status = useAppStore((s) => s.statuses.get(account.id));

  const [name, setName] = useState(account.name);
  useEffect(() => setName(account.name), [account.name]);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === account.name) {
      setName(account.name);
      return;
    }
    renameAccount(account.id, trimmed);
  };

  const handlePickIcon = async () => {
    const result = await pickAccountIcon(account.id);
    if (result?.error) window.alert(result.error);
  };

  const isSuspended = status?.suspended ?? account.suspended;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="w-8 px-2 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelected(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-accent)]"
          aria-label={`Selecionar ${account.name}`}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ background: account.iconDataUrl ? 'transparent' : account.color }}
          >
            {account.iconDataUrl ? (
              <img src={account.iconDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ServiceGlyph service={account.service} size={13} color="#fff" />
            )}
          </div>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="min-w-0 flex-1 rounded-lg border border-border bg-input px-2 py-1 text-[13px] text-text transition-colors focus:border-accent"
            aria-label="Nome da instância"
          />
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          value={account.groupId && groups.some((g) => g.id === account.groupId) ? account.groupId : ''}
          onChange={(e) => setAccountGroup(account.id, e.target.value || null)}
          className="w-full max-w-[140px] rounded-lg border border-border bg-input px-2 py-1 text-[11px] text-text focus:border-accent"
          aria-label="Agrupamento da instância"
        >
          <option value="">Sem agrupamento</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-[12px] text-text-dim">
        <span className="block truncate" title={SERVICES[account.service]?.label ?? account.service}>
          {SERVICES[account.service]?.label ?? account.service}
        </span>
      </td>
      <td className="px-2 py-2">
        <span
          className={
            'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (status?.loadError
              ? 'bg-danger/10 text-danger'
              : isSuspended
                ? 'bg-surface text-text-faint'
                : status?.isOnline
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface text-text-dim')
          }
          title={accountStatusLabel(account, status)}
        >
          {accountStatusLabel(account, status)}
        </span>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-0.5">
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md bg-input text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            title={isSuspended ? 'Ativar instância' : 'Suspender instância'}
            onClick={() => (isSuspended ? switchAccount(account.id) : suspendAccount(account.id))}
          >
            {isSuspended ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md bg-input text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            title="Escolher imagem"
            onClick={handlePickIcon}
          >
            <ImagePlus size={14} />
          </button>
          {/* Fase 59: troca a cor de identificação da instância. Fica junto
              da escolha de imagem porque as duas definem a mesma coisa: como
              a instância é reconhecida de relance na barra de contas. */}
          <div className="px-1">
            <ColorSwatchButton
              value={account.color}
              onChange={(hex) => setAccountColor(account.id, hex)}
              title={`Cor de ${account.name}`}
              size={16}
            />
          </div>
          {account.iconDataUrl && (
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md bg-input text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
              title="Usar ícone padrão do serviço"
              onClick={() => resetAccountIcon(account.id)}
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md bg-input text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
            title="Excluir instância"
            onClick={() => removeAccountWithConfirm(account.id, account.name)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function GeneralAppearanceTab({
  startup,
  toggleStartup,
  theme,
  setTheme,
  sidebarPosition,
  applySidebarPosition,
  iconSize,
  applyIconSize,
  closeBehavior,
  applyCloseBehavior,
  confirmBeforeRemove,
  toggleConfirmBeforeRemove,
}: {
  startup: boolean;
  toggleStartup: () => void;
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  sidebarPosition: SidebarPosition;
  applySidebarPosition: (p: SidebarPosition) => void;
  iconSize: IconSize;
  applyIconSize: (s: IconSize) => void;
  closeBehavior: CloseBehavior;
  applyCloseBehavior: (b: CloseBehavior) => void;
  confirmBeforeRemove: boolean;
  toggleConfirmBeforeRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<SlidersHorizontal size={17} />}
        title="Geral & Aparência"
        description="Inicialização, tema, barra de contas e o que acontece ao fechar a janela."
      />

      <div className="rounded-xl border border-border bg-app/40 px-4 py-3.5">
        <ToggleRow
          icon={<Power size={15} />}
          title="Iniciar com o Windows"
          description="Abre o Orbi automaticamente quando o computador liga."
          checked={startup}
          onChange={toggleStartup}
        />
      </div>

      <Card title="Tema visual" icon={<Sun size={15} />} description="Esquema de cores da interface do Orbi.">
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const ativo = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                aria-pressed={ativo}
                className={
                  'overflow-hidden rounded-xl border text-left transition-colors ' +
                  (ativo ? 'border-accent ring-1 ring-accent/50' : 'border-border hover:border-border-strong')
                }
              >
                <ThemePreview kind={opt.value} />
                <span
                  className={
                    'flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] ' +
                    (ativo ? 'font-semibold text-accent' : 'text-text-dim')
                  }
                >
                  <span className="flex items-center gap-1.5">
                    {opt.icon}
                    {opt.label}
                  </span>
                  <span
                    className={
                      'flex h-4 w-4 items-center justify-center rounded-full border ' +
                      (ativo ? 'border-accent' : 'border-border-strong')
                    }
                  >
                    {ativo && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Fase 65: posição e tamanho lado a lado, porque os dois ajustam a
          mesma coisa: a barra de contas. */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          title="Posição da barra de contas"
          icon={<PanelLeft size={15} />}
          description="Em qual lado da janela a lista de contas fica."
        >
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-input p-1">
            {SIDEBAR_POSITION_OPTIONS.map((opt) => (
              <OptionTile
                key={opt.value}
                segment
                active={sidebarPosition === opt.value}
                onClick={() => applySidebarPosition(opt.value)}
                icon={opt.icon}
                label={opt.label}
              />
            ))}
          </div>
        </Card>

        <Card
          title="Tamanho dos ícones/cards"
          icon={<Square size={15} />}
          description="Ícones, texto e espaçamento das contas na barra, em qualquer posição."
        >
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-input p-1">
            {ICON_SIZE_OPTIONS.map((opt) => (
              <OptionTile
                key={opt.value}
                layout="row"
                segment
                active={iconSize === opt.value}
                onClick={() => applyIconSize(opt.value)}
                icon={opt.icon}
                label={opt.label}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Fase 65: a descrição da opção escolhida, que antes só aparecia ao
          passar o mouse, fica visível no próprio cartão. A confirmação antes
          de remover mora aqui também, junto do outro ajuste de comportamento. */}
      <Card
        title="Ao fechar a janela"
        icon={<Minimize2 size={15} />}
        description={CLOSE_OPTIONS.find((o) => o.value === closeBehavior)?.description}
        action={
          <div className="flex rounded-lg border border-border bg-input p-1">
            {CLOSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => applyCloseBehavior(opt.value)}
                title={opt.description}
                aria-pressed={closeBehavior === opt.value}
                className={
                  'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ' +
                  (closeBehavior === opt.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-transparent text-text-dim hover:text-text')
                }
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="border-t border-border pt-3">
          <ToggleRow
            icon={<ShieldAlert size={15} />}
            title="Confirmar antes de remover uma instância"
            description="Mostra uma confirmação antes de excluir uma instância."
            checked={confirmBeforeRemove}
            onChange={toggleConfirmBeforeRemove}
          />
        </div>
      </Card>

      <Card title="Atalhos de teclado" icon={<Keyboard size={15} />}>
        <div className="rounded-lg border border-border">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-text-faint">
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Teclas</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-text">Trocar direto de instância</td>
                <td className="px-3 py-2 text-text-dim">
                  <Kbd>Ctrl</Kbd> + <Kbd>1</Kbd> … <Kbd>9</Kbd>
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-text">Avançar para a próxima instância</td>
                <td className="px-3 py-2 text-text-dim">
                  <Kbd>Ctrl</Kbd> + <Kbd>Tab</Kbd>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function InstancesTab({ diagnostics }: { diagnostics: DiagnosticsInfo | null }) {
  const accounts = useAppStore((s) => s.accounts);
  const groups = useAppStore((s) => s.groups);
  const createGroup = useAppStore((s) => s.createGroup);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const setGroupColor = useAppStore((s) => s.setGroupColor);
  const removeGroup = useAppStore((s) => s.removeGroup);
  const setAccountGroup = useAppStore((s) => s.setAccountGroup);
  const suspendAccount = useAppStore((s) => s.suspendAccount);
  const removeAccount = useAppStore((s) => s.removeAccount);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Fase 60: busca dentro da própria tabela. Com muitas instâncias, achar
  // uma conta exigia rolar a lista inteira.
  const [query, setQuery] = useState('');

  const visiveis = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return accounts;
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(termo) || a.phone?.toLowerCase().includes(termo)
    );
  }, [accounts, query]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Fase 60: "selecionar todas" passa a valer para o que está VISÍVEL. Com
  // a busca ativa, marcar a caixa do cabeçalho e apagar levaria junto
  // instâncias que nem estavam na tela.
  const allSelected = visiveis.length > 0 && visiveis.every((a) => selectedIds.has(a.id));
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const a of visiveis) {
        if (checked) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  };

  const bulkSetGroup = (groupId: string | null) => {
    for (const id of selectedIds) setAccountGroup(id, groupId);
  };

  const bulkPause = () => {
    for (const id of selectedIds) suspendAccount(id);
  };

  const bulkDelete = () => {
    const confirmed = window.confirm(
      `Excluir ${selectedIds.size} instância(s) selecionada(s)? Isso apaga permanentemente os dados de sessão delas.`
    );
    if (!confirmed) return;
    for (const id of selectedIds) removeAccount(id);
    setSelectedIds(new Set());
  };

  const handleAddGroup = async () => {
    const result = await createGroup(newGroupName);
    if (result?.error) {
      setGroupError(result.error);
      return;
    }
    setGroupError(null);
    setNewGroupName('');
  };

  const startRenameGroup = (id: string, currentName: string) => {
    setEditingGroupId(id);
    setEditingGroupName(currentName);
    setGroupError(null);
  };

  const commitRenameGroup = async () => {
    if (!editingGroupId) return;
    const result = await renameGroup(editingGroupId, editingGroupName);
    if (result?.error) {
      setGroupError(result.error);
      return;
    }
    setGroupError(null);
    setEditingGroupId(null);
  };

  const handleRemoveGroup = async (id: string, name: string) => {
    const confirmed = window.confirm(`Excluir o agrupamento "${name}"? As instâncias dele passam para "Sem agrupamento".`);
    if (!confirmed) return;
    await removeGroup(id);
  };

  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<Layers size={17} />}
        title="Instâncias & Agrupamentos"
        description="Cada instância roda em uma sessão isolada, guardada apenas neste computador."
        aside={
          diagnostics
            ? `${diagnostics.loadedAccounts}/${diagnostics.totalAccounts} em memória · ${formatBytes(diagnostics.memoryBytes)}`
            : undefined
        }
      />

      {/* Fase 65: agrupamentos num cartão próprio. As pílulas continuam
          iguais; a criação de agrupamento ganhou uma linha inteira embaixo. */}
      <Card
        title="Agrupamentos"
        icon={<FolderPlus size={15} />}
        description="Pastas para organizar as instâncias na barra de contas. A bolinha define a cor de cada uma."
        action={
          <span className="text-[12px] tabular-nums text-text-faint">
            {groups.length} {groups.length === 1 ? 'agrupamento' : 'agrupamentos'}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {groups.map((g) =>
            editingGroupId === g.id ? (
              <span key={g.id} className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRenameGroup();
                    if (e.key === 'Escape') {
                      // Fase 50: sem parar a propagação, este Esc chegaria
                      // também ao ouvinte do modal e fecharia as Configurações
                      // inteiras junto com o cancelamento da renomeação. Aqui
                      // ele só cancela a edição do nome.
                      e.stopPropagation();
                      setEditingGroupId(null);
                    }
                  }}
                  onBlur={commitRenameGroup}
                  className="w-28 rounded-lg border border-accent bg-input px-2 py-1 text-[11px] text-text"
                />
              </span>
            ) : (
              <span
                key={g.id}
                className="flex items-center gap-1 rounded-full border border-border bg-input py-1 pl-2 pr-1 text-[11px] text-text-dim"
              >
                {/* Fase 59: agrupamento passou a ter cor própria, que tinge o
                    ícone de pasta na barra de contas. */}
                <ColorSwatchButton
                  value={g.color}
                  onChange={(hex) => setGroupColor(g.id, hex)}
                  title={`Cor do agrupamento ${g.name}`}
                  size={12}
                />
                <span className="font-medium text-text">{g.name}</span>
                <span className="tabular-nums text-text-faint">{accounts.filter((a) => a.groupId === g.id).length}</span>
                <button
                  className="rounded-full p-0.5 hover:bg-surface-hover hover:text-text"
                  onClick={() => startRenameGroup(g.id, g.name)}
                  title="Renomear agrupamento"
                >
                  <Pencil size={11} />
                </button>
                <button
                  className="rounded-full p-0.5 hover:bg-danger/10 hover:text-danger"
                  onClick={() => handleRemoveGroup(g.id, g.name)}
                  title="Excluir agrupamento"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            )
          )}
        </div>
        <div className={'flex items-center gap-2 ' + (groups.length > 0 ? 'mt-3' : '')}>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              setGroupError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroup();
            }}
            placeholder="Novo agrupamento..."
            className={
              'min-w-0 flex-1 rounded-lg border bg-input px-2.5 py-1.5 text-[12.5px] text-text placeholder:text-text-faint focus:border-accent ' +
              (groupError ? 'border-danger' : 'border-border')
            }
          />
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-1.5 text-[12.5px] text-text-dim hover:border-accent hover:text-accent"
            onClick={handleAddGroup}
          >
            <FolderPlus size={13} />
            Criar
          </button>
        </div>
        {groupError && <p className="mt-1.5 text-[11px] text-danger">{groupError}</p>}
      </Card>

      <Card
        title="Instâncias"
        icon={<Layers size={15} />}
        description="Renomeie, troque o ícone e a cor, mude o agrupamento ou exclua. Marque as caixas para agir sobre várias de uma vez."
        action={
          <span className="text-[12px] tabular-nums text-text-faint">
            {query.trim() ? `${visiveis.length} de ${accounts.length}` : `${accounts.length} instância(s)`}
          </span>
        }
      >
        {/* Fase 60: busca dentro da tabela. */}
        <div className="relative mb-2">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar instância por nome..."
            className="w-full rounded-lg border border-border bg-input py-1.5 pl-7 pr-2 text-[12px] text-text placeholder:text-text-faint focus:border-accent"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
            <span className="text-[12px] font-medium text-text">{selectedIds.size} selecionada(s)</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value === '') return;
                bulkSetGroup(e.target.value === '__none__' ? null : e.target.value);
                e.target.value = '';
              }}
              className="rounded-lg border border-border bg-input px-2 py-1 text-[11px] text-text focus:border-accent"
            >
              <option value="" disabled>
                Alterar agrupamento...
              </option>
              <option value="__none__">Sem agrupamento</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <SecondaryButton onClick={bulkPause} icon={<Pause size={13} />}>
              Suspender
            </SecondaryButton>
            <SecondaryButton onClick={bulkDelete} icon={<Trash2 size={13} />}>
              {`Excluir selecionadas (${selectedIds.size})`}
            </SecondaryButton>
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-faint">
            Nenhuma instância ainda. Adicione uma pelo botão "+ Adicionar conta" na barra lateral.
          </p>
        ) : (
          // Fase 60: o `overflow-x-auto` daqui gerava a barra de rolagem
          // lateral E, por ser um contêiner de rolagem, impedia o cabeçalho de
          // grudar no topo do painel (um `sticky` resolve contra o contêiner
          // rolável mais próximo, que era esta caixa, e ela nunca rola na
          // vertical). Com larguras fixas por coluna a tabela cabe na largura
          // do modal e a caixa não precisa mais rolar.
          // Fase 65: `-mx-4 -mb-4` levam a tabela até a borda do cartão. Assim
          // ela mantém exatamente a largura de antes, e a coluna de nome, que
          // já é apertada, não perde espaço para o preenchimento do cartão.
          <div className="-mx-4 -mb-4 border-t border-border">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                {/* Fase 68: Ações ganhou largura para os botões em caixa; a
                    soma das colunas fixas continua 464px, então a coluna de
                    nome mantém exatamente a mesma largura. */}
                <col style={{ width: 34 }} />
                <col />
                <col style={{ width: 108 }} />
                <col style={{ width: 64 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 166 }} />
              </colgroup>
              {/* O fio de baixo vem de `box-shadow`, não de `border-bottom`:
                  com `border-collapse` a borda de um cabeçalho fixo não
                  acompanha a rolagem e some. */}
              {/* Fase 61: o `sticky` vai nas CÉLULAS do cabeçalho, não no
                  <thead>. Sticky em <thead>/<tr> não é confiável em tabela
                  com `border-collapse`; nas células funciona sempre. */}
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-text-faint [&>th]:sticky [&>th]:-top-5 [&>th]:z-20 [&>th]:bg-surface [&>th]:shadow-[inset_0_-1px_0_var(--color-border)]">
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                      aria-label="Selecionar todas"
                    />
                  </th>
                  <th className="px-2 py-2 font-semibold">Nome</th>
                  <th className="px-2 py-2 font-semibold">Agrupamento</th>
                  <th className="px-2 py-2 font-semibold">Serviço</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((acc) => (
                  <InstanceRow
                    key={acc.id}
                    account={acc}
                    groups={groups}
                    selected={selectedIds.has(acc.id)}
                    onToggleSelected={(checked) => toggleSelected(acc.id, checked)}
                  />
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-xs text-text-faint">
                      Nenhuma instância com esse nome.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PerformanceNotificationsTab({
  performanceMode,
  applyPerformanceMode,
  customMaxLoaded,
  customMaxLoadedRange,
  applyCustomMaxLoaded,
  notificationsEnabled,
  toggleNotifications,
  windowsNotificationsEnabled,
  toggleWindowsNotifications,
  toastNotificationsEnabled,
  toggleToastNotifications,
  diagnostics,
  cpuHistory,
}: {
  performanceMode: PerformanceMode;
  applyPerformanceMode: (m: PerformanceMode) => void;
  customMaxLoaded: number;
  customMaxLoadedRange: { min: number; max: number };
  applyCustomMaxLoaded: (value: number) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  windowsNotificationsEnabled: boolean;
  toggleWindowsNotifications: () => void;
  toastNotificationsEnabled: boolean;
  toggleToastNotifications: () => void;
  /** Fase 66 — consumo atual e histórico de CPU para os gráficos. */
  diagnostics: DiagnosticsInfo | null;
  cpuHistory: number[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<GaugeIcon size={17} />}
        title="Desempenho & Notificações"
        description="Quantas instâncias ficam carregadas ao mesmo tempo e por onde os avisos de mensagem aparecem."
      />

      <Card
        title="Desempenho"
        icon={<Zap size={15} />}
        description="Controla quantas instâncias ficam prontas ao mesmo tempo. As demais são suspensas automaticamente em segundo plano assim que o limite escolhido é ultrapassado."
        action={<CpuChip history={cpuHistory} />}
      >
        {/* Fase 65: a descrição de cada perfil, que só aparecia ao passar o
            mouse, agora fica visível dentro da própria opção. */}
        <p className="mb-2 text-[12px] font-medium text-text-dim">Perfil</p>
        <div className="grid grid-cols-4 gap-2">
          {PERFORMANCE_OPTIONS.map((opt) => {
            const ativo = performanceMode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => applyPerformanceMode(opt.value)}
                title={opt.description}
                aria-pressed={ativo}
                className={
                  'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ' +
                  (ativo ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong')
                }
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span
                    className={
                      'flex h-8 w-8 items-center justify-center rounded-lg ' +
                      (ativo ? 'accent-gradient text-accent-contrast' : 'bg-input text-text-dim')
                    }
                  >
                    {opt.icon}
                  </span>
                  <span className="text-[11px] tabular-nums text-text-faint">{PERFIL_INFO[opt.value].max}</span>
                </span>
                <span className={'mt-1 text-[12.5px] font-semibold ' + (ativo ? 'text-accent' : 'text-text')}>{opt.label}</span>
                <span className="text-[11px] leading-snug text-text-dim">{PERFIL_INFO[opt.value].linha1}</span>
                <span className="text-[11px] leading-snug text-text-dim">{PERFIL_INFO[opt.value].linha2}</span>
              </button>
            );
          })}
        </div>
        {performanceMode === 'custom' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <label htmlFor="custom-max-loaded" className="min-w-0">
              <span className="block text-[13px] font-medium text-text">Instâncias simultâneas</span>
              <span className="block text-[11.5px] text-text-dim">
                Entre {customMaxLoadedRange.min} e {customMaxLoadedRange.max} no perfil Personalizado.
              </span>
            </label>
            <div className="flex shrink-0 items-center gap-1.5">
            {/* Fase 67 — botões de menos e mais, usando o mesmo applyCustomMaxLoaded do campo. */}
            <button
              type="button"
              aria-label="Diminuir instâncias simultâneas"
              onClick={() => applyCustomMaxLoaded(Math.max(customMaxLoadedRange.min, customMaxLoaded - 1))}
              disabled={customMaxLoaded <= customMaxLoadedRange.min}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input text-lg text-text-dim transition-colors hover:text-text disabled:opacity-40"
            >
              −
            </button>
            <input
              id="custom-max-loaded"
              type="number"
              min={customMaxLoadedRange.min}
              max={customMaxLoadedRange.max}
              value={customMaxLoaded}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isNaN(value)) applyCustomMaxLoaded(value);
              }}
              className="h-9 w-16 rounded-lg border border-border bg-input px-2 text-center text-sm font-semibold text-accent focus:border-accent"
            />
            <button
              type="button"
              aria-label="Aumentar instâncias simultâneas"
              onClick={() => applyCustomMaxLoaded(Math.min(customMaxLoadedRange.max, customMaxLoaded + 1))}
              disabled={customMaxLoaded >= customMaxLoadedRange.max}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input text-lg text-text-dim transition-colors hover:text-text disabled:opacity-40"
            >
              +
            </button>
            <span className="ml-1.5">
              {diagnostics && <LoadedRing loaded={diagnostics.loadedAccounts} limit={customMaxLoaded} />}
            </span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Notificações" icon={<Bell size={15} />} description="Se os avisos de mensagem nova aparecem, e por onde.">
        <div className="rounded-lg border border-border">
          <div className="px-3.5 py-3">
            <ToggleRow
              icon={notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              title="Notificações de novas mensagens"
              description="Chave geral. Desligada, nenhum dos dois avisos abaixo aparece."
              checked={notificationsEnabled}
              onChange={toggleNotifications}
            />
          </div>

          {/*
            Fase 48 — por onde o aviso aparece. As duas cobrem situações
            diferentes e não se sobrepõem: a caixa do Windows é a única visível
            com o app minimizado; o aviso interno só existe com a janela aberta.
            Ficam desabilitadas quando a chave geral acima está desligada, para
            deixar claro que ela manda nas duas.
          */}
          <div className={'border-t border-border ' + (notificationsEnabled ? '' : 'pointer-events-none opacity-50')}>
            <div className="px-3.5 py-3">
              <ToggleRow
                icon={<Monitor size={15} />}
                title="Notificações do Windows"
                description="Caixa do sistema, aparece com o app minimizado ou em segundo plano."
                checked={windowsNotificationsEnabled}
                onChange={toggleWindowsNotifications}
                disabled={!notificationsEnabled}
              />
            </div>
            <div className="border-t border-border px-3.5 py-3">
              <ToggleRow
                icon={<Bell size={15} />}
                title="Notificações internas"
                description="Aviso flutuante no canto do app, aparece com a janela aberta."
                checked={toastNotificationsEnabled}
                onChange={toggleToastNotifications}
                disabled={!notificationsEnabled}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Fase 66 — consumo atual, relido a cada 2s com as Configurações abertas. */}
      {diagnostics && (
        <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-app/40 px-4 py-3">
          <div className="min-w-0">
            <h4 className="text-[13.5px] font-semibold text-text">Consumo atual do Orbi</h4>
            <p className="mt-0.5 text-[12px] text-text-dim">
              {formatBytes(diagnostics.memoryBytes)} de memória em {diagnostics.processCount} processos do Orbi.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-right">
            <div>
              <div className="text-[11px] text-text-dim">Carregadas</div>
              <div className="text-[18px] font-bold tabular-nums text-text">{diagnostics.loadedAccounts}</div>
            </div>
            <span className="h-8 w-px bg-border" aria-hidden />
            <div>
              <div className="text-[11px] text-text-dim">Suspensas</div>
              <div className="text-[18px] font-bold tabular-nums text-accent">{diagnostics.suspendedAccounts}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Fase 50 — informações institucionais, vindas do antigo botão "Sobre" do
 * topo. O lugar dele passou a ser do botão "Ajuda".
 */
function AboutSystemTab({ appInfo }: { appInfo: { appName: string; creator: string; version: string } | null }) {
  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<Info size={17} />}
        title="Sobre o Sistema"
        description="Informações do aplicativo, licença de uso e privacidade."
      />

      <section className="flex flex-col items-center rounded-xl border border-border bg-app/40 px-5 py-6 text-center">
        <div className="mb-3 h-14 w-14 overflow-hidden rounded-2xl shadow-lg">
          <OrbiLogo size={56} />
        </div>
        <h3 className="text-lg font-semibold text-text">{appInfo?.appName ?? 'Orbi'}</h3>
        <p className="mt-0.5 text-xs text-text-faint">Versão {appInfo?.version ?? ''}</p>
        <p className="mt-3.5 max-w-md text-sm leading-7 text-text-dim">
          O <strong className="font-semibold text-text">Orbi</strong> foi criado para centralizar e acelerar a gestão
          das suas instâncias em um só lugar, oferecendo controle total e produtividade para o seu fluxo de trabalho.
        </p>
        <div className="mt-4 rounded-full border border-border px-4 py-1.5 text-sm text-text">
          Criado por <strong className="font-semibold text-accent">{appInfo?.creator ?? 'Vinicius Braga'}</strong>
        </div>
      </section>

      <Card title="Licença e uso" icon={<FileText size={15} />}>
        <div className="flex flex-col gap-2 text-[13px] leading-6 text-text-dim">
          <p>
            Software proprietário, de uso restrito. Todos os direitos reservados ao autor. A redistribuição, a revenda e
            a modificação não são autorizadas.
          </p>
          <p>Copyright © 2026 Vinicius Braga.</p>
        </div>
      </Card>

      <Card title="Privacidade" icon={<ShieldCheck size={15} />}>
        <div className="flex flex-col gap-2 text-[13px] leading-6 text-text-dim">
          <p>
            Cada conta roda em uma sessão isolada, guardada apenas neste computador. Uma conta nunca enxerga os dados
            da outra.
          </p>
          <p>
            O Orbi não lê, guarda nem envia o conteúdo das suas conversas. Os números do Analytics são apenas
            quantidades, calculadas e mantidas localmente.
          </p>
          <p>Nenhum dado de conversa sai da sua máquina.</p>
        </div>
      </Card>
    </div>
  );
}

function BackupDiagnosticsTab({
  exportBackup,
  importBackup,
  diagnostics,
  logLines,
  toggleLogViewer,
  clearLogs,
}: {
  exportBackup: () => void;
  importBackup: () => void;
  diagnostics: DiagnosticsInfo | null;
  logLines: string[] | null;
  toggleLogViewer: () => void;
  /** Fase 70 — apaga o log de diagnóstico. */
  clearLogs: () => void;
}) {
  // Fase 52 — estado local: só esta aba precisa saber o resultado da limpeza.
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheResult, setCacheResult] = useState<string | null>(null);

  async function clearCache() {
    setClearingCache(true);
    setCacheResult(null);
    try {
      const { freedBytes, accounts } = await window.multiwhats.clearCache();
      setCacheResult(
        freedBytes > 0
          ? `${formatBytes(freedBytes)} liberados em ${accounts} ${accounts === 1 ? 'instância' : 'instâncias'}.`
          : 'Nada para limpar: o cache já estava vazio.'
      );
    } catch {
      setCacheResult('Não foi possível limpar o cache.');
    } finally {
      setClearingCache(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<DatabaseBackup size={17} />}
        title="Backup & Diagnóstico"
        description="Cópia da organização das instâncias, consumo do aplicativo, logs e limpeza de dados locais."
      />

      <Card
        title="Backup das instâncias"
        icon={<DownloadCloud size={15} />}
        description="Salva só os nomes, cores, ordem e agrupamentos das instâncias, nunca o login ou os dados da sessão. Útil para não perder a organização da lista; não substitui autenticar de novo se os dados da sessão forem apagados."
        action={
          <div className="flex flex-col gap-2">
            <SecondaryButton onClick={exportBackup} icon={<DownloadCloud size={14} />}>
              Exportar backup
            </SecondaryButton>
            <SecondaryButton onClick={importBackup} icon={<UploadCloud size={14} />}>
              Restaurar backup
            </SecondaryButton>
          </div>
        }
      />

      <Card
        title="Diagnóstico"
        icon={<FileText size={15} />}
        description="Medido ao abrir as Configurações."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => window.multiwhats.openLogsFolder()} icon={<FileText size={14} />}>
              Abrir pasta de logs
            </SecondaryButton>
            <SecondaryButton onClick={toggleLogViewer} icon={<FileText size={14} />}>
              {logLines ? 'Ocultar log' : 'Ver últimas linhas'}
            </SecondaryButton>
          </div>
        }
      >
        {/*
          Fase 43 — consumo real de memória e CPU, medido pelo próprio
          Electron somando todos os processos do app. A CPU pode passar de
          100% porque cada núcleo ocupado conta separado.
        */}
        {diagnostics && (
          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Instâncias"
              icon={<Layers size={15} />}
              value={String(diagnostics.totalAccounts)}
              hint="configuradas"
              percent={diagnostics.totalAccounts > 0 ? 100 : 0}
            />
            <Metric
              label="Carregadas"
              icon={<CheckCircle2 size={15} />}
              value={String(diagnostics.loadedAccounts)}
              hint={`${diagnostics.totalAccounts > 0 ? Math.round((diagnostics.loadedAccounts / diagnostics.totalAccounts) * 100) : 0}% em memória`}
              percent={diagnostics.totalAccounts > 0 ? (diagnostics.loadedAccounts / diagnostics.totalAccounts) * 100 : 0}
            />
            <Metric
              label="Log"
              icon={<FileText size={15} />}
              value={formatBytes(diagnostics.logSizeBytes)}
              hint="limite de 5 MB por arquivo"
              percent={(diagnostics.logSizeBytes / (5 * 1024 * 1024)) * 100}
            />
            <Metric
              label="Memória"
              icon={<GaugeIcon size={15} />}
              value={formatBytes(diagnostics.memoryBytes)}
              hint={
                diagnostics.totalSystemMemoryBytes
                  ? `${((diagnostics.memoryBytes / diagnostics.totalSystemMemoryBytes) * 100).toFixed(1)}% da memória do PC`
                  : 'soma dos processos'
              }
              percent={
                diagnostics.totalSystemMemoryBytes
                  ? (diagnostics.memoryBytes / diagnostics.totalSystemMemoryBytes) * 100
                  : undefined
              }
            />
            <Metric
              label="CPU"
              icon={<Zap size={15} />}
              value={`${diagnostics.cpuPercent}%`}
              hint="cada núcleo conta separado"
              percent={diagnostics.cpuPercent}
            />
            <Metric
              label="Processos"
              icon={<SlidersHorizontal size={15} />}
              value={String(diagnostics.processCount)}
              hint="do Orbi"
            />
          </div>
        )}
        {/* Fase 69 — log de diagnóstico visível na própria aba, carregado ao
            abrir as Configurações. O botão "Ocultar log" / "Ver últimas
            linhas" continua escondendo e mostrando, como antes. */}
        {logLines && (
          <div className={'rounded-xl border border-border bg-input ' + (diagnostics ? 'mt-3' : '')}>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[12.5px] font-semibold text-text">Log de diagnóstico</span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-faint">últimas {logLines.length} linhas, mais recente em cima</span>
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11.5px] text-text-dim transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 size={12} />
                  Limpar log
                </button>
              </div>
            </div>
            <div className="mw-scroll flex max-h-56 flex-col gap-0.5 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-6">
              {logLines.length > 0 ? (
                // Fase 70 — mais recente em cima. O arquivo guarda da mais
                // antiga para a mais nova, então a lista é invertida por entrada.
                agruparLog(logLines)
                  .reverse()
                  .map((grupo, i) => (
                    <div key={i}>
                      {grupo.map((linha, j) => (
                        <LogLine key={j} linha={linha} />
                      ))}
                    </div>
                  ))
              ) : (
                <p className="text-text-faint">Sem entradas no log ainda.</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/*
        Fase 52 — o cache de rede de cada instância cresce sozinho com o uso
        (imagens, fotos de perfil, mídia) e ocupa a maior parte do espaço em
        disco do app. Limpar não mexe na sessão: ver o comentário do handler
        mw:clear-cache para o que é e o que não é apagado.
      */}
      <Card
        title="Espaço em disco"
        icon={<Trash2 size={15} />}
        description="Apaga o cache de imagens e arquivos temporários de todas as instâncias. Não desconecta nenhuma conta, não pede QR Code e não apaga conversas, configurações ou o histórico do Analytics. Depois de limpar, cada instância demora um pouco mais para abrir na primeira vez."
        action={
          <SecondaryButton onClick={clearCache} icon={<Trash2 size={14} />}>
            {clearingCache ? 'Limpando…' : 'Limpar cache'}
          </SecondaryButton>
        }
      >
        {cacheResult && <p className="text-[12.5px] text-text-dim">{cacheResult}</p>}
      </Card>
    </div>
  );
}

/**
 * Fase 27 — verificação e instalação de atualizações via GitHub Releases.
 * Some quer que a checagem seja automática ao abrir o app (já feita no
 * processo principal, ver updateManager.ts), mas o DOWNLOAD e a INSTALAÇÃO
 * só acontecem quando o usuário clica aqui — nunca sozinho.
 */
function UpdatesTab({
  version,
  updateState,
  onCheck,
  onDownload,
  onInstall,
}: {
  version: string;
  updateState: UpdateState;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TabHeader
        icon={<RefreshCw size={17} />}
        title="Atualizações"
        description="O Orbi verifica sozinho ao abrir e a cada 4 horas. Baixar e instalar só acontece com o seu clique."
      />

      <section className="flex items-center justify-between gap-3 rounded-xl border border-border bg-app/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-input text-accent">
            <Layers size={18} />
          </span>
          <div>
            <div className="text-[12px] text-text-dim">Versão instalada</div>
            <div className="text-[14px] font-semibold text-text">Orbi</div>
          </div>
        </div>
        <span className="rounded-md bg-input px-2.5 py-1 text-[15px] font-bold tabular-nums text-accent">v{version}</span>
      </section>

      {/* Fase 65: os estados abaixo são exatamente os mesmos de antes; só
          passaram a morar dentro de um cartão. */}
      <section className="rounded-xl border border-border border-l-4 border-l-accent bg-app/40 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-text">
          <DownloadCloudIcon size={15} className="text-text-dim" />
          Atualização
        </h4>
        {updateState.phase === 'idle' && (
          <p className="text-xs text-text-dim">Ainda não verificado nesta sessão.</p>
        )}

        {updateState.phase === 'checking' && (
          <div className="flex items-center gap-2 text-xs text-text-dim">
            <RefreshCw size={14} className="animate-spin" />
            Verificando se há uma versão mais nova...
          </div>
        )}

        {updateState.phase === 'not-available' && (
          <div className="flex items-center gap-2 text-xs text-text-dim">
            <CheckCircle2 size={14} className="text-accent" />
            Você já está na versão mais recente.
          </div>
        )}

        {updateState.phase === 'available' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs text-text">
              <DownloadCloudIcon size={14} className="text-danger" />
              Versão <strong>v{updateState.version}</strong> disponível.
            </div>
            <SecondaryButton onClick={onDownload} icon={<DownloadCloudIcon size={14} />}>
              Baixar atualização
            </SecondaryButton>
          </div>
        )}

        {updateState.phase === 'downloading' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-text-dim">
              <RefreshCw size={14} className="animate-spin" />
              Baixando atualização... {updateState.percent}%
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full accent-gradient transition-all"
                style={{ width: `${updateState.percent}%` }}
              />
            </div>
          </div>
        )}

        {updateState.phase === 'downloaded' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs text-text">
              <CheckCircle2 size={14} className="text-accent" />
              Versão <strong>v{updateState.version}</strong> baixada e pronta para instalar.
            </div>
            <SecondaryButton onClick={onInstall} icon={<RefreshCw size={14} />}>
              Reiniciar e instalar agora
            </SecondaryButton>
            <p className="text-[11px] text-text-faint">O app fecha e reabre já atualizado. Suas contas continuam logadas normalmente.</p>
          </div>
        )}

        {updateState.phase === 'error' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs text-danger">
              <AlertTriangle size={14} />
              Não foi possível verificar/baixar a atualização.
            </div>
            <p className="text-[11px] text-text-faint">{updateState.message}</p>
          </div>
        )}

        {(updateState.phase === 'idle' || updateState.phase === 'not-available' || updateState.phase === 'error') && (
          <div className="mt-3">
            <SecondaryButton onClick={onCheck} icon={<RefreshCw size={14} />}>
              Verificar agora
            </SecondaryButton>
          </div>
        )}
      </section>
    </div>
  );
}

export function SettingsModal({
  open,
  onClose,
  initialTab,
}: {
  open: boolean;
  onClose: () => void;
  /** Fase 29: permite abrir o modal já direto na aba pedida (ex.: clique na notificação nativa de atualização disponível). */
  initialTab?: TabKey;
}) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const sidebarPosition = useAppStore((s) => s.sidebarPosition);
  const setSidebarPosition = useAppStore((s) => s.setSidebarPosition);
  const iconSize = useAppStore((s) => s.iconSize);
  const setIconSize = useAppStore((s) => s.setIconSize);
  const confirmBeforeRemove = useAppStore((s) => s.confirmBeforeRemove);
  const setConfirmBeforeRemoveStore = useAppStore((s) => s.setConfirmBeforeRemove);
  const loadGroups = useAppStore((s) => s.loadGroups);
  const appInfo = useAppStore((s) => s.appInfo);
  const updateState = useAppStore((s) => s.updateState);
  const checkForUpdate = useAppStore((s) => s.checkForUpdate);
  const downloadUpdate = useAppStore((s) => s.downloadUpdate);
  const installUpdate = useAppStore((s) => s.installUpdate);
  const hasUpdate = updateState.phase === 'available' || updateState.phase === 'downloading' || updateState.phase === 'downloaded';

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  // Fase 29: toda vez que o modal reabre com um `initialTab` explícito
  // (ex.: clique na notificação nativa de "atualização disponível"), pula
  // direto pra essa aba — sem isso o modal sempre reabriria em "Geral".
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);
  const [startup, setStartup] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('balanced');
  const [customMaxLoaded, setCustomMaxLoadedState] = useState(6);
  const [customMaxLoadedRange, setCustomMaxLoadedRange] = useState({ min: 1, max: 30 });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Fase 48 — preferências de por onde o aviso aparece.
  const [windowsNotificationsEnabled, setWindowsNotificationsEnabled] = useState(true);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(true);
  const [closeBehavior, setCloseBehaviorState] = useState<CloseBehavior>('tray');
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
  const [logLines, setLogLines] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab('general');
    window.multiwhats.getStartupSetting().then(setStartup);
    window.multiwhats.getPerformanceMode().then((info) => {
      setPerformanceMode(info.mode);
      setCustomMaxLoadedState(info.customMaxLoadedAccounts);
      setCustomMaxLoadedRange(info.customMaxLoadedRange);
    });
    window.multiwhats.getNotificationsEnabled().then(setNotificationsEnabled);
    window.multiwhats.getWindowsNotificationsEnabled().then(setWindowsNotificationsEnabled);
    window.multiwhats.getToastNotificationsEnabled().then(setToastNotificationsEnabled);
    window.multiwhats.getCloseBehavior().then(setCloseBehaviorState);
    window.multiwhats.getDiagnostics().then(setDiagnostics);
    // Fase 69 — o log já aparece carregado na aba Backup & Diagnóstico.
    window.multiwhats.readRecentLogs(80).then(setLogLines);
    loadGroups();
  }, [open, loadGroups]);

  // Fase 66 — com as Configurações abertas, o consumo é relido a cada 2s
  // para os gráficos acompanharem em tempo real. Guarda as últimas 30
  // leituras de CPU para o gráfico de linha. Para de ler ao fechar.
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  useEffect(() => {
    if (!open) return;
    setCpuHistory([]);
    const ler = () =>
      window.multiwhats.getDiagnostics().then((d) => {
        setDiagnostics(d);
        setCpuHistory((h) => [...h, d.cpuPercent].slice(-30));
      });
    ler();
    const id = setInterval(ler, 2000);
    return () => clearInterval(id);
  }, [open]);

  const toggleStartup = async () => {
    const applied = await window.multiwhats.setStartupSetting(!startup);
    setStartup(applied);
  };

  const applyPerformanceMode = async (mode: PerformanceMode) => {
    await window.multiwhats.setPerformanceMode(mode);
    setPerformanceMode(mode);
  };

  const applyCustomMaxLoaded = async (value: number) => {
    const applied = await window.multiwhats.setCustomMaxLoadedAccounts(value);
    setCustomMaxLoadedState(applied);
  };

  const toggleNotifications = async () => {
    const applied = await window.multiwhats.setNotificationsEnabled(!notificationsEnabled);
    setNotificationsEnabled(applied);
  };

  // Fase 48 — cada chave é gravada no settings.json na hora do clique, então
  // a escolha sobrevive a fechar o app.
  const toggleWindowsNotifications = async () => {
    const applied = await window.multiwhats.setWindowsNotificationsEnabled(!windowsNotificationsEnabled);
    setWindowsNotificationsEnabled(applied);
  };

  const toggleToastNotifications = async () => {
    const applied = await window.multiwhats.setToastNotificationsEnabled(!toastNotificationsEnabled);
    setToastNotificationsEnabled(applied);
  };

  const applyCloseBehavior = async (behavior: CloseBehavior) => {
    await window.multiwhats.setCloseBehavior(behavior);
    setCloseBehaviorState(behavior);
  };

  const toggleConfirmBeforeRemove = async () => {
    const applied = await window.multiwhats.setConfirmBeforeRemove(!confirmBeforeRemove);
    setConfirmBeforeRemoveStore(applied);
  };

  const exportBackup = async () => {
    const result = await window.multiwhats.exportBackup();
    if (result.canceled) return;
    if (result.error) return window.alert(result.error);
    window.alert(`Backup salvo em: ${result.savedTo}`);
  };

  const importBackup = async () => {
    const confirmed = window.confirm(
      'Restaurar um backup atualiza nomes/cores das instâncias que já existem e recria as que faltarem (sem apagar as atuais). Continuar?'
    );
    if (!confirmed) return;
    const result = await window.multiwhats.importBackup();
    if (result.canceled) return;
    if (result.error) return window.alert(result.error);
    window.alert(`Backup restaurado: ${result.restored} instância(s) recriada(s), ${result.updated} atualizada(s).`);
  };

  const toggleLogViewer = async () => {
    if (logLines) {
      setLogLines(null);
      return;
    }
    const lines = await window.multiwhats.readRecentLogs(80);
    setLogLines(lines);
  };

  // Fase 70 — apaga o log de diagnóstico e recarrega o painel e o tamanho do arquivo.
  const clearLogs = async () => {
    const confirmed = window.confirm(
      'Apagar todas as linhas do log de diagnóstico? Não afeta instâncias, conversas nem configurações.'
    );
    if (!confirmed) return;
    await window.multiwhats.clearLogs();
    setLogLines(await window.multiwhats.readRecentLogs(80));
    setDiagnostics(await window.multiwhats.getDiagnostics());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurações"
      icon={<Settings size={15} />}
      size="lg"
      closeOnEscape
      contentClassName="flex min-h-0 flex-1"
    >
      <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-border p-2.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              // Fase 41: aba ativa com contraste maior — o verde claro sobre
              // verde claro dificultava identificar de relance onde se está.
              // Fundo mais forte, texto em `semibold` e uma barra vertical de
              // destaque à esquerda.
              'relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ' +
              (activeTab === tab.key
                ? 'bg-accent/20 font-semibold text-accent before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-accent'
                : 'text-text-dim hover:bg-surface-hover hover:text-text')
            }
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'updates' && hasUpdate && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-danger" />}
          </button>
        ))}
      </nav>

      {/*
        Fase 41: `pr-3` afasta o conteúdo da barra de rolagem (antes ela
        encostava nos campos e switches da direita) e `pb-6` garante respiro
        no rodapé de todas as abas, que colavam na borda de baixo.
      */}
      <div className="mw-scroll min-w-0 flex-1 overflow-y-auto py-5 pb-6 pl-5 pr-3">
        {activeTab === 'general' && (
          <GeneralAppearanceTab
            startup={startup}
            toggleStartup={toggleStartup}
            theme={theme}
            setTheme={setTheme}
            sidebarPosition={sidebarPosition}
            applySidebarPosition={setSidebarPosition}
            iconSize={iconSize}
            applyIconSize={setIconSize}
            closeBehavior={closeBehavior}
            applyCloseBehavior={applyCloseBehavior}
            confirmBeforeRemove={confirmBeforeRemove}
            toggleConfirmBeforeRemove={toggleConfirmBeforeRemove}
          />
        )}
        {activeTab === 'instances' && <InstancesTab diagnostics={diagnostics} />}
        {activeTab === 'performance' && (
          <PerformanceNotificationsTab
            performanceMode={performanceMode}
            applyPerformanceMode={applyPerformanceMode}
            customMaxLoaded={customMaxLoaded}
            customMaxLoadedRange={customMaxLoadedRange}
            applyCustomMaxLoaded={applyCustomMaxLoaded}
            notificationsEnabled={notificationsEnabled}
            toggleNotifications={toggleNotifications}
            windowsNotificationsEnabled={windowsNotificationsEnabled}
            toggleWindowsNotifications={toggleWindowsNotifications}
            toastNotificationsEnabled={toastNotificationsEnabled}
            toggleToastNotifications={toggleToastNotifications}
            diagnostics={diagnostics}
            cpuHistory={cpuHistory}
          />
        )}
        {activeTab === 'backup' && (
          <BackupDiagnosticsTab
            exportBackup={exportBackup}
            importBackup={importBackup}
            diagnostics={diagnostics}
            logLines={logLines}
            toggleLogViewer={toggleLogViewer}
            clearLogs={clearLogs}
          />
        )}
        {activeTab === 'updates' && (
          <UpdatesTab
            version={appInfo?.version ?? '0.0.0'}
            updateState={updateState}
            onCheck={checkForUpdate}
            onDownload={downloadUpdate}
            onInstall={installUpdate}
          />
        )}
        {activeTab === 'about' && <AboutSystemTab appInfo={appInfo} />}
      </div>
    </Modal>
  );
}
