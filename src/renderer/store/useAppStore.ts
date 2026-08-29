/**
 * Estado global do renderer (Zustand). Concentra os dados vindos do processo
 * principal (contas, status, tema) e as ações que chamam a API exposta em
 * window.multiwhats — evita passar callbacks manualmente entre componentes.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { create } from 'zustand';
import {
  AccountRecord,
  AccountService,
  AccountStatus,
  AppInfo,
  GroupRecord,
  IconSize,
  SidebarPosition,
  ThemePreference,
  UpdateState,
} from '../types';
import { SIDEBAR_WIDTH_DEFAULT } from '../constants';

interface AppState {
  appInfo: AppInfo | null;
  accounts: AccountRecord[];
  statuses: Map<string, AccountStatus>;
  theme: ThemePreference;
  searchQuery: string;
  confirmBeforeRemove: boolean;
  sidebarWidth: number;
  sidebarPosition: SidebarPosition;
  iconSize: IconSize;
  isResizingSidebar: boolean;
  groups: GroupRecord[];
  updateState: UpdateState;

  init: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  switchAccount: (id: string) => Promise<void>;
  suspendAccount: (id: string) => Promise<void>;
  addAccount: (
    name: string,
    color?: string,
    service?: AccountService,
    customUrl?: string
  ) => Promise<{ error: string } | AccountRecord>;
  renameAccount: (id: string, name: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reorderAccounts: (orderedIds: string[]) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  removeAccountWithConfirm: (id: string, name: string) => Promise<void>;
  reloadAccount: (id: string) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setConfirmBeforeRemove: (enabled: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setIsResizingSidebar: (resizing: boolean) => void;
  commitSidebarWidth: (width: number) => Promise<void>;
  setSidebarPosition: (position: SidebarPosition) => Promise<void>;
  setIconSize: (size: IconSize) => Promise<void>;
  loadGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<{ error: string } | null>;
  renameGroup: (id: string, name: string) => Promise<{ error: string } | null>;
  reorderGroups: (orderedIds: string[]) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  setAccountGroup: (id: string, groupId: string | null) => Promise<void>;
  pickAccountIcon: (id: string) => Promise<{ dataUrl?: string; error?: string; canceled?: boolean }>;
  resetAccountIcon: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  appInfo: null,
  accounts: [],
  statuses: new Map(),
  theme: 'dark',
  searchQuery: '',
  confirmBeforeRemove: true,
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  sidebarPosition: 'left',
  iconSize: 'medium',
  isResizingSidebar: false,
  groups: [],
  updateState: { phase: 'idle' },

  init: async () => {
    const [appInfo, theme, payload, confirmBeforeRemove, sidebarWidth, sidebarPosition, iconSize, groups, updateState] =
      await Promise.all([
        window.multiwhats.getAppInfo(),
        window.multiwhats.getTheme(),
        window.multiwhats.listAccounts(),
        window.multiwhats.getConfirmBeforeRemove(),
        window.multiwhats.getSidebarWidth(),
        window.multiwhats.getSidebarPosition(),
        window.multiwhats.getIconSize(),
        window.multiwhats.listGroups(),
        window.multiwhats.getUpdateState(),
      ]);
    set({
      appInfo,
      theme,
      accounts: payload.accounts,
      statuses: new Map(payload.statuses.map((s) => [s.id, s])),
      confirmBeforeRemove,
      sidebarWidth,
      sidebarPosition,
      iconSize,
      groups,
      updateState,
    });
    window.multiwhats.onAccountsChanged((payload) => {
      set({
        accounts: payload.accounts,
        statuses: new Map(payload.statuses.map((s) => [s.id, s])),
      });
    });
    // Fase 27: o processo principal empurra o estado da verificação de
    // atualização assim que ela muda (checagem automática ao abrir, e
    // qualquer ação manual feita em Configurações → Atualizações).
    window.multiwhats.onUpdateStatusChanged((state) => set({ updateState: state }));
  },

  checkForUpdate: async () => {
    await window.multiwhats.checkForUpdate();
  },
  downloadUpdate: async () => {
    await window.multiwhats.downloadUpdate();
  },
  installUpdate: async () => {
    await window.multiwhats.installUpdate();
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  switchAccount: async (id) => {
    await window.multiwhats.switchAccount(id);
  },
  suspendAccount: async (id) => {
    await window.multiwhats.suspendAccount(id);
  },
  addAccount: async (name, color, service, customUrl) =>
    window.multiwhats.addAccount(name, color, service, customUrl),
  renameAccount: async (id, name) => {
    await window.multiwhats.renameAccount(id, name);
  },
  toggleFavorite: async (id) => {
    await window.multiwhats.toggleFavorite(id);
  },
  reorderAccounts: async (orderedIds) => {
    await window.multiwhats.reorderAccounts(orderedIds);
  },
  removeAccount: async (id) => {
    await window.multiwhats.removeAccount(id);
  },
  /** Remove pedindo confirmação antes, a menos que o usuário tenha desativado isso em Configurações. */
  removeAccountWithConfirm: async (id, name) => {
    if (get().confirmBeforeRemove) {
      // "Escanear o QR Code novamente" só faz sentido pra contas WhatsApp —
      // as demais (Gmail, Google Earth, navegador livre, URL customizada)
      // voltariam a pedir o login normal delas, não um QR Code.
      const isWhatsapp = get().accounts.find((a) => a.id === id)?.service === 'whatsapp';
      const reconnectHint = isWhatsapp
        ? ' (será necessário escanear o QR Code novamente se ela for adicionada de volta)'
        : ' (será necessário fazer login novamente se ela for adicionada de volta)';
      const confirmed = window.confirm(
        `Remover "${name}"?\n\nIsso apaga permanentemente os dados de sessão desta conta${reconnectHint}. As demais contas não são afetadas.`
      );
      if (!confirmed) return;
    }
    await window.multiwhats.removeAccount(id);
  },
  reloadAccount: async (id) => {
    await window.multiwhats.reloadAccount(id);
  },
  setTheme: async (theme) => {
    await window.multiwhats.setTheme(theme);
    set({ theme });
  },
  setConfirmBeforeRemove: (enabled) => set({ confirmBeforeRemove: enabled }),

  /** Atualiza a largura localmente durante o arrasto, sem tocar no IPC a cada pixel. */
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setIsResizingSidebar: (resizing) => set({ isResizingSidebar: resizing }),
  /** Persiste no processo principal (chamado ao soltar o mouse). */
  commitSidebarWidth: async (width) => {
    const applied = await window.multiwhats.setSidebarWidth(width);
    set({ sidebarWidth: applied });
  },
  setSidebarPosition: async (position) => {
    const applied = await window.multiwhats.setSidebarPosition(position);
    set({ sidebarPosition: applied });
  },
  setIconSize: async (size) => {
    const applied = await window.multiwhats.setIconSize(size);
    set({ iconSize: applied });
  },

  loadGroups: async () => {
    const groups = await window.multiwhats.listGroups();
    set({ groups });
  },
  createGroup: async (name) => {
    const result = await window.multiwhats.createGroup(name);
    if ('error' in result) return { error: result.error };
    await get().loadGroups();
    return null;
  },
  renameGroup: async (id, name) => {
    const result = await window.multiwhats.renameGroup(id, name);
    if ('error' in result) return { error: result.error };
    await get().loadGroups();
    return null;
  },
  reorderGroups: async (orderedIds) => {
    await window.multiwhats.reorderGroups(orderedIds);
    await get().loadGroups();
  },
  removeGroup: async (id) => {
    await window.multiwhats.removeGroup(id);
    await get().loadGroups();
  },
  setAccountGroup: async (id, groupId) => {
    await window.multiwhats.setAccountGroup(id, groupId);
  },
  pickAccountIcon: async (id) => window.multiwhats.pickAccountIcon(id),
  resetAccountIcon: async (id) => {
    await window.multiwhats.resetAccountIcon(id);
  },
}));
