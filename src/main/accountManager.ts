/**
 * Orquestra contas + views: troca de conta ativa, suspensão manual e
 * automática (limite de contas carregadas + ociosidade), e a montagem do
 * status de cada conta para a UI. Isola essa lógica de negócio do ciclo de
 * vida da janela/bandeja/IPC (ver windowManager.ts, trayManager.ts, ipcRouter.ts).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { AccountStore } from './accountStore';
import { ViewManager } from './viewManager';
import { AccountStatus } from './types';
import { AccountService } from './services';
import { logger } from './logger';

export const MAX_ACCOUNTS = 30;

export class AccountManager {
  private activeAccountId: string | null = null;
  private readonly lastActiveAt: Map<string, number> = new Map();

  // Quantas contas podem ficar com a WebContents carregada (RAM/CPU) ao
  // mesmo tempo, e depois de quanto tempo ociosa uma conta em segundo plano
  // é suspensa automaticamente. Valores iniciais vêm do modo de desempenho
  // salvo (ver settingsStore.ts); ajustáveis em tempo real via updateLimits.
  private maxLoadedAccounts: number;
  private idleSuspendMs: number;

  constructor(
    private readonly accountStore: AccountStore,
    private readonly viewManager: ViewManager,
    initialMaxLoadedAccounts: number,
    initialIdleSuspendMinutes: number
  ) {
    this.maxLoadedAccounts = initialMaxLoadedAccounts;
    this.idleSuspendMs = initialIdleSuspendMinutes * 60 * 1000;
  }

  /** Aplica um novo modo de desempenho sem precisar reiniciar o app. */
  updateLimits(maxLoadedAccounts: number, idleSuspendMinutes: number): void {
    this.maxLoadedAccounts = maxLoadedAccounts;
    this.idleSuspendMs = idleSuspendMinutes * 60 * 1000;
  }

  getActiveAccountId(): string | null {
    return this.activeAccountId;
  }

  list() {
    return this.accountStore.list();
  }

  get(id: string) {
    return this.accountStore.get(id);
  }

  buildStatuses(): AccountStatus[] {
    return this.accountStore.list().map((acc) => ({
      id: acc.id,
      isActive: acc.id === this.activeAccountId,
      isOnline: this.viewManager.hasView(acc.id) ? this.viewManager.isOnline(acc.id) : false,
      unreadCount: this.viewManager.hasView(acc.id) ? this.viewManager.getUnreadCount(acc.id) : 0,
      suspended: acc.suspended,
      loaded: this.viewManager.hasView(acc.id),
      loadError: this.viewManager.hasView(acc.id) ? this.viewManager.hasLoadError(acc.id) : false,
    }));
  }

  switchTo(accountId: string): void {
    const acc = this.accountStore.get(accountId);
    if (!acc) return;
    this.viewManager.activate(accountId);
    this.accountStore.setSuspended(accountId, false);
    this.activeAccountId = accountId;
    this.lastActiveAt.set(accountId, Date.now());
    this.enforceLoadedCap(accountId);
  }

  /** Suspensão manual (a partir da UI): permitida mesmo para a conta ativa no momento. */
  suspendManually(accountId: string): void {
    if (this.activeAccountId === accountId) this.activeAccountId = null;
    if (this.viewManager.hasView(accountId)) {
      this.viewManager.suspend(accountId);
      this.accountStore.setSuspended(accountId, true);
      this.lastActiveAt.delete(accountId);
    }
  }

  private suspendAutomatically(accountId: string): void {
    if (accountId === this.activeAccountId) return; // nunca suspende a conta visível no momento
    if (!this.viewManager.hasView(accountId)) return;
    this.viewManager.suspend(accountId);
    this.accountStore.setSuspended(accountId, true);
    this.lastActiveAt.delete(accountId);
    logger.info(`Conta suspensa automaticamente: ${accountId}`);
  }

  /** Garante que no máximo this.maxLoadedAccounts fiquem carregadas, suspendendo as menos usadas recentemente. */
  private enforceLoadedCap(justActivatedId: string): void {
    const loaded = this.viewManager.getLoadedAccountIds();
    if (loaded.length <= this.maxLoadedAccounts) return;

    const candidates = loaded
      .filter((id) => id !== justActivatedId)
      .sort((a, b) => (this.lastActiveAt.get(a) ?? 0) - (this.lastActiveAt.get(b) ?? 0));

    const overBy = loaded.length - this.maxLoadedAccounts;
    for (let i = 0; i < overBy && i < candidates.length; i++) {
      this.suspendAutomatically(candidates[i]);
    }
  }

  /** Varredura periódica: suspende contas em segundo plano ociosas há muito tempo, mesmo sob o limite de carregadas. */
  sweepIdleAccounts(): void {
    const now = Date.now();
    for (const id of this.viewManager.getLoadedAccountIds()) {
      if (id === this.activeAccountId) continue;
      const last = this.lastActiveAt.get(id) ?? 0;
      if (now - last > this.idleSuspendMs) {
        this.suspendAutomatically(id);
      }
    }
  }

  create(
    name: string,
    color?: string,
    service: AccountService = 'whatsapp',
    customUrl?: string
  ): { error: string } | ReturnType<AccountStore['create']> {
    if (this.accountStore.list().length >= MAX_ACCOUNTS) {
      return { error: `Limite de ${MAX_ACCOUNTS} contas atingido.` };
    }
    const acc = this.accountStore.create(name && name.trim() ? name.trim() : 'Nova conta', color, service, customUrl);
    logger.info(`Conta criada: ${acc.id} ("${acc.name}", serviço "${service}")`);
    return acc;
  }

  rename(id: string, name: string): void {
    this.accountStore.rename(id, name);
  }

  toggleFavorite(id: string): void {
    const acc = this.accountStore.get(id);
    if (!acc) return;
    this.accountStore.setFavorite(id, !acc.favorite);
  }

  reorder(orderedIds: string[]): void {
    this.accountStore.reorder(orderedIds);
  }

  setGroup(id: string, groupId: string | null): void {
    this.accountStore.setGroup(id, groupId);
  }

  setIcon(id: string, iconDataUrl: string | undefined): void {
    this.accountStore.setIcon(id, iconDataUrl);
  }

  /** Soma de não lidas de todas as contas — usado no selo da barra de tarefas. */
  totalUnread(): number {
    return this.buildStatuses().reduce((sum, s) => sum + (s.unreadCount || 0), 0);
  }

  reload(id: string): void {
    this.viewManager.reload(id);
  }

  async remove(id: string): Promise<void> {
    await this.viewManager.wipeAndDestroy(id);
    this.accountStore.remove(id);
    this.lastActiveAt.delete(id);
    if (this.activeAccountId === id) {
      this.activeAccountId = null;
    }
    logger.info(`Conta removida e dados da sessão apagados: ${id}`);
  }
}
