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
import { ReactNode, useEffect, useState } from 'react';
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
  PanelLeft,
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
import { OrbiLogo } from './OrbiLogo';
import { accountStatusLabel } from '../accountStatusLabel';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'dark', label: 'Escuro', icon: <Moon size={15} /> },
  { value: 'light', label: 'Claro', icon: <Sun size={15} /> },
  { value: 'system', label: 'Sistema', icon: <Monitor size={15} /> },
];

// Fase 21: posição da sidebar de contas — pedido explícito do usuário.
const SIDEBAR_POSITION_OPTIONS: { value: SidebarPosition; label: string; icon: ReactNode }[] = [
  { value: 'left', label: 'Esquerda', icon: <PanelLeft size={15} /> },
  { value: 'top', label: 'Topo', icon: <PanelTop size={15} /> },
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-text-faint">{title}</div>
      {children}
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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            className="min-w-[100px] flex-1 rounded-lg border border-border bg-input px-2 py-1 text-[13px] text-text transition-colors focus:border-accent"
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
      <td className="px-2 py-2 text-[12px] text-text-dim">{SERVICES[account.service]?.label ?? account.service}</td>
      <td className="px-2 py-2">
        <span
          className={
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ' +
            (status?.loadError
              ? 'bg-danger/10 text-danger'
              : isSuspended
                ? 'bg-surface text-text-faint'
                : status?.isOnline
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface text-text-dim')
          }
        >
          {accountStatusLabel(account, status)}
        </span>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-0.5">
          <button
            className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            title={isSuspended ? 'Ativar instância' : 'Suspender instância'}
            onClick={() => (isSuspended ? switchAccount(account.id) : suspendAccount(account.id))}
          >
            {isSuspended ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            title="Escolher imagem"
            onClick={handlePickIcon}
          >
            <ImagePlus size={14} />
          </button>
          {account.iconDataUrl && (
            <button
              className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
              title="Usar ícone padrão do serviço"
              onClick={() => resetAccountIcon(account.id)}
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            className="rounded-lg p-1.5 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
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
    <div className="flex flex-col gap-4">
      <Section title="Geral">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-sm text-text">
            <Power size={15} className="text-text-dim" />
            Iniciar com o Windows
          </span>
          <input type="checkbox" checked={startup} onChange={toggleStartup} className="h-4 w-4 accent-[var(--color-accent)]" />
        </label>
      </Section>

      <Section title="Aparência">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors ' +
                (theme === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-dim hover:border-border-strong hover:text-text')
              }
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Posição da barra lateral">
        <div className="grid grid-cols-2 gap-2">
          {SIDEBAR_POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applySidebarPosition(opt.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors ' +
                (sidebarPosition === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-dim hover:border-border-strong hover:text-text')
              }
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tamanho dos ícones/cards">
        <div className="grid grid-cols-3 gap-2">
          {ICON_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyIconSize(opt.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors ' +
                (iconSize === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-dim hover:border-border-strong hover:text-text')
              }
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-text-faint">
          Ajusta o tamanho dos ícones, texto e espaçamento dos cards de conta na barra lateral, tanto no modo "Esquerda" quanto no modo "Topo".
        </p>
      </Section>

      <Section title="Ao fechar a janela">
        <div className="grid grid-cols-3 gap-2">
          {CLOSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyCloseBehavior(opt.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs transition-colors ' +
                (closeBehavior === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-dim hover:border-border-strong hover:text-text')
              }
              title={opt.description}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Segurança">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-sm text-text">
            <ShieldAlert size={15} className="text-text-dim" />
            Confirmar antes de remover uma instância
          </span>
          <input
            type="checkbox"
            checked={confirmBeforeRemove}
            onChange={toggleConfirmBeforeRemove}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>
      </Section>

      <Section title="Atalhos">
        <ul className="space-y-1.5 text-xs text-text-dim">
          <li className="flex items-center gap-1">
            <Keyboard size={13} className="mr-0.5 shrink-0 text-text-faint" />
            <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">Ctrl</kbd>+
            <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">1</kbd>…
            <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">9</kbd> troca direto de instância.
          </li>
          <li className="flex items-center gap-1">
            <span className="mr-0.5 inline-block w-[13px]" />
            <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">Ctrl</kbd>+
            <kbd className="rounded border border-border bg-input px-1.5 py-0.5 text-[11px]">Tab</kbd> avança para a próxima
            instância.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function InstancesTab() {
  const accounts = useAppStore((s) => s.accounts);
  const groups = useAppStore((s) => s.groups);
  const createGroup = useAppStore((s) => s.createGroup);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const removeGroup = useAppStore((s) => s.removeGroup);
  const setAccountGroup = useAppStore((s) => s.setAccountGroup);
  const suspendAccount = useAppStore((s) => s.suspendAccount);
  const removeAccount = useAppStore((s) => s.removeAccount);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allSelected = accounts.length > 0 && selectedIds.size === accounts.length;
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(accounts.map((a) => a.id)) : new Set());
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
    <div className="flex flex-col gap-4">
      <Section title="Agrupamentos">
        <p className="mb-2.5 text-xs leading-relaxed text-text-dim">
          Crie agrupamentos (ex.: "Vendas", "Suporte") para organizar suas instâncias na barra lateral.
        </p>

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
                className="flex items-center gap-1 rounded-full border border-border bg-input py-1 pl-2.5 pr-1 text-[11px] text-text-dim"
              >
                {g.name}
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
          <div className="flex items-center gap-1">
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
                'w-32 rounded-lg border bg-input px-2 py-1 text-[11px] text-text placeholder:text-text-faint focus:border-accent ' +
                (groupError ? 'border-danger' : 'border-border')
              }
            />
            <button
              className="flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2 py-1 text-[11px] text-text-dim hover:border-accent hover:text-accent"
              onClick={handleAddGroup}
            >
              <FolderPlus size={12} />
              Criar
            </button>
          </div>
        </div>
        {groupError && <p className="mt-1.5 text-[11px] text-danger">{groupError}</p>}
      </Section>

      <Section title="Instâncias">
        <p className="mb-2.5 text-xs leading-relaxed text-text-dim">
          Renomeie, troque o ícone, mude o agrupamento ou exclua qualquer instância diretamente aqui. Marque as caixas de
          seleção para aplicar uma ação a várias instâncias de uma vez.
        </p>

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
                Mover para agrupamento...
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
              Excluir
            </SecondaryButton>
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-faint">
            Nenhuma instância ainda. Adicione uma pelo botão "+ Adicionar conta" na barra lateral.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-text-faint">
                  <th className="w-8 px-2 py-2">
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
                {accounts.map((acc) => (
                  <InstanceRow
                    key={acc.id}
                    account={acc}
                    groups={groups}
                    selected={selectedIds.has(acc.id)}
                    onToggleSelected={(checked) => toggleSelected(acc.id, checked)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
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
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Desempenho">
        <p className="mb-2.5 text-xs leading-relaxed text-text-dim">
          Controla quantas instâncias ficam prontas ao mesmo tempo — as demais são suspensas automaticamente em segundo
          plano assim que o limite escolhido é ultrapassado.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PERFORMANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyPerformanceMode(opt.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs transition-colors ' +
                (performanceMode === opt.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-dim hover:border-border-strong hover:text-text')
              }
              title={opt.description}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
        {performanceMode === 'custom' && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
            <label htmlFor="custom-max-loaded" className="text-sm text-text">
              Instâncias simultâneas
            </label>
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
              className="w-16 rounded-lg border border-border bg-input px-2 py-1 text-center text-sm text-text focus:border-accent"
            />
          </div>
        )}
      </Section>

      <Section title="Notificações">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-sm text-text">
            {notificationsEnabled ? <Bell size={15} className="text-text-dim" /> : <BellOff size={15} className="text-text-dim" />}
            Notificações de novas mensagens
          </span>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={toggleNotifications}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        {/*
          Fase 48 — por onde o aviso aparece. As duas cobrem situações
          diferentes e não se sobrepõem: a caixa do Windows é a única visível
          com o app minimizado; o aviso interno só existe com a janela aberta.
          Ficam desabilitadas quando a chave geral acima está desligada, para
          deixar claro que ela manda nas duas.
        */}
        <div className={'mt-2 flex flex-col gap-2 ' + (notificationsEnabled ? '' : 'pointer-events-none opacity-50')}>
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm text-text">
                <Monitor size={15} className="text-text-dim" />
                Notificações do Windows
              </span>
              <span className="text-[12px] text-text-dim">
                Caixa do sistema, aparece com o app minimizado ou em segundo plano.
              </span>
            </span>
            <input
              type="checkbox"
              checked={windowsNotificationsEnabled}
              onChange={toggleWindowsNotifications}
              disabled={!notificationsEnabled}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm text-text">
                <Bell size={15} className="text-text-dim" />
                Notificações internas
              </span>
              <span className="text-[12px] text-text-dim">
                Aviso flutuante no canto do app, aparece com a janela aberta.
              </span>
            </span>
            <input
              type="checkbox"
              checked={toastNotificationsEnabled}
              onChange={toggleToastNotifications}
              disabled={!notificationsEnabled}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
          </label>
        </div>
      </Section>
    </div>
  );
}

/**
 * Fase 50 — informações institucionais, vindas do antigo botão "Sobre" do
 * topo. O lugar dele passou a ser do botão "Ajuda".
 */
function AboutSystemTab({ appInfo }: { appInfo: { appName: string; creator: string; version: string } | null }) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Aplicativo">
        <div className="flex flex-col items-center rounded-xl border border-border px-5 py-6 text-center">
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
        </div>
      </Section>

      <Section title="Licença e uso">
        <div className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5 text-[13px] leading-6 text-text-dim">
          <p>
            Software proprietário, de uso restrito. Todos os direitos reservados ao autor. A redistribuição, a revenda e
            a modificação não são autorizadas.
          </p>
          <p>Copyright © 2026 Vinicius Braga.</p>
        </div>
      </Section>

      <Section title="Privacidade">
        <div className="flex gap-2.5 rounded-xl border border-border px-4 py-3.5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />
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
        </div>
      </Section>
    </div>
  );
}

function BackupDiagnosticsTab({
  exportBackup,
  importBackup,
  diagnostics,
  logLines,
  toggleLogViewer,
  clearAnalytics,
}: {
  exportBackup: () => void;
  importBackup: () => void;
  diagnostics: DiagnosticsInfo | null;
  logLines: string[] | null;
  toggleLogViewer: () => void;
  clearAnalytics: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Backup das instâncias">
        <p className="mb-3 text-xs leading-relaxed text-text-dim">
          Salva só os nomes/cores/ordem/agrupamentos das instâncias, nunca o login ou os dados da sessão. Útil para não perder
          a organização da lista; não substitui autenticar de novo se os dados da sessão forem apagados.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={exportBackup} icon={<DownloadCloud size={14} />}>
            Exportar backup
          </SecondaryButton>
          <SecondaryButton onClick={importBackup} icon={<UploadCloud size={14} />}>
            Restaurar backup
          </SecondaryButton>
        </div>
      </Section>

      <Section title="Diagnóstico">
        {/*
          Fase 41: hierarquia visual — o número é o dado, então ganha destaque
          (20px, peso 700, cor principal) e o rótulo recua para 12px em cinza
          secundário. Antes os dois tinham peso parecido e o olho não sabia
          onde pousar.
        */}
        {diagnostics && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{diagnostics.totalAccounts}</div>
              <div className="mt-0.5 text-[12px] text-text-dim">instâncias</div>
            </div>
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{diagnostics.loadedAccounts}</div>
              <div className="mt-0.5 text-[12px] text-text-dim">carregadas</div>
            </div>
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{formatBytes(diagnostics.logSizeBytes)}</div>
              <div className="mt-0.5 text-[12px] text-text-dim">log</div>
            </div>
          </div>
        )}
        {/*
          Fase 43 — consumo real de memória e CPU, medido pelo próprio
          Electron somando todos os processos do app. A CPU pode passar de
          100% porque cada núcleo ocupado conta separado.
        */}
        {diagnostics && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{formatBytes(diagnostics.memoryBytes)}</div>
              <div className="mt-0.5 text-[12px] text-text-dim">memória</div>
            </div>
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{diagnostics.cpuPercent}%</div>
              <div className="mt-0.5 text-[12px] text-text-dim">CPU</div>
            </div>
            <div className="rounded-xl border border-border px-2 py-3">
              <div className="text-[20px] font-bold leading-tight text-text">{diagnostics.processCount}</div>
              <div className="mt-0.5 text-[12px] text-text-dim">processos</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => window.multiwhats.openLogsFolder()} icon={<FileText size={14} />}>
            Abrir pasta de logs
          </SecondaryButton>
          <SecondaryButton onClick={toggleLogViewer} icon={<FileText size={14} />}>
            {logLines ? 'Ocultar log' : 'Ver últimas linhas'}
          </SecondaryButton>
        </div>
        {logLines && (
          <pre className="mw-scroll mt-2.5 max-h-40 overflow-y-auto rounded-xl border border-border bg-input p-2.5 pr-3 text-[10px] leading-relaxed text-text-dim">
            {logLines.length > 0 ? logLines.join('\n') : 'Sem entradas no log ainda.'}
          </pre>
        )}
      </Section>

      <Section title="Analytics">
        <p className="mb-3 text-xs leading-relaxed text-text-dim">
          Apaga todo o histórico de mensagens contabilizado na aba Analytics (eventos e a última contagem salva de cada
          instância). Não afeta as instâncias, conversas ou dados de login — é só o histórico de métricas local. Essa ação
          não pode ser desfeita.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={clearAnalytics} icon={<Trash2 size={14} />}>
            Apagar histórico do Analytics
          </SecondaryButton>
        </div>
      </Section>
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
    <div className="flex flex-col gap-4">
      <Section title="Versão instalada">
        <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
          <span className="text-sm text-text">Orbi</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-medium text-text-dim">v{version}</span>
        </div>
      </Section>

      <Section title="Atualização">
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
      </Section>
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
    loadGroups();
  }, [open, loadGroups]);

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

  const clearAnalytics = async () => {
    const confirmed = window.confirm(
      'Apagar todo o histórico do Analytics? Isso remove todas as métricas de mensagens já registradas e não pode ser desfeito.'
    );
    if (!confirmed) return;
    await window.multiwhats.clearAnalytics();
    window.alert('Histórico do Analytics apagado.');
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
        {activeTab === 'instances' && <InstancesTab />}
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
          />
        )}
        {activeTab === 'backup' && (
          <BackupDiagnosticsTab
            exportBackup={exportBackup}
            importBackup={importBackup}
            diagnostics={diagnostics}
            logLines={logLines}
            toggleLogViewer={toggleLogViewer}
            clearAnalytics={clearAnalytics}
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
