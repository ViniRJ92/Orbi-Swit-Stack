# Orbi Swit Stack (antigo "Whats Control", antes disso "MultiWhats") — Status do projeto

Criado por: **Vinicius Braga** (identidade fixa — Sobre, rodapé removido na Fase 8, package.json, notificações, bandeja, instalador; era "Vini7" até a Fase 7).

## Objetivo geral
App desktop Windows (Electron + TypeScript) tipo Ferdium/Rambox: cada
"instância" é uma sessão 100% isolada e persistente (cookies/localStorage/
IndexedDB/cache próprios), hospedando a interface oficial de um serviço web
(WhatsApp Web, Instagram, Gmail, TikTok, Facebook, Messenger, Google
Calendar, Google Earth, navegador livre ou uma URL customizada — grade
expandida na Fase 16, generalizado desde a Fase 6, antes era só WhatsApp).
Sem API não oficial, sem bot, sem automação, sem engenharia reversa — só a
interface oficial de cada site em sessões isoladas via Electron
`session.fromPartition`.

Desenvolvimento em fases, validando cada uma antes de avançar (regra do
próprio usuário — nunca avançar sem confirmação dele).

## Histórico resumido (Fases 1-5, concluídas em 2026-08-25/26)
2 contas → 5 → 20, isolamento por partition, QR Code, persistência,
suspensão automática/manual, bandeja do Windows, "Iniciar com o Windows",
atalhos de teclado, renomear "MultiWhats" → "Whats Control" (Fase 4),
instalador NSIS, tema claro/escuro, animações discretas, backup/restauração
de metadados, tratamento de erro de carregamento com retry, log de
diagnóstico em arquivo, busca/favoritos/wizard de adicionar conta, modos de
desempenho configuráveis, notificações, diagnóstico visual, comportamento
ao fechar configurável, confirmação antes de remover, tela de gerenciamento
de contas em grade, reordenar por arrastar e soltar, paleta de comando
Ctrl+K, selo de não lidas na barra de tarefas do Windows. Correção de
empacotamento (instalador caiu de ~495 MB para ~78 MB removendo
`node_modules` do pacote e separando a pasta de saída do electron-builder
da saída do tsc/Vite).

### Bug crítico encontrado e corrigido após a Fase 5 (2026-08-26)
Usuário reportou que **nenhuma funcionalidade funcionava** (Configurações,
Adicionar conta, etc. pareciam não abrir) na build 0.10.0/0.10.1-fase5.
Causa raiz: uma `WebContentsView` do Electron é sempre desenhada numa
camada nativa **na frente** da página HTML da janela — não existe jeito de
colocá-la "atrás". Corrigido com um estado `overlayActive` em `ViewManager`
(`viewManager.ts`), avisado via IPC (`mw:set-overlay-active`) sempre que
qualquer modal abre/fecha no renderer (agregado em `anyModalOpen` no
`App.tsx`). Corrigido também um bug menor real: o Framer Motion reserva
`onDragStart`/`onDrag`/`onDragEnd` em componentes `motion.*` para o próprio
sistema de gestos, então os handlers nativos de arrastar-e-soltar da Fase 5
nunca disparavam de verdade. Publicado como `WhatsControl-Setup-0.10.2-fase5.exe`
— **o usuário nunca confirmou explicitamente que essa build resolveu o
problema** (seguiu direto para as Fases 6, 7 e 8).

## Fase 6 (multi-plataforma, sidebar redimensionável, ícones, grupos) — CONCLUÍDA em 2026-08-26
1. **Sidebar redimensionável**: alça de arrastar na borda direita, livre
   entre 200-450px, persistida em `settingsStore.ts` (`sidebarWidth`).
2. **Modal de seleção de serviço multi-plataforma**: WhatsApp Web, Gmail,
   Navegador livre, Google Earth ou URL customizada, cada um com sua
   allowlist de navegação e URL padrão (`main/services.ts` — `SERVICES`).
3. **Ícones por serviço + ícone customizado**: ícone estilizado por serviço
   por padrão, ou imagem do usuário via `dialog.showOpenDialog` (data URL
   em `accounts.json`).
4. **Grupos/pastas de instâncias**: `GroupStore` (`groups.json`) com CRUD.
5. Paleta/tipografia/bordas do dark mode preservadas.

**Ressalva conhecida, ainda não testada com o usuário**: o Google bloqueia
logins OAuth dentro de webviews incorporadas — Gmail/Google Earth podem não
completar o login dentro das instâncias do app. Restrição da própria
plataforma Google, não corrigível no nosso código.

## Fase 7 (rebranding completo: "Whats Control" → "Orbi Swit Stack") — CONCLUÍDA em 2026-08-26
1. Renomeação completa (nome do app, `package.json`, `appId`
   `com.viniciusbraga.orbiswitstack`, título da janela, logs, identificador
   de backup com retrocompatibilidade para `'whats-control'`, interface TS
   `OrbiSwitStackApi`). "Vini7" → "Vinicius Braga" em todo lugar. Bridge do
   preload (`window.multiwhats`) mantida de propósito — detalhe interno.
2. Nova tela "Sobre" com a narrativa completa do produto (conceito "Orbi" =
   órbita/ecossistema + "SwitStack" = Switch + Stack).
3. Nova identidade visual (`OrbiLogo.tsx` + `assets/icon.png`/`icon.ico`,
   gerados via `scripts/gen_icon.py` com Pillow): squircle grafite neutro
   (gradiente `#1B2229`→`#0D1013`), duas esferas em órbita (branca = hub,
   azul-violeta `#6C8CF5→#8B6FF5` = conta), contorno escuro fino para
   contraste em tamanhos minúsculos (bandeja/favicon).

**Ressalva importante, ainda não confirmada com o usuário**: como o `appId`
mudou, o Electron abre uma pasta de dados NOVA e vazia
(`app.getPath('userData')` deriva do nome do app) — instalar a 0.12.0+ por
cima da versão antiga não migra contas/sessões automaticamente. Passei os
comandos PowerShell de migração manual ao usuário (`$env:APPDATA\whats-control`
→ `$env:APPDATA\orbi-swit-stack`), mas não confirmou se migrou.

## Fase 8 (limpeza visual, first-run limpo, Configurações em abas) — CONCLUÍDA em 2026-08-26
Pedido do usuário (papel "desenvolvedor full-stack sênior"), 5 itens:

1. **Limpeza visual solicitada à parte** (título/cabeçalho/rodapé/Sobre):
   barra de título agora só `Orbi Swit Stack` (sem `· Vinicius Braga`,
   `App.tsx`); badge "Vinicius Braga" removido do cabeçalho (`Header.tsx`
   — sobram só busca, Gerenciar contas, Configurações, Sobre); rodapé da
   sidebar trocou o texto "Orbi Swit Stack, criado por..." por um indicador
   discreto `v{versão}` (`Sidebar.tsx`); tela "Sobre" mantida como o único
   lugar com nome do criador + narrativa completa (inalterada).
2. **Limpeza da sidebar**: `AccountItem.tsx` perdeu os botões de Renomear
   (lápis), Suspender (pausa) e Excluir (X) que apareciam no hover — sobra
   só a estrela de favorito (a única ação que afeta a própria ordenação da
   sidebar). O prop `onRename` foi removido do componente e de `Sidebar.tsx`;
   `RenameModal.tsx` ficou órfão e foi deletado. **Decisão de escopo**: a
   tela "Gerenciar contas" (`AccountsDashboard.tsx`, grade acessada pelo
   cabeçalho) manteve suas próprias ações (suspender/remover/favoritar) —
   interpretei "centralização administrativa" como sobre a *sidebar*
   especificamente (é o título da seção 1 do pedido), não como uma proibição
   de qualquer ação fora do modal de Configurações; o Dashboard é uma tela
   de gerenciamento dedicada e legítima, não "poluição visual" da sidebar.
   Se o usuário quiser o Dashboard também só leitura, é um pedido à parte.
3. **First-run limpo**: `AccountStore.ensureDefaults()` foi DELETADO (não
   apenas desativado) — `main.ts` não cria mais nenhuma conta fictícia no
   primeiro boot. **Decisão de escopo**: implementei a opção "Empty State"
   do pedido (não a de "1 instância padrão WhatsApp Principal") — a sidebar
   e a área de conteúdo mostram um estado vazio convidativo com botão
   centralizado "+ Adicionar primeira conta" quando não há nenhuma
   instância (`Sidebar.tsx`, `App.tsx`), por ser mais limpo que criar uma
   conta mock que o usuário provavelmente vai renomear/trocar de serviço de
   qualquer forma.
4. **Configurações em abas** (`SettingsModal.tsx`, reescrito do zero): rail
   interno fixo à esquerda com 4 abas — Geral & Aparência (Iniciar com
   Windows, tema, Ao fechar, Atalhos, Segurança/confirmar remoção),
   Instâncias & Agrupamentos, Desempenho & Notificações, Backup &
   Diagnóstico — substituindo o scroll único vertical anterior. `Modal.tsx`
   ganhou um `size="lg"` (860×620px, dentro do teto `max-h-[85vh]` de
   sempre) e um `contentClassName` para o chamador assumir o próprio layout
   de rolagem (nesse caso: rail fixo que não rola + painel de conteúdo com
   `overflow-y-auto` isolado) — elimina o scroll global do modal, só o
   painel da aba ativa rola quando excede a altura.
5. **Aba Instâncias & Agrupamentos como central administrativa única**:
   novo componente `InstanceCard` (substituído por `InstanceRow`/tabela na
   Fase 16, ver abaixo) — cada conta é um card com avatar, campo de nome
   editável inline (commit no blur/Enter via `renameAccount`), seletor de
   agrupamento, botão de trocar ícone e botão discreto de excluir
   (`Trash2`). Terminologia "Grupo" → "Agrupamento"/"Agrupamentos" em toda
   a interface (sidebar, Dashboard, Configurações); os identificadores
   internos (`GroupStore`, `groupId`, canais IPC `mw:*-group`) foram mantidos
   — **decisão de escopo deliberada**: renomear esses identificadores
   internos tocaria main+preload+renderer sem nenhum benefício visível ao
   usuário, só risco de regressão; o pedido de "padronizar em todo o
   código" foi interpretado como a terminologia visível, não os nomes de
   função/canal internos.
6. **Validação e tempo real de agrupamentos**: `GroupStore.create()`/
   `rename()` agora rejeitam nome vazio ou duplicado (case-insensitive,
   `validateName()`), retornando `{ error }` em vez de silenciosamente
   criar "Novo grupo" ou permitir duplicata — propagado pela IPC
   (`mw:create-group`/`mw:rename-group`) e pela store do renderer até a UI
   (mensagem de erro inline abaixo do campo). Criar/renomear/excluir um
   agrupamento já atualiza `useAppStore.groups` imediatamente (recarrega via
   `loadGroups()` após cada operação bem-sucedida) — os seletores de
   agrupamento em cada instância refletem na hora, sem fechar o modal.
   Excluir um agrupamento já desvinculava as contas (`clearGroupReferences`,
   desde a Fase 6) — mantido, só a label mudou para "Sem agrupamento".

## Fase 9 (Analytics — coleta de métricas + painel de gráficos) — CONCLUÍDA em 2026-08-26
Pedido do usuário: painel de Analytics mostrando movimento (mensagens) por
conta, sem nunca ler conteúdo de conversa.

1. **Coleta discreta de dados** (`main/analyticsStore.ts`, classe
   `AnalyticsStore`, novo arquivo `analytics.json` em
   `app.getPath('userData')`, mesmo padrão atômico tmp+rename do
   `AccountStore`): reaproveita o contador de não lidas que já existia
   (`viewManager.getUnreadCount`, heurística de regex no título da página —
   nada novo foi lido do WhatsApp/Gmail para isso). Método `observe(statuses)`
   é chamado a cada `pushAccountsUpdate()` em `main.ts` (mesmo ponto onde o
   `NotificationManager` decide se dispara notificação nativa); compara o
   não-lidas atual de cada conta com a última observação e só grava um
   evento `{ timestamp, accountId, delta }` quando ele **sobe** — ou seja, a
   frequência de escrita em disco acompanha o volume real de mensagens, não
   o intervalo de polling (60s, `IDLE_SWEEP_INTERVAL_MS`). Retenção de 30
   dias + teto de 20.000 eventos, podados a cada gravação — evita o arquivo
   crescer sem limite com o uso contínuo do app. `forget(accountId)` é
   chamado ao remover uma conta (`ipcRouter.ts`, handler `mw:remove-account`),
   para não gerar um pico falso se um id novo reaproveitar o histórico.
2. **Agregação no processo principal**: `AnalyticsStore.buildSummary(period,
   accounts)` calcula tudo antes de cruzar o IPC — nenhum evento bruto vai
   pro renderer, só um resumo pequeno (`AnalyticsSummary`: volume total,
   instância líder, média por conta, ranking por conta, série de 24 horas
   agregada por hora-do-dia para achar picos). Novo handler IPC
   `mw:get-analytics-summary` (`ipcRouter.ts`), exposto no preload como
   `window.multiwhats.getAnalyticsSummary(period)`. Tipos compartilhados
   `AnalyticsPeriod`/`AnalyticsSummary`/`AnalyticsAccountTotal` espelhados
   em `main/types.ts` e `renderer/types.ts`, seguindo o padrão já usado
   pelos outros tipos do app. **(Substituído na Fase 11 — ver abaixo — por
   um intervalo explícito `AnalyticsRange`.)**
