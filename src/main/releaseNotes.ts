/**
 * Notas de versão ("O que há de novo") mostradas automaticamente na
 * primeira vez que o usuário abre uma versão nova do app.
 *
 * Decisão de arquitetura: o texto fica cadastrado localmente aqui, dentro
 * do próprio instalador, em vez de ser buscado da API de Releases do
 * GitHub em tempo de execução. Motivo: o repositório do projeto está
 * marcado como privado (ver Fase 28.1 do status do projeto), e a API
 * pública do GitHub não enxerga releases de um repositório privado sem um
 * token de acesso. Embutir um token só para isso seria menos seguro sem
 * necessidade (o mesmo trade-off já documentado para o auto-update em si).
 * Buscar do GitHub também exigiria rede disponível só para mostrar um
 * texto que já sabemos de antemão.
 *
 * Uso: a cada nova versão publicada, adicionar uma entrada aqui com a
 * mesma chave usada em `package.json` -> version. Se o repositório se
 * tornar público no futuro, é possível trocar `resolveWhatsNew` para
 * buscar da API do GitHub em vez desta tabela, sem mudar o contrato de
 * IPC (`mw:get-whats-new`/`mw:ack-whats-new`) usado pelo renderer.
 *
 * Fase 41: padrão de escrita destes textos, a pedido do usuário.
 *  • Marcador de lista é sempre "•", nunca hífen.
 *  • Nada de hífen ou travessão emendando orações no meio da frase. Usar
 *    vírgula, ponto final, ou reescrever.
 *  • Frases curtas e diretas. "Adicionada opção para X", não "O sistema
 *    agora permite que o usuário realize X".
 *  • Sem conectivos de encheção ("Além disso", "Vale ressaltar", "Note
 *    que", "Portanto").
 *  • Acentuação e pontuação corretas.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */

