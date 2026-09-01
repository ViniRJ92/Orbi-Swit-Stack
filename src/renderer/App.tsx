/**
 * Componente raiz do renderer. Orbi Swit Stack — Criado por Vinicius Braga
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { useTheme } from './useTheme';
import { Header } from './components/Header';
import { MessageToast } from './components/MessageToast';
import { Sidebar } from './components/Sidebar';
import { HelpModal } from './components/HelpModal';
import { CalendarPage } from './components/CalendarPage';
import { ReminderAlert } from './components/ReminderAlert';
import { SettingsModal } from './components/SettingsModal';
import { AddAccountWizard } from './components/AddAccountWizard';
import { AccountsDashboard } from './components/AccountsDashboard';
import { CommandPalette } from './components/CommandPalette';
import { WhatsNewModal } from './components/WhatsNewModal';

// Carregado sob demanda: a biblioteca de gráficos (recharts) só entra no
// bundle quando a aba Analytics é aberta pela primeira vez, em vez de pesar
// no carregamento inicial do app — mantém a troca entre telas leve, como
// pedido no requisito de desempenho da Fase 9.
const AnalyticsModal = lazy(() => import('./components/AnalyticsModal').then((m) => ({ default: m.AnalyticsModal })));

export function App() {
  const init = useAppStore((s) => s.init);
  const appInfo = useAppStore((s) => s.appInfo);
  const accounts = useAppStore((s) => s.accounts);
  const statuses = useAppStore((s) => s.statuses);
  const theme = useAppStore((s) => s.theme);
  const isResizingSidebar = useAppStore((s) => s.isResizingSidebar);
  const sidebarPosition = useAppStore((s) => s.sidebarPosition);
  const updateState = useAppStore((s) => s.updateState);
  const hasUpdate = updateState.phase === 'available' || updateState.phase === 'downloading' || updateState.phase === 'downloaded';
  const whatsNew = useAppStore((s) => s.whatsNew);
  const reloadAccount = useAppStore((s) => s.reloadAccount);

  const [helpOpen, setHelpOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Fase 29: quando a notificação nativa de atualização é clicada,
  // Configurações abre já na aba certa em vez da aba "Geral" padrão.
  const [settingsInitialTab, setSettingsInitialTab] = useState<'updates' | undefined>(undefined);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  // Só monta o modal (e força o carregamento sob demanda do chunk de
  // gráficos) na primeira vez que o usuário realmente abre a aba — mas, uma
  // vez montado, mantemos montado para não perder a animação de fechamento
  // do Modal (que depende de AnimatePresence reagindo à mudança de `open`).
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  useTheme(theme);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    return window.multiwhats.onOpenCommandPalette(() => setPaletteOpen(true));
  }, []);

  useEffect(() => {
    return window.multiwhats.onOpenSettingsUpdates(() => {
      setSettingsInitialTab('updates');
      setSettingsOpen(true);
    });
  }, []);

  // Barra de título enxuta: só o nome do app (o criador fica só na tela
  // "Sobre", que é o lugar certo para essa informação — Fase 8).
  useEffect(() => {
    if (appInfo) {
      document.title = appInfo.appName;
    }
  }, [appInfo]);

  // A WebContentsView do WhatsApp Web é uma camada nativa desenhada NA FRENTE
  // desta página HTML — inclusive na frente de qualquer modal aqui. Por isso,
  // sempre que algum modal em tela cheia estiver aberto, avisamos o processo
  // principal para esconder a view ativa (ver viewManager.ts) e evitar que
  // ela cubra o modal e roube os cliques destinados a ele.
  // Arrastar a borda da sidebar tem o mesmo problema: enquanto o mouse
  // passa por cima da área do WhatsApp, é a view nativa (não esta página)
  // que recebe os eventos de mousemove/mouseup, então escondemos a view
  // ativa durante o redimensionamento também.
  const anyModalOpen =
    helpOpen ||
    calendarOpen ||
    settingsOpen ||
    addAccountOpen ||
    dashboardOpen ||
    paletteOpen ||
    analyticsOpen ||
    isResizingSidebar ||
    whatsNew !== null;
  useEffect(() => {
    window.multiwhats.setOverlayActive(anyModalOpen);
  }, [anyModalOpen]);

  const hasActive = accounts.some((a) => statuses.get(a.id)?.isActive);
  // Fase 31: instância em exibição — alvo do botão de recarregar e do F5.
  const activeAccountId = accounts.find((a) => statuses.get(a.id)?.isActive)?.id ?? null;

  const header = (
    <Header
      onOpenHelp={() => setHelpOpen(true)}
      onOpenCalendar={() => setCalendarOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenDashboard={() => setDashboardOpen(true)}
      onOpenPalette={() => setPaletteOpen(true)}
      onOpenAnalytics={() => {
        setAnalyticsLoaded(true);
        setAnalyticsOpen(true);
      }}
      onReloadActive={() => {
        if (activeAccountId) reloadAccount(activeAccountId);
      }}
      canReload={activeAccountId !== null}
      hasUpdate={hasUpdate}
    />
  );

  const sidebar = <Sidebar position={sidebarPosition} onAdd={() => setAddAccountOpen(true)} />;

  // A WebContentsView do WhatsApp Web é posicionada pelo processo principal
  // exatamente sobre esta área (ver windowManager.ts, que calcula os bounds
  // de forma diferente conforme `sidebarPosition` — ver getContentBounds) —
  // este <main> só reserva o espaço e mostra o estado vazio.
  // Fase 32: Analytics virou PÁGINA — ocupa a área de conteúdo inteira no
  // lugar da instância, em vez da antiga janela flutuante. A WebContentsView
  // por baixo continua sendo escondida pelo mesmo `setOverlayActive`
  // (analyticsOpen já entra em `anyModalOpen` acima).
  const analyticsPage = analyticsLoaded ? (
    <Suspense fallback={null}>
      {/* Fase 50: com algo aberto por cima (Ajuda, Configurações, contas...),
          o Esc deve fechar só o que está na frente, não a página junto. */}
      <AnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        escEnabled={!helpOpen && !settingsOpen && !dashboardOpen && !addAccountOpen && !paletteOpen && whatsNew === null}
      />
    </Suspense>
  ) : null;

  // Fase 54: a Agenda é PÁGINA, igual ao Analytics — ocupa a área de
  // conteúdo no lugar da instância. Se as duas estiverem abertas, o Analytics
  // tem precedência só porque foi aberto por último na ordem de checagem.
  const main = calendarOpen ? (
    <CalendarPage open={calendarOpen} onClose={() => setCalendarOpen(false)} />
  ) : analyticsOpen ? (
    analyticsPage
  ) : (
    <main id="content-area" className="relative flex-1 bg-content transition-colors">
      {!hasActive && accounts.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-text-faint">
            <MessageCircle size={28} strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-sm font-medium text-text">Nenhuma conta ainda</p>
            <p className="mt-1 text-xs text-text-dim">Conecte o WhatsApp, Gmail ou outro serviço para começar.</p>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-lg accent-gradient px-4 py-2.5 text-sm font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90"
            onClick={() => setAddAccountOpen(true)}
          >
            <Plus size={15} />
            Adicionar primeira conta
          </button>
        </div>
      )}
      {!hasActive && accounts.length > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-text-faint">
            <MessageCircle size={28} strokeWidth={1.6} />
          </div>
          <p className="text-sm text-text-dim">Selecione uma conta para abrir.</p>
        </div>
      )}
    </main>
  );

  const modals = (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsInitialTab(undefined);
        }}
        initialTab={settingsInitialTab}
      />
      <WhatsNewModal />
      <AddAccountWizard open={addAccountOpen} onClose={() => setAddAccountOpen(false)} />
      <AccountsDashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* Fase 39: aviso de mensagem nova desenhado pelo app (janela visível). */}
      <MessageToast />
      {/* Fase 54: alerta de lembrete da Agenda — fica sempre montado para
          poder aparecer com qualquer tela em uso. */}
      <ReminderAlert />
    </>
  );

  // Fase 21/58: a posição da barra de contas muda qual eixo organiza o
  // layout raiz. São dois formatos, cada um com duas pontas:
  //
  // Horizontais ("top"/"bottom"): o header fica no topo ocupando a largura
  // inteira, e a barra de contas vira uma faixa de altura fixa acima ou
  // abaixo do conteúdo.
  //
  // Verticais ("left"/"right"): a barra ocupa a ALTURA TOTAL numa das
  // laterais, e o header passa a ocupar só a coluna ao lado dela, não a
  // largura inteira do app.
  //
  // getContentBounds (windowManager.ts) calcula a área da instância com
  // exatamente esta mesma leitura — os dois precisam continuar casados.
  if (sidebarPosition === 'top' || sidebarPosition === 'bottom') {
    return (
      <div className="flex h-screen flex-col bg-app text-text">
        {header}
        {sidebarPosition === 'top' && sidebar}
        <div className="flex min-h-0 flex-1">{main}</div>
        {sidebarPosition === 'bottom' && sidebar}
        {modals}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-app text-text">
      {sidebarPosition === 'left' && sidebar}
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <div className="flex min-h-0 flex-1">{main}</div>
      </div>
      {sidebarPosition === 'right' && sidebar}
      {modals}
    </div>
  );
}
