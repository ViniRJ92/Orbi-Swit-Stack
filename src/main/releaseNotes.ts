/**
 * Notas de versão ("O que há de novo") mostradas automaticamente na
 * primeira vez que o usuário abre uma versão nova do app.
 *
 * Decisão de arquitetura: o texto fica cadastrado localmente aqui, dentro
 * do próprio instalador, em vez de ser buscado da API de Releases do
 * GitHub em tempo de execução. Motivo: o repositório do projeto está
 * marcado como privado (ver Fase 28.1 do status do projeto) — a API
 * pública do GitHub não enxerga releases de um repositório privado sem um
 * token de acesso, e embutir um token só para isso seria menos seguro sem
 * necessidade (o mesmo trade-off já documentado para o auto-update em si).
 * Buscar do GitHub também exigiria rede disponível só para mostrar um
 * texto que já sabemos de antemão — desnecessário.
 *
 * Uso: a cada nova versão publicada, adicionar uma entrada aqui com a
 * mesma chave usada em `package.json` -> version. Se o repositório se
 * tornar público no futuro, é possível trocar `resolveWhatsNew` para
 * buscar da API do GitHub em vez desta tabela, sem mudar o contrato de
 * IPC (`mw:get-whats-new`/`mw:ack-whats-new`) usado pelo renderer.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */

export const RELEASE_NOTES: Record<string, string> = {
  '0.31.0': [
    'Analytics: relatorio "Hoje x Ontem" por instancia',
    '',
    '- Novas secoes "Atividade de hoje" e "Atividade de ontem", mostrando por instancia o numero de novas interacoes e de mensagens novas.',
    '- Contagem incremental sem duplicidade: mensagens ja vistas nao sao recontadas ao so navegar entre as instancias.',
    '- Sem rastreamento de nomes ou telefones de contatos, so numeros agregados por instancia.',
    '- Modal de Analytics ampliada, com mais espaco e rolagem vertical.',
  ].join('\n'),
  '0.32.0': [
    'Atualizacoes mais visiveis',
    '',
    '- O app agora verifica novas versoes tambem periodicamente enquanto fica aberto, alem da checagem de sempre ao iniciar.',
    '- Quando uma atualizacao fica disponivel, uma notificacao do Windows avisa na hora, sem precisar abrir Configuracoes para checar manualmente.',
    '- Esta tela de novidades: a partir de agora, toda vez que uma versao nova trouxer mudancas relevantes, ela aparece automaticamente na primeira abertura.',
  ].join('\n'),
  '0.33.0': [
    'Analytics: correcao da instancia mais usada',
    '',
    '- Corrigido um caso em que a instancia com mais atividade real podia nao aparecer na lista/lideranca do Analytics.',
    '- Causa: mensagens de uma conversa que voce ja esta olhando na hora sao marcadas como lidas quase na mesma hora, entao o contador de nao lidas nunca chegava a refletir esse movimento.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.33.1': [
    'Analytics: correcao de duplicidade ao trocar de instancia',
    '',
    '- Corrigido um caso em que reabrir o app ou trocar de instancia podia contar mensagens repetidas no Analytics.',
    '- O contador de mensagens da conversa aberta agora reage ao instante exato em que uma mensagem nova chega, em vez de reler a tela periodicamente.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.33.2': [
    'Analytics: correcao do historico contado como mensagem nova',
    '',
    '- Corrigido um caso em que abrir uma conversa contava o historico inteiro dela como mensagens novas.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.33.3': [
    'Analytics: Hoje/Ontem por instancia agora em tempo real',
    '',
    '- O relatorio "Atividade de hoje/ontem" passa a contar a conversa aberta pelo mesmo mecanismo em tempo real do Volume total, em vez de so pela lista lateral.',
    '- Cobre o caso de responder um cliente ao vivo: mensagens trocadas numa conversa aberta agora entram na contagem do dia certo.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento - so o identificador da mensagem e o nome ja visivel no cabecalho da conversa.',
  ].join('\n'),
  '0.33.4': [
    'Analytics: correcao na identificacao do contato',
    '',
    '- Corrigido um caso em que o nome do contato da conversa aberta nao era identificado corretamente, impedindo o relatorio Hoje/Ontem de contar a mensagem.',
  ].join('\n'),
  '0.33.5': [
    'Analytics: recupera mensagens de hoje/ontem ja carregadas',
    '',
    '- Mensagens de hoje ou ontem que ja estavam na tela ao abrir a conversa (por exemplo, se a conversa foi aberta antes desta atualizacao) agora entram na contagem, sem nunca recontar o que ja passou dessa janela.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.33.6': [
    'Analytics: corrige rolagem confundida com mensagem nova',
    '',
    '- Rolar a conversa pra ver historico antigo podia ser confundido com mensagem nova chegando - corrigido.',
    '- Toda mudanca na conversa agora reclassifica o que esta visivel pelo divisor de data (Hoje/Ontem), nunca pelo instante em que apareceu na tela.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.33.7': [
    'Corrige quedas de sessao na conta mais ativa e zeros no Analytics',
    '',
    '- Corrigido: a conta com mais mensagens chegando podia ficar sobrecarregada e cair a sessao de verdade com o WhatsApp ("sessao caiu ou QR Code expirou"), mesmo estando tudo certo - causa: uma verificacao interna rodava sem limite a cada mudanca na tela, e contas muito ativas geram muitas mudancas por segundo. Agora essa verificacao e agrupada, sem perder nenhuma deteccao.',
    '- Isso tambem explicava contas com atividade real nao aparecendo no Analytics: a sobrecarga impedia o rastreamento de se firmar antes da sessao cair.',
    '- Modo de desempenho "Personalizado": deixou de suspender contas por tempo parado quando o limite de contas carregadas escolhido nao esta sendo atingido - so reconecta do zero quando o limite de fato exige liberar espaco.',
  ].join('\n'),
  '0.33.8': [
    'Analytics: corrige conversas grandes nao contadas',
    '',
    '- Corrigido: conversas com bastante historico podiam nao ter nenhuma mensagem de hoje/ontem contada, mesmo com atividade real - causa: a contagem dependia do marcador "Hoje"/"Ontem" continuar visivel na tela, e o WhatsApp Web remove esse marcador da tela quando ha muita mensagem acima dele.',
    '- Agora cada mensagem carrega a propria data (mesmo dado que a funcao "copiar" do WhatsApp ja usa), entao a contagem funciona independente de quanto historico a conversa tem ou de quanto voce rolou a tela.',
    '- Sem leitura de texto, remetente ou midia em nenhum momento.',
  ].join('\n'),
  '0.34.0': [
    'Login nos servicos + botao de recarregar (F5)',
    '',
    '- Corrigido o erro "Failed to open popup window" (TikTok e outros): o login social ("Continuar com Google/Facebook/Apple") precisa abrir uma janela de login, e o app recusava todas. Agora essa janela abre na MESMA sessao isolada da instancia, sem quebrar o isolamento entre contas.',
    '- Corrigido tambem o bloqueio da propria tela de login: quando o servico te manda pro site do provedor (Google, Facebook, Apple, Microsoft), a navegacao era barrada pela lista de dominios permitidos. Esses dominios de login agora sao aceitos em todos os servicos, menos WhatsApp (que nao tem login social e segue com a trava mais estrita).',
    '- Novo botao de recarregar no topo, e atalhos F5 e Ctrl+R, para recarregar a instancia que esta em exibicao.',
    '',
    'Limitacao conhecida (nao e falha do app): o Google bloqueia login de conta Google dentro de navegadores embutidos como este - por isso Gmail, Google Calendar, Google Earth e "Continuar com Google" mostram "esse navegador ou app pode nao ser seguro". Nos servicos que oferecem outras formas de entrar (e-mail/telefone, Facebook, Apple), essas funcionam.',
  ].join('\n'),
  '0.34.1': [
    'Servicos do Google que exigem login sairam da lista',
    '',
    '- Gmail, Google Calendar, Google Earth e Gemini nao aparecem mais ao adicionar uma conta: todos exigem entrar com conta Google, e o Google recusa esse login dentro de aplicativos como este (sem opcao de continuar mesmo assim). Criar essas instancias so gerava uma aba que nunca ia conseguir logar.',
    '- "Pesquisa Google" continua na lista e funciona normalmente - buscar no Google nao exige login.',
    '- Instancias desses servicos que voce ja tenha criado continuam abrindo como antes; nada foi apagado.',
    '- Nos servicos que nao sao WhatsApp, o status agora diz "Aberto" em vez de "Conectado". Fora do WhatsApp o app so sabe que a pagina carregou, nao se voce esta logado - dizer "Conectado" aparecia ate quando o login tinha falhado.',
  ].join('\n'),
  '0.35.0': [
    'Analytics em tela cheia e numeros que fecham entre si',
    '',
    '- O Analytics deixou de ser uma janelinha e virou pagina inteira, usando toda a largura e altura.',
    '- Numeros unificados: "Volume total", "Instancia lider", "Media por conta", "Movimento por instancia" e "Horarios de pico" agora vem da MESMA contagem por mensagem que ja alimentava "Atividade de hoje/ontem". Antes eram dois sistemas diferentes na mesma tela (um contava pelo aviso de nao lidas da conta inteira, outro mensagem por mensagem), e por isso os blocos nunca batiam.',
    '- Consequencia esperada: o "Volume total" fica menor do que voce via antes. O numero antigo estava inflado; o novo e a soma exata do que aparece por instancia.',
    '- O periodo "Hoje" agora casa exatamente com o card "Atividade de hoje".',
    '- Corrigido o grafico "Movimento por instancia", que escondia o nome de algumas instancias (aparecia barra sem nome).',
    '- Grupos continuam fora da contagem, como ja era na atividade diaria.',
  ].join('\n'),
  '0.35.1': [
    'Corrige mensagens contadas em dobro ao abrir a conversa',
    '',
    '- Este era o motivo dos numeros inflados. Quando chegavam mensagens numa conversa que voce ainda nao tinha aberto, o app contava pelo aviso de nao lidas. Ao abrir a conversa depois, ele lia os baloes e contava as MESMAS mensagens outra vez - 5 mensagens viravam 10.',
    '- Agora a leitura balao a balao vira a verdade daquela conversa naquele dia: o que o aviso de nao lidas tinha estimado antes e descartado, em vez de somar por cima. Abrir a conversa passa a corrigir o numero, nunca dobrar.',
    '',
    'Importante: os dados ja gravados antes desta versao continuam inflados, porque foram contados com o erro. Se quiser recomecar com numeros limpos, use "Limpar dados do Analytics" em Configuracoes.',
  ].join('\n'),
  '0.35.2': [
    'Ajustes de seguranca na correcao da contagem',
    '',
    '- Corrigido: depois de usar "Limpar dados do Analytics", as conversas que voce ja tinha aberto no dia parariam de ser contadas ate o dia seguinte.',
    '- Corrigido: uma conversa ja aberta uma vez no dia deixaria de contar as mensagens que chegassem nela depois, caso voce nao a abrisse de novo. Agora o aviso de nao lidas segue contando entre uma abertura e outra, e cada nova abertura reescreve o dia pelo que os baloes mostram.',
    '- Os numeros ja gravados por versoes anteriores nunca sao apagados por esta correcao - podem estar inflados, mas nada de real e destruido.',
  ].join('\n'),
  '0.35.3': [
    '"Limpar dados do Analytics" agora zera de verdade',
    '',
    '- Antes o botao limpava o historico salvo, mas cada instancia aberta continuava lembrando quais mensagens ja tinha reportado - entao a conversa que estivesse aberta na hora so voltava a ser contada depois de trocar de conversa ou recarregar, comecando o acompanhamento com um buraco.',
    '- Agora limpar zera tambem essa memoria dentro de cada instancia e recomeca a leitura na hora, do zero.',
  ].join('\n'),
  '0.35.4': [
    'Contagem passa a ler as notificacoes que ja estao na tela',
    '',
    '- Antes, ao limpar os dados (ou na primeira vez que o app rodava), as mensagens nao lidas que ja estavam na lista viravam apenas "ponto de partida" e nunca eram contadas - so voltavam a contar se voce abrisse cada conversa manualmente. Na pratica, limpar os dados jogava fora a atividade do dia.',
    '- Agora o app le o numero de nao lidas de cada conversa junto com o rotulo de dia que o WhatsApp mostra do lado ("hoje"/"ontem") e ja registra aquilo como mensagens daquele dia. Conversa com rotulo mais antigo que ontem nao entra.',
    '- Ao abrir a conversa, esse numero estimado e apagado e regravado pelo total real dos baloes, como ja era.',
    '- Reabrir o app nao conta nada de novo: so semeia conversa que ainda nao tinha registro nenhum.',
  ].join('\n'),
  '0.35.5': [
    'Ajustes na tela do Analytics',
    '',
    '- Corrigido o botao "Comparar com periodo anterior", que vazava para fora da area da pagina e ficava sobreposto na borda direita.',
    '- A tecla Esc agora fecha o Analytics (voltou junto com a mudanca para pagina inteira).',
  ].join('\n'),
  '0.36.0': [
    'Suas proprias mensagens deixam de ser contadas',
    '',
    '- O filtro que deveria excluir as mensagens enviadas por voce existia desde o inicio, mas nunca funcionou: ele procurava um formato de identificador que esta versao do WhatsApp Web nao usa. Na pratica, tudo que voce enviava entrava no relatorio como se tivesse sido recebido.',
    '- Descoberto conferindo os identificadores realmente gravados no seu computador - nenhum deles tinha a marca que o codigo procurava.',
    '- Agora a separacao usa a marcacao que o proprio WhatsApp coloca na bolha para alinhar mensagem enviada a direita e recebida a esquerda.',
    '',
    'Importante: os numeros ja gravados incluem suas mensagens e continuam inflados. Use "Limpar dados do Analytics" em Configuracoes para recomecar com a contagem correta.',
  ].join('\n'),
  '0.36.1': [
    'Conta o dia inteiro, nao so o que coube na tela',
    '',
    '- Corrigido o caso da conversa com bastante movimento: ao abrir, o WhatsApp desenha so as mensagens mais recentes, e as demais mensagens de hoje nem chegavam a existir na pagina - por isso nao eram contadas. Agora o app percorre a conversa para tras ate passar de ontem, conta tudo de hoje e ontem, e volta a tela para onde voce estava. Nunca vai alem de ontem.',
    '- Voce vai ver a conversa se mover por alguns segundos ao abri-la. E esse processo acontecendo.',
    '- A identificacao de quem enviou ficou mais firme: alem do lado em que a mensagem aparece, agora tambem usa o indicador de entrega (relogio, tique simples, tique duplo), que so existe nas mensagens enviadas por voce.',
  ].join('\n'),
  '0.36.2': [
    'Corrige nomes encavalados no grafico por instancia',
    '',
    '- Com varias instancias, os nomes no grafico "Movimento por instancia" ficavam sobrepostos e ilegiveis. Agora o grafico cresce conforme a quantidade de instancias e o card rola por dentro quando nao couber - nenhum nome some nem se sobrepoe.',
  ].join('\n'),
  '0.37.0': [
    'Aviso de mensagem nova com a cara do app',
    '',
    '- Ate agora o unico aviso era a caixa do Windows, desenhada pelo sistema - o app nao tinha como ajustar tamanho, cantos, icone nem espacamento dela.',
    '- Novo aviso proprio, no canto inferior direito da janela: compacto, cantos arredondados e mesma identidade visual do resto da interface. Clicar nele abre a instancia; some sozinho em 5 segundos.',
    '- A caixa do Windows continua aparecendo quando a janela do app esta minimizada ou na bandeja - nessa situacao um aviso dentro da janela nao seria visto.',
    '- Corrigido tambem o espacamento da chave "Comparar com periodo anterior", no Analytics, que encostava na borda dos cards abaixo.',
  ].join('\n'),
};

export interface WhatsNewResult {
  /** Versão atual do app (`app.getVersion()`), sempre presente. */
  version: string;
  /** Texto cadastrado para esta versão, ou `null` se nenhuma nota foi registrada. */
  notes: string | null;
  /**
   * `true` quando a versão atual é diferente da última versão que o
   * usuário já viu (`lastSeenVersion` persistida) — inclui tanto "acabou
   * de atualizar" quanto "primeira vez que abre o app" (nesse caso
   * `lastSeenVersion` chega como string vazia).
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
  // Só mostra o modal se: é uma versão diferente da última vista E existe
  // texto cadastrado para ela. Uma versão sem notas (ex.: só correção
  // interna) não interrompe o usuário com um modal vazio.
  return { version: currentVersion, notes, shouldShow: isNewVersion && notes !== null };
}