export const RELEASE_NOTES: Record<string, string> = {
  '0.31.0': [
    'Analytics: relatório "Hoje x Ontem" por instância',
    '',
    '• Novas seções "Atividade de hoje" e "Atividade de ontem", com o número de interações e de mensagens novas por instância.',
    '• Contagem incremental, sem duplicidade. Navegar entre instâncias não reconta o que já foi visto.',
    '• Sem rastreamento de nomes ou telefones, só números por instância.',
    '• Modal do Analytics ampliada, com mais espaço e rolagem vertical.',
  ].join('\n'),
  '0.32.0': [
    'Atualizações mais visíveis',
    '',
    '• O app passa a verificar novas versões também enquanto fica aberto, não só ao iniciar.',
    '• Quando uma atualização fica disponível, uma notificação do Windows avisa na hora.',
    '• Esta tela de novidades. Toda versão com mudanças relevantes passa a mostrá-la na primeira abertura.',
  ].join('\n'),
  '0.33.0': [
    'Analytics: correção da instância mais usada',
    '',
    '• Corrigido um caso em que a instância com mais atividade real não aparecia na liderança do Analytics.',
    '• Causa: mensagens de uma conversa aberta são marcadas como lidas quase na hora, então o contador de não lidas nunca refletia esse movimento.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.1': [
    'Analytics: correção de duplicidade ao trocar de instância',
    '',
    '• Corrigido um caso em que reabrir o app ou trocar de instância contava mensagens repetidas.',
    '• O contador da conversa aberta passa a reagir ao instante em que a mensagem chega, em vez de reler a tela periodicamente.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.2': [
    'Analytics: correção do histórico contado como mensagem nova',
    '',
    '• Corrigido um caso em que abrir uma conversa contava o histórico inteiro dela como mensagens novas.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.3': [
    'Analytics: Hoje e Ontem em tempo real',
    '',
    '• O relatório "Atividade de hoje/ontem" passa a contar a conversa aberta pelo mesmo mecanismo em tempo real do Volume total, não só pela lista lateral.',
    '• Cobre o caso de responder um cliente ao vivo. Mensagens trocadas numa conversa aberta entram na contagem do dia certo.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.4': [
    'Analytics: correção na identificação do contato',
    '',
    '• Corrigido um caso em que o nome do contato da conversa aberta não era identificado, impedindo o relatório de contar a mensagem.',
  ].join('\n'),
  '0.33.5': [
    'Analytics: recupera mensagens de hoje e ontem já carregadas',
    '',
    '• Mensagens de hoje ou ontem que já estavam na tela ao abrir a conversa agora entram na contagem, sem recontar o que já passou dessa janela.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.6': [
    'Analytics: corrige rolagem confundida com mensagem nova',
    '',
    '• Rolar a conversa para ver histórico antigo podia ser confundido com mensagem nova chegando. Corrigido.',
    '• Toda mudança na conversa passa a reclassificar o que está visível pelo divisor de data (Hoje/Ontem), nunca pelo instante em que apareceu na tela.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.33.7': [
    'Corrige quedas de sessão na conta mais ativa',
    '',
    '• Corrigido: a conta com mais mensagens chegando podia ficar sobrecarregada e cair a sessão com o WhatsApp, mesmo estando tudo certo.',
    '• Causa: uma verificação interna rodava sem limite a cada mudança na tela, e contas muito ativas geram muitas mudanças por segundo. Agora essa verificação é agrupada, sem perder nenhuma detecção.',
    '• Isso também explicava contas com atividade real ausentes do Analytics. A sobrecarga impedia o rastreamento de se firmar antes da sessão cair.',
    '• Modo de desempenho "Personalizado": deixou de suspender contas por tempo parado quando o limite de contas carregadas não está sendo atingido.',
  ].join('\n'),
  '0.33.8': [
    'Analytics: corrige conversas grandes não contadas',
    '',
    '• Corrigido: conversas com bastante histórico podiam não ter nenhuma mensagem de hoje ou ontem contada, mesmo com atividade real.',
    '• Causa: a contagem dependia do marcador "Hoje"/"Ontem" continuar visível, e o WhatsApp Web remove esse marcador quando há muita mensagem acima dele.',
    '• Agora cada mensagem carrega a própria data, o mesmo dado que a função "copiar" do WhatsApp já usa. A contagem funciona independente do tamanho da conversa.',
    '• Sem leitura de texto, remetente ou mídia.',
  ].join('\n'),
  '0.34.0': [
    'Login nos serviços e botão de recarregar',
    '',
    '• Corrigido o erro "Failed to open popup window" no TikTok e outros. O login social precisa abrir uma janela, e o app recusava todas. Agora ela abre na mesma sessão isolada da instância.',
    '• Corrigido também o bloqueio da própria tela de login. Quando o serviço encaminha para o site do provedor (Google, Facebook, Apple, Microsoft), a navegação era barrada pela lista de domínios permitidos. Esses domínios agora são aceitos em todos os serviços, menos WhatsApp.',
    '• Novo botão de recarregar no topo, com atalhos F5 e Ctrl+R.',
    '',
    'Limitação conhecida, que não é falha do app: o Google bloqueia login de conta Google dentro de navegadores embutidos como este. Por isso Gmail, Google Calendar, Google Earth e "Continuar com Google" mostram "esse navegador ou app pode não ser seguro". Nos serviços com outras formas de entrar, como e-mail, telefone, Facebook ou Apple, o login funciona.',
  ].join('\n'),
  '0.34.1': [
    'Serviços do Google que exigem login saíram da lista',
    '',
    '• Gmail, Google Calendar, Google Earth e Gemini não aparecem mais ao adicionar uma conta. Todos exigem entrar com conta Google, e o Google recusa esse login dentro de aplicativos como este.',
    '• "Pesquisa Google" continua na lista e funciona normalmente. Buscar no Google não exige login.',
    '• Instâncias desses serviços que você já criou continuam abrindo como antes. Nada foi apagado.',
    '• Fora do WhatsApp, o status agora diz "Aberto" em vez de "Conectado". O app só sabe que a página carregou, não se você está logado.',
  ].join('\n'),
  '0.35.0': [
    'Analytics em tela cheia, com números que fecham',
    '',
    '• O Analytics deixou de ser uma janela flutuante e virou página inteira, usando toda a largura e altura.',
    '• Números unificados. "Volume total", "Instância líder", "Média por conta", "Movimento por instância" e "Horários de pico" passam a vir da mesma contagem por mensagem que já alimentava "Atividade de hoje/ontem".',
    '• Antes eram dois sistemas diferentes na mesma tela, um contando pelo aviso de não lidas da conta inteira e outro mensagem por mensagem. Por isso os blocos nunca batiam.',
    '• O "Volume total" fica menor do que você via antes. O número antigo estava inflado.',
    '• O período "Hoje" passa a casar exatamente com o card "Atividade de hoje".',
    '• Corrigido o gráfico "Movimento por instância", que escondia o nome de algumas instâncias.',
    '• Grupos continuam fora da contagem.',
  ].join('\n'),
  '0.35.1': [
    'Corrige mensagens contadas em dobro ao abrir a conversa',
    '',
    '• Este era o motivo dos números inflados. Quando chegavam mensagens numa conversa ainda não aberta, o app contava pelo aviso de não lidas. Ao abrir a conversa depois, lia os balões e contava as mesmas mensagens outra vez. Cinco viravam dez.',
    '• Agora a leitura balão a balão vira a verdade daquela conversa naquele dia. O que o aviso de não lidas tinha estimado é descartado, em vez de somar por cima.',
    '',
    'Os dados gravados antes desta versão continuam inflados. Para recomeçar com números limpos, use "Limpar dados do Analytics" em Configurações.',
  ].join('\n'),
  '0.35.2': [
    'Ajustes de segurança na correção da contagem',
    '',
    '• Corrigido: depois de usar "Limpar dados do Analytics", as conversas já abertas no dia parariam de ser contadas até o dia seguinte.',
    '• Corrigido: uma conversa já aberta uma vez no dia deixaria de contar as mensagens que chegassem depois, caso você não a abrisse de novo. O aviso de não lidas volta a contar entre uma abertura e outra.',
    '• Os números já gravados nunca são apagados por esta correção. Podem estar inflados, mas nada de real é destruído.',
  ].join('\n'),
  '0.35.3': [
    '"Limpar dados do Analytics" agora zera de verdade',
    '',
    '• Antes o botão limpava o histórico salvo, mas cada instância aberta continuava lembrando quais mensagens já tinha reportado. A conversa aberta na hora só voltava a ser contada depois de trocar de conversa ou recarregar.',
    '• Agora limpar zera também essa memória dentro de cada instância e recomeça a leitura na hora.',
  ].join('\n'),
  '0.35.4': [
    'Contagem passa a ler as notificações que já estão na tela',
    '',
    '• Antes, ao limpar os dados ou na primeira vez que o app rodava, as mensagens não lidas já presentes na lista viravam apenas ponto de partida e nunca eram contadas. Na prática, limpar os dados jogava fora a atividade do dia.',
    '• Agora o app lê o número de não lidas de cada conversa junto com o rótulo de dia que o WhatsApp mostra ao lado, e registra aquilo como mensagens daquele dia. Conversa com rótulo mais antigo que ontem não entra.',
    '• Ao abrir a conversa, esse número estimado é apagado e regravado pelo total real dos balões.',
    '• Reabrir o app não conta nada de novo. Só semeia conversa que ainda não tinha registro.',
  ].join('\n'),
  '0.35.5': [
    'Ajustes na tela do Analytics',
    '',
    '• Corrigido o botão "Comparar com período anterior", que vazava para fora da área da página.',
    '• A tecla Esc volta a fechar o Analytics.',
  ].join('\n'),
  '0.36.0': [
    'Suas próprias mensagens deixam de ser contadas',
    '',
    '• O filtro que deveria excluir as mensagens enviadas por você existia desde o início, mas nunca funcionou. Ele procurava um formato de identificador que esta versão do WhatsApp Web não usa. Tudo que você enviava entrava no relatório como recebido.',
    '• Descoberto conferindo os identificadores realmente gravados no seu computador. Nenhum tinha a marca que o código procurava.',
    '• A separação passa a usar a marcação que o próprio WhatsApp coloca na bolha para alinhar enviada à direita e recebida à esquerda.',
    '',
    'Os números já gravados incluem suas mensagens e continuam inflados. Use "Limpar dados do Analytics" para recomeçar.',
  ].join('\n'),
  '0.36.1': [
    'Conta o dia inteiro, não só o que coube na tela',
    '',
    '• Corrigido o caso da conversa com bastante movimento. Ao abrir, o WhatsApp desenha só as mensagens mais recentes, e as demais mensagens de hoje nem chegavam a existir na página.',
    '• Agora o app percorre a conversa para trás até passar de ontem, conta tudo de hoje e ontem, e devolve a tela para onde você estava. Nunca vai além de ontem.',
    '• Você verá a conversa se mover por alguns segundos ao abri-la. É esse processo acontecendo.',
    '• A identificação de quem enviou ficou mais firme. Além do lado em que a mensagem aparece, agora também usa o indicador de entrega, que só existe nas mensagens enviadas por você.',
  ].join('\n'),
  '0.36.2': [
    'Corrige nomes encavalados no gráfico por instância',
    '',
    '• Com várias instâncias, os nomes no gráfico "Movimento por instância" ficavam sobrepostos e ilegíveis. O gráfico agora cresce conforme a quantidade de instâncias, e o card rola por dentro quando não couber.',
  ].join('\n'),
  '0.37.0': [
    'Aviso de mensagem nova com a cara do app',
    '',
    '• Até agora o único aviso era a caixa do Windows, desenhada pelo sistema. O app não tinha como ajustar tamanho, cantos, ícone nem espaçamento dela.',
    '• Novo aviso próprio, no canto inferior direito da janela. Compacto, com cantos arredondados e a mesma identidade visual do resto da interface. Clicar nele abre a instância, e ele some sozinho em 5 segundos.',
    '• A caixa do Windows continua aparecendo quando a janela está minimizada ou na bandeja.',
    '• Corrigido o espaçamento da chave "Comparar com período anterior", que encostava na borda dos cards abaixo.',
  ].join('\n'),
  '0.38.0': [
    'Recebidas e enviadas separadas, atividade do dia em tabela',
    '',
    '• "Atividade de hoje" e "Atividade de ontem" viraram tabela: Instância, Interações, Recebidas, Enviadas e Total, com linha de total no rodapé.',
    '• As mensagens enviadas por você deixaram de ser descartadas e passaram a ser contadas em coluna separada.',
    '• "Interações" continua contando só quem falou com você. Mandar mensagem para alguém que não respondeu não vira interação.',
    '• O gráfico "Movimento por instância" virou barra empilhada, mostrando quanto de cada instância foi recebido e quanto foi enviado.',
    '• O card "Volume total" mostra a divisão logo abaixo do número.',
    '',
    'Limite da coluna "Enviadas": só é possível ler o que foi enviado numa conversa aberta. Em conversa fechada o WhatsApp não mostra nada sobre envios, então a coluna fica em 0. Isso significa "não foi possível capturar", não necessariamente "não houve envio".',
    '',
    'Os números já gravados não têm essa separação e aparecem todos como recebidos. Para o relatório ficar coerente, use "Limpar dados do Analytics".',
  ].join('\n'),
  '0.38.1': [
    'Acertos visuais na interface',
    '',
    '• A chave "Comparar com período anterior" passava da borda direita dos cards. Agora termina alinhada com eles.',
    '• Filtros da barra lateral em uma única linha. Ao estreitar a barra eles quebravam e cortavam a linha de cima. Se não couberem, a faixa desliza na horizontal.',
    '• O filtro "Com erro" virou "Erro", para ocupar menos espaço.',
    '• Barra de rolagem mais fina e discreta em todas as listas, com folga para não encostar nos campos da direita.',
    '• Respiro maior no rodapé das abas de Configurações e da tela de contas. Os botões colavam na borda de baixo.',
    '• Cards do Diagnóstico com número em destaque e rótulo menor em cinza.',
    '• Aba selecionada em Configurações com mais contraste, mais fácil de identificar de relance.',
    '• Tela "Sobre" com texto mais curto e mais espaço entre as linhas.',
    '• Notas de versão reescritas: frases mais diretas, acentuação corrigida e marcadores padronizados.',
  ].join('\n'),
  '0.38.2': [
    'Corrige quem enviou a mensagem e mensagens que sumiam da contagem',
    '',
    'Dois defeitos encontrados conferindo os dados gravados no seu computador.',
    '',
    '• Suas mensagens continuavam sendo contadas como recebidas. A verificação de quem enviou procurava a marcação de lado nos elementos acima da mensagem, mas o WhatsApp coloca essa marcação abaixo. Nunca encontrava nada. Agora procura nos dois sentidos, e usa o indicador de entrega e o formato do identificador como reforço.',
    '• Imagens, figurinhas e áudios sumiam da contagem. Só mensagem de texto carrega a data própria; as demais dependiam do divisor "Hoje"/"Ontem" estar carregado na tela, o que quase nunca acontece numa conversa rolada. Agora elas herdam o dia da última mensagem datada antes delas.',
    '',
    'Os números gravados antes desta versão estão errados: mensagens suas aparecem como recebidas. Use "Limpar dados do Analytics" em Configurações para recomeçar com a contagem certa.',
  ].join('\n'),
  '0.39.0': [
    'Filtro por agrupamento, exportar CSV e uso de memória',
    '',
    '• Filtro por agrupamento no Analytics. Dá para ver o relatório de um agrupamento só, ou de todos. Vale para os cards, a atividade do dia e os gráficos.',
    '• Botão CSV salva o período selecionado em arquivo, com uma linha por instância e a linha de total. Sai da mesma contagem que está na tela, então o arquivo nunca diverge do relatório. Abre direto no Excel, com acentos corretos.',
    '• Diagnóstico em Configurações agora mostra memória, CPU e quantidade de processos do app. É a medição do próprio Electron, não estimativa. A CPU pode passar de 100% porque cada núcleo ocupado conta separado.',
    '',
    'Correção: as primeiras imagens e figurinhas logo abaixo do divisor "Hoje" eram contadas como sendo de ontem. A busca pelo divisor de data usava um seletor que não casava com o divisor comum do WhatsApp.',
  ].join('\n'),
  '0.39.1': [
    'Corrige a chave "Comparar com período anterior"',
    '',
    '• A bolinha da chave escapava para fora da cápsula. As tentativas anteriores mexeram na posição do bloco na linha, não na chave em si, por isso o defeito continuava.',
    '• A chave foi refeita sem posicionamento absoluto: a bolinha agora anda dentro da área interna e encosta na borda sem ultrapassar.',
  ].join('\n'),
  '0.39.2': [
    'Gráficos com mais espaço',
    '',
    '• Os cards "Movimento por instância" e "Horários de pico" ganharam altura mínima. Ao diminuir a janela eles eram achatados e as barras ficavam cortadas.',
    '• Mais espaço à esquerda no gráfico de instâncias, para caber o nome completo sem cortar.',
    '• Mais espaço entre as barras, e a legenda deixou de ficar colada na primeira delas.',
    '• Em "Horários de pico", a escala vai um pouco acima do maior valor. O pico ficava colado na borda de cima do card.',
    '',
    'Nada foi alterado na contagem nem na soma das mensagens.',
  ].join('\n'),
  '0.40.0': [
    'Aviso de mensagem só pelo toast do app',
    '',
    '• A caixa preta do Windows saiu de vez. O aviso agora é sempre o do próprio app, no canto inferior direito.',
    '• Visual flutuante: cantos arredondados, sombra mais funda e fundo que acompanha o tema claro ou escuro.',
    '• Nome da instância limpo na exibição: traços soltos e trechos repetidos são removidos. O nome cadastrado da conta não muda.',
    '',
    'Com a janela minimizada na bandeja não aparece aviso visual, já que o toast vive dentro da janela. O contador de não lidas na barra lateral continua marcando normalmente.',
    '',
    'A detecção de mensagem nova não foi alterada. Mudou só por onde o aviso aparece.',
  ].join('\n'),
  '0.41.0': [
    'O aplicativo agora se chama Orbi',
    '',
    '• Nome novo na barra de título, na bandeja, na tela Sobre, em Configurações e nos avisos.',
    '• O atalho e a entrada em "Adicionar ou remover programas" passam a aparecer como Orbi.',
    '',
    'Suas contas, sessões e dados do Analytics continuam exatamente onde estavam. A pasta de dados foi fixada de propósito para não se mover com a troca de nome, então nenhuma conta pede QR Code de novo.',
    '',
    'Como o atalho antigo tinha outro nome, o instalador apaga o ícone "Orbi Swit Stack" da área de trabalho e do menu iniciar antes de criar o novo.',
    '',
    'Preferências de notificação',
    '',
    '• Nova seção em Configurações, na aba Desempenho e Notificações, com duas chaves separadas.',
    '• "Notificações do Windows": a caixa do sistema, que aparece com o app minimizado ou em segundo plano.',
    '• "Notificações internas": o aviso flutuante no canto, que aparece com a janela aberta.',
    '• A chave geral continua mandando nas duas. Desligando ela, as outras ficam esmaecidas.',
    '• As escolhas ficam salvas e valem também depois de fechar o app.',
    '',
    'Tecla Esc',
    '',
    '• Esc agora fecha o Gerenciador de contas, as Configurações e a tela Sobre, com a mesma ação do botão de fechar.',
    '• O assistente de adicionar conta ficou de fora de propósito: ali o Esc descartaria o que você já digitou.',
    '',
    'A detecção de mensagens não foi alterada em nenhum desses itens.',
  ].join('\n'),
  '0.42.0': [
    'Central de Ajuda e reorganização do topo',
    '',
    'Ajuda',
    '',
    '• Novo botão "Ajuda" no topo, no lugar do antigo "Sobre".',
    '• Abre o manual de uso completo, com índice à esquerda e conteúdo passo a passo à direita.',
    '• Seções: Primeiros passos, Gerenciar contas, Analytics, Notificações, Configurações e Atalhos de teclado.',
    '• O manual vem dentro do programa, então funciona sem internet e é sempre o da versão instalada.',
    '',
    'Sobre o Sistema',
    '',
    '• As informações institucionais saíram do topo e viraram uma aba dentro de Configurações.',
    '• Além da versão, a aba traz a licença de uso e uma seção explicando como seus dados são tratados.',
    '',
    'Tecla Esc',
    '',
    '• Fecha também a Ajuda e esta tela de novidades.',
    '• A decisão de quando esta tela aparece e o registro da versão já vista continuam como estavam.',
    '• O Esc agora fecha só a tela que está na frente. Renomear um agrupamento e apertar Esc cancela apenas a edição do nome, sem fechar as Configurações; e com o Analytics aberto atrás de outra tela, só a de cima fecha.',
  ].join('\n'),
  '0.42.1': [
    'Ajuda: contato do suporte e rolagem do índice',
    '',
    '• Novo card "Ainda precisa de ajuda?" no fim do manual, com WhatsApp e e-mail do suporte. Os contatos são texto: dá para selecionar e copiar.',
    '• Clicar num item do índice agora leva o título da seção exatamente para o topo. Antes a rolagem parava abaixo do título, porque a medição partia do elemento errado.',
    '• O destaque do índice acompanha a rolagem sem piscar entre duas seções.',
    '• A última seção também consegue subir até o topo ao ser clicada.',
  ].join('\n'),
  '0.43.0': [
    'Botão para limpar cache e liberar espaço',
    '',
    '• Novo botão em Configurações, na aba Backup e Diagnóstico. Ele mostra quanto foi liberado, medido no disco antes e depois.',
    '• O cache de cada instância cresce sozinho com o uso, guardando imagens, fotos de perfil e mídia já baixadas. Em uso intenso ele passa de 500 MB por instância.',
    '',
    'O que a limpeza faz e o que não faz',
    '',
    '• Apaga: cache de rede e arquivos temporários de cada instância.',
    '• Não apaga: conversas, login, configurações, agrupamentos nem o histórico do Analytics.',
    '• Nenhuma conta é desconectada e nenhuma pede QR Code de novo.',
    '• Depois de limpar, cada instância demora um pouco mais para abrir na primeira vez, enquanto baixa de novo o que precisa.',
    '',
    'Aviso: apagar manualmente a pasta "Partitions" na pasta de dados do aplicativo desconecta todas as contas. O botão apaga só as partes seguras, sem esse risco.',
  ].join('\n'),
  '0.43.1': [
    'Destaque da conta aberta e fim da rolagem na Ajuda',
    '',
    '• A conta selecionada na barra lateral ficou mais fácil de identificar de relance. Ganhou um contorno fino e uma sombra suave, que dão profundidade sem virar bloco de cor. O indicador verde continua igual.',
    '• Vale para os dois formatos da barra lateral, em tema claro e escuro.',
    '• Nenhum tamanho, espaçamento, fonte, ícone ou cor foi alterado.',
    '',
    '• Corrigido: na Ajuda dava para rolar além do último bloco e cair numa área vazia, como se a página continuasse. A folga que existe para o índice funcionar passou a ser calculada, em vez de fixa, e agora a rolagem termina no card de contato.',
  ].join('\n'),
  '0.44.0': [
    'Nova Agenda',
    '',
    'Botão "Agenda" no topo, ao lado do Analytics.',
    '',
    'Visualizações',
    '',
    '• Mês, Semana e Dia. Nas visões de Semana e Dia há grade de horários com uma linha vermelha marcando o horário atual.',
    '• Painel lateral com mini-calendário para navegar rápido e a lista dos próximos compromissos.',
    '• Duplo clique num dia ou num horário cria um compromisso já naquela data.',
    '',
    'Compromissos',
    '',
    '• Título, início e término, opção de dia inteiro, categoria com cor, descrição e anotações.',
    '• Dá para vincular o compromisso a uma instância. Se a instância for excluída depois, o compromisso continua na agenda e só perde o vínculo.',
    '',
    'Lembretes',
    '',
    '• Vários lembretes por compromisso: no horário exato, 15 minutos, 1 hora, 1 dia, 3 dias, 7 dias antes, ou um valor que você escolhe em dias, horas e minutos.',
    '• Quando chega a hora, aparece um alerta que fica na tela até você agir. Dá para adiar por 5 minutos, 1 hora ou 1 dia, ou concluir.',
    '• Esse alerta não fecha com Esc nem clicando fora, de propósito, para não passar despercebido.',
    '• Se a janela estiver fechada na hora, o lembrete continua pendente e aparece quando você voltar.',
    '',
    'Feriados',
    '',
    '• Feriados nacionais já vêm no aplicativo, incluindo os que mudam de data todo ano, como Carnaval, Sexta-feira Santa e Corpus Christi.',
    '• Calculados dentro do próprio programa, sem consultar nada na internet: funcionam offline e para qualquer ano.',
    '• Aparecem com etiqueta cinza discreta, para não competir com seus compromissos, e podem ser escondidos pelo botão "Exibir feriados".',
    '',
    'Tudo fica salvo apenas neste computador.',
  ].join('\n'),
  '0.44.1': [
    'Correção do layout ao iniciar junto com o Windows',
    '',
    '• Corrigido um caso em que, ao abrir o aplicativo automaticamente com o Windows, a instância aparecia espremida numa faixa estreita, com o resto da área em branco.',
    '• Causa: o espaço reservado para a instância era medido enquanto a janela ainda estava assumindo o tamanho final, e nada depois disso refazia a conta.',
    '• Agora esse espaço é remedido também ao maximizar, restaurar, entrar e sair de tela cheia e ao voltar da bandeja.',
    '• Nenhuma mudança na contagem de mensagens, na Agenda ou no comportamento das telas.',
  ].join('\n'),
  '0.45.0': [
    'Barra de contas em quatro posições, filtro em menu e paleta de cores maior',
    '',
    'Posição da barra de contas',
    '',
    '• Além de Esquerda e Topo, agora também Direita e Inferior. A escolha fica em Configurações, em "Posição da barra de contas".',
    '• Direita é o espelho da Esquerda: mesmo painel vertical, com a divisória e a alça de redimensionar do outro lado.',
    '• Inferior é a mesma barra horizontal do Topo, fixada na base, com rolagem lateral na lista de contas.',
    '• Esquerda e Topo continuam exatamente como estavam.',
    '',
    'Filtro de contas',
    '',
    '• Na barra lateral, as abas Todas, Conectadas, Suspensas e Erro viraram um menu suspenso.',
    '• Cada opção mostra quantas instâncias estão naquele estado.',
    '• Motivo: com a barra estreita as abas ficavam com o texto cortado. O menu ocupa a largura inteira em qualquer tamanho de barra.',
    '',
    'Cor da conta',
    '',
    '• A paleta passou de 8 para 16 cores, entre vibrantes, pastéis e escuras.',
    '• Um botão de gota no fim da lista abre o seletor de cores do sistema, para escolher qualquer tom.',
    '• Dá para digitar o código da cor à mão, no formato #FF5733.',
    '',
    'Correção',
    '',
    '• Ao iniciar junto com o Windows, a instância podia aparecer espremida numa faixa estreita. A área agora é remedida também ao maximizar, restaurar, entrar e sair de tela cheia e ao voltar da bandeja.',
  ].join('\n'),
};

export interface WhatsNewResult {
  /** Versão atual do app (`app.getVersion()`), sempre presente. */
  version: string;
  /** Texto cadastrado para esta versão, ou `null` se nenhuma nota foi registrada. */
  notes: string | null;
  /**
   * `true` quando a versão atual é diferente da última versão que o
   * usuário já viu (`lastSeenVersion` persistida). Inclui tanto "acabou
   * de atualizar" quanto "primeira vez que abre o app", caso em que
   * `lastSeenVersion` chega como string vazia.
   */
  shouldShow: boolean;
}

/**
 * Função pura (fácil de testar) que decide se o modal "O que há de novo"
 * deve aparecer, comparando a versão instalada com a última que o usuário
 * já confirmou ter visto. Nunca mostra nada na primeira instalação sem
 * notas cadastradas, e nunca mostra a mesma versão duas vezes.
 */
export function resolveWhatsNew(currentVersion: string, lastSeenVersion: string): WhatsNewResult {
  const notes = RELEASE_NOTES[currentVersion] ?? null;
  const isNewVersion = currentVersion !== lastSeenVersion;
  // Só mostra o modal se a versão é diferente da última vista E existe texto
  // cadastrado para ela. Uma versão sem notas, como uma correção interna,
  // não interrompe o usuário com um modal vazio.
  return { version: currentVersion, notes, shouldShow: isNewVersion && notes !== null };
}