3. **Interface** (`renderer/components/AnalyticsModal.tsx`, novo): modal
   `size="lg"` no mesmo estilo escuro/grafite do resto do app (tokens CSS
   existentes, sem cor nova hardcoded) — seletor de período (Hoje/Últimos 7
   dias/Últimos 30 dias), 3 cards de KPI (Volume Total, Instância Líder,
   Média por Conta) e dois gráficos lado a lado: barra horizontal (ranking
   de movimento por conta) e linha (curva de 24h para identificar horário
   de pico). Biblioteca escolhida: **Recharts v3** (`npm install recharts`,
   MIT, sem custo — compatível com a restrição de "nada de dinheiro real").
   Atualização automática a cada 20s enquanto o painel está aberto.
   Acessado por um novo botão (ícone `BarChart3`, só ícone, sem texto — para
   não conflitar com a limpeza minimalista do cabeçalho da Fase 8) no
   `Header.tsx`, entre a busca e "Gerenciar contas".
4. **Desempenho** (requisito explícito do pedido — "não travar ao trocar de
   tela"): `AnalyticsModal` é carregado com `React.lazy()` em `App.tsx` — o
   chunk do Recharts (~378 KB) só entra no bundle na primeira vez que o
   usuário abre o painel, em vez de pesar no carregamento inicial do app.
   Confirmado no build: o bundle principal caiu de 763 KB para 386 KB depois
   da divisão. O componente continua montado (não desmonta ao fechar) depois
   da primeira abertura, só para preservar a animação de fechamento do
   `Modal.tsx` (que depende do `AnimatePresence` reagir à mudança de `open`).
5. **Correção pós-entrega (0.14.1-fase9)**: usuário perguntou como a coleta
   funciona quando uma conta está suspensa — expôs um bug real de dupla
   contagem. `accountManager.buildStatuses()` força `unreadCount: 0` pra
   contas suspensas/descarregadas (não tem `WebContentsView` carregada pra
   ler o título da página). O `observe()` original tratava esse 0 como uma
   observação real, então ao reativar a conta o salto do 0 forçado até o
   valor de verdade inflava a métrica (contava de novo mensagens que já
   existiam antes da suspensão). Corrigido: `observe()` agora ignora
   inteiramente uma conta enquanto `status.loaded === false` — não toca em
   `lastSeenUnread` pra ela — então a última contagem real fica guardada e a
   comparação retoma dali quando a conta volta a carregar, sem salto falso.
   **(Substituído por versões mais robustas nas Fases 13 e 15 — ver abaixo.)**

## Fase 10 (QR Code só no WhatsApp, ícones próprios, limite 30, agrupamentos de verdade) — CONCLUÍDA em 2026-08-26
Pedido do usuário, 10 itens, executados com a skill "superpowers" (revisão de
arquitetura antes de mexer no código, não só ajuste superficial de UI):

1. **QR Code exclusivo do WhatsApp — corrigido na origem, não só escondido
   na UI**: a causa raiz era `webviewPreload.ts` — o mesmo script era
   injetado em TODAS as instâncias (WhatsApp, Gmail, Earth, navegador livre,
   custom) e só sabia detectar o DOM do WhatsApp Web (`#pane-side`/canvas de
   QR); para qualquer outro serviço esses seletores nunca existem, então
   `isOnline` ficava `false` pra sempre e a UI mostrava "Aguardando QR Code"
   permanentemente, mesmo a página carregando normal. Corrigido com
   `additionalArguments: ['--mw-service=<id>']` no `webPreferences` da
   `WebContentsView` (`viewManager.ts`, `createView`) — o preload lê isso via
   `process.argv` e só roda a detecção de QR Code/login quando o serviço é
   `whatsapp`; pros demais, reporta "pronta" assim que a página termina de
   carregar (`startOtherService()`), sem inventar um DOM de terceiro que não
   existe (evitaria engenharia reversa de sites que não são o WhatsApp).
   Texto de status também deixou de ser hardcoded em 3 lugares diferentes
   (`AccountItem.tsx`, `AccountsDashboard.tsx`, `CommandPalette.tsx`) —
   agora usam um helper único, `renderer/accountStatusLabel.ts`, que só
   mostra "Aguardando QR Code" pra `service === 'whatsapp'`; os demais
   mostram "Carregando..." até a página terminar de carregar. O texto de
   confirmação de remoção de conta (`useAppStore.ts`) também parou de
   mencionar "escanear o QR Code" pra contas não-WhatsApp.
2. **Ícones próprios por serviço** (`renderer/components/ServiceIcon.tsx`,
   reescrito): Gmail, Google Earth e navegador livre ganharam glifos SVG
   autorais desenhados do zero (envelope com corte diagonal característico
   pro Gmail, globo com meridianos + satélite pro Earth, janela com barra de
   abas/endereço pro navegador) em vez dos ícones genéricos de biblioteca
   anteriores (envelope/globo/bússola do lucide, que não comunicavam qual
   app era qual). **Decisão consciente, reafirmada na Fase 16**: não
   reproduzem os logos vetoriais oficiais de terceiros pixel a pixel —
   mantém a mesma política de não usar marcas registradas de terceiros, só
   que agora com formas bem mais reconhecíveis e distintas entre si do que
   antes. Cores de marca também diferenciadas: Earth e navegador livre
   usavam o MESMO azul (`#4285F4`) antes, tornando os dois quase idênticos
   na sidebar mesmo com ícones diferentes — agora Earth é verde-azulado
   (`#1B9C6E`, evoca globo/continentes) e navegador livre é índigo
   (`#5C6BC0`), em `main/services.ts` (espelhado em `renderer/types.ts`).
3. **Limite de 20 → 30 instâncias**: mudança única de fonte da verdade
   (`MAX_ACCOUNTS` em `main/accountManager.ts`) — toda validação de criação
   e mensagem de erro (`Limite de X contas atingido.`) já derivava dessa
   constante, então propagou sozinho. O que estava hardcoded e precisou de
   correção manual: os badges `{accounts.length}/20` em `Sidebar.tsx` e
   `AccountsDashboard.tsx`, que agora usam `appInfo.maxAccounts` — um novo
   campo exposto pelo processo principal via `mw:get-app-info` (não só um
   número fixo na UI, pra nunca mais duas telas divergirem desse valor).
   Confirmado: não existe persistência em `localStorage` neste app (tudo é
   JSON no `userData` via IPC — `accounts.json`, `groups.json`, etc.), então
   esse ponto do pedido já não se aplicava. **(O badge da sidebar foi
   removido na Fase 16 — ver abaixo — mas `appInfo.maxAccounts` continua
   sendo a fonte da verdade usada pelo badge que restou no Dashboard.)**
4-8. **Agrupamentos como pastas de verdade** (`Sidebar.tsx`, reescrito):
   - Agrupamentos agora são reordenáveis por arrastar o cabeçalho de uma
     pasta sobre outra — `GroupStore.reorder()` já existia no processo
     principal desde a Fase 8 mas nunca tinha sido exposto; agora tem IPC
     (`mw:reorder-groups`), preload, tipos e ação `reorderGroups` na store
     do renderer, com o mesmo padrão dos demais (`reorderAccounts`).
   - Instâncias podem ser arrastadas para dentro de outro agrupamento
     (soltar sobre o cabeçalho da pasta de destino), pra fora de um
     agrupamento (soltar na área sem agrupamento), ou reordenadas dentro da
     lista atual — tudo na mesma interação de arrastar-e-soltar já existente,
     estendida pra recalcular o `groupId` quando o destino pertence a outra
     pasta, além de reordenar.
   - **Não existe mais uma pasta/aba "Sem agrupamento"** na sidebar: essas
     instâncias aparecem como uma lista simples (posição definida na Fase
     12, ver abaixo), sem cabeçalho — só uma linha divisória sutil. (O
     rótulo "Sem agrupamento" continua existindo como OPÇÃO em seletores
     legítimos — o dropdown de agrupamento de uma conta em Configurações, o
     chip de filtro "ver só as sem agrupamento" no Dashboard, e a opção de
     mudança de agrupamento em massa da Fase 16 — esses não são a pasta
     fantasma que o pedido queria eliminar, são formas normais de dizer
     "nenhum" numa lista de opções.)
   - Indicação visual durante o arraste: mesmo padrão já usado desde a
     Fase 5 (anel de destaque no alvo do drop), agora também no cabeçalho
     das pastas.
   - Tudo persistido nos mesmos arquivos JSON de sempre (`groups.json` pra
     ordem das pastas, `accounts.json` pra `groupId`/ordem das contas) —
     sobrevive a fechar/reabrir o app normalmente.
   - **Decisão de escopo original (parcialmente revertida na Fase 12, ver
     abaixo)**: o pedido original também descrevia arrastar uma instância
     sem agrupamento pra uma posição ACIMA das pastas. Na época, isso ficou
     de fora por exigir uma única escala de ordenação compartilhada entre
     `GroupStore` (ordem de pastas) e `AccountStore` (ordem de contas) e um
     modelo de árvore genuíno na sidebar. A Fase 12 entregou a parte
     "posição fixa no topo" desse pedido sem precisar dessa unificação (ver
     Fase 12); só a interposição arbitrária entre pastas específicas
     continua fora de escopo.
9. **Revisão final** (pedida explicitamente no item 9 do usuário): busca
   confirmada, sem sobras, de `20`/`MAX_ACCOUNTS`, `QR Code`/`Aguardando`,
   `Sem agrupamento` e `localStorage` em todo `src/main` e `src/renderer` —
   só sobraram usos legítimos (tamanhos de ícone, delays de UI, comentários
   históricos precisos, e os dois seletores "sem agrupamento" explicados
   acima).
10. Build compilada limpa (`tsc` main + renderer, `vite build`) e empacotada
    (`electron-builder --win`) sem erros.

## Fase 11 (versão limpa sem nomenclatura interna + upgrade Analytics) — CONCLUÍDA em 2026-08-26
Pedido do usuário em duas partes, na mesma mensagem.

**Parte 1 — remover identificação de fase/etapa de desenvolvimento da
experiência do usuário.** O rodapé mostrava `v0.15.0-fase10`; o usuário
pediu uma versão "limpa, profissional e definitiva" e explicitamente pediu
para remover a *lógica* que gera esses sufixos, não só escondê-los.
Investigação confirmou que **todo** texto de versão visível ao usuário
(rodapé da sidebar, modal Sobre, aba Diagnóstico de Configurações, log, e o
nome do arquivo do instalador via `artifactName: "OrbiSwitStack-Setup-
${version}.exe"`) deriva de uma única fonte: `app.getVersion()`, que lê o
campo `version` de `package.json`. Não havia nenhuma lógica separada
concatenando `-fase`/`-beta`/`-dev` — o sufixo era digitado à mão no próprio
`package.json` a cada entrega. Correção: um único edit, `"version":
"0.15.0-fase10"` → `"version": "0.16.0"` — propagou sozinho para todos os
pontos da UI e para o nome do instalador (confirmado: o `.exe` gerado nesta
rodada já saiu como `OrbiSwitStack-Setup-0.16.0.exe`, sem sufixo). Busca em
todo `src/main` e `src/renderer` por `fase|etapa|beta|dev` confirmou que as
únicas ocorrências restantes são comentários internos no código-fonte
(nunca renderizados na UI) — a única string visível ao usuário que contém
"etapa" é o contador de passos do assistente de adicionar conta
(`Adicionar conta · etapa ${n}/3` em `AddAccountWizard.tsx`), que **não** é
uma referência a fase de desenvolvimento e foi mantida intacta por pedido
explícito de não alterar funcionalidade.

**Parte 2 — upgrade de UI/UX da aba Analytics.** Pedido detalhado (filtros
de período avançados, alertas do sistema, cards de saúde de conexão,
gráficos de proporção enviado/recebido e status de entrega, mantendo o
visual dark/esmeralda). Como o item de "Recebidas vs. Enviadas" e "Status de
Entrega" exigiria coletar dados que o app não coleta hoje (contagem de
mensagens enviadas e status de tick/entrega por mensagem), o que só seria
possível com uma inspeção de DOM/mensagens bem mais profunda do que a atual
(contador de não lidas do título da página) — esbarrando na própria
restrição do projeto contra scraping/engenharia reversa adicional — foi
perguntado ao usuário como proceder. **Resposta do usuário: "Manter só o
que já é seguro (recomendado)"** — ou seja, sem nenhuma coleta nova de DOM;
os dois gráficos de enviado/entrega ficaram de fora desta rodada, e todo o
resto do pedido foi implementado usando somente dados que o app já produz.

1. **Contrato de período generalizado para um intervalo explícito**: o
   antigo `AnalyticsPeriod` ('today'|'7d'|'30d') como parâmetro de
   `buildSummary` foi substituído por `AnalyticsRange { startTs, endTs }`
   (novo tipo em `main/types.ts`, espelhado em `renderer/types.ts`) — o
   `AnalyticsSummary.period` virou `AnalyticsSummary.range`. Isso permite
   tanto os atalhos rápidos quanto um intervalo customizado e o cálculo do
   "período anterior" (comparação) usarem exatamente a mesma agregação em
   `AnalyticsStore.buildSummary()`, só variando o range recebido. O handler
   IPC `mw:get-analytics-summary`, o preload e `OrbiSwitStackApi` foram
   atualizados para receber `AnalyticsRange` em vez do enum.
