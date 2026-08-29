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
