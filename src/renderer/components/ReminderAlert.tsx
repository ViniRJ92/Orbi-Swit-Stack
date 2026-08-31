/**
 * Fase 54 — alerta de lembrete da Agenda.
 *
 * Diferente do aviso de mensagem nova (MessageToast), este NÃO some sozinho:
 * fica na tela até o usuário adiar ou dispensar. É o comportamento pedido
 * para compromisso não passar despercebido.
 *
 * Também não fecha com Esc nem clicando fora, pelo mesmo motivo — sair dele
 * exige uma escolha consciente. É a única tela do app que se comporta assim,
 * e de propósito.
 *
 * Marcar como visto acontece só quando o usuário age. Se a janela estiver
 * escondida quando o lembrete vencer, ele continua pendente e aparece assim
 * que a janela voltar, em vez de se perder.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlarmClock, Check, Clock } from 'lucide-react';
import { ReminderDuePayload } from '../types';

const ADIAMENTOS: { label: string; minutes: number }[] = [
  { label: '5 min', minutes: 5 },
  { label: '1 hora', minutes: 60 },
  { label: '1 dia', minutes: 1440 },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "hoje às 14:30", "amanhã às 09:00" ou "12/09 às 09:00". */
function quandoTexto(start: number): string {
  const d = new Date(start);
  const hoje = new Date();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const hora = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (mesmoDia(d, hoje)) return `hoje às ${hora}`;
  if (mesmoDia(d, amanha)) return `amanhã às ${hora}`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} às ${hora}`;
}

export function ReminderAlert() {
  const [fila, setFila] = useState<ReminderDuePayload[]>([]);

  useEffect(() => {
    return window.multiwhats.onReminderDue((payload) => {
      // O processo principal reenvia o mesmo lembrete a cada verificação até
      // ele ser tratado; por isso o mesmo `key` nunca entra duas vezes.
      setFila((prev) => (prev.some((p) => p.key === payload.key) ? prev : [...prev, payload]));
    });
  }, []);

  const atual = fila[0];

  function removerAtual() {
    setFila((prev) => prev.slice(1));
  }

  async function adiar(minutes: number) {
    if (!atual) return;
    await window.multiwhats.snoozeReminder(atual.key, minutes);
    removerAtual();
  }

  async function dispensar() {
    if (!atual) return;
    await window.multiwhats.dismissReminder(atual.key);
    removerAtual();
  }

  return (
    <AnimatePresence>
      {atual && (
        <motion.div
          key={atual.key}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-overlay backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-[420px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start gap-3 px-5 pb-4 pt-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl accent-gradient text-accent-contrast">
                <AlarmClock size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">Lembrete</p>
                <h2 className="mt-0.5 break-words text-[16px] font-semibold leading-snug text-text">{atual.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-text-dim">
                  <Clock size={13} />
                  {quandoTexto(atual.start)}
                </p>
              </div>
            </div>

            {fila.length > 1 && (
              <p className="px-5 pb-2 text-[11.5px] text-text-faint">
                +{fila.length - 1} {fila.length - 1 === 1 ? 'outro lembrete' : 'outros lembretes'} na fila
              </p>
            )}

            <div className="border-t border-border px-5 py-3.5">
              <p className="mb-2 text-[11.5px] text-text-faint">Adiar por</p>
              <div className="flex flex-wrap gap-2">
                {ADIAMENTOS.map((a) => (
                  <button
                    key={a.minutes}
                    onClick={() => adiar(a.minutes)}
                    className="rounded-lg border border-border px-3 py-2 text-[12.5px] text-text-dim transition-colors hover:border-accent hover:bg-surface-hover hover:text-text"
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  onClick={dispensar}
                  className="ml-auto flex items-center gap-1.5 rounded-lg accent-gradient px-4 py-2 text-[12.5px] font-semibold text-accent-contrast transition-opacity hover:opacity-90"
                >
                  <Check size={14} />
                  Concluir
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
