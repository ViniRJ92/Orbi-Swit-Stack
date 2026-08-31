/**
 * Fase 54 — formulário de compromisso da Agenda: criar, editar e excluir.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, X } from 'lucide-react';
import { CalendarEvent, CalendarEventInput, EVENT_CATEGORIES, EventCategoryId, EventReminder } from '../types';
import { useAppStore } from '../store/useAppStore';

/**
 * Opções prontas de antecedência, em minutos. "Personalizado" não entra aqui:
 * ele monta o valor a partir dos campos de dias, horas e minutos.
 */
const PRESET_REMINDERS: { label: string; minutes: number }[] = [
  { label: 'No horário exato', minutes: 0 },
  { label: '15 minutos antes', minutes: 15 },
  { label: '1 hora antes', minutes: 60 },
  { label: '1 dia antes', minutes: 1440 },
  { label: '3 dias antes', minutes: 4320 },
  { label: '7 dias antes', minutes: 10080 },
];

/** Texto legível de uma antecedência qualquer, inclusive as personalizadas. */
export function describeReminder(minutes: number): string {
  if (minutes <= 0) return 'No horário exato';
  const dias = Math.floor(minutes / 1440);
  const horas = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const partes: string[] = [];
  if (dias) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  if (horas) partes.push(`${horas}h`);
  if (mins) partes.push(`${mins}min`);
  return `${partes.join(' ')} antes`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Timestamp -> "AAAA-MM-DD" e "HH:MM" para os campos do formulário. */
function toDateInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toTimeInput(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
/** Junta data e hora dos campos num timestamp local. */
function fromInputs(dateStr: string, timeStr: string): number {
  const [a, m, d] = dateStr.split('-').map(Number);
  const [h, min] = (timeStr || '00:00').split(':').map(Number);
  return new Date(a, (m || 1) - 1, d || 1, h || 0, min || 0, 0, 0).getTime();
}

function novoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function EventFormModal({
  open,
  onClose,
  onSaved,
  editing,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Evento em edição, ou null para criar um novo. */
  editing: CalendarEvent | null;
  /** Dia clicado no calendário, usado como data inicial de um evento novo. */
  defaultDate: Date;
}) {
  const accounts = useAppStore((s) => s.accounts);

  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<EventCategoryId>('trabalho');
  const [accountId, setAccountId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Campos do lembrete personalizado.
  const [customOpen, setCustomOpen] = useState(false);
  const [customDias, setCustomDias] = useState(0);
  const [customHoras, setCustomHoras] = useState(1);
  const [customMin, setCustomMin] = useState(0);

  // Sempre que abre, recarrega os campos: em edição, com os dados do evento;
  // em criação, com o dia clicado e uma hora padrão.
  useEffect(() => {
    if (!open) return;
    setErro(null);
    setCustomOpen(false);
    if (editing) {
      setTitle(editing.title);
      setAllDay(editing.allDay);
      setStartDate(toDateInput(editing.start));
      setStartTime(toTimeInput(editing.start));
      setEndDate(toDateInput(editing.end));
      setEndTime(toTimeInput(editing.end));
      setCategory(editing.category);
      setAccountId(editing.accountId ?? '');
      setDescription(editing.description ?? '');
      setReminders(editing.reminders);
    } else {
      const base = toDateInput(defaultDate.getTime());
      setTitle('');
      setAllDay(false);
      setStartDate(base);
      setStartTime('09:00');
      setEndDate(base);
      setEndTime('10:00');
      setCategory('trabalho');
      setAccountId('');
      setDescription('');
      setReminders([{ id: novoId(), minutesBefore: 60 }]);
    }
  }, [open, editing, defaultDate]);

  // Esc fecha, com a mesma ação do X.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  function addReminder(minutes: number) {
    // Não deixa repetir a mesma antecedência: dois alertas idênticos só
    // gerariam dois pop-ups iguais no mesmo instante.
    if (reminders.some((r) => r.minutesBefore === minutes)) return;
    setReminders((prev) => [...prev, { id: novoId(), minutesBefore: minutes }].sort((a, b) => b.minutesBefore - a.minutesBefore));
  }

  function addCustomReminder() {
    const total = customDias * 1440 + customHoras * 60 + customMin;
    addReminder(Math.max(0, total));
    setCustomOpen(false);
  }

  async function salvar() {
    const tituloLimpo = title.trim();
    if (!tituloLimpo) {
      setErro('Dê um título para o compromisso.');
      return;
    }

    // Em "dia inteiro", o período cobre do começo ao fim do dia, para o evento
    // aparecer na faixa do topo e não numa hora específica.
    const inicio = allDay ? fromInputs(startDate, '00:00') : fromInputs(startDate, startTime);
    const fim = allDay ? fromInputs(endDate || startDate, '23:59') : fromInputs(endDate || startDate, endTime);

    if (fim < inicio) {
      setErro('O término não pode ser antes do início.');
      return;
    }

    const payload: CalendarEventInput = {
      title: tituloLimpo,
      start: inicio,
      end: fim,
      allDay,
      category,
      accountId: accountId || null,
      description: description.trim() || undefined,
      reminders,
    };

    setSalvando(true);
    try {
      if (editing) await window.multiwhats.updateEvent(editing.id, payload);
      else await window.multiwhats.createEvent(payload);
      onSaved();
      onClose();
    } catch {
      setErro('Não foi possível salvar o compromisso.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editing) return;
    if (!window.confirm(`Excluir "${editing.title}"?`)) return;
    await window.multiwhats.removeEvent(editing.id);
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[86vh] w-[560px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">
              <CalendarClock size={15} />
            </span>
            <h2 className="text-[15px] font-semibold text-text">
              {editing ? 'Editar compromisso' : 'Novo compromisso'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mw-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-5 pb-6 pl-5 pr-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Título</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Reunião de alinhamento"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text outline-none focus:border-accent"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Dia inteiro
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Início</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-input px-2 py-2 text-[13px] text-text outline-none focus:border-accent"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-[86px] shrink-0 rounded-lg border border-border bg-input px-2 py-2 text-[13px] text-text outline-none focus:border-accent"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Término</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-input px-2 py-2 text-[13px] text-text outline-none focus:border-accent"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-[86px] shrink-0 rounded-lg border border-border bg-input px-2 py-2 text-[13px] text-text outline-none focus:border-accent"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors ' +
                    (category === c.id
                      ? 'border-accent bg-surface-hover text-text'
                      : 'border-border text-text-dim hover:bg-surface-hover')
                  }
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Instância vinculada (opcional)</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-[13px] text-text outline-none focus:border-accent"
            >
              <option value="">Nenhuma</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[12px] font-medium text-text-dim">Lembretes</label>
              <span className="text-[11.5px] text-text-faint">{reminders.length} configurado(s)</span>
            </div>

            {reminders.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-[12.5px] text-text"
                  >
                    {describeReminder(r.minutesBefore)}
                    <button
                      onClick={() => setReminders((prev) => prev.filter((x) => x.id !== r.id))}
                      aria-label="Remover lembrete"
                      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {PRESET_REMINDERS.filter((p) => !reminders.some((r) => r.minutesBefore === p.minutes)).map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => addReminder(p.minutes)}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-text-dim transition-colors hover:border-accent hover:text-text"
                >
                  <Plus size={12} />
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setCustomOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-text-dim transition-colors hover:border-accent hover:text-text"
              >
                <Plus size={12} />
                Personalizado
              </button>
            </div>

            {customOpen && (
              <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-input px-3 py-2.5">
                {[
                  { label: 'dias', value: customDias, set: setCustomDias, max: 365 },
                  { label: 'horas', value: customHoras, set: setCustomHoras, max: 23 },
                  { label: 'minutos', value: customMin, set: setCustomMin, max: 59 },
                ].map((campo) => (
                  <div key={campo.label}>
                    <label className="mb-1 block text-[11px] text-text-faint">{campo.label}</label>
                    <input
                      type="number"
                      min={0}
                      max={campo.max}
                      value={campo.value}
                      onChange={(e) => campo.set(Math.max(0, Math.min(campo.max, Number(e.target.value) || 0)))}
                      className="w-[70px] rounded-md border border-border bg-surface px-2 py-1.5 text-[12.5px] text-text outline-none focus:border-accent"
                    />
                  </div>
                ))}
                <button
                  onClick={addCustomReminder}
                  className="rounded-lg accent-gradient px-3 py-1.5 text-[12.5px] font-semibold text-accent-contrast"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-dim">Descrição e anotações</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalhes, links, o que precisa ser levado…"
              className="mw-scroll w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-[13px] leading-6 text-text outline-none focus:border-accent"
            />
          </div>

          {erro && <p className="text-[12.5px] text-danger">{erro}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3.5">
          {editing ? (
            <button
              onClick={excluir}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="rounded-lg accent-gradient px-4 py-2 text-[13px] font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
