/**
 * Registra todos os handlers `ipcMain.handle(...)` chamados pelo preload/
 * renderer. Mantido separado do ciclo de vida do app (main.ts) para que a
 * lista de comandos expostos à UI fique em um único lugar fácil de auditar.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import { AccountStore } from './accountStore';
import { AccountManager, MAX_ACCOUNTS } from './accountManager';
import { GroupStore } from './groupStore';
import { AccountService } from './services';
import {
  SettingsStore,
  ThemePreference,
  PerformanceMode,
  PERFORMANCE_PRESETS,
  CloseBehavior,
  CUSTOM_MAX_LOADED_MIN,
  CUSTOM_MAX_LOADED_MAX,
  SidebarPosition,
  IconSize,
} from './settingsStore';
import { AnalyticsStore } from './analyticsStore';
import { ChatActivityStore } from './chatActivityStore';
import { UpdateManager } from './updateManager';
import { resolveWhatsNew } from './releaseNotes';
import { AnalyticsRange, AnalyticsSummary, BackupFile } from './types';
import { logger } from './logger';

const ICON_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function fsWriteJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function fsReadJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export interface IpcRouterDeps {
  appName: string;
  creatorName: string;
  accountStore: AccountStore;
  accountManager: AccountManager;
  groupStore: GroupStore;
  settingsStore: SettingsStore;
  analyticsStore: AnalyticsStore;
  chatActivityStore: ChatActivityStore | null;
  updateManager: UpdateManager | null;
  getMainWindow: () => BrowserWindow | null;
  switchToAccount: (accountId: string) => void;
  pushAccountsUpdate: () => void;
  updateTrayMenu: () => void;
  forgetNotificationState: (accountId: string) => void;
  applyPerformanceMode: (mode: PerformanceMode) => void;
  setOverlayActive: (active: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setIconSize: (size: IconSize) => void;
  /** Fase 33.2 — faz cada instância esquecer quais balões já reportou (usado ao limpar o Analytics). */
  resetMessageTracking: () => void;
}

