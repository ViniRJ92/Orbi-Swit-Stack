# ⚡ Orbi Swit Stack

**Desktop Workspace para gerenciamento de múltiplas instâncias, aplicações web e operações centralizadas.**

O **Orbi Swit Stack** é uma plataforma desktop desenvolvida para centralizar, em um único ambiente, diferentes instâncias do WhatsApp e aplicações web utilizadas no dia a dia operacional.

A proposta é transformar múltiplas contas, sistemas e ferramentas independentes em um **workspace único, organizado, visual e escalável**, reduzindo a necessidade de alternar constantemente entre diferentes aplicativos e janelas.

---

## 🎯 Visão do Projeto

O Orbi Swit Stack foi concebido para funcionar como uma **central operacional desktop**, permitindo que diferentes serviços sejam organizados dentro de uma única interface.

A plataforma combina:

* 📱 Gerenciamento de múltiplas instâncias do WhatsApp
* 🗂️ Organização por agrupamentos e categorias
* 🖱️ Organização dinâmica via Drag & Drop
* 📊 Analytics operacional
* 🌐 Integração com aplicações e serviços web
* 🔌 Monitoramento de conexão das instâncias
* 🔄 Gerenciamento de sessões e reconexões
* 🧩 Arquitetura preparada para expansão

O objetivo não é apenas abrir diferentes aplicações em uma mesma janela, mas criar uma **camada central de gerenciamento e operação** sobre elas.

---

## ✨ Principais Recursos

### 📱 Hub de Multinstâncias

Gerenciamento centralizado de múltiplas instâncias do WhatsApp.

Cada instância possui seu próprio estado e pode ser organizada independentemente das demais.

Recursos incluem:

* Até **30 instâncias**
* Identificação individual de cada conta
* Status de conexão
* Gerenciamento independente de sessões
* Suporte a QR Code para conexão do WhatsApp
* Indicadores visuais de estado
* Organização por agrupamentos
* Instâncias independentes ou agrupadas

---

### 🗂️ Organização Inteligente

A barra lateral foi projetada para funcionar como um verdadeiro gerenciador de workspace.

É possível:

* Criar agrupamentos personalizados
* Reordenar agrupamentos
* Reordenar instâncias
* Arrastar instâncias para dentro de agrupamentos
* Remover instâncias de agrupamentos
* Organizar livremente a ordem dos itens
* Manter a organização persistida entre sessões

Instâncias que ainda não pertencem a um agrupamento são automaticamente posicionadas na área correspondente, sem a necessidade de criar uma categoria artificial de **"Sem agrupamento"**.

---

### 📊 Analytics

O módulo de Analytics concentra informações operacionais relacionadas às instâncias do WhatsApp.

A arquitetura foi planejada para permitir evolução progressiva dos indicadores, incluindo:

* Volume de mensagens
* Mensagens enviadas e recebidas
* Desempenho por instância
* Picos de atividade
* Comparação entre períodos
* Indicadores de atividade
* Status operacional
* Métricas de conexão e disponibilidade

O Analytics é separado das aplicações web externas, evitando misturar dados operacionais distintos.

---

### 🌐 Aplicações Web Integradas

Além das instâncias do WhatsApp, o workspace pode centralizar aplicações e serviços web utilizados na operação.

Exemplos:

* 🌎 Google Earth
* 📧 Gmail
* 🌐 Navegador Livre
* 🔗 Sistemas web próprios
* 🖥️ Ferramentas internas
* 🌍 URLs personalizadas

Cada aplicação possui seu próprio comportamento e identidade visual.

Aplicações web externas **não utilizam o fluxo de QR Code**, que é reservado às instâncias do WhatsApp.

---

### 🔌 Monitoramento de Conexão

O sistema acompanha o estado das instâncias e permite identificar rapidamente situações como:

* 🟢 Conectado
* 🟡 Conectando
* 🔴 Desconectado
* ⚠️ Restrito
* 🔄 Reconectando
* 📱 Aguardando QR Code

O fluxo de QR Code é específico para instâncias que realmente utilizam esse mecanismo de autenticação.

---

## 🖥️ Interface

O Orbi Swit Stack utiliza uma interface inspirada em aplicações desktop modernas, priorizando:

* Organização visual
* Baixa poluição da interface
* Navegação rápida
* Hierarquia clara de informações
* Indicadores de estado
* Modais contextuais
* Organização por workspace
* Experiência consistente entre diferentes aplicações

A interface foi construída para que o usuário consiga administrar diversas operações sem perder a referência de qual instância ou aplicação está utilizando.

