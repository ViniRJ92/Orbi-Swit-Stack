/**
 * Fase 54 — Agenda: página com visões de Mês, Semana e Dia.
 *
 * Mesma decisão de layout do Analytics: é PÁGINA, não janela flutuante,
 * ocupando a área de conteúdo inteira. A WebContentsView por baixo continua
 * sendo escondida pelo mesmo mecanismo de sempre (setOverlayActive em
 * App.tsx).
 *
 * Painel lateral com mini-calendário de navegação e a lista dos próximos
 * compromissos. Feriados vêm do cálculo local (main/holidays.ts), sem rede.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, CalendarX, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CalendarEvent, EVENT_CATEGORIES, Holiday } from '../types';
import { useAppStore } from '../store/useAppStore';
import { EventFormModal } from './EventFormModal';

type ViewMode = 'month' | 'week' | 'day';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Altura de uma hora na grade de Semana/Dia. */
const HORA_PX = 48;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** Domingo da semana da data informada. */
function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -d.getDay());
}
function corDaCategoria(id: string): string {
  return EVENT_CATEGORIES.find((c) => c.id === id)?.color ?? '#64748B';
}
function horaTexto(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function CalendarPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useAppStore((s) => s.accounts);

  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showHolidays, setShowHolidays] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formDate, setFormDate] = useState(() => new Date());
  const [agora, setAgora] = useState(() => Date.now());

  const gradeRef = useRef<HTMLDivElement>(null);

  /** Intervalo carregado: sempre um mês inteiro em volta do cursor, o que
      cobre com folga qualquer das três visões sem recarregar a cada clique. */
  const intervalo = useMemo(() => {
    const inicio = addDays(new Date(cursor.getFullYear(), cursor.getMonth(), 1), -7);
    const fim = addDays(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), 14);
    return { startTs: startOfDay(inicio).getTime(), endTs: new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59).getTime() };
  }, [cursor]);

  const carregar = useCallback(async () => {
    const [evs, feriados] = await Promise.all([
      window.multiwhats.listEvents(intervalo),
      window.multiwhats.listHolidays(dayKey(new Date(intervalo.startTs)), dayKey(new Date(intervalo.endTs))),
    ]);
    setEvents(evs);
    setHolidays(feriados);
  }, [intervalo]);

  useEffect(() => {
    if (!open) return;
    carregar();
  }, [open, carregar]);

  // Linha do horário atual: atualiza a cada minuto, o suficiente para ela
  // acompanhar sem custo nenhum.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [open]);

  // Esc fecha a Agenda — mas só quando não há formulário aberto por cima,
  // senão um toque fecharia os dois.
  useEffect(() => {
    if (!open || formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, formOpen, onClose]);

  // Ao abrir Semana ou Dia, rola até perto do horário atual em vez de deixar
  // a grade na madrugada.
  useEffect(() => {
    if (!open || view === 'month') return;
    const el = gradeRef.current;
    if (!el) return;
    const hora = new Date().getHours();
    el.scrollTop = Math.max(0, (hora - 2) * HORA_PX);
  }, [open, view]);

  const feriadosPorDia = useMemo(() => {
    const m = new Map<string, Holiday>();
    for (const h of holidays) m.set(h.date, h);
    return m;
  }, [holidays]);

  const eventosPorDia = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      // Um evento de vários dias aparece em cada dia que ele cobre.
      let d = startOfDay(new Date(ev.start));
      const fim = startOfDay(new Date(ev.end));
      while (d <= fim) {
        const k = dayKey(d);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(ev);
        d = addDays(d, 1);
      }
    }
    return m;
  }, [events]);

  const proximos = useMemo(() => {
    const limite = Date.now();
    return events.filter((e) => e.end >= limite).sort((a, b) => a.start - b.start).slice(0, 8);
  }, [events]);

  // Fase 68 — quantos compromissos de cada categoria caem no mês exibido.
  const contagemPorCategoria = useMemo(() => {
    const ini = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
    const fim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime() - 1;
    const m = new Map<string, number>();
    let total = 0;
    for (const ev of events) {
      if (ev.start > fim || ev.end < ini) continue;
      m.set(ev.category, (m.get(ev.category) ?? 0) + 1);
      total++;
    }
    return { m, total };
  }, [events, cursor]);

  function abrirNovo(dia: Date) {
    setEditing(null);
    setFormDate(dia);
    setFormOpen(true);
  }
  function abrirEdicao(ev: CalendarEvent) {
    setEditing(ev);
    setFormDate(new Date(ev.start));
    setFormOpen(true);
  }

  function navegar(passo: number) {
    if (view === 'month') setCursor((c) => new Date(c.getFullYear(), c.getMonth() + passo, 1));
    else if (view === 'week') setCursor((c) => addDays(c, passo * 7));
    else setCursor((c) => addDays(c, passo));
  }

  const tituloPeriodo = useMemo(() => {
    if (view === 'month') return `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;
    if (view === 'week') {
      const ini = startOfWeek(cursor);
      const fim = addDays(ini, 6);
      return `${pad2(ini.getDate())}/${pad2(ini.getMonth() + 1)} a ${pad2(fim.getDate())}/${pad2(fim.getMonth() + 1)}`;
    }
    return `${DIAS_SEMANA[cursor.getDay()]}, ${pad2(cursor.getDate())} de ${MESES[cursor.getMonth()]}`;
  }, [view, cursor]);

  if (!open) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-content">
      {/* Fase 68 — cabeçalho e controles numa barra só. O "Fechar" continua
          aqui, na ponta direita, junto do Esc. */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
        <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-2.5 py-1.5 text-accent">
          <CalendarDays size={16} />
          <h1 className="text-[14px] font-semibold">Agenda</h1>
        </div>
        <span className="h-6 w-px bg-border" aria-hidden />

        <div className="flex items-center rounded-lg border border-border bg-input p-0.5">
          <button
            onClick={() => navegar(-1)}
            aria-label="Anterior"
            className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-md px-2.5 py-1 text-[12.5px] font-semibold text-text transition-colors hover:bg-surface-hover"
          >
            Hoje
          </button>
          <button
            onClick={() => navegar(1)}
            aria-label="Próximo"
            className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <span className="min-w-0 truncate text-[15px] font-semibold capitalize text-text">{tituloPeriodo}</span>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-0.5">
          {([['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia']] as [ViewMode, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={
                'rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ' +
                (view === k ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text-dim">
          <input
            type="checkbox"
            checked={showHolidays}
            onChange={(e) => setShowHolidays(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-accent)]"
          />
          Exibir feriados
        </label>

        <button
          onClick={() => abrirNovo(view === 'month' ? new Date() : cursor)}
          className="ml-auto flex items-center gap-1.5 rounded-lg accent-gradient px-3.5 py-2 text-[12.5px] font-semibold text-accent-contrast transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Novo compromisso
        </button>
        <button
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Painel lateral */}
        {/* Fase 68 — coluna lateral em cartões: calendário, próximos
            compromissos e contagem por categoria no mês exibido. */}
        <aside className="mw-scroll flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border p-3">
          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <MiniCalendar
              cursor={cursor}
              onPick={(d) => { setCursor(d); if (view === 'month') setView('day'); }}
              feriados={feriadosPorDia}
              mostrarFeriados={showHolidays}
              onPrev={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              onNext={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-text">Próximos compromissos</p>
              <Bell size={14} className="text-text-faint" />
            </div>
            {proximos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CalendarX size={22} className="text-text-faint" />
                <p className="text-[12.5px] text-text-dim">Nada agendado por enquanto.</p>
                <button
                  onClick={() => abrirNovo(new Date())}
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline"
                >
                  <Plus size={13} />
                  Agendar compromisso
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {proximos.map((ev) => {
                  const conta = accounts.find((a) => a.id === ev.accountId);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => abrirEdicao(ev)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-border px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <div className="flex w-full items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: corDaCategoria(ev.category) }} />
                        <span className="truncate text-[12.5px] font-medium text-text">{ev.title}</span>
                      </div>
                      <span className="text-[11.5px] text-text-dim">
                        {pad2(new Date(ev.start).getDate())}/{pad2(new Date(ev.start).getMonth() + 1)}
                        {!ev.allDay && ` · ${horaTexto(ev.start)}`}
                        {ev.allDay && ' · dia inteiro'}
                      </span>
                      {conta && <span className="truncate text-[11px] text-text-faint">{conta.name}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-text">Categorias</p>
              <span className="text-[11.5px] tabular-nums text-text-faint">{contagemPorCategoria.total} no mês</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {EVENT_CATEGORIES.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md px-1.5 py-1.5 text-[12.5px]">
                  <span className="flex items-center gap-2 text-text-dim">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.label}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: c.color }}>
                    {contagemPorCategoria.m.get(c.id) ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Área do calendário */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {view === 'month' && (
            <MonthGrid
              cursor={cursor}
              eventosPorDia={eventosPorDia}
              feriados={feriadosPorDia}
              mostrarFeriados={showHolidays}
              onDayClick={abrirNovo}
              onEventClick={abrirEdicao}
            />
          )}
          {view !== 'month' && (
            <TimeGrid
              ref={gradeRef}
              dias={view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)) : [startOfDay(cursor)]}
              eventosPorDia={eventosPorDia}
              feriados={feriadosPorDia}
              mostrarFeriados={showHolidays}
              agora={agora}
              onSlotClick={abrirNovo}
              onEventClick={abrirEdicao}
            />
          )}
        </div>
      </div>

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={carregar}
        editing={editing}
        defaultDate={formDate}
      />
    </section>
  );
}

/** Mini-calendário do painel lateral, só para navegar rápido. */
function MiniCalendar({
  cursor,
  onPick,
  feriados,
  mostrarFeriados,
  onPrev,
  onNext,
}: {
  cursor: Date;
  onPick: (d: Date) => void;
  feriados: Map<string, Holiday>;
  mostrarFeriados: boolean;
  /** Fase 68 — setas de mês no próprio mini-calendário. */
  onPrev: () => void;
  onNext: () => void;
}) {
  const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicio = startOfWeek(primeiro);
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const hoje = new Date();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-text-dim">
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <div className="flex items-center">
          <button
            onClick={onPrev}
            aria-label="Mês anterior"
            className="rounded p-0.5 text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onNext}
            aria-label="Próximo mês"
            className="rounded p-0.5 text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="py-1 text-[10px] font-medium text-text-faint">
            {d[0]}
          </span>
        ))}
        {dias.map((d) => {
          const doMes = d.getMonth() === cursor.getMonth();
          const eHoje = sameDay(d, hoje);
          const selecionado = sameDay(d, cursor);
          const feriado = mostrarFeriados && feriados.has(dayKey(d));
          return (
            <button
              key={d.getTime()}
              onClick={() => onPick(d)}
              title={feriado ? feriados.get(dayKey(d))!.name : undefined}
              className={
                'relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] transition-colors ' +
                (selecionado
                  ? 'accent-gradient font-semibold text-accent-contrast'
                  : eHoje
                    ? 'font-semibold text-accent hover:bg-surface-hover'
                    : doMes
                      ? 'text-text-dim hover:bg-surface-hover'
                      : 'text-text-faint/50 hover:bg-surface-hover')
              }
            >
              {d.getDate()}
              {feriado && !selecionado && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-text-faint" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Visão de Mês: uma célula por dia, com os eventos listados dentro. */
function MonthGrid({
  cursor,
  eventosPorDia,
  feriados,
  mostrarFeriados,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  eventosPorDia: Map<string, CalendarEvent[]>;
  feriados: Map<string, Holiday>;
  mostrarFeriados: boolean;
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicio = startOfWeek(primeiro);
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const hoje = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-border">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="bg-surface/60 px-2 py-2.5 text-center text-[11.5px] font-bold uppercase tracking-wide text-text-dim">
            {d}
          </span>
        ))}
      </div>
      <div className="mw-scroll grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {dias.map((d) => {
          const k = dayKey(d);
          const doMes = d.getMonth() === cursor.getMonth();
          const eHoje = sameDay(d, hoje);
          const feriado = mostrarFeriados ? feriados.get(k) : undefined;
          const doDia = eventosPorDia.get(k) ?? [];

          return (
            <div
              key={k}
              onDoubleClick={() => onDayClick(d)}
              className={
                'min-h-[92px] border-b border-r border-border px-2 py-1.5 transition-colors hover:bg-surface-hover/40 ' +
                (doMes ? '' : 'bg-app/40 opacity-45 ') +
                (eHoje ? 'bg-accent/5' : '')
              }
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={
                    'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] ' +
                    (eHoje ? 'accent-gradient font-bold text-accent-contrast' : doMes ? 'font-semibold text-text' : 'text-text-dim')
                  }
                >
                  {d.getDate()}
                </span>
                {/* Fase 68 — marca de hoje e etiqueta de feriado nacional no canto. */}
                {eHoje ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Hoje</span>
                ) : feriado ? (
                  <span className="rounded bg-surface-hover px-1 text-[9.5px] font-bold text-text-faint">BR</span>
                ) : null}
              </div>

              {/* Feriado: etiqueta cinza discreta, para não competir com os
                  compromissos do usuário. */}
              {feriado && (
                <div
                  title={feriado.name}
                  className="mb-1 truncate rounded bg-surface-hover px-1.5 py-0.5 text-[10.5px] text-text-faint"
                >
                  {feriado.name}
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                {doDia.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{ background: `color-mix(in srgb, ${corDaCategoria(ev.category)} 16%, transparent)` }}
                    className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-text transition-opacity hover:opacity-80"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: corDaCategoria(ev.category) }} />
                    <span className="truncate">
                      {!ev.allDay && <span className="text-text-faint">{horaTexto(ev.start)} </span>}
                      {ev.title}
                    </span>
                  </button>
                ))}
                {doDia.length > 3 && (
                  <span className="px-1 text-[10.5px] text-text-faint">+{doDia.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Visão de Semana e Dia: grade de horas com a linha do horário atual. */
const TimeGrid = (() => {
  function Grid(
    {
      dias,
      eventosPorDia,
      feriados,
      mostrarFeriados,
      agora,
      onSlotClick,
      onEventClick,
    }: {
      dias: Date[];
      eventosPorDia: Map<string, CalendarEvent[]>;
      feriados: Map<string, Holiday>;
      mostrarFeriados: boolean;
      agora: number;
      onSlotClick: (d: Date) => void;
      onEventClick: (e: CalendarEvent) => void;
    },
    ref: React.Ref<HTMLDivElement>
  ) {
    const hoje = new Date();
    const agoraDate = new Date(agora);
    const minutosAgora = agoraDate.getHours() * 60 + agoraDate.getMinutes();

    return (
      <div className="flex h-full flex-col">
        {/* Cabeçalho dos dias + faixa de dia inteiro e feriados */}
        <div className="flex shrink-0 border-b border-border">
          <div className="w-14 shrink-0 border-r border-border" />
          {dias.map((d) => {
            const k = dayKey(d);
            const feriado = mostrarFeriados ? feriados.get(k) : undefined;
            const diaInteiro = (eventosPorDia.get(k) ?? []).filter((e) => e.allDay);
            return (
              <div key={k} className="min-w-0 flex-1 border-r border-border px-2 py-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] uppercase text-text-faint">{DIAS_SEMANA[d.getDay()]}</span>
                  <span
                    className={
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] ' +
                      (sameDay(d, hoje) ? 'accent-gradient font-semibold text-accent-contrast' : 'text-text')
                    }
                  >
                    {d.getDate()}
                  </span>
                </div>
                {feriado && (
                  <div title={feriado.name} className="mt-1 truncate rounded bg-surface-hover px-1.5 py-0.5 text-center text-[10.5px] text-text-faint">
                    {feriado.name}
                  </div>
                )}
                {diaInteiro.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="mt-1 flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] text-text transition-colors hover:bg-surface-hover"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: corDaCategoria(ev.category) }} />
                    <span className="truncate">{ev.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Grade de horas */}
        <div ref={ref} className="mw-scroll relative min-h-0 flex-1 overflow-y-auto">
          <div className="flex" style={{ height: HORA_PX * 24 }}>
            {/* Coluna das horas */}
            <div className="w-14 shrink-0 border-r border-border">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ height: HORA_PX }} className="relative">
                  <span className="absolute -top-1.5 right-1.5 text-[10.5px] text-text-faint">{pad2(h)}h</span>
                </div>
              ))}
            </div>

            {dias.map((d) => {
              const k = dayKey(d);
              const comHora = (eventosPorDia.get(k) ?? []).filter((e) => !e.allDay);
              const eHoje = sameDay(d, hoje);
              return (
                <div key={k} className="relative min-w-0 flex-1 border-r border-border">
                  {/* Linhas de hora, clicáveis para criar */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      style={{ height: HORA_PX }}
                      onDoubleClick={() => onSlotClick(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0))}
                      className="border-b border-border/50 transition-colors hover:bg-surface-hover/30"
                    />
                  ))}

                  {/* Indicador do horário atual */}
                  {eHoje && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: (minutosAgora / 60) * HORA_PX }}
                    >
                      <span className="h-2 w-2 -ml-1 rounded-full bg-red-500" />
                      <span className="h-px flex-1 bg-red-500" />
                    </div>
                  )}

                  {/* Eventos posicionados pelo horário */}
                  {comHora.map((ev) => {
                    const ini = new Date(Math.max(ev.start, startOfDay(d).getTime()));
                    const fim = new Date(Math.min(ev.end, addDays(startOfDay(d), 1).getTime() - 1));
                    const topo = ((ini.getHours() * 60 + ini.getMinutes()) / 60) * HORA_PX;
                    const altura = Math.max(
                      20,
                      (((fim.getTime() - ini.getTime()) / 60000) / 60) * HORA_PX
                    );
                    const cor = corDaCategoria(ev.category);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        style={{
                          top: topo,
                          height: altura,
                          background: `color-mix(in srgb, ${cor} 18%, transparent)`,
                          borderLeft: `3px solid ${cor}`,
                        }}
                        className="absolute inset-x-1 z-[5] overflow-hidden rounded-md px-1.5 py-0.5 text-left transition-opacity hover:opacity-85"
                      >
                        <span className="block truncate text-[11px] font-medium text-text">{ev.title}</span>
                        <span className="block truncate text-[10.5px] text-text-dim">
                          {horaTexto(ev.start)} – {horaTexto(ev.end)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  return Object.assign(
    (props: Parameters<typeof Grid>[0] & { ref?: React.Ref<HTMLDivElement> }) => {
      const { ref, ...rest } = props;
      return Grid(rest, ref ?? null);
    },
    { displayName: 'TimeGrid' }
  );
})();