export function registerIpcHandlers(deps: IpcRouterDeps): void {
  const { accountStore, accountManager, groupStore, settingsStore, analyticsStore, chatActivityStore } = deps;

  ipcMain.handle('mw:get-app-info', () => ({
    appName: deps.appName,
    creator: deps.creatorName,
    version: app.getVersion(),
    // Exposto pra UI nunca hardcodar esse número (badge de contagem de
    // contas, mensagens de limite atingido) — uma única fonte de verdade em
    // accountManager.ts (Fase 10: 20 → 30).
    maxAccounts: MAX_ACCOUNTS,
  }));

  ipcMain.handle('mw:list-accounts', () => ({
    accounts: accountManager.list(),
    statuses: accountManager.buildStatuses(),
  }));

  ipcMain.handle('mw:switch-account', (_evt, accountId: string) => {
    deps.switchToAccount(accountId);
    return true;
  });

  ipcMain.handle('mw:suspend-account', (_evt, accountId: string) => {
    accountManager.suspendManually(accountId);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle(
    'mw:add-account',
    (
      _evt,
      { name, color, service, customUrl }: { name: string; color?: string; service?: AccountService; customUrl?: string }
    ) => {
      const result = accountManager.create(name, color, service, customUrl);
      deps.pushAccountsUpdate();
      return result;
    }
  );

  ipcMain.handle('mw:rename-account', (_evt, { id, name }: { id: string; name: string }) => {
    accountManager.rename(id, name);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:toggle-favorite', (_evt, id: string) => {
    accountManager.toggleFavorite(id);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:reorder-accounts', (_evt, orderedIds: string[]) => {
    accountManager.reorder(orderedIds);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:reload-account', (_evt, id: string) => {
    accountManager.reload(id);
    return true;
  });

  ipcMain.handle('mw:remove-account', async (_evt, id: string) => {
    await accountManager.remove(id);
    deps.forgetNotificationState(id);
    analyticsStore.forget(id);
    chatActivityStore?.forget(id);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:get-startup-setting', () => app.getLoginItemSettings().openAtLogin);

  ipcMain.handle('mw:set-startup-setting', (_evt, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    deps.updateTrayMenu();
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('mw:get-theme', () => settingsStore.getTheme());

  ipcMain.handle('mw:set-theme', (_evt, theme: ThemePreference) => {
    settingsStore.setTheme(theme);
    return theme;
  });

  ipcMain.handle('mw:export-backup', async () => {
    const win = deps.getMainWindow();
    if (!win) return { error: 'Janela indisponível.' };
    const backup: BackupFile = {
      app: 'orbi-swit-stack',
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      accounts: accountStore.exportBackup(),
    };
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salvar backup das contas',
      defaultPath: `orbi-swit-stack-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Backup do Orbi Swit Stack', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { canceled: true };
    try {
      fsWriteJson(filePath, backup);
      logger.info(`Backup exportado para ${filePath} (${backup.accounts.length} contas).`);
      return { savedTo: filePath };
    } catch (err) {
      logger.error(`Falha ao exportar backup: ${String(err)}`);
      return { error: 'Não foi possível salvar o arquivo de backup.' };
    }
  });

  ipcMain.handle('mw:import-backup', async () => {
    const win = deps.getMainWindow();
    if (!win) return { error: 'Janela indisponível.' };
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Selecionar backup para restaurar',
      properties: ['openFile'],
      filters: [{ name: 'Backup do Orbi Swit Stack', extensions: ['json'] }],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    try {
      const parsed = fsReadJson(filePaths[0]) as BackupFile;
      // Aceita também o identificador antigo ('whats-control') para não
      // quebrar a restauração de backups feitos antes do rebranding.
      if (
        (parsed?.app !== 'orbi-swit-stack' && (parsed?.app as string) !== 'whats-control') ||
        !Array.isArray(parsed.accounts)
      ) {
        return { error: 'Este arquivo não parece ser um backup válido do Orbi Swit Stack.' };
      }
      const result = accountStore.restore(parsed.accounts);
      logger.info(
        `Backup importado de ${filePaths[0]}: ${result.restored} conta(s) recriada(s), ${result.updated} atualizada(s).`
      );
      deps.pushAccountsUpdate();
      return result;
    } catch (err) {
      logger.error(`Falha ao importar backup: ${String(err)}`);
      return { error: 'Não foi possível ler o arquivo selecionado.' };
    }
  });

  ipcMain.handle('mw:open-logs-folder', () => {
    shell.openPath(logger.getLogDir());
    return true;
  });

  ipcMain.handle('mw:get-performance-mode', () => ({
    mode: settingsStore.getPerformanceMode(),
    presets: PERFORMANCE_PRESETS,
    customMaxLoadedAccounts: settingsStore.getCustomMaxLoadedAccounts(),
    customMaxLoadedRange: { min: CUSTOM_MAX_LOADED_MIN, max: CUSTOM_MAX_LOADED_MAX },
  }));

  ipcMain.handle('mw:set-performance-mode', (_evt, mode: PerformanceMode) => {
    settingsStore.setPerformanceMode(mode);
    deps.applyPerformanceMode(mode);
    return mode;
  });

  ipcMain.handle('mw:set-custom-max-loaded-accounts', (_evt, value: number) => {
    const applied = settingsStore.setCustomMaxLoadedAccounts(value);
    // Só afeta o comportamento em tempo real se o perfil "Personalizado" já estiver ativo.
    if (settingsStore.getPerformanceMode() === 'custom') {
      deps.applyPerformanceMode('custom');
    }
    return applied;
  });

  ipcMain.handle('mw:get-notifications-enabled', () => settingsStore.getNotificationsEnabled());

  ipcMain.handle('mw:set-notifications-enabled', (_evt, enabled: boolean) => {
    settingsStore.setNotificationsEnabled(enabled);
    return enabled;
  });

  ipcMain.handle('mw:get-diagnostics', () => {
    const list = accountManager.list();
    const statuses = accountManager.buildStatuses();
    return {
      appVersion: app.getVersion(),
      totalAccounts: list.length,
      loadedAccounts: statuses.filter((s) => s.loaded).length,
      suspendedAccounts: statuses.filter((s) => s.suspended).length,
      logDir: logger.getLogDir(),
      logSizeBytes: logger.getLogSizeBytes(),
    };
  });

  ipcMain.handle('mw:read-recent-logs', (_evt, maxLines: number) => logger.readTail(maxLines ?? 100));

  ipcMain.handle('mw:get-close-behavior', () => settingsStore.getCloseBehavior());

  ipcMain.handle('mw:set-close-behavior', (_evt, behavior: CloseBehavior) => {
    settingsStore.setCloseBehavior(behavior);
    return behavior;
  });

  ipcMain.handle('mw:get-confirm-before-remove', () => settingsStore.getConfirmBeforeRemove());

  ipcMain.handle('mw:set-confirm-before-remove', (_evt, enabled: boolean) => {
    settingsStore.setConfirmBeforeRemove(enabled);
    return enabled;
  });

  // Ver comentário em viewManager.ts (campo overlayActive): a WebContentsView
  // do WhatsApp sempre desenha na frente da página HTML, então o renderer
  // avisa por aqui sempre que qualquer modal em tela cheia abre/fecha, para
  // a view ativa ser escondida e não roubar cliques do modal.
  ipcMain.handle('mw:set-overlay-active', (_evt, active: boolean) => {
    deps.setOverlayActive(active);
    return true;
  });

  ipcMain.handle('mw:get-sidebar-width', () => settingsStore.getSidebarWidth());

  ipcMain.handle('mw:set-sidebar-width', (_evt, width: number) => {
    const applied = settingsStore.setSidebarWidth(width);
    deps.setSidebarWidth(applied);
    return applied;
  });

  // Fase 21: posição da sidebar ("left"/"top", ver Configurações > Aparência).
  ipcMain.handle('mw:get-sidebar-position', () => settingsStore.getSidebarPosition());

  ipcMain.handle('mw:set-sidebar-position', (_evt, position: SidebarPosition) => {
    settingsStore.setSidebarPosition(position);
    deps.setSidebarPosition(position);
    return position;
  });

  // Fase 22: tamanho dos ícones/cards de conta ("small"/"medium"/"large").
  ipcMain.handle('mw:get-icon-size', () => settingsStore.getIconSize());

  ipcMain.handle('mw:set-icon-size', (_evt, size: IconSize) => {
    settingsStore.setIconSize(size);
    deps.setIconSize(size);
    return size;
  });

  // --- Grupos/pastas de instâncias (Fase 6) ---

  ipcMain.handle('mw:list-groups', () => groupStore.list());

  ipcMain.handle('mw:create-group', (_evt, name: string) => {
    const result = groupStore.create(name);
    if (!('error' in result)) deps.pushAccountsUpdate();
    return result;
  });

  ipcMain.handle('mw:rename-group', (_evt, { id, name }: { id: string; name: string }) => {
    const result = groupStore.rename(id, name);
    if (!('error' in result)) deps.pushAccountsUpdate();
    return result;
  });

  ipcMain.handle('mw:reorder-groups', (_evt, orderedIds: string[]) => {
    groupStore.reorder(orderedIds);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:remove-group', (_evt, id: string) => {
    groupStore.remove(id);
    accountStore.clearGroupReferences(id);
    deps.pushAccountsUpdate();
    return true;
  });

  ipcMain.handle('mw:set-account-group', (_evt, { id, groupId }: { id: string; groupId: string | null }) => {
    accountManager.setGroup(id, groupId);
    deps.pushAccountsUpdate();
    return true;
  });

  // --- Ícone customizado (Fase 6) ---

  ipcMain.handle('mw:pick-account-icon', async (_evt, id: string) => {
    const win = deps.getMainWindow();
    if (!win) return { error: 'Janela indisponível.' };
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Escolher ícone da instância',
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ICON_IMAGE_EXTENSIONS }],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };
    try {
      const filePath = filePaths[0];
      const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
      const mime = MIME_BY_EXT[ext];
      if (!mime) return { error: 'Formato de imagem não suportado.' };
      const buffer = fs.readFileSync(filePath);
      // Ícones pequenos guardados como data URL direto no accounts.json — não
      // há necessidade de um diretório de assets separado para isso.
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      accountManager.setIcon(id, dataUrl);
      deps.pushAccountsUpdate();
      return { dataUrl };
    } catch (err) {
      logger.error(`Falha ao ler ícone customizado: ${String(err)}`);
      return { error: 'Não foi possível ler a imagem selecionada.' };
    }
  });

  ipcMain.handle('mw:reset-account-icon', (_evt, id: string) => {
    accountManager.setIcon(id, undefined);
    deps.pushAccountsUpdate();
    return true;
  });

  // --- Analytics (Fase 9) ---

  // Fase 32: fonte ÚNICA do painel — a mesma contagem por mensagem que
  // alimenta "Atividade de hoje/ontem" (ver
  // chatActivityStore.buildAnalyticsSummary). Antes vinha de
  // analyticsStore.buildSummary, que conta pelo badge da conta inteira: os
  // dois blocos da mesma tela nunca fechavam entre si.
  ipcMain.handle('mw:get-analytics-summary', (_evt, range: AnalyticsRange) => {
    const accounts = accountManager.list().map((a) => ({ id: a.id, name: a.name, color: a.color }));
    const empty: AnalyticsSummary = {
      range,
      totalVolume: 0,
      leader: null,
      averagePerAccount: 0,
      byAccount: [],
      timeline: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    };
    return chatActivityStore?.buildAnalyticsSummary(range, accounts) ?? empty;
  });

  // Fase 28: relatório fixo de Hoje x Ontem por instância — não depende do
  // seletor de período geral do Analytics (ver chatActivityStore.ts).
  ipcMain.handle('mw:get-chat-activity-daily', () => {
    const accounts = accountManager.list().map((a) => ({ id: a.id, name: a.name, color: a.color }));
    const empty = { totalConversations: 0, totalMessages: 0, byAccount: [] };
    return chatActivityStore?.buildDailyReport(accounts) ?? { today: empty, yesterday: empty };
  });

  ipcMain.handle('mw:clear-analytics', () => {
    analyticsStore.clear();
    chatActivityStore?.clear();
    // Fase 33.2: zera também a memória DENTRO de cada instância (quais balões
    // já foram reportados). Sem isto o "limpar" seria parcial e a conversa
    // aberta no momento ficaria sem ser contada até trocar de conversa ou
    // recarregar — atrapalhando justamente o uso deste botão, que é começar
    // um teste do zero e acompanhar a contagem desde o começo.
    deps.resetMessageTracking();
    logger.info('Dados do Analytics limpos (histórico + rastreamento em memória das instâncias).');
    return true;
  });

  // --- Atualizações (Fase 27) ---

  ipcMain.handle('mw:get-update-state', () => deps.updateManager?.getState() ?? { phase: 'idle' });

  ipcMain.handle('mw:check-for-update', async () => {
    await deps.updateManager?.check();
    return true;
  });

  ipcMain.handle('mw:download-update', async () => {
    await deps.updateManager?.download();
    return true;
  });

  ipcMain.handle('mw:install-update', () => {
    deps.updateManager?.install();
    return true;
  });

  // --- "O que há de novo" (Fase 29) ---
  // Compara a versão instalada com a última que o usuário já confirmou ter
  // visto (persistida em settings.json, não em localStorage — ver
  // main/releaseNotes.ts para a justificativa) para decidir se o modal de
  // notas de versão deve abrir sozinho ao iniciar.

  ipcMain.handle('mw:get-whats-new', () =>
    resolveWhatsNew(app.getVersion(), settingsStore.getLastSeenVersion())
  );

  ipcMain.handle('mw:ack-whats-new', () => {
    settingsStore.setLastSeenVersion(app.getVersion());
    return true;
  });
}