---

## 🏗️ Arquitetura

Aplicativo desktop Electron + TypeScript. Cada instância é uma sessão isolada do Chromium (`session.fromPartition`), com o conteúdo web renderizado numa `WebContentsView` própria — sem API não oficial, sem bot, sem automação de mensagens e sem engenharia reversa: só a interface oficial de cada serviço, dentro de uma sessão isolada.

```text
Orbi-Swit-Stack/
│
├── src/
│   ├── main/                    # processo principal (Electron), empacotado com esbuild
│   │   ├── accountStore.ts      # persistência de metadados das contas (JSON)
│   │   ├── accountManager.ts    # troca de conta, suspensão automática/manual
│   │   ├── viewManager.ts       # isolamento por partition, leituras passivas do DOM
│   │   ├── windowManager.ts     # janela principal, bounds da view nativa
│   │   ├── analyticsStore.ts    # Analytics: volume/instância líder
│   │   ├── chatActivityStore.ts # Analytics: relatório Hoje x Ontem por conversa
│   │   ├── settingsStore.ts / groupStore.ts / updateManager.ts / releaseNotes.ts
│   │   ├── ipcRouter.ts         # todos os comandos expostos à UI, num só lugar
│   │   └── preload.ts / webviewPreload.ts
│   │
│   └── renderer/                # interface React (Vite)
│       ├── components/          # Sidebar, Header, modais, Analytics, etc.
│       ├── store/useAppStore.ts # estado global (Zustand)
│       └── types.ts
│
├── assets/                       # ícones do app
├── scripts/                       # build-main.mjs (esbuild), gen_icon.py
├── package.json
├── status_doc.md                 # changelog interno detalhado, por fase
└── README.md
```

Toda nova capacidade exposta ao renderer segue o mesmo padrão de 4 camadas: store/manager no processo principal → handler em `ipcRouter.ts` → ponte em `preload.ts` → tipagem + estado no renderer (`types.ts` / `useAppStore.ts`).

---

## 🧩 Módulos

| Módulo                   | Função                               | Estado         |
| ------------------------ | ------------------------------------ | -------------- |
| **Multi-Instance Hub**   | Gerenciamento das instâncias         | 🟢 Ativo       |
| **Workspace Sidebar**    | Agrupamento e organização            | 🟢 Ativo       |
| **Connection Manager**   | Controle de conexão e sessões        | 🟢 Ativo       |
| **Analytics**            | Volume por instância, líder, relatório Hoje x Ontem | 🟢 Ativo |
| **Web Apps**             | Aplicações web integradas            | 🟢 Ativo       |
| **QR Connection**        | Autenticação das instâncias WhatsApp | 🟢 Ativo       |
| **Auto-Suspend**         | Suspensão automática por ociosidade/perfil de desempenho | 🟢 Ativo |
| **Auto-Update**          | Checagem/download/instalação de atualizações via GitHub Releases | 🟢 Ativo |
| **Desktop Distribution** | Instalador Windows (NSIS) via electron-builder | 🟢 Ativo |

---

## 🛠️ Stack Tecnológica

### Interface

* React 19 + TypeScript
* Tailwind CSS 4
* Zustand (estado global)
* Framer Motion (animações)
* Vite (build do renderer)

### Desktop

* Electron
* `session.fromPartition` para isolamento por conta
* esbuild (empacotamento do processo principal)
* electron-builder (instalador Windows/NSIS)
* electron-updater (atualização automática via GitHub Releases)

### Persistência

* JSON local em `userData` (contas, grupos, configurações, Analytics) — sem banco de dados externo
* Sessões (cookies/localStorage/IndexedDB) isoladas e persistidas pelo próprio Electron, por partition

### Visualização

* Recharts (gráficos do Analytics)

### Desenvolvimento

* TypeScript (`tsc --noEmit` para checagem de tipos em main e renderer)
* Git / GitHub
* Claude Code / Inteligência Artificial como apoio de engenharia

---

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/ViniRJ92/Orbi-Swit-Stack.git
```

### 2. Entre no diretório

```bash
cd Orbi-Swit-Stack
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Inicie a aplicação

```bash
npm start
```

Isso roda o build completo (`tsc` + esbuild + Vite) e abre o Electron. Para gerar o instalador Windows: `npm run dist:win` (gera `.exe` + `latest.yml` em `release/`).

---

## 📌 Roadmap

O projeto está em evolução contínua.

### Workspace