2. **Cálculo de intervalos no renderer** (`renderer/analyticsRange.ts`,
   novo arquivo): `quickRange('today'|'7d'|'30d')`, `startOfDateInput`/
   `endOfDateInput` (para os `<input type="date">` do seletor customizado,
   sem nenhuma biblioteca nova), `dateInputValue` (preenchimento padrão dos
   inputs) e `previousRange` (período imediatamente anterior, de mesma
   duração, usado na comparação). Documentado explicitamente por que o
   range é recalculado a cada chamada de `load()` dentro do
   `AnalyticsModal` em vez de memoizado só a partir da seleção da UI: se
   fosse memoizado, o `endTs` de "Hoje/7 dias/30 dias" (que depende de
   `Date.now()`) congelaria no instante do clique, e a atualização
   automática de 20s do painel pararia de trazer dado novo para esses três
   atalhos.
3. **`AnalyticsModal.tsx` reescrito** com:
   - Barra de filtros: os três atalhos de sempre + um quarto botão
     "Personalizado" que revela dois `<input type="date">` (início/fim); e
     um toggle "Comparar com período anterior" que, quando ligado, busca um
     segundo resumo (`previousRange`) e sobrepõe uma linha pontilhada
     (`strokeDasharray`) no gráfico "Horários de pico", além de mostrar o
     delta (absoluto + %) no card de KPI "Volume total".
   - Banners de alerta em tempo real (sub-topo): não é uma nova fonte de
     dado — usa o `Map<string, AccountStatus>` que `useAppStore` já recebe
     via `onAccountsChanged`, comparando o status anterior com o atual a
     cada atualização para detectar quedas de sessão (`isOnline: true →
     false`) e falhas de carregamento (`loadError: false → true`); cada
     banner tem um botão "Reconectar" (chama `reloadAccount` +
     `switchAccount` da store) e um X pra dispensar.
   - Cards de saúde da conexão (topo do painel): contagem de instâncias
     Online (verde)/Offline (vermelho)/Reconectando (amarelo), derivada
     puramente no cliente a partir de `accounts`/`statuses` já existentes —
     nenhum IPC novo.
   - Visual dark/esmeralda e os 3 KPIs + 2 gráficos originais preservados
     como base.
4. **Explicitamente fora do escopo desta rodada** (por decisão do usuário):
   gráfico de barras "Recebidas vs. Enviadas" por instância e donut "Status
   de Entrega" (Enviada/Entregue/Lida/Falha) — exigiriam coletar contagem
   de mensagens enviadas e status de tick por mensagem, dado que o app não
   observa hoje. Se o usuário quiser isso no futuro, é uma decisão à parte
   que amplia a superfície de inspeção de DOM do WhatsApp Web.
5. Compilação limpa (`tsc` main + renderer, `vite build`) e empacotamento
   (`electron-builder --win`) sem erros.

## Fase 12 (instâncias avulsas fixas no topo da sidebar) — CONCLUÍDA em 2026-08-26
Pedido do usuário: reorganização flexível das instâncias na sidebar — (1)
permitir manter 1+ instâncias "soltas" no topo, fora de qualquer
agrupamento; (2) arrastar livremente pra dentro/fora dos agrupamentos e
entre a área avulsa e os agrupamentos a qualquer momento; (3) uma linha
divisória automática entre a área avulsa e os agrupamentos, que aparece só
quando ambas existem e some sozinha quando não há mais nenhuma instância
avulsa.

Este é exatamente o follow-up que ficou registrado como decisão de escopo
pendente desde a Fase 10 (ver seção da Fase 10 e "Pendências" de rodadas
anteriores) — com uma diferença importante em relação ao que foi descrito
na época: o pedido da Fase 10 original também citava intercalar instâncias
soltas ENTRE pastas específicas (ordem totalmente unificada, como um
explorador de arquivos), o que exigiria unificar as escalas de ordenação de
`GroupStore` e `AccountStore`. O pedido desta rodada é mais específico —
fixar a área avulsa sempre no TOPO — e não precisa dessa unificação.

1. **`renderer/components/Sidebar.tsx`**: a lista de instâncias sem
   agrupamento (`ungrouped`), que desde a Fase 10 renderizava como uma
   lista simples ABAIXO de todos os agrupamentos, passou a renderizar
   SEMPRE ACIMA deles — mudança de ORDEM DE RENDERIZAÇÃO de duas seções que
   já existiam, sem tocar em nenhum modelo de dados (`AccountRecord.order`
   e `GroupRecord.order` continuam duas escalas independentes, como desde
   a Fase 8).
2. **Divisória automática**: um `<div className="border-t ...">` simples,
   renderizado condicionalmente por `ungrouped.length > 0 && groups.length
   > 0` — não é um estado guardado em lugar nenhum, é derivado a cada
   render a partir da própria lista de contas, então aparece/some sozinho
   conforme a última instância avulsa entra ou sai de um agrupamento (ponto
   3 do pedido, atendido "de graça" por ser puramente derivado).
3. **Arrastar entre as duas áreas**: já funcionava desde a Fase 10 (soltar
   uma instância agrupada na área avulsa via `handleDropOnGroupZone(null)`
   desvincula do agrupamento; soltar sobre o cabeçalho de uma pasta
   agrupa) — não precisou de nenhuma mudança de handler, só a nova posição
   de renderização já habilita visualmente "mover pro topo" e "mover pra
   um agrupamento" como pedido.
4. **Fora de escopo, documentado em comentário no próprio `Sidebar.tsx`**:
   intercalar uma instância avulsa entre duas pastas específicas (ex.:
   avulsa, pasta A, avulsa, pasta B) continua exigindo a unificação de
   ordenação mencionada acima — não foi pedido nesta rodada (o pedido foi
   especificamente "topo fixo", não "posição livre entre pastas").
5. Versão do app: `package.json` `0.16.0` → `0.17.0` (sem sufixo, seguindo
   a Fase 11). Compilação limpa (`tsc` main + renderer, `vite build`) e
   empacotamento (`electron-builder --win`) sem erros.

## Fase 13 (baseline persistida do Analytics — 1ª correção da dupla contagem) — CONCLUÍDA em 2026-08-26
Pedido do usuário, depois de perguntar como o Analytics faz a contagem
(explicado nesta sessão: `webContents.getTitle()` sobre a `WebContentsView`
de cada conta, regex `/^\((\d+)\)/` no título "(N) WhatsApp" que o próprio
WhatsApp Web escreve, sem ler texto de mensagem — ver `viewManager.ts` e
`analyticsStore.ts`). O usuário identificou uma falha real na correção da
Fase 9: `lastSeenUnread` (a última contagem observada, usada pra calcular o
delta) vivia só em memória, num `Map` da instância de `AnalyticsStore`. Isso
sobrevivia a uma suspensão manual dentro da mesma execução do app (a conta
fica marcada `loaded: false` e é ignorada em `observe()`, então o valor no
`Map` não é perdido), mas não sobrevivia a fechar e reabrir o app — a
`AnalyticsStore` é recriada do zero a cada boot, e a leitura de título logo
depois que uma conta carrega pode não refletir ainda o valor real (a página
ainda está carregando quando a primeira leitura acontece), criando risco de
salto artificial contado como mensagem nova.

**Solução implementada em `main/analyticsStore.ts`** (`observe()` e o
armazenamento de estado, seguindo exatamente as 3 regras que o usuário
especificou):

1. **Persistência em disco**: `lastSeenUnread` deixou de ser um `Map` só em
   memória e virou `lastSeen: Record<string, number>`, campo novo dentro do
   próprio `analytics.json` (mesmo arquivo dos eventos, salvo com o mesmo
   `persist()` atômico tmp+rename de sempre — não foi criado um arquivo
   separado). `load()` trata a ausência desse campo em arquivos salvos por
   versões anteriores (Fase 9-12) como baseline vazia, o que é seguro:
   equivale a tratar toda conta como "nunca observada", e o mecanismo do
   item 2 abaixo cobre exatamente esse caso sem gerar delta retroativo.
2. **Grace period na reativação/reabertura**: um novo `Set<string>`
   `syncedSinceLoad`, em memória (de propósito — reiniciar o app zera esse
   Set, o que é o comportamento desejado), marca quais contas já passaram
   pela "leitura de sincronização" desde que ficaram `loaded === true`.
   Toda vez que uma conta aparece carregada e AINDA NÃO está nesse Set
   (app acabou de abrir, conta acabou de sair de suspensão, ou a view foi
   recriada por qualquer motivo), essa primeira leitura só resincroniza
   `lastSeen[accountId]` com o valor atual do título — nenhum evento de
   delta é gerado nessa rodada, não importa qual seja a diferença em
   relação ao valor persistido antes. A partir da leitura seguinte (conta
   já establemente carregada), a comparação normal de delta volta a valer.
   Quando a conta descarrega (`loaded: false`), sua entrada é removida de
   `syncedSinceLoad`, forçando um novo grace period na próxima vez que
   carregar.
3. **Fluxo normal preservado**: ler as mensagens (contador zera) e depois
   receber mensagens novas continua gerando delta correto, porque a
   comparação (fora do grace period) sempre usa o `lastSeen` mais recente,
   que agora sobrevive a qualquer ciclo de suspensão/reativação e a fechar
   o app — não há mudança de comportamento aqui, só a base de comparação
   ficou mais confiável.

`forget(accountId)` (chamado ao remover uma conta) agora também apaga a
entrada de `lastSeen` do disco e do `syncedSinceLoad`, e passou a persistir
essa remoção — antes não persistia nada porque o próprio `lastSeenUnread`
nunca ia pro disco.

Escrita em disco continua condicionada a mudança real de valor (evento
novo OU baseline resincronizada), não a cada verificação periódica sem
mudança nenhuma — mesmo princípio de frequência de escrita das fases
anteriores, só que agora cobrindo também as resincronizações de baseline.

Versão do app: `package.json` `0.17.0` → `0.18.0`. Compilação limpa (`tsc`
main + renderer, `vite build`) e empacotamento (`electron-builder --win`)
sem erros.

**Esta correção se mostrou incompleta** — ver Fase 15 abaixo, que identifica
e corrige a causa raiz real do problema.

## Fase 14 (apagar histórico do Analytics) — CONCLUÍDA em 2026-08-26
Pedido do usuário: opção para apagar o histórico de métricas do Analytics
(pergunta "Já tem uma opção para apagar o histórico do analytics?", seguida
de confirmação explícita "Faça isso").

1. **`AnalyticsStore.clear()`** (novo método em `main/analyticsStore.ts`):
   reseta `this.data` para `{ events: [], lastSeen: {} }` e também limpa o
   `Set` em memória `syncedSinceLoad`, antes de persistir — a limpeza do
   `syncedSinceLoad` é o detalhe que evita reabrir o mesmo bug da Fase 9/13:
   sem ela, a próxima leitura de uma conta já carregada compararia contra a
   baseline recém-zerada e contaria tudo que já estava pendente como
   "mensagem nova"; limpando o Set, a próxima leitura de cada conta passa de
   novo pelo grace period (só resincroniza, sem gerar delta). Ação
   irreversível por natureza (apaga o arquivo de eventos todo).
2. **IPC**: novo handler `mw:clear-analytics` em `main/ipcRouter.ts`, ao
   lado de `mw:get-analytics-summary`, chamando `analyticsStore.clear()` e
   retornando `true`. Exposto no preload como
   `window.multiwhats.clearAnalytics()` e adicionado à interface
   `OrbiSwitStackApi` (`renderer/types.ts`).
