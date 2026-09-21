/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useState } from 'react';
import { ChatActivityDayReport } from '../../types';
import { Dot } from './shared';
import { SeletorPeriodo } from './SeletorPeriodo';

/**
 * Fase 71 — "Atividade das instâncias": um card só, com Hoje e Ontem
 * alternáveis (Hoje ao abrir). Os relatórios são os mesmos de sempre
 * (chatDaily.today e chatDaily.yesterday, ver chatActivityStore.ts), só
 * exibidos um de cada vez: as linhas se dividem em duas colunas iguais e o
 * total atravessa o card. Nenhuma linha é descartada: com mais de 10
 * instâncias, cada coluna fica com a metade.
 */
export function AtividadeCard({
  hoje,
  ontem,
}: {
  hoje: ChatActivityDayReport | undefined;
  ontem: ChatActivityDayReport | undefined;
}) {
  const [dia, setDia] = useState<'hoje' | 'ontem'>('hoje');
  const report = dia === 'hoje' ? hoje : ontem;
  const rows = report?.byAccount ?? [];
  const meio = Math.ceil(rows.length / 2);
  const colunas = [rows.slice(0, meio), rows.slice(meio)];

  const tabela = (lista: ChatActivityDayReport['byAccount']) => (
    <table className="w-full table-fixed border-collapse text-[12.5px]">
      <colgroup>
        <col style={{ width: '36%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '15%' }} />
      </colgroup>
      <thead>
        <tr className="text-[10.5px] font-medium uppercase tracking-wide text-text-faint">
          <th className="pb-2 pr-2 text-left font-medium">Instância</th>
          <th className="pb-2 px-1.5 text-right font-medium">Interações</th>
          <th className="pb-2 px-1.5 text-right font-medium">Recebidas</th>
          <th className="pb-2 px-1.5 text-right font-medium">Enviadas</th>
          <th className="pb-2 pl-1.5 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((a) => (
          <tr key={a.accountId} className="border-t border-border/60">
            <td className="py-2.5 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="truncate font-medium text-text">{a.name}</span>
              </div>
            </td>
            <td className="py-2.5 px-1.5 text-right tabular-nums text-text-dim">{a.newConversations}</td>
            <td className="py-2.5 px-1.5 text-right tabular-nums text-accent">{a.received}</td>
            <td className="py-2.5 px-1.5 text-right tabular-nums" style={{ color: '#8B6FF5' }}>
              {a.sent}
            </td>
            <td className="py-2.5 pl-1.5 text-right font-semibold tabular-nums text-text">{a.messages}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-text">
            <Dot color="var(--color-accent)" />
            Atividade das instâncias
          </p>
          <p className="mt-1 text-[12px] text-text-dim">
            {report?.totalConversations ?? 0} interações · {report?.totalMessages ?? 0} mensagens registradas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Fase 78: mesmo seletor do topo. Aqui só Hoje e Ontem, que é a regra deste relatório (ver Fase 28). */}
          <SeletorPeriodo
            opcoes={[
              { key: 'hoje', label: 'Hoje' },
              { key: 'ontem', label: 'Ontem' },
            ]}
            valor={dia}
            onChange={setDia}
            ariaLabel="Dia do relatório"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-center text-[12px] font-light text-text-faint">
          Sem novas interações.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 rounded-lg border border-border p-3">{tabela(colunas[0])}</div>
          <div className="min-w-0 rounded-lg border border-border p-3">{tabela(colunas[1])}</div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center rounded-lg bg-input px-4 py-3 text-[13px] font-semibold tabular-nums">
        <span className="truncate text-accent">
          Total {dia === 'hoje' ? 'Hoje' : 'Ontem'} ({rows.length} {rows.length === 1 ? 'instância' : 'instâncias'})
        </span>
        <span className="text-right text-text" title="Interações">
          {report?.totalConversations ?? 0}
        </span>
        <span className="text-right text-accent" title="Recebidas">
          {report?.totalReceived ?? 0}
        </span>
        <span className="text-right" style={{ color: '#8B6FF5' }} title="Enviadas">
          {report?.totalSent ?? 0}
        </span>
        <span className="text-right text-text" title="Total">
          {report?.totalMessages ?? 0}
        </span>
      </div>
    </div>
  );
}
