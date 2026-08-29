/**
 * Processo principal do Orbi Swit Stack (antigo "MultiWhats", depois
 * "Whats Control" — renomeado na Fase 7; a arquitetura de isolamento e
 * suspensão de sessões não mudou).
 *
 * Este arquivo só orquestra o ciclo de vida do app e conecta os módulos
 * especializados abaixo — cada um cuida de uma responsabilidade própria:
 *  - accountManager: contas, troca, suspensão manual/automática (LRU + idle);
 *  - viewManager: isolamento e ciclo de vida das WebContentsView do WhatsApp Web;
 *  - windowManager: janela principal, área de conteúdo, "fechar minimiza";
 *  - trayManager: bandeja do Windows;
 *  - shortcutManager: atalhos de teclado de navegação entre contas;
 *  - notificationManager: notificações nativas de novas mensagens;
 *  - ipcRouter: todos os comandos expostos à UI (window.multiwhats);
 *  - accountStore / settingsStore / logger: persistência e diagnóstico.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { AccountStore } from './accountStore';
import { GroupStore } from './groupStore';
import { AnalyticsStore } from './analyticsStore';
import { ChatActivityStore } from './chatActivityStore';
import { ViewManager } from './viewManager';
import { AccountManager } from './accountManager';
import { NotificationManager } from './notificationManager';
import { TrayManager } from './trayManager';
import { ShortcutManager } from './shortcutManager';
import { WindowManager } from './windowManager';
import { registerIpcHandlers } from './ipcRouter';
import { SettingsStore, resolvePerformancePreset } from './settingsStore';
import { UpdateManager } from './updateManager';
import { logger } from './logger';

const APP_NAME = 'Orbi Swit Stack';
const CREATOR_NAME = 'Vinicius Braga';
const IDLE_SWEEP_INTERVAL_MS = 60 * 1000;
// Fase 17: intervalo de leitura passiva da lista de conversas (ver
// viewManager.getChatEntries / chatActivityStore.ts). Não precisa ser tão
// frequente quanto o título da aba — uma conversa nova fica visível por
// tempo suficiente pra não perder nenhuma leitura com esse intervalo.
const CHAT_ACTIVITY_POLL_MS = 4000;
// Fase 29: intervalo entre verificações automáticas de atualização
// enquanto o app fica aberto, além da checagem única de sempre ao iniciar
// (ver updateManager.ts). 4 horas é frequente o bastante para quem deixa o
// app rodando na bandeja por dias sem reabrir, sem gerar tráfego de rede
// desnecessário nem incomodar com verificações constantes.
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');

let windowManager: WindowManager | null = null;
let viewManager: ViewManager | null = null;
let accountManager: AccountManager | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
let analyticsStore: AnalyticsStore | null = null;
let chatActivityStore: ChatActivityStore | null = null;
let updateManager: UpdateManager | null = null;

function pushAccountsUpdate(): void {
  const win = windowManager?.get();
  if (!win || !accountManager) return;
  const statuses = accountManager.buildStatuses();
  win.webContents.send('mw:accounts-changed', {
    accounts: accountManager.list(),
    statuses,
  });
  notificationManager?.notifyIfNewMessages(statuses);
  // Fase 9: além de decidir se notifica, guardamos um histórico local de
  // "mensagens novas por conta" para alimentar a aba Analytics (ver
  // analyticsStore.ts) — reaproveita o mesmo contador de não lidas, nada
  // de conteúdo de conversa é lido para isso.
  analyticsStore?.observe(statuses);
  trayManager?.updateMenu();
  windowManager?.updateUnreadBadge(accountManager.totalUnread());
}

function switchToAccount(accountId: string): void {
  accountManager?.switchTo(accountId);
  pushAccountsUpdate();
}

// Necessário no Windows para que as notificações nativas mostrem o nome e
// ícone corretos do app em vez de aparecerem como "Electron". Precisa bater
// com o appId do instalador (package.json -> build.appId).
app.setAppUserModelId('com.viniciusbraga.orbiswitstack');

// Tratamento de erros (Fase 5): erros não capturados não devem derrubar o
// app silenciosamente sem deixar rastro — ficam registrados no log de
// diagnóstico para o usuário poder relatar o problema com detalhes.
process.on('uncaughtException', (err) => {
  logger.error(`Exceção não tratada no processo principal: ${err?.stack ?? String(err)}`);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Promise rejeitada sem tratamento: ${String(reason)}`);
});

app.whenReady().then(() => {
  logger.info(`${APP_NAME} iniciado (versão ${app.getVersion()}).`);

  // Fase 8: sem contas fictícias na primeira instalação — o usuário começa
  // com a lista vazia e um empty state convidativo (ver App.tsx) em vez de
  // 20 instâncias mockadas "WhatsApp 01..20".
  const accountStore = new AccountStore();
  const settingsStore = new SettingsStore();
  const groupStore = new GroupStore();
  analyticsStore = new AnalyticsStore();
  chatActivityStore = new ChatActivityStore();

  windowManager = new WindowManager(
    APP_NAME,
    CREATOR_NAME,
    ICON_PATH,
    (bounds) => viewManager?.setContentBounds(bounds),
    (input) => shortcutManagerRef?.handleNavigationShortcut(input),
    () => {
      pushAccountsUpdate();
      const activeId = accountManager?.getActiveAccountId();
      if (activeId) switchToAccount(activeId);
    },
    () => settingsStore.getCloseBehavior(),
    () => {
      windowManager?.markQuitting();
      app.quit();
    },
    settingsStore.getSidebarWidth(),
    settingsStore.getSidebarPosition(),
    settingsStore.getIconSize()
  );
  const win = windowManager.create();

  viewManager = new ViewManager(win, accountStore);
  viewManager.setStatusChangeListener(() => pushAccountsUpdate());
  // Fase 30 (reescrita): mensagens novas chegam por EVENTO (MutationObserver
  // dentro da própria página, ver webviewPreload.ts), não por polling — o
  // processo principal só reage quando algo de fato acontece. Alimenta os
  // DOIS relatórios que dependem de mensagens recebidas em tempo real:
  // analyticsStore (Volume total/Instância líder, por CONTA) sempre;
  // chatActivityStore (Hoje x Ontem, por CONTATO) só para conversas
  // individuais — grupos nunca entram nesse segundo relatório.
  viewManager.setNewMessageListener((accountId, chatKey, isGroup, dataId, ts) => {
    analyticsStore?.recordNewMessage(accountId, dataId, ts);
    if (!isGroup && chatKey) {
      chatActivityStore?.recordLiveMessage(accountId, chatKey, dataId, ts);
    }
  });
  viewManager.setChatOpenStateListener((accountId, open, chatKey, isGroup) => {
    if (open) {
      analyticsStore?.markChatOpen(accountId);
      // Sempre limpa o que estava rastreado antes (troca de conversa, ou
      // virou um grupo) antes de decidir se a nova conversa entra no canal
      // de evento do chatActivityStore.
      chatActivityStore?.onChatClosed(accountId);
      if (!isGroup && chatKey) {
        chatActivityStore?.markChatOpen(accountId, chatKey);
      }
    } else {
      analyticsStore?.onAccountChatClosed(accountId);
      chatActivityStore?.onChatClosed(accountId);
    }
  });

  const initialPreset = resolvePerformancePreset(settingsStore.getPerformanceMode(), settingsStore.getCustomMaxLoadedAccounts());
  accountManager = new AccountManager(
    accountStore,
    viewManager,
    initialPreset.maxLoadedAccounts,
    initialPreset.idleSuspendMinutes
  );

  const shortcutManagerRef = new ShortcutManager(
    accountStore,
    () => accountManager!.getActiveAccountId(),
    (id) => switchToAccount(id),
    () => windowManager?.get()?.webContents.send('mw:open-command-palette')
  );
  viewManager.setShortcutHandler((input) => shortcutManagerRef.handleNavigationShortcut(input));

  trayManager = new TrayManager(
    APP_NAME,
    CREATOR_NAME,
    ICON_PATH,
    () => windowManager?.toggle(),
    () => windowManager?.show(),
    () => {
      windowManager?.markQuitting();
      app.quit();
    }
  );
  trayManager.create();

  // Fase 27: verificação de atualização via GitHub Releases (ver
  // updateManager.ts) — checagem silenciosa ao abrir, nunca baixa/instala
  // sozinha. O estado é empurrado pro renderer, que acende o indicador em
  // Configurações → Atualizações quando há algo novo.
  updateManager = new UpdateManager(
    (state) => {
      windowManager?.get()?.webContents.send('mw:update-status-changed', state);
    },
    // Fase 29: clique na notificação nativa de "atualização disponível" —
    // mostra a janela (pode estar minimizada na bandeja) e avisa o
    // renderer pra abrir Configurações já na aba Atualizações.
    () => {
      windowManager?.show();
      windowManager?.get()?.webContents.send('mw:open-settings-updates');
    }
  );
  updateManager.check();

  // Fase 29: além da checagem única ao abrir (acima), repete a verificação
  // periodicamente enquanto o app fica aberto — cobre quem deixa o Orbi
  // Swit Stack minimizado na bandeja por muito tempo sem reabrir. Continua
  // sendo só uma checagem silenciosa (nunca baixa/instala sozinha); o
  // resultado passa pelo mesmo `onStateChange` de sempre, que já empurra
  // pro renderer e aciona tanto o indicador em Configurações quanto o
  // aviso flutuante (ver UpdateToast.tsx no renderer).
  const updateCheckInterval = setInterval(() => {
    updateManager?.check();
  }, UPDATE_CHECK_INTERVAL_MS);
  app.on('before-quit', () => clearInterval(updateCheckInterval));

  notificationManager = new NotificationManager(
    APP_NAME,
    ICON_PATH,
    accountStore,
    () => windowManager?.get() ?? null,
    (accountId) => {
      windowManager?.show();
      switchToAccount(accountId);
    },
    () => settingsStore.getNotificationsEnabled()
  );

  registerIpcHandlers({
    appName: APP_NAME,
    creatorName: CREATOR_NAME,
    accountStore,
    accountManager,
    groupStore,
    settingsStore,
    analyticsStore,
    chatActivityStore,
    updateManager,
    getMainWindow: () => windowManager?.get() ?? null,
    switchToAccount,
    pushAccountsUpdate,
    updateTrayMenu: () => trayManager?.updateMenu(),
    forgetNotificationState: (id) => notificationManager?.forget(id),
    applyPerformanceMode: (mode) => {
      const preset = resolvePerformancePreset(mode, settingsStore.getCustomMaxLoadedAccounts());
      accountManager?.updateLimits(preset.maxLoadedAccounts, preset.idleSuspendMinutes);
      logger.info(`Modo de desempenho alterado para "${mode}" (máx. ${preset.maxLoadedAccounts} contas carregadas, ${preset.idleSuspendMinutes} min de ociosidade).`);
    },
    setOverlayActive: (active) => viewManager?.setOverlayActive(active),
    setSidebarWidth: (width) => windowManager?.setSidebarWidth(width),
    setSidebarPosition: (position) => windowManager?.setSidebarPosition(position),
    setIconSize: (size) => windowManager?.setIconSize(size),
  });

  app.on('render-process-gone', (_event, _wc, details) => {
    logger.error(`Uma página travou/encerrou inesperadamente (motivo: ${details.reason}).`);
  });

  const first = accountStore.list()[0];
  if (first) {
    // A troca de verdade acontece assim que a janela terminar de carregar
    // (ver callback onReady passado ao WindowManager acima).
    accountManager.switchTo(first.id);
  }

  setInterval(() => {
    accountManager?.sweepIdleAccounts();
    pushAccountsUpdate();
  }, IDLE_SWEEP_INTERVAL_MS);

  // Fase 17: alimenta o chatActivityStore com uma leitura passiva e
  // periódica da lista de conversas de cada conta WhatsApp carregada (ver
  // viewManager.getChatEntries). Roda no seu próprio intervalo, separado do
  // ciclo de "não lidas por conta" acima, porque lê o DOM da página em vez
  // de só o título — não precisa (nem deve) rodar a cada atualização de
  // status para não gerar overhead desnecessário.
  //
  // Fase 30 (reescrita): o canal de "conversa aberta" do analyticsStore NÃO
  // faz mais parte deste polling — ele é alimentado por evento, empurrado
  // pelo próprio webviewPreload.ts assim que uma mensagem chega (ver
  // viewManager.setNewMessageListener/setChatOpenStateListener, ligados
  // acima). Aqui só cuidamos de destravar o canal de badge (`analyticsStore
  // .onAccountChatClosed`) quando a conta é descarregada — a view sendo
  // destruída derruba o listener de evento sem avisar, então isso evita a
  // conta ficar presa num estado de "conversa aberta" para sempre.
  setInterval(() => {
    if (!accountManager || !viewManager || !chatActivityStore || !analyticsStore) return;
    const statuses = accountManager.buildStatuses();
    for (const status of statuses) {
      if (!status.loaded) {
        chatActivityStore.onAccountUnloaded(status.id);
        analyticsStore.onAccountChatClosed(status.id);
        continue;
      }
      viewManager
        .getChatEntries(status.id)
        .then((entries) => chatActivityStore?.observe(status.id, entries))
        .catch(() => {});
    }
  }, CHAT_ACTIVITY_POLL_MS);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager?.create();
    } else {
      windowManager?.show();
    }
  });
});

let appIsQuitting = false;

app.on('before-quit', () => {
  appIsQuitting = true;
  windowManager?.markQuitting();
  logger.info(`${APP_NAME} encerrado pelo usuário.`);
});

app.on('window-all-closed', () => {
  // No Windows/Linux o app continua rodando na bandeja mesmo com a janela
  // fechada (ver WindowManager.create -> win.on('close', ...)); este handler
  // só entra em ação se a janela for destruída de fato (ex.: durante o "Sair").
  if (process.platform !== 'darwin' && appIsQuitting) {
    app.quit();
  }
});