3. **UI**: nova seção "Analytics" na aba Backup & Diagnóstico de
   Configurações (`SettingsModal.tsx`), com um `SecondaryButton` ("Apagar
   histórico do Analytics", ícone `Trash2`) seguindo o mesmo padrão visual
   dos outros botões da aba. Handler `clearAnalytics` na função
   `SettingsModal` usa `window.confirm(...)` antes de chamar a IPC — mesmo
   padrão de confirmação já usado por `importBackup()` — já que é uma ação
   destrutiva e sem desfazer. Um `window.alert` confirma a conclusão. Não
   afeta instâncias, sessões ou login — só o arquivo `analytics.json`.
4. Versão do app: `package.json` `0.18.0` → `0.19.0`. Compilação limpa
   (`tsc` main + renderer, `vite build`) e empacotamento
   (`electron-builder --win`) sem erros.

## Fase 15 (debounce de estabilização — causa raiz real da dupla contagem do Analytics) — CONCLUÍDA em 2026-08-28
Usuário reportou, após instalar a 0.19.0, que **o mesmo problema
continuava**: mensagens que já existiam antes (sem o usuário abrir/ler
nada, sem receber mensagem nova) voltavam a ser somadas no Analytics
("sistema está falho"). Isso mostrou que a Fase 13 tratou o SINTOMA
(reabrir o app perde a baseline) mas não a CAUSA raiz.

**Causa raiz identificada**: a Fase 13 presumia que a primeira leitura de
título depois que uma conta fica `loaded: true` já reflete o valor real e
definitivo de não lidas. Na prática, o WhatsApp Web pode escrever o título
da página em mais de um passo — um título genérico "WhatsApp" primeiro,
"(N) WhatsApp" só depois que a página termina de renderizar a lista de
conversas — então tanto a leitura do grace period (Fase 13) quanto uma
leitura normal podem capturar um valor transitório (mais baixo, às vezes 0)
um instante antes do valor real se assentar. Se a baseline for sincronizada
nesse instante errado, a leitura seguinte (já com o valor real) aparece
como um "salto" positivo de mensagens novas — exatamente o padrão que o
usuário reportou duas vezes.

**Correção em `main/analyticsStore.ts`**: `observe()` não decide mais nada
na hora. Para cada conta carregada, ele agenda a leitura (`Map<string,
SettlingEntry>` chamado `settling`, com um `setTimeout`) em vez de agir
imediatamente; se o mesmo valor de não lidas se repetir sem mudar por
`SETTLE_MS` (2500 ms) seguidos, só então a leitura é aceita como real e o
método privado `commitObservation()` decide entre grace period (resincroniza
a baseline, sem delta — a mesma regra da Fase 13) ou comparação normal de
delta. Qualquer leitura intermediária (o título "piscando" entre um valor e
outro) reinicia o cronômetro em vez de ser tratada como definitiva — isso
cobre tanto a baseline do grace period (só é gravada já estabilizada) quanto
o delta normal (só reage a uma mudança que realmente se sustentou). Se a
conta descarrega (`loaded: false`) antes do cronômetro disparar, a leitura
pendente é cancelada (`cancelSettling`) — nunca comita um valor obsoleto.
`forget()` e `clear()` também cancelam qualquer leitura pendente da conta
afetada, para não disparar um `commitObservation` depois que a conta já foi
removida ou o histórico já foi apagado.

Diferença de comportamento perceptível: o Analytics agora reage ao volume
real de mensagens com um atraso de até ~2,5s em vez de imediato — troca
consciente, já que o objetivo do usuário (não contar duas vezes mensagens
que já existiam) depende de esperar o título se estabilizar antes de tirar
qualquer conclusão. Nenhuma mudança na regra de negócio em si (grace period
+ delta), só em QUANDO cada leitura é aceita como válida.

Versão do app: `package.json` `0.19.0` → `0.20.0` (empacotada junto com a
Fase 16, entregues na mesma build). Compilação limpa (`tsc` main +
renderer) confirmada.

## Fase 16 (grade de serviços expandida, header enxuto, perfil de desempenho personalizado, tabela de instâncias) — CONCLUÍDA em 2026-08-28
Pedido do usuário em 4 partes, na mesma mensagem (com uma captura de tela
de referência do Ferdium anexada só como exemplo de layout, não para copiar
o app inteiro — o próprio usuário pediu para "adaptar para o formato e
cores atuais do programa").

1. **Grade de serviços do assistente de adicionar conta** (Etapa 1/3,
   `AddAccountWizard.tsx`): a lista vertical de 5 itens (WhatsApp, Gmail,
   Navegador livre, Google Earth, URL customizada) virou uma grade de 4
   colunas com exatamente os 8 serviços pedidos, nesta ordem: WhatsApp Web,
   Instagram, Gmail, TikTok, Facebook, Messenger, Google Calendar, Google
   Earth. Clicar em qualquer ícone avança direto para a Etapa 2/3 (antes
   era preciso clicar em "Próximo" separadamente). Fundo, título do modal e
   cores não foram tocados; **nenhuma barra de busca foi adicionada** — o
   pedido pedia para preservar uma barra de busca que já existiria e
   explicitamente proibia adicionar uma nova, e o wizard nunca teve uma, então
   a interpretação mais segura foi não criar nenhuma.
   - **5 novos serviços de verdade no back-end** (`main/services.ts`,
     espelhado em `renderer/types.ts`): Instagram, TikTok, Facebook,
     Messenger e Google Calendar foram adicionados ao union type
     `AccountService` e à tabela `SERVICES`, cada um com URL oficial padrão,
     allowlist de navegação própria e cor de marca — mesmo modelo já usado
     desde a Fase 6 pro Gmail/Earth/navegador livre (sessão isolada
     `session.fromPartition`, sem API não oficial, sem scraping). Nenhuma
     dessas 5 tem detecção de QR Code (só o WhatsApp tem, ver Fase 10) —
     reportam "pronta" assim que a página termina de carregar, como Gmail e
     Earth já fazem.
   - **Glifos autorais para os 5 serviços novos** (`ServiceIcon.tsx`): mesma
     política já registrada desde a Fase 10 — formas e cores de marca
     reconhecíveis (câmera estilizada pro Instagram, nota musical pro
     TikTok, rede de pessoas pro Facebook, balão de chat com raio pro
     Messenger, página de agenda com grade pro Google Calendar) SEM
     reproduzir os logos vetoriais oficiais de terceiros pixel a pixel —
     não é uma limitação técnica, é a mesma decisão deliberada de não usar
     marcas registradas de terceiros que já vinha do histórico do projeto.
   - "Navegador livre" e "URL customizada" **continuam existindo** no
     back-end e no tipo `AccountService` — só saíram desta grade específica
     de 8 ícones, a pedido explícito do usuário. Quem já tinha uma conta
     configurada com esses dois serviços não é afetado.
2. **Cabeçalho superior enxuto** (`Header.tsx`): o texto "Orbi Swit Stack"
   ao lado do logo foi removido (o logo sozinho continua) — pedido
   explícito era remover "apenas o texto", não o logo. Altura reduzida de
   56px (`h-14`) para 44px (`h-11`), logo de 28px para 24px, para abrir mais
   espaço útil de tela. Nenhuma cor, menu, botão ou funcionalidade da barra
   foi alterado.
   - **Contador "N/30"** (`Sidebar.tsx`, canto superior da barra lateral —
     era ali que esse contador existia, não dentro do `Header.tsx` em si,
     mas visualmente é o "canto superior esquerdo" que o pedido descreveu):
     removido, sobrando só o rótulo "CONTAS". O badge equivalente na tela
     "Gerenciar contas" (`AccountsDashboard.tsx`) não foi tocado — o pedido
     falou especificamente do canto superior/cabeçalho, não dessa tela.
3. **Perfil de desempenho "Personalizado"** (`settingsStore.ts`,
   `ipcRouter.ts`, `SettingsModal.tsx`): os presets fixos foram atualizados
   pros valores pedidos — Economia 1 instância (era 1), Equilibrado 6 (era
   2), Desempenho 10 (era 4) — e ganharam um quarto perfil, "Personalizado",
   sem preset fixo: em vez disso usa um novo campo persistido
   `customMaxLoadedAccounts` (1-30, `settings.json`), editável por um campo
   numérico que só aparece quando esse perfil está selecionado. Novo helper
   `resolvePerformancePreset(mode, customValue)` centraliza a resolução do
   preset efetivo pros dois pontos que precisavam dele (`main.ts` na
   inicialização e a cada troca de modo) — evita duplicar a lógica de
   "custom usa o valor salvo, os demais usam a tabela fixa". Novo IPC
   `mw:set-custom-max-loaded-accounts`, que já aplica o novo limite em tempo
   real via `accountManager.updateLimits()` se o perfil "Personalizado" já
   estiver ativo no momento da mudança. Suspensão automática das instâncias
   excedentes continua sendo o mesmo mecanismo de sempre
   (`AccountManager.enforceLoadedCap`/`sweepIdleAccounts`, Fase 1) — não foi
   criado um mecanismo novo, só um limite configurável chegando nele.
4. **Aba "Instâncias & Agrupamentos" como tabela** (`SettingsModal.tsx`):
   `InstanceCard` (cards empilhados, Fase 8) foi substituído por
   `InstanceRow`, renderizado dentro de uma tabela HTML com as colunas
   pedidas — Nome (editável inline, como antes), Agrupamento (mesmo
   seletor), Serviço (nome do serviço, `SERVICES[acc.service].label`),
   Status (badge reaproveitando `accountStatusLabel()`, o mesmo helper da
   Fase 10 — sem reimplementar a lógica de status numa tela nova) e Ações
   (suspender/ativar, trocar ícone, resetar ícone, excluir — os mesmos
   botões de sempre, com um botão novo de pausar/retomar que não existia no
   card). Cada linha tem uma caixa de seleção; uma barra de ações em massa
   aparece quando 1+ estão marcadas, com três operações: mover as
   selecionadas para um agrupamento (ou "Sem agrupamento"), suspender todas
   as selecionadas, ou excluir todas as selecionadas (com uma única
   confirmação `window.confirm` pro lote inteiro, não uma por conta —
   `removeAccount()` sem confirmação individual é usado aqui, reservando
   `removeAccountWithConfirm()` — com seu diálogo por conta — só pra exclusão
   avulsa de uma linha).

Versão do app: `package.json` `0.19.0` → `0.20.0` (empacotada junto com a
Fase 15). Compilação limpa (`tsc` main + renderer, `vite build`) e
empacotamento (`electron-builder --win`) sem erros.

## Builds entregues nesta rodada
- `WhatsControl-Setup-0.6.0-fase1.exe` (~163 MB) — arquitetura.
- `WhatsControl-Setup-0.7.0-fase2.exe` (~165 MB) — visual premium.
- `WhatsControl-Setup-0.8.0-fase3.exe` (~165 MB) — busca/favoritos/wizard/desempenho/notificações/diagnóstico/tipografia.
- `WhatsControl-Setup-0.9.0-fase4.exe` (~78 MB) — comportamento ao fechar, confirmação de remoção, tela de gerenciamento de contas.
- `WhatsControl-Setup-0.10.0-fase5.exe` / `0.10.1-fase5.exe` (~78 MB) — reordenar por arrastar e soltar, paleta de comando Ctrl+K, selo de não lidas (build com bugs, ver seção do bug crítico acima).
- `WhatsControl-Setup-0.10.2-fase5.exe` (~78 MB, sha256 `7dca451b0d117d53a0e11af8053a15dfee28c07b8ae3a230eca9cf15ca9f3001`) — correção do bug de z-order da WebContentsView + drag-and-drop real. Confirmação do usuário ainda pendente.
- `WhatsControl-Setup-0.11.0-fase6.exe` (~78 MB, sha256 `d6a12ae51372b72699a234447764a01a4253e34028ad7f752ebfb1b8e1ea4679`) — multi-plataforma, sidebar redimensionável, ícones por serviço/customizados, grupos de instâncias.
- `OrbiSwitStack-Setup-0.12.0-fase7.exe` (~78 MB, sha256 `bed8b13ea9057a78893a877a6faa2e3590aa801996e022fe0dabbac844f42aff`) — rebranding completo para Orbi Swit Stack (nome, About, ícone/logo).
- `OrbiSwitStack-Setup-0.13.0-fase8.exe` (~78 MB, sha256 `5aa990baad8b1d9495be71a4d029d266abfcf7937c17e58b3a314e00b7a7d4a9`) — limpeza visual, first-run sem mocks (empty state), Configurações em abas, agrupamentos com validação/tempo real. **Confirmado pelo usuário: instalação e junção das partes funcionaram.**
- `OrbiSwitStack-Setup-0.14.0-fase9.exe` (~78 MB, sha256 `81e73812ffabffb7a6e1aca1398d6da389f862e435921225711f55eb4bd7b152`) — painel de Analytics (coleta de métricas de não lidas + gráficos de barra/linha).
- `OrbiSwitStack-Setup-0.14.1-fase9.exe` (~78 MB, sha256 `34fc63a695358f07b1305a12763cf62824021d5b5629e18a048a3ebc1e2db212`) — corrige dupla contagem do Analytics quando uma conta suspende/reativa (correção em memória — ver Fase 13/15 pra versões seguintes).
- `OrbiSwitStack-Setup-0.15.0-fase10.exe` (~78 MB, sha256 `57dc0a9c1ae41afe25c4ed6fa602dad9bef5211d2819d5955d63cd43981ab6a7`) — QR Code só no WhatsApp, ícones próprios por serviço, limite de 30 instâncias, agrupamentos reordenáveis com drag-and-drop, sem pasta "Sem agrupamento".
- `OrbiSwitStack-Setup-0.16.0.exe` (~78 MB, sha256 `58f06ead8ce047e36b5446bb317505a123ca148cdedbed93c8394eace041911e`) — versão de exibição limpa (sem sufixo de fase, inclusive no nome do próprio arquivo do instalador) + upgrade da aba Analytics (filtros de período avançados com intervalo customizado, comparação com período anterior, alertas de sistema em tempo real, cards de saúde de conexão), sem nenhuma coleta de dado nova.
- `OrbiSwitStack-Setup-0.17.0.exe` (~78 MB, sha256 `0a657736a49b361debb50f83236f97aa7f4b3dfd63e5e52908b0697a87609269`) — instâncias sem agrupamento fixas no topo da sidebar (acima dos agrupamentos, antes ficavam abaixo), com divisória automática entre as duas áreas.
- `OrbiSwitStack-Setup-0.18.0.exe` (~78 MB, sha256 `8b090522ac4adecbd2c5ef06175fbc51e6743258e26b4c1f99cd5c89ab78b7d3`) — baseline do Analytics (`lastSeen`) persistida em `analytics.json` + grace period na reativação/reabertura (Fase 13 — correção incompleta, ver Fase 15).
- `OrbiSwitStack-Setup-0.19.0.exe` (~78 MB, sha256 `04de2cdfc2a0a503b1923041a5ca5a15784c764aa49817daed40be0e1b680ad6`) — opção "Apagar histórico do Analytics" na aba Backup & Diagnóstico de Configurações, com confirmação antes de apagar. **Usuário reportou que a dupla contagem do Analytics persistia mesmo nesta versão** — motivou a Fase 15.
- `OrbiSwitStack-Setup-0.20.0.exe` (~78 MB, sha256 `d9433e8c6cf176182058bd96ba449bf9fb313b6150b93289db51d02c7b1ef356`) — Fase 15 (debounce de estabilização, causa raiz real da dupla contagem do Analytics corrigida) + Fase 16 (grade de 8 serviços no assistente de adicionar conta com 5 serviços novos, cabeçalho enxuto sem texto/contador, perfil de desempenho "Personalizado" com campo numérico, tabela de instâncias com seleção em massa). **Esta é a build mais recente entregue.**

Todos gerados e validados nesta sessão via wine, entregues em partes de
~20-25 MB + hash SHA-256 (dispositivo do usuário não estava conectado à
ponte em nenhuma dessas entregas, então foi tudo por chat).

## Publicação no GitHub (tentativa registrada em 2026-08-26)
Usuário pediu pra subir o projeto num repositório GitHub próprio, "Orbi
Swit Stack" (criado por ele como `ViniRJ92/Orbi-Swit-Stack`). **Limitação
descoberta**: o ambiente de execução deste agente usa um proxy de
credenciais Git escopado por sessão — só publica em repositórios
explicitamente autorizados nas configurações da sessão/app (fora do chat),
e não existe nenhuma ferramenta disponível aqui para o próprio agente
autorizar um repositório novo (`add_repo`, citado nas mensagens de erro da
API do GitHub, não está exposto como tool neste ambiente). Tentativa de
`git push` retornou 403 com a mensagem "ViniRJ92/Orbi-Swit-Stack is not in
this session's authorized repository set... add the repository to the
session's sources". **Solução aplicada**: git inicializado localmente
(`main`, commit único com o snapshot do código-fonte da v0.17.0, remote
`origin` apontando pro repo do usuário) e entregue como `.zip` via chat
(`orbi-swit-stack-source.zip`, só código-fonte — sem `node_modules`/
`dist`/`release`) com os comandos de `git init`/`add`/`commit`/`push` pro
próprio usuário rodar do computador dele. **Pendente**: se o usuário
descobrir onde liberar esse acesso do lado das configurações do Cowork/
Claude Code, um push direto desta sessão pode ser tentado de novo (o
snapshot ficou parado na v0.17.0 — se o push for retomado, vale gerar um
zip atualizado com o código atual primeiro).

## Pendências
- **Avisar/confirmar com o usuário sobre a pasta de dados nova** ao
  instalar a partir da 0.12.0-fase7 (appId mudou) — ver ressalva da Fase 7.
  Já mandei os comandos PowerShell de migração manual; não confirmou uso.
- **Confirmar com o usuário** se a 0.10.2-fase5 resolveu de fato o "nada
  funciona" (nunca confirmado) e se as builds 0.11 a 0.20 instalam/rodam
  bem num Windows real — em especial: redimensionamento da sidebar, fluxo
  de adicionar conta multi-serviço (agora com 8 opções na grade da Fase 16,
  incluindo 5 serviços nunca testados: Instagram, TikTok, Facebook,
  Messenger, Google Calendar), layout de abas em Configurações, a nova
  tabela de instâncias com seleção em massa (Fase 16), o perfil de
  desempenho "Personalizado" (Fase 16), o painel de Analytics da Fase 11 e
  sua correção definitiva de baseline da Fase 15 (agora com um atraso de
  ~2,5s proposital antes de contar qualquer mudança — vale confirmar que
  esse atraso não incomoda no uso real), a nova opção de apagar histórico
  da Fase 14, a posição fixa das instâncias avulsas da Fase 12, e a Fase 10
  inteira — nenhum testado fora desta sessão de desenvolvimento ainda.
- **Analytics — acompanhar se a Fase 15 realmente resolveu**: as Fases 9 e
  13 pareciam corretas na revisão de código mas o usuário encontrou o
  problema na prática duas vezes; a Fase 15 tem uma justificativa técnica
  mais forte (a causa raiz é o título sendo escrito em mais de um passo,
  não só perda de estado em memória), mas só o uso real vai confirmar. Se o
  usuário reportar o problema uma terceira vez, os próximos suspeitos são:
  o valor de `SETTLE_MS` (2500ms) sendo curto demais pra alguma máquina/
  conexão mais lenta, ou algum outro caminho de código que ainda chame
  `pushAccountsUpdate()`/`observe()` de um jeito que não passe pelo
  debounce (revisar todos os call sites de `analyticsStore.observe`).
- **Diagnóstico pendente, nunca respondido pelo usuário**: usuário reportou
  "O sistema não pode encontrar o arquivo especificado." ao rodar o comando
  `copy /b` de junção das partes da build 0.18.0 — pedi `dir
  %USERPROFILE%\Downloads\OrbiSwitStack*` pra confirmar os nomes reais dos
  arquivos baixados (suspeita: navegador pode ter salvo com sufixo tipo
  `(1)`, ou em outra pasta), mas o usuário não respondeu e mudou de assunto
  duas vezes desde então. Se o mesmo erro aparecer na junção da 0.20.0,
  repetir esse diagnóstico antes de qualquer outra hipótese.
- Avisar o usuário sobre a limitação de login OAuth do Google em Gmail/
  Google Earth/Google Calendar se ele testar essas opções (ver seção da
  Fase 6 acima) — com a Fase 10, pelo menos essas instâncias não vão mais
  mostrar "Aguardando QR Code" enquanto isso; se o OAuth falhar, o sintoma
  agora seria a própria tela de login do Google recusando dentro da
  instância. A mesma ressalva provavelmente vale para o login do
  Instagram/Facebook/Messenger dentro de uma `WebContentsView` isolada —
  ainda não testado nesta sessão.
- **Atualização automática** (`electron-updater` + GitHub Releases,
  gratuito) continua explicitamente adiada a pedido do usuário.
- Terminologia "Agrupamento" ficou só na interface — identificadores
  internos (`GroupStore`, `groupId`, canais IPC) continuam em inglês/termo
  antigo "group" (decisão de escopo da Fase 8, ver seção acima).
- Tela "Gerenciar contas" (Dashboard) mantida com ações próprias
  (suspender/remover/favoritar) e com seu próprio badge "N/30" — não foi
  esvaziada para virar só leitura nem teve o badge removido (só o do
  cabeçalho/sidebar foi, na Fase 16); ver decisão de escopo da Fase 8, item 2.
- README.md ainda descreve o estado da Fase 5 em detalhe (só recebeu
  renomeação pontual de título/nomes na Fase 7) — não foi reescrito para
  refletir as Fases 6-16 (não foi pedido).
- **Analytics começa vazio**: como a coleta só passou a existir na 0.14.0,
  o histórico de mensagens só começa a partir da instalação desta versão —
  não há retroatividade (nem seria possível, já que nada era guardado antes).
  Isso agora também vale toda vez que o usuário usar a opção de apagar
  histórico (Fase 14): a contagem recomeça do zero a partir dali.
- **Interposição arbitrária pastas↔instâncias soltas** (arrastar uma
  instância avulsa pra uma posição intercalada entre duas pastas
  específicas, não só "sempre no topo"): decisão de escopo explícita da
  Fase 10, ainda não implementada — a Fase 12 resolveu a parte "topo fixo +
  divisória automática" do pedido original, mas a interposição arbitrária
  continuaria exigindo unificar as escalas de ordenação de `GroupStore` e
  `AccountStore`. Follow-up dedicado se o usuário confirmar que quer
  especificamente essa interação.
- **Analytics "Recebidas vs. Enviadas" e "Status de Entrega"**: decisão de
  escopo explícita da Fase 11 (resposta do usuário: "Manter só o que já é
  seguro") — não implementado, exigiria nova coleta de DOM que o app não
  faz hoje. Só revisitar se o usuário pedir explicitamente essa expansão de
  escopo de coleta de dados, ciente da restrição de "nada de scraping além
  do já existente".
- **Publicação no GitHub**: repositório `ViniRJ92/Orbi-Swit-Stack` criado
  pelo usuário, mas esta sessão não tem permissão de push nele (ver seção
  dedicada acima) — entregue como `.zip` + comandos de git pro usuário
  publicar pelo próprio computador (parado na v0.17.0). Se ele conseguir
  autorizar o repo do lado das configurações do app, revisitar o push
  direto com um zip atualizado.
- **Não testado nesta sessão**: os 5 serviços novos da Fase 16 (Instagram,
  TikTok, Facebook, Messenger, Google Calendar) foram implementados seguindo
  exatamente o mesmo padrão dos serviços existentes (URL oficial, allowlist,
  sessão isolada), mas nunca foram abertos de fato num Windows real — vale
  confirmar login/uso normal de cada um, e ajustar a allowlist de domínios
  se algum deles precisar de mais subdomínios pra funcionar completamente
  (ex.: CDNs de vídeo do TikTok, subdomínios de autenticação do Facebook).

## Decisões-chave de arquitetura (atualizadas na Fase 16)
- Isolamento: `session.fromPartition('persist:account-<uuid>')` por conta — inalterado.
- **Modelo de serviço genérico, expandido na Fase 16**: `main/services.ts`
  (`SERVICES`) para `whatsapp | instagram | gmail | tiktok | facebook |
  messenger | googlecalendar | chrome | earth | custom`; `renderer/types.ts`
  espelha a mesma tabela (sem `allowedHosts`, só do main). Cada serviço tem
  cor de marca própria e distinta e um glifo SVG autoral em
  `ServiceIcon.tsx` — nenhum reproduz o logo oficial de terceiros pixel a
  pixel (decisão consciente desde a Fase 10, reafirmada na Fase 16 pros 5
  serviços novos). UI: React + Zustand + Framer Motion + Tailwind v4 +
  lucide-react + Recharts (Fase 9).
- Bridge do preload continua `window.multiwhats` / tipos em
  `src/renderer/types.ts` (`OrbiSwitStackApi`, espelha `src/main/types.ts`).
- `overlayActive` em `ViewManager`: mecanismo central para esconder a
  WebContentsView ativa sempre que uma camada HTML precisa ficar visível/
  clicável por cima dela (modais + arrasto de redimensionamento da sidebar,
  incluindo o modal de Analytics) — qualquer futura camada HTML em tela
  cheia deve entrar na lista agregada `anyModalOpen` em `App.tsx`.
- **Edição de conta é centralizada**: `AccountItem.tsx` (sidebar) só tem
  favoritar; renomear/ícone/agrupamento/excluir/suspender vivem
  exclusivamente em `SettingsModal.tsx` → aba Instâncias & Agrupamentos →
  desde a Fase 16, uma tabela (`InstanceRow`, substituiu o `InstanceCard`
  em cards da Fase 8) com seleção em massa. O Dashboard
  (`AccountsDashboard.tsx`) é a exceção deliberada (ver Pendências).
- `Modal.tsx`: `size` ('sm'|'md'|'lg', substituindo o antigo `wide`
  booleano — mantido como alias para 'md') e `contentClassName` (permite ao
  chamador assumir o próprio layout de rolagem em vez do padrão
  `overflow-y-auto px-5 py-5`) — usado pelo `SettingsModal` e pelo
  `AnalyticsModal` para layouts internos próprios.
- Agrupamentos: `GroupStore` (`groups.json`) valida nome vazio/duplicado em
  `create()`/`rename()` (retornam `{error}`) e expõe `reorder()` via IPC
  (`mw:reorder-groups`, Fase 10) — a ordem das pastas é uma escala numérica
  própria (`GroupRecord.order`), independente da ordem global das contas
  (`AccountRecord.order`); essas duas escalas continuam separadas mesmo
  depois da Fase 12 (que só mudou a ORDEM DE RENDERIZAÇÃO das seções, não o
  modelo de dados) — é essa separação que torna a interposição arbitrária
  pastas↔instâncias soltas um trabalho maior (ver Pendências).
  `useAppStore.createGroup/renameGroup/reorderGroups` recarrega `groups` do
  main após sucesso. A mudança de agrupamento em massa da Fase 16 reusa o
  mesmo `setAccountGroup` já existente, só chamado uma vez por conta
  selecionada.
- **Layout da sidebar (Fase 12, cabeçalho enxuto na Fase 16)**: `Sidebar.tsx`
  renderiza SEMPRE a lista de instâncias sem agrupamento (`ungrouped`)
  primeiro, no topo, seguida de uma divisória condicional
  (`ungrouped.length > 0 && groups.length > 0`, puramente derivada, sem
  estado próprio) e só então os agrupamentos. O topo da sidebar (`CONTAS`)
  perdeu o badge de contagem "N/30" na Fase 16 — só o rótulo ficou.
- Primeira instalação: sem contas fictícias — `AccountStore.ensureDefaults()`
  não existe mais; estado vazio tem CTA "+ Adicionar primeira conta" na
  sidebar e na área de conteúdo (`App.tsx`, `Sidebar.tsx`).
- Marca/logo: `OrbiLogo.tsx` (SVG inline) e `assets/icon.png`/`icon.ico`
  (gerados por `scripts/gen_icon.py`, Pillow) compartilham a mesma
  paleta/geometria — qualquer ajuste de cor/forma deve ser replicado nos
  dois lugares. Desde a Fase 16, o logo aparece sozinho no cabeçalho (sem o
  texto "Orbi Swit Stack" ao lado) — o nome completo do app só aparece na
  tela "Sobre" e no título da janela do sistema operacional.
- **Analytics — mecanismo de leitura**: a fonte do dado é `webContents.
  getTitle()` (API nativa do Electron, `viewManager.getTitle()`/
  `getUnreadCount()`) sobre a `WebContentsView` de cada conta — nunca DOM
  scraping nem qualquer API do WhatsApp. O WhatsApp Web já escreve "(N)
  WhatsApp" sozinho no título da aba quando há não lidas; uma regex simples
  (`/^\((\d+)\)/`) extrai o número. Só se aplica a `service === 'whatsapp'`
  (outros serviços retornam sempre 0 aqui). Nenhum texto de mensagem,
  remetente ou conteúdo é lido em ponto algum desse fluxo.
- **Analytics — persistência, baseline e estabilização (Fases 9, 13 e 15)**:
  `AnalyticsStore` (`main/analyticsStore.ts`) mantém em `analytics.json`
  tanto os eventos (`{ t, a, c }`, delta de não lidas por conta) quanto,
  desde a Fase 13, a última contagem observada por conta (`lastSeen`,
  `Record<string, number>`) — ambos persistidos em disco com o mesmo
  padrão atômico tmp+rename. Desde a Fase 15, `observe(statuses)` NUNCA
  decide na hora: agenda cada leitura num `Map` (`settling`) e só aceita o
  valor como real depois de `SETTLE_MS` (2500ms) sem mudar — só então
  `commitObservation()` aplica a regra de grace period (primeira leitura
  estável de cada conta desde que ficou `loaded === true`, rastreado pelo
  `Set` em memória `syncedSinceLoad`, que reinicia a cada boot: resincroniza
  `lastSeen` sem gerar evento) ou a comparação normal de delta. Isso cobre
  reabrir o app, sair de uma suspensão, qualquer recriação da view, E o
  título do WhatsApp Web sendo escrito em mais de um passo (a causa raiz
  real descoberta na Fase 15, que a Fase 13 sozinha não cobria).
- **Analytics — apagar histórico (Fase 14)**: `AnalyticsStore.clear()`
  reseta eventos e baseline (`{ events: [], lastSeen: {} }`), limpa
  `syncedSinceLoad` e cancela qualquer leitura pendente em `settling`
  (Fase 15) — sem isso, uma leitura já agendada antes do clear poderia
  comitar um valor obsoleto depois. Exposto via IPC `mw:clear-analytics` e
  um botão na aba Backup & Diagnóstico de Configurações, atrás de
  `window.confirm(...)` por ser irreversível.
- **Analytics — agregação e contrato de período**: toda agregação (totais,
  ranking, série por hora) acontece no processo principal via
  `buildSummary(range, accounts)`, que desde a Fase 11 recebe um
  `AnalyticsRange { startTs, endTs }` explícito em vez do antigo enum de
  período — o mesmo método serve os atalhos rápidos, o intervalo
  customizado e o cálculo do "período anterior" (comparação), só mudando o
  range recebido; o renderer só recebe o resumo pronto (`AnalyticsSummary`),
  nunca eventos brutos. O cálculo dos intervalos (atalho/custom/anterior)
  vive no renderer (`renderer/analyticsRange.ts`), recalculado a cada
  carregamento — nunca memoizado só a partir da seleção da UI — pra não
  congelar o `endTs` de "Hoje/7d/30d" entre as atualizações automáticas de
  20s. `AnalyticsModal.tsx` é carregado sob demanda (`React.lazy`) para não
  pesar no bundle inicial. Alertas de sistema e cards de saúde de conexão
  no modal são 100% derivados client-side de `accounts`/`statuses` (já
  disponíveis via `useAppStore`/`onAccountsChanged`) — nenhum IPC novo foi
  criado para eles. **Deliberadamente fora do escopo**: métricas de
  mensagens enviadas e status de entrega (ver Fase 11 e Pendências).
- **Detecção de status por serviço (Fase 10)**: `webviewPreload.ts` recebe o
  serviço da instância via `additionalArguments` (`--mw-service=<id>`,
  passado por `viewManager.ts`) e só roda a detecção de QR Code/login
  específica do WhatsApp (`#pane-side`, canvas de QR) quando o serviço é
  `whatsapp`; para os demais (incluindo os 5 novos da Fase 16), reporta
  "pronta" assim que a página carrega. Texto de status na UI é centralizado
  em `renderer/accountStatusLabel.ts` (usado por `AccountItem`,
  `AccountsDashboard`, `CommandPalette`, e desde a Fase 16 também por
  `InstanceRow` na tabela de Configurações) — nunca reimplementar essa
  lógica localmente numa tela nova.
- **Limite de contas (Fase 10)**: `MAX_ACCOUNTS` em `main/accountManager.ts`
  é a única fonte da verdade (30, era 20); exposto ao renderer via
  `appInfo.maxAccounts` (`mw:get-app-info`) — usado pelo badge que restou
  no Dashboard (o do cabeçalho/sidebar foi removido na Fase 16).
- **Desempenho configurável (Fase 1, presets atualizados e perfil
  "Personalizado" adicionado na Fase 16)**: `PERFORMANCE_PRESETS` em
  `settingsStore.ts` cobre `economy | balanced | performance` com valores
  fixos (1/6/10 instâncias simultâneas); o quarto modo, `custom`, usa
  `customMaxLoadedAccounts` (1-30, persistido) em vez de um preset fixo.
  `resolvePerformancePreset(mode, customValue)` é o único ponto que resolve
  qual preset vale pra qualquer modo — `main.ts` e `applyPerformanceMode`
  (`ipcRouter.ts`) sempre passam por ele, nunca leem `PERFORMANCE_PRESETS`
  diretamente pra um modo que pode ser `custom`.
- **Versão exibida (Fase 11)**: `package.json`'s `version` é a única fonte
  da verdade para todo texto de versão na UI (via `app.getVersion()`) e
  para o nome do arquivo do instalador (`artifactName`) — nunca incluir
  sufixos internos de desenvolvimento (`-fase*`, `-beta`, `-dev`, `-etapa*`)
  nesse campo; ele deve conter sempre um SemVer limpo (`MAJOR.MINOR.PATCH`).
- **Publicação/CI (Fase 13)**: este ambiente de execução NÃO tem permissão
  de push em repositórios GitHub arbitrários — só nos explicitamente
  autorizados nas configurações da sessão/app, fora do alcance de qualquer
  tool disponível ao agente. Entregas de código-fonte pro GitHub do usuário
  devem seguir via `.zip` + instruções de `git` pro usuário rodar, a menos
  que essa autorização seja concedida do lado de fora do chat.
- Empacotamento: `electron-builder` com saída em `release/`, `node_modules` excluído do `.asar`.

## Fase 17 — "Novas conversas" x "Mensagens" no Analytics (v0.21.0)

Pedido do usuário: separar, no Analytics, "Novas conversas" (pessoas únicas que mandaram algo novo) de "Mensagens" (total de mensagens novas dessas pessoas), ignorando completamente grupos, sem contar de novo mensagem já vista.

Decisão técnica (escolhida por mim, aprovada pelo usuário via pergunta de escopo): implementado dentro do próprio app, em TypeScript — sem processo Python externo, sem OCR. O app já roda cada conta em uma `WebContentsView` isolada; usamos `webContents.executeJavaScript` para uma leitura PASSIVA da lista de conversas já visível na tela (nome + contador de não lidas por conversa), nunca o texto de mensagens, nunca clique/interação.

Arquivos novos/alterados:
- `src/main/chatActivityStore.ts` (novo): mesma lógica de debounce/grace period da Fase 13/15 do `analyticsStore.ts`, aplicada por (conta + conversa) em vez de só por conta. Persistido em `chatActivity.json`.
- `src/main/viewManager.ts`: novo método `getChatEntries(accountId)` — lê nome/contador/indício de grupo do DOM do WhatsApp Web, só para contas `service === 'whatsapp'`. Documentado com as limitações (lista virtualizada, detecção de grupo por múltiplos indícios sem garantia).
- `src/main/main.ts`: novo polling a cada 4s (`CHAT_ACTIVITY_POLL_MS`) alimentando o `chatActivityStore`.
- `src/main/types.ts` / `src/renderer/types.ts`: novo `ChatActivitySummary` (`newConversations`, `messages`, `byAccount`), embutido em `AnalyticsSummary.chatActivity`.
- `src/main/ipcRouter.ts`: `mw:get-analytics-summary` agora também popula `chatActivity`; `mw:clear-analytics` limpa os dois stores; `mw:remove-account` esquece os dois.
- `src/renderer/components/AnalyticsModal.tsx`: dois novos KPI cards ("Novas conversas" / "Mensagens").

Limitação conhecida e assumida: a detecção de "isto é um grupo" e a leitura do nome/contador dependem da estrutura interna (DOM) da página oficial do WhatsApp Web, que a Meta pode mudar sem aviso — diferente do resto do app, que só lê o título da aba. Não há como testar contra uma sessão real do WhatsApp Web neste ambiente; os seletores usados são best-effort com múltiplos fallbacks, e podem precisar de ajuste fino depois do usuário testar ao vivo.

Build entregue: `OrbiSwitStack-Setup-0.21.0.exe`, sha256 `3ac090308190ddf428b98d3d960f4eed656f51f68f63c1728dd917bfa15a288f`.

## Fase 18 — Cabeçalho ultra-fino + ícones oficiais das marcas + sem números automáticos (v0.22.0)

Pedido do usuário, aplicado ponto a ponto (com confirmação a cada etapa):

**Ponto 1 (Cabeçalho):** removido de vez o container/ícone da logo redonda do canto superior esquerdo interno (`OrbiLogo`) — o espaço fica vazio, só a barra nativa do Windows mostra o ícone do app agora. Altura reduzida de 44px para 32px (`h-8 min-h-[32px]`, `py-0`), botões reajustados (`px-2 py-1 text-[12px]`) para caber sem cortar.

**Ponto 2 (Ícones oficiais):** decisão explícita do usuário de reverter a política anterior (Fase 10/16, "sem reproduzir logo oficial") — agora usa os logos SVG oficiais reais. Solução técnica escolhida: traçados vetoriais (`path d=`) extraídos do pacote npm `simple-icons` (CC0-1.0, só usado localmente para copiar os paths — não é dependência em runtime, não entrou no `package.json`), embutidos como constantes em `ServiceIcon.tsx`. Instagram usa gradiente linear oficial (amarelo→laranja→rosa→roxo); TikTok usa 3 camadas (ciano + vermelho + preto deslocadas) reproduzindo o efeito "nota musical" oficial; os demais usam o traçado oficial em cor sólida de marca.

**Ponto 2 (Grade completa):** `SERVICE_GRID` em `AddAccountWizard.tsx` voltou a ter as 10 opções pedidas, na ordem: WhatsApp, Instagram, Gmail, TikTok, Facebook, Messenger, Google Calendar, Google Earth, Pesquisa Google, Web Explorer. As duas últimas reaproveitam os serviços já existentes `chrome` (renomeado de "Navegador livre" para "Pesquisa Google", ícone do "G" do Google) e `custom` (renomeado de "URL customizada" para "Web Explorer", mantém glifo genérico por não ser uma marca específica) — nenhuma migração de dados necessária, contas já criadas com esses serviços continuam funcionando.

**Ponto 3 (Sem números automáticos):** `suggestedName` na Etapa 2/3 agora é só `SERVICES[service].label` (ex.: "Instagram"), sem mais o sufixo `${accounts.length+1}` (ex.: "Instagram 14").

Build entregue: `OrbiSwitStack-Setup-0.22.0.exe`, sha256 `1a6c65c2dd9e5b2698cc7f79dbe25c2b3fa621a6d4b3cabb01e878e46c0eb1ab`.

## Fase 19 — Ícones "de app" estilo Apple/iOS + Threads e X (v0.23.0)

Pedido do usuário: substituir TODOS os ícones da grade (nada de genérico/ilustrado) por ícones no padrão "app oficial" Apple/iOS — squircle com sombra, fundo e glifo na cor/gradiente oficial — e adicionar Threads e X (antigo Twitter) no mesmo padrão.

Implementação em `ServiceIcon.tsx`, separada em dois modos:
- `ServiceGlyph` (inalterado no uso externo — sidebar, paleta de comandos, dashboard): glifo plano de 1 cor só, composto sobre o círculo de cor da própria conta, sem fundo próprio.
- `ServiceIcon` (só a grade da Etapa 1/3): novo modo "ícone de app" — squircle (`border-radius` ~22.3% do lado, sombra sutil) com fundo na cor/gradiente oficial de cada marca e o glifo em branco (ou na cor de marca sobre fundo branco, para as marcas cujo ícone oficial é assim: Gmail, Google Calendar, Google Earth, Pesquisa Google). Instagram e Messenger usam o gradiente oficial como fundo do squircle; TikTok usa 3 camadas (ciano + vermelho + branco) sobre fundo preto, reproduzindo o efeito da nota musical oficial; Threads e X usam fundo preto com o glifo branco.

Novos serviços: `threads` (Threads, threads.net) e `x` (X, x.com) — adicionados ao tipo `AccountService`, à tabela `SERVICES` (main e renderer) e ao final da grade (`SERVICE_GRID` em `AddAccountWizard.tsx`), com `allowedHosts` restritos aos domínios oficiais de cada um (mesmo padrão de isolamento já usado pelos demais serviços).

Traçados vetoriais extraídos do pacote npm `simple-icons` (CC0-1.0), usado só localmente para copiar os paths — não é dependência em runtime.

Build entregue: `OrbiSwitStack-Setup-0.23.0.exe`, sha256 `8248588af5da9a00c17e3d97246e20fd34843e67e24b0c4e3dca97c818cf16bc`.

## Fase 20 — Faixa preta entre header e WhatsApp + modal sem corte de nomes (v0.24.0)

**Bug do espaço preto (causa raiz real):** `windowManager.ts` tinha `HEADER_HEIGHT = 56` fixo, usado para calcular onde a `WebContentsView` do WhatsApp começa (`y: HEADER_HEIGHT`). A Fase 18 reduziu a altura real do `<header>` pra 32px (`h-8`), mas ninguém atualizou essa constante — sobravam exatamente 24px de espaço preto vazio entre a barra e a view nativa. Corrigido: `HEADER_HEIGHT = 32`, com comentário no código deixando explícito que essa constante precisa sempre bater com a altura real do Header.tsx.

**Modal "Adicionar conta" sem corte de nomes:** o modal usava o tamanho padrão (`sm`, 360px) com grade de 4 colunas — não havia largura suficiente para nomes como "Google Calendar"/"Pesquisa Google" sem truncar. Corrigido: modal passou pra `size="md"` (440px), grade reduzida pra 3 colunas (mais largura por item), removida a classe `truncate` do nome (agora quebra em até 2 linhas, sem "...", sem reduzir fonte abaixo de um tamanho legível).

**Acabamento dos ícones:** adicionado um leve "sheen" de vidro (gradiente branco translúcido no topo do squircle) e sombra refinada em `Squircle` (ServiceIcon.tsx), aproximando o acabamento do padrão "Liquid Glass" do iOS mais recente. Limitação registrada: o app usa o traçado vetorial OFICIAL de cada marca (mesma fonte simple-icons da Fase 19, nunca redesenhado) com esse acabamento de vidro aplicado por cima — não é uma cópia bit a bit do arquivo de ícone exato que a Apple/cada empresa distribui no iOS (esse arquivo não é algo que dá pra buscar/baixar deste ambiente). Se o usuário quiser fidelidade pixel-perfect, o caminho é ele enviar os arquivos de ícone (prints/exports do iPhone) para serem embutidos como imagem em vez de vetor.

Build entregue: `OrbiSwitStack-Setup-0.24.0.exe`, sha256 `bb5cb433ceda6ff5c72eac4db568b1b0d117d11bb26a77a336578a4da9d5029f`.

## Fase 21 (v0.25.0) — Reestruturação de Layout: Posição da Sidebar

**Pedido do usuário**: reestruturar o layout mantendo todas as funcionalidades intactas (alteração exclusiva de CSS/estrutura de layout), com três requisitos:
1. Sidebar esticada (100vh), ao lado do header.
2. Nova opção em Configurações para escolher a posição da sidebar: "Esquerda" (padrão) ou "Topo".
3. No modo "Topo": a sidebar vira uma barra horizontal no topo, todos os elementos internos (ícones, nomes, status, botões) se reorganizam para o eixo horizontal, e o conteúdo principal desce para ocupar o espaço restante abaixo dela.

**Implementação**:
- Novo tipo `SidebarPosition = 'left' | 'top'` persistido via `settingsStore.ts` (`getSidebarPosition`/`setSidebarPosition`, default `'left'`).
- Fluxo IPC completo (4 camadas): `settingsStore.ts` → `ipcRouter.ts` (`mw:get-sidebar-position`/`mw:set-sidebar-position`) → `preload.ts` → `renderer/types.ts` (`OrbiSwitStackApi`) → `useAppStore.ts` (campo `sidebarPosition` + ação `setSidebarPosition`, hidratado em `init()`).
- `windowManager.ts`: `getContentBounds` agora recebe `sidebarPosition` e calcula os bounds da `WebContentsView` nativa de forma diferente por modo — modo "left" reserva a largura da sidebar à esquerda; modo "top" reserva `HEADER_HEIGHT + SIDEBAR_TOP_HEIGHT` no topo. Novo método `WindowManager.setSidebarPosition(position)` recalcula os bounds ao vivo quando o usuário troca a opção em Configurações. `SIDEBAR_TOP_HEIGHT = 64` documentado com o mesmo aviso do `HEADER_HEIGHT` (precisa bater exatamente com a altura real renderizada da barra horizontal em `Sidebar.tsx`, senão reaparece o bug do "vão preto" da Fase 20).
- `App.tsx`: o layout raiz agora ramifica em duas árvores JSX distintas conforme `sidebarPosition` — "left": sidebar coluna inteira + header/conteúdo empilhados à direita; "top": header no topo, sidebar como barra horizontal logo abaixo, conteúdo ocupando o restante.
- `Sidebar.tsx`: reescrito para suportar os dois modos — no modo "top" vira um `<aside>` de altura fixa (64px) com `flex-row`, busca/filtros compactos, lista de contas rolável horizontalmente (`overflow-x-auto`), divisores verticais entre grupos; no modo "left" mantém o comportamento anterior (coluna vertical, redimensionável, altura total).
- `AccountItem.tsx`: prop opcional `horizontal` adiciona `shrink-0` para não encolher dentro da barra horizontal.
- `SettingsModal.tsx`: nova seção "Posição da barra lateral" na aba Geral & Aparência, com botões visuais (ícones `PanelLeft`/`PanelTop`) para alternar entre "Esquerda" e "Topo", seguindo o mesmo padrão visual do seletor de tema.

**Verificação**: `npx tsc -p tsconfig.json --noEmit` e `npx tsc -p tsconfig.renderer.json --noEmit` passaram sem erros após a reestruturação completa (incluindo a correção do gap de wiring de props entre `SettingsModal` e `GeneralAppearanceTab`).

**Entrega**: v0.25.0, instalador Windows NSIS dividido em 4 partes, hash SHA256 `55a1311116018a291d29d4b1277991385277319888b0e52eceb759912ee2b5cd`.

## Fase 22 (v0.26.0) — Correção Visual/Usabilidade do Modo "Topo" + Tamanho dos Ícones/Cards

**Pedido do usuário**: corrigir o visual e a usabilidade do modo "Sidebar no Topo" e adicionar uma opção de redimensionamento nas Configurações, com três partes:
1. Remover a conversão do scroll vertical do mouse em rolagem horizontal na barra superior — navegação só por rolagem nativa/arraste, botões de seta nas pontas ou barra de rolagem visível.
2. Ajuste visual: mais respiro entre os elementos, cards de conta centralizados verticalmente, altura geral do topo reduzida (sem invadir o cabeçalho do app), alinhamento perfeito entre busca/filtros/cards.
3. Nova opção "Tamanho dos Ícones/Cards" em Configurações (Pequeno/Médio/Grande), afetando dinamicamente ícone, texto e padding dos cards em AMBOS os modos (Esquerda e Topo).

**Implementação**:
- **Redesenho do card no modo "Topo"** (`AccountItem.tsx`): o modo horizontal deixou de espremer a linha larga do modo "Esquerda" (ícone + duas linhas de texto) numa barra baixa — agora é um tile compacto próprio (ícone em cima, nome embaixo, uma linha só). O texto de status (antes uma segunda linha) virou um tooltip (`title`) no tile inteiro; os estados continuam todos visíveis (indicador colorido de status, selo de não lidas, estrela de favorito, botão de "tentar novamente" em erro), só a apresentação mudou. O modo "Esquerda" manteve a linha original.
- **`ICON_SIZE_SPECS`** (`AccountItem.tsx`): tabela de tamanhos (Pequeno/Médio/Grande) com dois conjuntos de medidas — `row*` para o modo Esquerda (ícone 30/36/44px) e `tile*` para o modo Topo (ícone 22/28/38px, deliberadamente menor para caber numa barra compacta). "Médio" preserva exatamente o visual anterior do modo Esquerda (compatibilidade).
- **Bloqueio da conversão de scroll** (`Sidebar.tsx`): listener nativo de `wheel` (não o `onWheel` do React, que anexa como passivo e ignora `preventDefault`) no contêiner da barra horizontal — bloqueia só gestos verticais (`deltaY` dominante), deixando gestos horizontais de trackpad passarem.
- **Botões de seta + barra de rolagem visível**: `ChevronLeft`/`ChevronRight` nas pontas da área de contas, com `scrollBy({behavior:'smooth'})`, aparecendo/desaparecendo via `ResizeObserver` + evento de scroll conforme há ou não conteúdo para rolar em cada direção. A rolagem por arraste do mouse e a barra de rolagem visível (já estilizada globalmente em `index.css`) continuam disponíveis.
- **Respiro e alinhamento**: gaps (`gap-3`→`gap-4`) e padding (`px-3`→`px-4`) da barra aumentados; todos os elementos (rótulo, busca, filtros, divisores, cards, botão adicionar) alinhados via `items-center` numa única linha.
- **Altura dinâmica do topo por tamanho de ícone**: nova constante `TOP_BAR_HEIGHT_BY_ICON_SIZE` (Pequeno 50px / Médio 61px / Grande 77px) substitui o `SIDEBAR_TOP_HEIGHT` fixo da Fase 21 — Médio ficou menor que o valor fixo anterior (64px), cumprindo o pedido de reduzir a altura geral. Duplicada com o mesmo valor em `windowManager.ts` (`SIDEBAR_TOP_HEIGHT_BY_ICON_SIZE`), seguindo o padrão já estabelecido de manter a constante de bounds da `WebContentsView` em sincronia manual com a altura real do CSS (mesmo cuidado documentado desde a correção do bug da Fase 20).
- **Fluxo IPC completo do novo `IconSize`** (4 camadas, mesmo padrão das Fases anteriores): `settingsStore.ts` (`getIconSize`/`setIconSize`, default `'medium'`) → `ipcRouter.ts` (`mw:get-icon-size`/`mw:set-icon-size`, propaga para `WindowManager.setIconSize`) → `preload.ts` → `renderer/types.ts` (`OrbiSwitStackApi`) → `useAppStore.ts` (campo `iconSize` + ação `setIconSize`, hidratado em `init()`).
- **`windowManager.ts`**: `getContentBounds` e `WindowManager` agora recebem/guardam `iconSize` (11º parâmetro do construtor), recalculando os bounds da `WebContentsView` ao vivo quando o usuário troca o tamanho em Configurações (`setIconSize`).
- **`SettingsModal.tsx`**: nova seção "Tamanho dos ícones/cards" na aba Geral & Aparência, com três botões visuais (ícones `Square` em tamanhos crescentes) seguindo o mesmo padrão visual dos seletores de tema/posição da sidebar, mais uma nota explicando que afeta os dois modos.

**Verificação**: `npx tsc -p tsconfig.json --noEmit` e `npx tsc -p tsconfig.renderer.json --noEmit` passaram sem erros após todas as mudanças.

**Entrega**: v0.26.0, instalador Windows NSIS dividido em 4 partes, hash SHA256 `83cd707f9ec33521f4ca031825d757bd44cc2efc3022ff7c4199b115f5f87f93`.

## Fase 23/24 (v0.27.0) — Serviços de IA no Modal + Refatoração do Modo "Topo"

**Pedido do usuário (Ponto 1 — Modal "Adicionar conta")**: adicionar 7 serviços de IA (OpenAI/ChatGPT, Google Gemini, DeepSeek, Claude, Microsoft Copilot, Perplexity, Grok) na Etapa 1/3, mantendo o padrão visual e a grade intactos, e remover o botão "Cancelar" (só o X fecha o modal).

**Implementação (Fase 23)**:
- **Verificação de fontes oficiais**: checado o `simple-icons` (mesma biblioteca já usada nos ícones existentes) — Claude, Google Gemini, DeepSeek e Perplexity têm traçado vetorial oficial disponível; OpenAI/ChatGPT, Microsoft Copilot e Grok foram REMOVIDOS dessa biblioteca (normalmente por exigência de marca registrada da empresa). Isso foi explicado ao usuário antes de prosseguir.
- **Decisão do usuário**: incluir os 7 mesmo assim — os 4 com fonte oficial usam o traçado real (mesmo processo de sempre: extraído do `simple-icons`, dev-only, nunca dependência em runtime); os 3 sem fonte oficial (OpenAI, Copilot, Grok) recebem uma aproximação geométrica ORIGINAL, documentada em código como tal (`OpenAIFlowerGlyph`, `CopilotWingsGlyph`, `GrokAsteriskGlyph` em `ServiceIcon.tsx`) — não é o traçado oficial de nenhuma das três marcas.
- `services.ts`/`renderer/types.ts`: `AccountService` ganhou `openai`, `gemini`, `deepseek`, `claude`, `copilot`, `perplexity`, `grok`, cada um com `label`, `defaultUrl` e `color`.
- `AddAccountWizard.tsx`: os 7 novos serviços entraram no `SERVICE_GRID` (mesma grade 3 colunas, mesmo card visual — nenhuma mudança estrutural); o botão "Cancelar" da Etapa 1/3 foi removido — o fechamento do modal passa a ser só pelo X do `Modal.tsx`.

**Pedido do usuário (Ponto 2 — refatoração do modo "Sidebar no Topo")**: corrigir bugs de visibilidade, agrupamento e alinhamento — compactar o bloco de filtros à esquerda, corrigir corte de nomes, restaurar exibição de grupos/pastas na horizontal, ajustar altura/alinhamento vertical e empurrar "Adicionar conta"/versão para a extrema direita.

**Implementação (Fase 24)**:
- **Bug raiz dos agrupamentos identificado**: no modo "Topo", o wrapper interno de cada grupo (cabeçalho da pasta + lista de contas) não tinha classe flex — cabeçalho e contas empilhavam verticalmente (bloco-a-bloco) dentro de uma barra baixa demais para isso, cortando tudo. Corrigido tornando esse wrapper um `flex items-center` horizontal (`Sidebar.tsx`), igual ao resto da barra.
- **Corte de nomes eliminado**: o tile de conta (`AccountItem.tsx`) tinha `width` fixo + `truncate` + `max-width` calculado — trocado para `minWidth` (o tile cresce em LARGURA, nunca em altura, para caber o nome inteiro) e removido `truncate`/`max-width` do nome — a altura da barra continua 100% previsível, só a largura de cada tile varia.
- **Bloco de filtros compactado**: "CONTAS" + busca + filtros agrupados num único bloco com gap/padding mínimos, encostado na borda esquerda (busca reduzida de `w-40` para `w-24`, expandindo para `w-32` só no foco; filtros com padding e fonte reduzidos).
- **Altura e respiro**: `TOP_BAR_HEIGHT_BY_ICON_SIZE` aumentado (Pequeno 50→54 / Médio 61→66 / Grande 77→82, sincronizado em `windowManager.ts`) e removido `overflow-y-hidden` da área de contas — ícones, selos de favorito/não lidas e nomes não ficam mais colados/cortados nas bordas da barra.
- **"Adicionar conta" + versão sempre na extrema direita**: agrupados num bloco com `ml-auto`, garantindo que fiquem encostados na borda direita mesmo com poucas contas (antes dependiam só do `flex-1` da área de contas empurrar sozinho).

**Verificação**: `npx tsc -p tsconfig.json --noEmit` e `npx tsc -p tsconfig.renderer.json --noEmit` passaram sem erros após cada ponto.

**Entrega**: v0.27.0, instalador Windows NSIS dividido em 4 partes, hash SHA256 `96ac1cb339e6ed2721d2fe13420db607dbdf518c550d3559b840a6b344667298`.

## Fase 25 (v0.28.0) — Correções Finais do Modo "Topo" + Ajustes na Lista de IA

**Pedido do usuário (Ponto 1 — badge cortado)**: o selo de não lidas sobre o ícone da conta estava sendo cortado pela borda superior da barra no modo "Topo".

**Implementação**: identificada a causa exata — o selo (`-top-1.5`, 6px acima do ícone) ultrapassava por poucos pixels o topo do tile. Adicionado `TILE_BADGE_HEADROOM = 6` como padding-top extra SÓ no topo do tile (`AccountItem.tsx`), e a altura da barra (`TOP_BAR_HEIGHT_BY_ICON_SIZE`) aumentada em +6px em cada tamanho (Pequeno 54→60 / Médio 66→72 / Grande 82→88), sincronizada em `windowManager.ts` como sempre.

**Pedido do usuário (Ponto 2 — espaço vazio e pastas)**: eliminar o espaço vazio entre os filtros e a primeira conta, e exibir todas as instâncias (inclusive as dentro de pastas fechadas) em sequência contínua no modo "Topo", sem exigir clique para expandir.

**Implementação**:
- **Espaço vazio**: os botões de seta (◀ ▶) da Fase 22 ficavam ocultos só por opacidade quando não havia para onde rolar, mas continuavam ocupando espaço reservado no layout — trocado para renderização condicional (`{canScrollLeft && <button>...}`), então o botão simplesmente não existe no DOM quando não é necessário.
- **Pastas sempre expandidas no Topo**: no modo "Topo", a barra agora sempre renderiza uma única lista plana com TODAS as contas visíveis (`isTop || groups.length === 0`), ignorando cabeçalhos de pasta e o estado de recolhido/expandido — o agrupamento continua existindo como dado e controlando a apresentação normalmente no modo "Esquerda".

**Pedido do usuário (modal "Adicionar conta")**: remover o card do Claude da grade e atualizar os ícones dos demais 6 serviços de IA para o padrão oficial "iOS App Store" (cores/fundos descritos explicitamente para ChatGPT, Gemini e DeepSeek).

**Implementação**:
- `AddAccountWizard.tsx`: `claude` removido do `SERVICE_GRID` (a definição do serviço continua existindo em `services.ts`/`types.ts`, para não quebrar nenhuma conta já criada com esse serviço antes) — grade agora com 18 itens (6 linhas × 3 colunas), alinhamento perfeito sem linha incompleta.
- `ServiceIcon.tsx`: ChatGPT (openai) — logo preto puro (`#000000`, era um preto ligeiramente acinzentado) sobre fundo branco sólido, exatamente como pedido. Gemini — fundo escurecido para preto/quase-preto (`#0B0B0E`, era branco) com a "sparkle" (traçado oficial real) em degradê azul→roxo. DeepSeek — já estava exatamente como pedido (baleia azul sobre fundo branco), mantido sem alteração. Perplexity — fundo escurecido (`#151A1B`, era um teal claro) para casar com o ícone real do app, mantendo o traçado oficial (pinwheel). Copilot e Grok mantidos como na Fase 23 (sem fonte oficial disponível, aproximação já alinhada ao espírito da marca).

**Verificação**: `npx tsc -p tsconfig.json --noEmit` e `npx tsc -p tsconfig.renderer.json --noEmit` passaram sem erros após cada ponto.

**Entrega**: v0.28.0, instalador Windows NSIS dividido em 4 partes — desta vez a reunião das 4 partes foi testada localmente antes do envio (hash do arquivo remontado conferido byte a byte contra o original), depois da v0.27.0 ter chegado ao usuário com uma parte faltando. Hash SHA256: `b94b1cf3e7daa0ba3a30a664e5905e330d970bf857c29b15d1eb21a4d0db937c`.

## Fase 26 (v0.29.0) — Simplificação do Cabeçalho + Minimizar Filtros (Modo "Topo")

**Pedido do usuário**: simplificar o canto superior direito da barra no modo "Topo" e adicionar a função de minimizar o bloco de filtros à esquerda.

**Implementação**:
- **Canto superior direito simplificado**: o botão extenso "+ Adicionar conta" e o texto da versão (`v0.28.0`) foram substituídos por um único botão compacto (32×32px) só com o ícone "+", fixado na extrema direita da barra (`ml-auto`). A versão do app continua acessível na tela "Sobre".
- **Botão "Minimizar" nos filtros**: novo botão `ChevronsLeft`/`ChevronsRight` ("<<"/">>") ao lado do bloco "CONTAS" + busca + filtros. Ao minimizar, todo o bloco (label, campo de busca completo, filtros) é substituído por um único quadradinho com o ícone de lupa; ao clicar nele (ou no botão de expandir), o painel completo volta, com foco automático no campo de busca (`requestAnimationFrame` aguarda o input real voltar ao DOM antes de focar).
- **Ajuste dinâmico da lista de contas**: automático — como a área de contas já era `flex-1`, ela ocupa sozinha a largura extra liberada quando o bloco de filtros encolhe para o quadradinho, sem nenhuma lógica adicional de redimensionamento.

**Verificação**: `npx tsc -p tsconfig.json --noEmit` e `npx tsc -p tsconfig.renderer.json --noEmit` passaram sem erros.

**Entrega**: v0.29.0, instalador Windows NSIS dividido em 4 partes — junção testada localmente antes do envio (hash do arquivo remontado conferido byte a byte). Hash SHA256: `7cd671bac9209633b63754046af9158ee5bfdc274dad717063f8627af22691a5`.

## Fase 27 — Atualização automática (v0.30.0)

**Pedido do usuário**: ao atualizar o app e dar push no GitHub, quem já tem o programa instalado deveria ver um indicador vermelho em Configurações para clicar e atualizar.

**Implementação**:
- `electron-updater` integrado via `src/main/updateManager.ts`, apontando para as GitHub Releases do repositório (`package.json` → `build.publish`: provider `github`, owner `ViniRJ92`, repo `Orbi-Swit-Stack`).
- Checagem silenciosa e automática ao abrir o app (`autoUpdater.checkForUpdates()`) — nunca baixa nem instala sozinha.
- IPC (`mw:get-update-state`, `mw:check-for-update`, `mw:download-update`, `mw:install-update`) + evento `mw:update-status-changed` empurrado do processo principal pro renderer sempre que o estado muda.
- Indicador vermelho no botão "Configurações" do cabeçalho (`Header.tsx`) e na aba "Atualizações" do menu lateral de Configurações, acesos quando há versão disponível/baixando/baixada.
- Nova aba "Atualizações" em `SettingsModal.tsx`: mostra a versão instalada, status da verificação, barra de progresso do download e botão "Reiniciar e instalar agora" — download e instalação sempre disparados por clique do usuário, nunca automaticamente.

**Importante para o fluxo de publicação (manual, feito pelo usuário)**:
1. Rodar `npm run dist:win` gera, além do instalador, um `latest.yml` em `release/` (o electron-builder gera isso sozinho porque `build.publish` está configurado).
2. Criar uma **GitHub Release** no repositório com a tag da versão (ex.: `v0.30.0`) e anexar tanto o `OrbiSwitStack-Setup-X.Y.Z.exe` quanto o `latest.yml` — sem os dois arquivos juntos na Release, o auto-update não encontra a atualização.
3. Só instalações que já tiverem esta função (a partir da v0.30.0) enxergam atualizações futuras sozinhas; quem estiver em v0.29.0 ou anterior precisa instalar esta versão manualmente uma última vez.
4. Instalador não é assinado digitalmente — o Windows/SmartScreen pode avisar "editor desconhecido" tanto na instalação quanto durante a auto-atualização, como já acontecia antes.

**Verificação**: `npm run build` (tsc + vite) sem erros; `electron-builder --win` gerado com sucesso; hash local do instalador reconstituído a partir das partes bate com o original antes do envio.

**Entrega**: v0.30.0 em 4 partes + `latest.yml`, com instruções de junção/verificação enviadas ao usuário.

## Fase 27.1 — Correção do empacotamento (v0.30.1)

A v0.30.0 quebrava ao abrir no Windows com `Error: Cannot find module 'electron-updater'`. Causa raiz: `package.json` excluía `node_modules` inteiro do instalador (`"!node_modules/**/*"`) — um padrão que nunca tinha dado problema porque, até esta fase, nenhuma dependência de npm era usada em tempo de execução pelo processo principal (tudo que vinha de node_modules era só para o renderer, já embutido no JS pelo Vite). O `electron-updater`, ao contrário, é `require()`ado de verdade no processo principal.

Uma primeira tentativa (remover a exclusão e deixar o electron-builder incluir `node_modules` automaticamente) revelou um segundo problema: dependências transitivas do `electron-updater` (`builder-util-runtime`, `semver`, `fs-extra`) existem em múltiplas cópias/versões dentro de `node_modules` (por conflito com as mesmas libs usadas pelo próprio `electron-builder`), e o empacotador automático falhou silenciosamente em decidir quais copiar — ficariam de fora do instalador do mesmo jeito.

**Correção definitiva**: processo principal agora é empacotado com `esbuild` (`scripts/build-main.mjs`), gerando um bundle único por ponto de entrada (`main.js`, `preload.js`, `webviewPreload.js`) com todas as dependências de npm embutidas — só `electron` continua externo (fornecido pelo próprio runtime). `tsc` passa a rodar só como checagem de tipos (`--noEmit`); `node_modules` volta a ser excluído do instalador (`"!node_modules/**/*"`), agora com segurança, porque nada mais depende de existir fisicamente ali. Isso elimina esta classe de bug para qualquer dependência futura do processo principal, não só o electron-updater.

**Verificação feita antes de enviar**: `grep` no `main.js` bundlado confirmando que não sobrou nenhum `require()` de pacote externo (só módulos nativos do Node + `electron`); inspeção do `app.asar` gerado confirmando zero entradas de `node_modules`; teste real de subida do app empacotado sob Xvfb (`electron . --no-sandbox`) checando o log próprio do app (`orbi-swit-stack.log`) para confirmar inicialização limpa, sem exceções — só depois disso o instalador foi dividido, hash verificado e enviado.

## Fase 28 (v0.31.0) — Analytics: relatório "Hoje x Ontem" por instância

Analytics ganhou seções fixas "Atividade de hoje" e "Atividade de ontem", separadas do seletor de período geral (Hoje/7 dias/30 dias/personalizado) — cada instância mostra quantas novas interações (pessoas únicas) e quantas mensagens novas teve em cada um dos dois dias.

**Fonte do dado**: `viewManager.getChatEntries()` (Fase 17) ganhou um campo `dateTag` (`'today' | 'yesterday' | 'other'`), lido do próprio rótulo de horário/data que o WhatsApp Web já mostra ao lado do nome de cada conversa na lista lateral ("HH:MM" = hoje, "Ontem"/"Yesterday" = ontem) — sem nunca abrir a conversa. `chatActivityStore.ts` atribui cada mensagem nova ao dia (`dayKey` local "AAAA-MM-DD") resolvido a partir desse rótulo no momento da detecção, não do instante em que o app fez o polling — grupos nunca entram, e contagem incremental (nunca reconta mensagem já vista, mesma lógica de baseline/grace-period/settle da Fase 13/15).

**Interface**: `AnalyticsModal.tsx` — os dois KPIs soltos da Fase 17 ("Novas conversas"/"Mensagens") foram substituídos por dois `DailyActivityCard` (Hoje/Ontem), cada um listando por instância "N novas interações — M mensagens". Modal ampliada para `size="xl"` (1180×760, novo tamanho em `Modal.tsx`). Endpoint próprio `mw:get-chat-activity-daily` (sem parâmetro de intervalo, diferente de `mw:get-analytics-summary`) — `AnalyticsSummary` (main e renderer) perdeu o campo `chatActivity`, que não fazia mais sentido preso ao seletor de período geral.

**Limitação assumida**: o rótulo usado é o mesmo que o WhatsApp Web já mostra ao lado de cada conversa. Se o app ficar fechado por vários dias com mensagens acumuladas numa mesma conversa, o WhatsApp só mostra UM rótulo (o da mensagem mais recente) — o backlog inteiro é atribuído ao dia desse rótulo, por ser uma limitação da própria informação exibida pelo WhatsApp Web, não do app.

**Nota de proveniência (2026-08-29)**: o código desta fase foi construído e publicado como instalador `OrbiSwitStack-Setup-0.31.0.exe`, mas por uma falha no fluxo de publicação nunca chegou a ser commitado no repositório — a tag `v0.31.0` ficou apontando para o commit da v0.30.3 por meses/dias. Reconciliado nesta data a partir do `git diff` real fornecido pelo usuário; todos os arquivos de `src/main/*.ts` foram conferidos byte a byte contra o instalador publicado (extraído via NSIS → asar → sourcemap do esbuild) antes deste commit ser criado. Ver `git log` a partir daqui para o histórico correto e linear das versões seguintes.