* [x] Sidebar de múltiplas instâncias
* [x] Agrupamentos personalizados
* [x] Organização por Drag & Drop
* [x] Reordenação de instâncias
* [x] Persistência da organização
* [x] Suporte para até 30 instâncias

### WhatsApp

* [x] Gerenciamento de múltiplas sessões
* [x] Status individual de conexão
* [x] Fluxo de QR Code
* [x] Indicadores de conexão
* [x] Suspensão automática por ociosidade (perfis de desempenho configuráveis)
* [ ] Reconexão automática avançada além da suspensão/reativação atual

### Analytics

* [x] Volume por instância e identificação da instância líder
* [x] Detecção de mensagens novas por evento em tempo real (não por polling)
* [x] Relatório fixo "Hoje x Ontem" por instância
* [x] Comparação com período anterior
* [x] Picos de atividade por horário
* [ ] Indicadores de status de entrega (fora de escopo — exigiria inspecionar ticks/DOM interno de cada mensagem)
* [ ] Dashboard operacional completo (histórico além de Hoje/Ontem)

### Desktop

* [x] Workspace integrado
* [x] Aplicações web
* [x] Sistema de atualização automática (GitHub Releases, checagem periódica + notificação nativa)
* [x] Tela "O que há de novo" por versão
* [x] Configurações em abas (aparência, instâncias, desempenho, backup, atualizações)
* [x] Empacotamento e distribuição (instalador Windows via electron-builder)

---

## 🗒️ Histórico de Versões

Changelog técnico completo, fase a fase, em [`status_doc.md`](status_doc.md). Resumo:

| Versão | Destaque |
| --- | --- |
| v0.33.1 | Correção: canal de conversa aberta do Analytics reescrito para event-driven (elimina risco de duplicidade) |
| v0.33.0 | Segundo canal de contagem para a conta usada em tempo real (corrige instância líder sumindo da lista) |
| v0.32.0 | Checagem periódica de atualização, notificação nativa, tela "O que há de novo" |
| v0.31.0 | Analytics: relatório "Hoje x Ontem" por instância |
| v0.30.x | Auto-atualização via GitHub Releases, correções de empacotamento |

---

## 🤖 Desenvolvimento Assistido por IA

O desenvolvimento do Orbi Swit Stack utiliza **Inteligência Artificial como ferramenta de apoio à engenharia de software**.

A IA é utilizada principalmente para auxiliar em:

* Arquitetura e organização de código
* Refatoração
* Desenvolvimento de componentes
* Análise de bugs
* Melhorias de interface
* Desenvolvimento de funcionalidades
* Testes e validações
* Documentação técnica

Ferramentas de IA fazem parte do processo de desenvolvimento, mas a arquitetura, validação e decisões finais do projeto permanecem sob controle do desenvolvimento humano.

---

## 🔐 Privacidade e Dados

O Orbi Swit Stack foi projetado para trabalhar com instâncias e aplicações utilizadas em ambientes operacionais.

Dados de sessão, credenciais e informações sensíveis devem ser tratados de acordo com as configurações e mecanismos de armazenamento definidos pela aplicação.

**Nunca publique credenciais, tokens, sessões, QR Codes, arquivos de autenticação ou informações sensíveis no repositório.**

Utilize variáveis de ambiente e mecanismos seguros de armazenamento sempre que aplicável.

---

## 📸 Screenshots

As capturas de tela da aplicação podem ser encontradas em:

```text
assets/screenshots/
```

> Esta seção pode ser expandida conforme novas versões da interface forem disponibilizadas.

---

## 🗺️ Visão de Longo Prazo

O objetivo do Orbi Swit Stack é evoluir de um simples gerenciador de instâncias para um **workspace operacional completo**.

A visão futura inclui:

```text
                    ORBI SWIT STACK
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       WhatsApp        Analytics       Web Apps
          │                │                │
     Multi-Sessões     Métricas       Aplicações
     Conexões          Histórico      Navegação
     Status            Performance    Sistemas
          │                │                │
          └────────────────┼────────────────┘
                           │
                    CENTRAL WORKSPACE
```

Uma única interface para organizar, monitorar e operar diferentes ferramentas utilizadas no ambiente de trabalho.

---

## 📄 Licença

Este projeto é de **uso privado**.

Todos os direitos reservados.

© 2026 **Vinicius Braga**

---

## 👨‍💻 Autor

**Vinicius Braga**

Desenvolvimento de soluções, automações, ferramentas desktop e sistemas integrados utilizando tecnologias modernas e Inteligência Artificial.

---

<p align="center">

**⚡ Orbi Swit Stack**

*One Workspace. Multiple Operations.*

</p>
