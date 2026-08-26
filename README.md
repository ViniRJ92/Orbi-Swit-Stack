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

A estrutura do projeto foi organizada para manter os principais domínios da aplicação separados.

```text
Orbi-Swit-Stack/
│
├── src/
│   ├── components/
│   │   ├── sidebar/
│   │   ├── modals/
│   │   ├── cards/
│   │   └── ui/
│   │
│   ├── whatsapp/
│   │   ├── sessions/
│   │   ├── connection/
│   │   ├── qr/
│   │   └── status/
│   │
│   ├── analytics/
│   │   ├── metrics/
│   │   ├── charts/
│   │   └── filters/
│   │
│   ├── webview/
│   │   ├── applications/
│   │   └── navigation/
│   │
│   └── core/
│       ├── state/
│       ├── storage/
│       └── configuration/
│
├── assets/
│   ├── icons/
│   ├── images/
│   └── screenshots/
│
├── docs/
│
├── .github/
│   └── workflows/
│
├── package.json
├── README.md
└── ...
```

> A estrutura acima representa a organização conceitual do projeto. Os diretórios podem evoluir conforme a arquitetura da aplicação amadurece.

---

## 🧩 Módulos

| Módulo                   | Função                               | Estado         |
| ------------------------ | ------------------------------------ | -------------- |
| **Multi-Instance Hub**   | Gerenciamento das instâncias         | 🟢 Ativo       |
| **Workspace Sidebar**    | Agrupamento e organização            | 🟢 Ativo       |
| **Connection Manager**   | Controle de conexão e sessões        | 🟢 Ativo       |
| **Analytics**            | Métricas e indicadores               | 🟡 Em evolução |
| **Web Apps**             | Aplicações web integradas            | 🟢 Ativo       |
| **QR Connection**        | Autenticação das instâncias WhatsApp | 🟢 Ativo       |
| **Auto-Reconnect**       | Reconexão automática                 | 🟡 Em evolução |
| **Desktop Distribution** | Build e distribuição desktop         | 🟡 Planejado   |

---

## 🛠️ Stack Tecnológica

### Interface

* HTML5
* CSS3
* JavaScript ES6+

### Desktop

* Electron
* Node.js

### Dados e comunicação

* LocalStorage
* REST APIs
* WebSockets

### Visualização

* Chart.js

### Desenvolvimento

* Git
* GitHub
* Claude Code
* Ferramentas de Inteligência Artificial

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

> Dependendo da versão e da configuração do projeto, algumas interfaces também podem ser executadas diretamente em ambiente de desenvolvimento utilizando ferramentas como o Live Server.

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
* [ ] Reconexão automática avançada
* [ ] Gerenciamento avançado de sessões

### Analytics

* [x] Analytics básico
* [x] Volume de atividade
* [x] Identificação de picos
* [ ] Comparação entre períodos
* [ ] Indicadores avançados de entrega
* [ ] Histórico detalhado por instância
* [ ] Dashboard operacional completo

### Desktop

* [x] Workspace integrado
* [x] Aplicações web
* [ ] Sistema de atualização automática
* [ ] Gerenciamento avançado de configurações
* [ ] Empacotamento e distribuição final

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
