/**
 * Fase 54 — Agenda: persistência dos compromissos e disparo dos lembretes.
 *
 * Mesmo padrão dos outros stores do projeto: um JSON simples em userData,
 * gravado de forma atômica (escreve num arquivo temporário e renomeia), para
 * um desligamento no meio da escrita não corromper o arquivo.
 *
 * Nada aqui vai para a rede. Compromissos, lembretes e anotações ficam só
 * neste computador.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const STORE_FILE = 'calendar.json';

/** Categorias fixas, com a cor usada para pintar o evento no calendário. */
export const EVENT_CATEGORIES = [
  { id: 'trabalho', label: 'Trabalho', color: '#3B82F6' },
  { id: 'reuniao', label: 'Reunião', color: '#8B5CF6' },
  { id: 'pessoal', label: 'Pessoal', color: '#10B981' },
  { id: 'atendimento', label: 'Atendimento', color: '#F59E0B' },
  { id: 'outro', label: 'Outro', color: '#64748B' },
] as const;

export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]['id'];

/**
 * Um lembrete de um compromisso.
 *
 * `minutesBefore` é sempre a antecedência em minutos: 0 dispara na hora do
 * evento, 1440 um dia antes, 10080 uma semana antes. Guardar assim (e não uma
 * data pronta) faz o lembrete acompanhar sozinho qualquer mudança de horário
 * do compromisso.
 */
export interface EventReminder {
  id: string;
  minutesBefore: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** Início e fim em milissegundos. Em evento de dia inteiro, cobrem o dia todo. */
  start: number;
  end: number;
  allDay: boolean;
  category: EventCategoryId;
  /** Instância vinculada (opcional). Guarda só o id; o nome vem do AccountStore. */
  accountId?: string | null;
  description?: string;
  reminders: EventReminder[];
  createdAt: number;
  updatedAt: number;
}

interface StoreShape {
  events: CalendarEvent[];
  /**
   * Lembretes que já foram mostrados, na forma "eventoId:lembreteId". Evita
   * que o mesmo alerta reapareça a cada verificação, e sobrevive a reiniciar
   * o app — sem isso, reabrir o programa traria de volta todos os alertas do
   * dia de uma vez.
   */
  firedReminders: string[];
  /**
   * Adiamentos ativos: mesma chave do `firedReminders`, apontando para o
   * instante em que o alerta deve voltar.
   */
  snoozedUntil: Record<string, number>;
}

const DEFAULTS: StoreShape = { events: [], firedReminders: [], snoozedUntil: {} };

