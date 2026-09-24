/**
 * Testes de proteção da lógica do Analytics (Fase 80).
 *
 * Roda sobre o processo principal já compilado (dist/main), sem Electron:
 * o módulo "electron" é trocado por um falso que só aponta a pasta de dados
 * para um diretório temporário. Nenhum arquivo real do usuário é tocado.
 *
 * Uso: npx tsc -p tsconfig.json && node scripts/test-analytics.js
 * Qualquer falha encerra com código 1, o que interrompe a publicação.
 *
 * Orbi — Criado por Vinicius Braga
 */
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbi-test-'));
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return { app: { getPath: () => tmp } };
  return originalLoad.call(this, request, ...rest);
};

const dist = path.resolve(__dirname, '..', 'dist', 'main');
const { ChatActivityStore } = require(path.join(dist, 'chatActivityStore.js'));
const { classifyContact, buildInteractionClassification, dayKey } = require(path.join(dist, 'interactionClassification.js'));
let falhas = 0;
let total = 0;
function check(nome, obtido, esperado) {
  total++;
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? '  ok   ' : '  FALHA'} ${nome}${ok ? '' : ` — obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}
function novoStore() {
  fs.rmSync(path.join(tmp, 'chatActivity.json'), { force: true });
  return new ChatActivityStore();
}
const contas = [{ id: 'A', name: 'Inst A', color: '#fff' }, { id: 'B', name: 'Inst B', color: '#fff' }];
const hoje = () => buildDaily().today;
let store;
const buildDaily = () => store.buildDailyReport(contas);
const baloes = (prefixo, n, direcao, bucket = 'today') =>
  Array.from({ length: n }, (_, i) => ({ dataId: `${prefixo}${i}`, bucket, direction: direcao }));

console.log('\nContagem por balão (conversa aberta)');
store = novoStore();
store.recordChatMessages('A', 'joao', [...baloes('in', 5, 'in'), ...baloes('out', 3, 'out')]);
check('João mandou 5 e você respondeu 3: recebidas', hoje().totalReceived, 5);
check('João mandou 5 e você respondeu 3: enviadas', hoje().totalSent, 3);
check('João mandou 5 e você respondeu 3: 1 interação', hoje().totalConversations, 1);
store.recordChatMessages('A', 'joao', [...baloes('in', 5, 'in'), ...baloes('out', 3, 'out')]);
check('Reabrir a conversa não soma de novo', [hoje().totalReceived, hoje().totalSent], [5, 3]);
store.recordChatMessages('A', 'joao', [...baloes('in', 5, 'in'), { dataId: 'in-novo', bucket: 'today', direction: 'in' }]);
check('Mensagem nova depois vira a 6ª recebida', hoje().totalReceived, 6);
store.recordChatMessages('A', 'maria', baloes('m', 20, 'in'));
check('20 mensagens da mesma pessoa = 1 interação a mais', hoje().totalConversations, 2);
store.recordChatMessages('B', 'lia', baloes('so-envio', 2, 'out'));
check('Só enviar mensagem não cria interação', hoje().totalConversations, 2);
store.recordChatMessages('A', 'ana', baloes('ontem', 2, 'in', 'yesterday'));
check('Balão de ontem vai para ontem', [buildDaily().yesterday.totalReceived, hoje().totalReceived], [2, 26]);

console.log('\nEstimativa pela lista removida');
const antes = JSON.stringify(buildDaily());
store.observe('A', [{ key: 'pedro', isGroup: false, unread: 0, dateTag: 'today' }]);
store.commitObservation('A', 'pedro', 0, true);
store.commitObservation('A', 'pedro', 9, false);
check('Não lidas subindo na lista não gera mensagem', JSON.stringify(buildDaily()), antes);
store.commitObservation('A', 'carla', 7, true);
check('Conversa nova com não lidas não gera mensagem', JSON.stringify(buildDaily()), antes);
store.data.events.push({ t: Date.now(), day: dayKey(new Date()), a: 'A', k: 'antigo', c: 50, s: 'b', d: 'in' });
check('Estimativa antiga guardada fica fora dos números', JSON.stringify(buildDaily()), antes);
const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
const fim = new Date(); fim.setHours(23, 59, 59, 999);
const resumo = store.buildAnalyticsSummary({ startTs: inicio.getTime(), endTs: fim.getTime() }, contas);
check('Painel de Hoje fecha com o card de Hoje', [resumo.totalReceived, resumo.totalSent], [hoje().totalReceived, hoje().totalSent]);
check('Histórico da classificação ignora estimativa e envios', store.getInboundDays().some((e) => e.k === 'antigo' || e.k === 'lia'), false);

console.log('\nClassificação das interações');
const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return dayKey(x); };
check('Sem histórico = Nova', classifyContact([], d(0)), 'nova');
check('Falou ontem = Recorrente', classifyContact([d(-1)], d(0)), 'recorrente');
check('4 dias nos últimos 30 = Frequente', classifyContact([d(-8), d(-5), d(-3), d(-1)], d(0)), 'frequente');
check('Intervalos longos = Esporádica', classifyContact([d(-25), d(-12)], d(0)), 'esporadica');
check('30 dias sem falar = Reativada', classifyContact([d(-60), d(-45)], d(0)), 'reativada');
const cls = buildInteractionClassification(
  { startTs: inicio.getTime(), endTs: fim.getTime() },
  contas,
  { A: { joao: [d(-1), d(0)], maria: [d(0)], velho: [d(-3)] }, B: { lia: [d(0)] } }
);
check('Soma das categorias = total de interações', Object.values(cls.counts).reduce((s, n) => s + n, 0), cls.total);

console.log('\nBackup do histórico');
const { InteractionHistoryStore } = require(path.join(dist, 'interactionHistoryStore.js'));
const origem = novoStore();
origem.recordChatMessages('A', 'joao', baloes('bk', 3, 'in'));
const copia = origem.exportForBackup();
const destino = novoStore();
destino.recordChatMessages('B', 'lia', baloes('outro', 2, 'in'));
const antesDestino = destino.buildDailyReport(contas).today.totalReceived;
check('Restaurar soma ao que já existe', destino.mergeFromBackup(copia), 3);
check('Nada do destino foi apagado', destino.buildDailyReport(contas).today.totalReceived, antesDestino + 3);
check('Restaurar o mesmo backup de novo não conta em dobro', destino.mergeFromBackup(copia), 0);
destino.recordChatMessages('A', 'joao', baloes('bk', 3, 'in'));
check('Balões do backup não são recontados ao abrir a conversa', destino.buildDailyReport(contas).today.totalReceived, antesDestino + 3);
fs.rmSync(path.join(tmp, 'interactionHistory.json'), { force: true });
const hist = new InteractionHistoryStore();
hist.sync([{ a: 'A', k: 'maria', day: d(0) }]);
hist.merge({ A: { maria: [d(-3), d(0)], joao: [d(-1)] } });
check('Histórico da classificação é somado sem repetir dias', hist.getDays().A.maria, [d(-3), d(0)]);

// Fase 92 — quem mandou cada balão, pela pontinha (caso real conferido pelo
// usuário em 2026-09-24: conversa com 9 mensagens dela e 10 dele, das quais 7
// mandadas pelo celular eram contadas como recebidas).
console.log('\nQuem mandou cada balão (pontinha)');
const { herdarLadoPelaPontinha } = require(path.join(dist, 'messageDirection.js'));
const conversaReal = [
  'out', null, null, // 3 dele às 9:52 (pelo computador)
  'in', null, null, null, // 4 dela
  'out', null, null, null, null, // 5 dele pelo celular, incluindo a imagem
  'in', null, null, null, null, // 5 dela
  'out', null, // 2 dele pelo celular
];
const lados = herdarLadoPelaPontinha(conversaReal);
check('Conversa real: 10 enviadas por ele', lados.filter((l) => l === 'out').length, 10);
check('Conversa real: 9 recebidas dela', lados.filter((l) => l === 'in').length, 9);
check('Sem pontinha nenhuma, não decide (volta aos sinais antigos)', herdarLadoPelaPontinha([null, null]), [null, null]);
check('Balões antes da primeira pontinha não são adivinhados', herdarLadoPelaPontinha([null, 'in', null]), [null, 'in', 'in']);
check('Enviada e recebida continuam separadas no relatório', (() => {
  store = novoStore();
  store.recordChatMessages('A', 'vaneide', lados.map((l, i) => ({ dataId: `v${i}`, bucket: 'today', direction: l })));
  const r = hoje();
  return [r.totalReceived, r.totalSent];
})(), [9, 10]);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${total - falhas} de ${total} testes passaram.`);
process.exit(falhas ? 1 : 0);
