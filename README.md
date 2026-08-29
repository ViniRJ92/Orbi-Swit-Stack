# Orbi Swit Stack

Criado por **Vinicius Braga**.

Gerenciador de múltiplas contas do WhatsApp Web, cada uma em uma sessão
totalmente isolada e persistente. **O isolamento por conta (uma
`BrowserView` + `session.fromPartition` própria) não mudou desde a Fase 1**
— esta fase foi só acabamento: aparência, robustez e diagnóstico.

## O que mudou nesta fase

- **Modo claro/escuro**: em Configurações → Aparência, com três opções — Escuro, Claro, Seguir o sistema. A escolha é salva (`settings.json`) e aplicada de novo a cada abertura; no modo "seguir o sistema", o app também reage se você trocar o tema do Windows com ele aberto.
- **Animações discretas**: transições suaves ao abrir/fechar modais, trocar de conta, e um pequeno "pop" no contador de não lidas — nada chamativo, só feedback visual de que algo mudou.
- **Backup e restauração** (Configurações → Backup das contas): exporta um arquivo `.json` com nome/cor/ordem de cada conta. **Importante**: o backup guarda só isso — nunca login, cookies ou qualquer dado de sessão (essas informações continuam exclusivamente na partition isolada de cada conta, em disco). Restaurar um backup atualiza contas existentes e recria as que faltarem com o mesmo `id` de antes: se a pasta de sessão daquela conta ainda existir no disco (por exemplo, você só perdeu a lista de contas, não desinstalou o programa), ela volta logada; se os dados da sessão foram apagados de vez, ela pede QR Code normalmente. Isso é uma limitação real do que um backup de metadados pode garantir, não um bug.
- **Tratamento de erros de carregamento**: se o WhatsApp Web de uma conta falhar ao carregar (por exemplo, sem internet), a conta aparece com um indicador vermelho e "Falha ao carregar" + botão "Tentar de novo" na barra lateral, em vez de mostrar uma tela em branco sem explicação.
- **Log de diagnóstico em arquivo**: eventos como iniciar/encerrar o app, criar/remover conta, suspensão automática, falhas de carregamento e erros não tratados agora ficam registrados em `logs/orbi-swit-stack.log` (dentro da pasta de dados do app), com rotação automática ao passar de 5 MB. Botão "Abrir pasta de logs" em Configurações → Diagnóstico. Nenhum conteúdo de mensagem é registrado.
- Captura de erros não tratados no processo principal (`uncaughtException`, `unhandledRejection`, travamento de página) para que um erro inesperado fique registrado em vez de falhar silenciosamente.

## O instalador Windows agora foi gerado e testado de verdade

Nas fases anteriores eu não tinha como gerar o `.exe` real neste ambiente
(Linux sem `wine`). Nesta fase instalei o `wine` (`wine`, `wine32:i386`)
neste ambiente especificamente para rodar a mesma ferramenta que o
`electron-builder` usaria numa máquina Windows, e consegui gerar o
instalador de verdade: **`OrbiSwitStack-Setup-0.5.0-fase5.exe`** (~155 MB,
um NSIS válido — confirmado com `file`: `PE32 executable ... Nullsoft
Installer self-extracting archive`). Ele está anexado nesta mensagem, além
do código-fonte.

O que eu **não** consigo fazer neste ambiente é efetivamente instalar e
abrir esse `.exe` (não tenho Windows aqui) — então o teste funcional final
(assistente de instalação, atalhos, abrir o app instalado) ainda depende de
você rodar numa máquina Windows. Se algo falhar nesse teste, me manda a
mensagem de erro exata que eu investigo antes de propor uma correção — não
vou adivinhar.

Durante esse processo encontrei e corrigi um problema real de configuração:
o `electron-builder` tentava gerar metadados de atualização automática por
padrão (procurando um repositório Git/GitHub configurado) e travava com
`Cannot read properties of null (reading 'channel')` por não haver nenhum
destino de publicação definido. Corrigi adicionando `"publish": null` em
`package.json` — isso desliga a geração desses metadados até você decidir
(pendência já registrada na Fase 4) onde as versões serão publicadas.

## Checklist de validação da Fase 5

1. Repetir os testes de isolamento e persistência das fases anteriores — nada nessa parte deve ter mudado.
2. Configurações → Aparência: trocar entre Escuro/Claro/Sistema e confirmar que a interface toda (não só a lista de contas) muda de cor.
3. Configurações → Backup: exportar um backup, editar/renomear uma conta, importar o backup de novo e confirmar que o nome antigo volta.
4. Desconectar a internet e reabrir uma conta (ou usar uma rede inválida) → confirmar que aparece "Falha ao carregar" com o botão "Tentar de novo", e que ele funciona ao reconectar.
5. Verificar em Configurações → Diagnóstico → "Abrir pasta de logs" que o arquivo `orbi-swit-stack.log` existe e tem entradas (abrir/fechar contas etc.).
6. Instalar `OrbiSwitStack-Setup-0.5.0-fase5.exe` numa máquina Windows de verdade e confirmar: assistente de instalação aparece, atalho no Menu Iniciar e na área de trabalho são criados, app abre com o nome/ícone corretos.

## O que já existia e continua igual (Fases 1–4)

Isolamento total por conta, login por QR Code, persistência entre
reinícios, até 20 contas, suspensão automática/manual, bandeja do Windows,
"Iniciar com o Windows", atalhos de teclado (`Ctrl+1..9`, `Ctrl+Tab`),
renomear/adicionar/remover conta com apagamento real dos dados ao remover,
notificações nativas, nome/ícone/instalador "Orbi Swit Stack".

## Pendência ainda aberta: atualização automática

Continua exatamente como descrito na Fase 4 — falta você decidir onde
hospedar as releases (GitHub Releases é a sugestão) e se vai usar
certificado de assinatura de código, para eu configurar o
`electron-updater` corretamente. Enquanto isso não é decidido, deixei a
publicação explicitamente desligada (`"publish": null`) para o build não
quebrar.

## Como rodar em desenvolvimento

```bash
npm install
npm start
```

## Como gerar o instalador você mesmo

```bash
npm run dist:win
```

Em uma máquina Windows isso roda direto. Em Linux, precisa de `wine`
instalado (`sudo apt-get install wine wine32:i386` em distros baseadas em
Debian/Ubuntu, com multiarch i386 habilitado) — foi exatamente esse o
caminho usado para gerar o `.exe` anexado aqui.

## Estrutura do projeto

```
src/
  main/
    main.ts           ciclo de vida do app, janela, bandeja, notificações, atalhos, IPC
    accountStore.ts    persistência de metadados das contas + backup/restauração
    settingsStore.ts   preferência de tema (novo na Fase 5)
    logger.ts          log de diagnóstico em arquivo (novo na Fase 5)
    viewManager.ts      criação/isolamento/suspensão das BrowserViews, detecção de erro de carregamento
    webviewPreload.ts   preload injetado dentro do WhatsApp Web (status + debounce)
    preload.ts          preload da janela principal (bridge seguro para o renderer)
    types.ts            tipos compartilhados
  renderer/            interface (HTML/CSS/TS), sem Node.js exposto
assets/
  icon.png / icon.ico  ícones (execução / instalador)
```

## Segurança e limites (por design)

- Sem API não oficial, sem bot, sem automação de envio — só a UI oficial do WhatsApp Web dentro de sessões isoladas.
- Backup exporta só metadados de exibição — nunca login/cookies/tokens.
- Log de diagnóstico não grava conteúdo de mensagens.
- `contextIsolation: true` e `nodeIntegration: false` em todas as janelas/views.