/** Teto de lembretes lembrados, para o arquivo não crescer sem fim. */
const MAX_FIRED = 5000;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class CalendarStore {
  private filePath: string;
  private data: StoreShape;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.data = this.load();
  }

  private load(): StoreShape {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as Partial<StoreShape>;
        return {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          firedReminders: Array.isArray(parsed.firedReminders) ? parsed.firedReminders : [],
          snoozedUntil: parsed.snoozedUntil && typeof parsed.snoozedUntil === 'object' ? parsed.snoozedUntil : {},
        };
      }
    } catch (err) {
      console.error('[CalendarStore] Falha ao ler calendar.json, iniciando vazio:', err);
    }
    return { ...DEFAULTS };
  }

  private persist(): void {
    try {
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data), 'utf-8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[CalendarStore] Falha ao salvar calendar.json:', err);
    }
  }

  list(): CalendarEvent[] {
    return [...this.data.events].sort((a, b) => a.start - b.start);
  }

  /** Eventos que tocam o intervalo, inclusive os que começam antes e terminam dentro. */
  listBetween(startTs: number, endTs: number): CalendarEvent[] {
    return this.list().filter((e) => e.end >= startTs && e.start <= endTs);
  }

  create(input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const agora = Date.now();
    const evento: CalendarEvent = {
      ...input,
      // Cada lembrete recebe id próprio, que é o que identifica um alerta já
      // mostrado. Sem isso, editar o evento faria alertas antigos voltarem.
      reminders: (input.reminders ?? []).map((r) => ({ id: r.id || newId(), minutesBefore: r.minutesBefore })),
      id: newId(),
      createdAt: agora,
      updatedAt: agora,
    };
    this.data.events.push(evento);
    this.persist();
    return evento;
  }

  update(id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>): CalendarEvent | null {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const anterior = this.data.events[idx];
    const atualizado: CalendarEvent = {
      ...anterior,
      ...patch,
      reminders: (patch.reminders ?? anterior.reminders).map((r) => ({
        id: r.id || newId(),
        minutesBefore: r.minutesBefore,
      })),
      id: anterior.id,
      createdAt: anterior.createdAt,
      updatedAt: Date.now(),
    };
    this.data.events[idx] = atualizado;

    // Mudou o horário: os alertas daquele evento voltam a valer, senão um
    // compromisso remarcado para depois nunca mais avisaria.
    if (patch.start !== undefined && patch.start !== anterior.start) {
      this.forgetRemindersOf(id);
    }
    this.persist();
    return atualizado;
  }

  remove(id: string): boolean {
    const antes = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);
    if (this.data.events.length === antes) return false;
    this.forgetRemindersOf(id);
    this.persist();
    return true;
  }

  private forgetRemindersOf(eventId: string): void {
    this.data.firedReminders = this.data.firedReminders.filter((k) => !k.startsWith(`${eventId}:`));
    for (const chave of Object.keys(this.data.snoozedUntil)) {
      if (chave.startsWith(`${eventId}:`)) delete this.data.snoozedUntil[chave];
    }
  }

  /**
   * Lembretes que devem aparecer AGORA.
   *
   * Um lembrete entra na lista quando o instante dele já passou e ele ainda
   * não foi mostrado (ou foi adiado e o adiamento venceu). Eventos que já
   * terminaram há mais de um dia são ignorados: reabrir o app depois de uma
   * semana fechado não deve despejar alertas antigos na tela.
   */
  dueReminders(now: number): { event: CalendarEvent; reminder: EventReminder; key: string }[] {
    const out: { event: CalendarEvent; reminder: EventReminder; key: string }[] = [];
    const limiteAtraso = now - 24 * 60 * 60 * 1000;

    for (const evento of this.data.events) {
      if (evento.end < limiteAtraso) continue;
      for (const lembrete of evento.reminders) {
        const chave = `${evento.id}:${lembrete.id}`;
        const quando = evento.start - lembrete.minutesBefore * 60 * 1000;
        if (quando > now) continue;

        const adiadoAte = this.data.snoozedUntil[chave];
        if (adiadoAte !== undefined) {
          if (adiadoAte > now) continue; // ainda adiado
        } else if (this.data.firedReminders.includes(chave)) {
          continue; // já mostrado e não adiado
        }
        out.push({ event: evento, reminder: lembrete, key: chave });
      }
    }
    return out;
  }

  /** Marca como mostrado, para não reaparecer. */
  markReminderFired(key: string): void {
    delete this.data.snoozedUntil[key];
    if (!this.data.firedReminders.includes(key)) {
      this.data.firedReminders.push(key);
      if (this.data.firedReminders.length > MAX_FIRED) {
        this.data.firedReminders = this.data.firedReminders.slice(-MAX_FIRED);
      }
    }
    this.persist();
  }

  /** Adia o alerta por N minutos a partir de agora. */
  snoozeReminder(key: string, minutes: number): void {
    this.data.snoozedUntil[key] = Date.now() + minutes * 60 * 1000;
    // Sai de "já mostrado" para poder voltar quando o adiamento vencer.
    this.data.firedReminders = this.data.firedReminders.filter((k) => k !== key);
    this.persist();
  }

  /** Conta removida: apaga o vínculo, mantendo o compromisso. */
  forgetAccount(accountId: string): void {
    let mudou = false;
    for (const evento of this.data.events) {
      if (evento.accountId === accountId) {
        evento.accountId = null;
        mudou = true;
      }
    }
    if (mudou) this.persist();
  }
}
