/**
 * Fase 54 — feriados nacionais brasileiros, calculados no próprio app.
 *
 * Sem nenhuma chamada de rede: os fixos são uma tabela, e os móveis derivam
 * da Páscoa, que é calculada pelo algoritmo de Meeus/Jones/Butcher. Isso vale
 * para qualquer ano, passado ou futuro, e funciona sem internet.
 *
 * Motivo de não usar API: o app precisa mostrar o calendário certo mesmo
 * offline, e depender de um serviço de terceiro para uma informação que não
 * muda seria fragilidade sem ganho nenhum.
 *
 * Orbi — Criado por Vinicius Braga
 */

export interface Holiday {
  /** Chave local "AAAA-MM-DD", mesmo formato usado no resto do app. */
  date: string;
  name: string;
  /** `fixed` = mesma data todo ano; `movable` = depende da Páscoa. */
  kind: 'fixed' | 'movable';
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Soma dias a uma data sem mexer no fuso (usa construtor local). */
function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

/**
 * Domingo de Páscoa do ano informado (algoritmo de Meeus/Jones/Butcher para
 * o calendário gregoriano). Todos os feriados móveis brasileiros são contados
 * a partir dele.
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes - 1, dia);
}

/** Feriados de data fixa, iguais todo ano. */
const FIXOS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Confraternização Universal' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do Trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  // Feriado nacional desde 2024 (Lei 14.759/2023). Mantido para todos os anos
  // exibidos: a data é a mesma, e marcar como feriado num ano anterior não
  // atrapalha o uso do calendário.
  { month: 11, day: 20, name: 'Consciência Negra' },
  { month: 12, day: 25, name: 'Natal' },
];

const cache = new Map<number, Holiday[]>();

/** Todos os feriados nacionais de um ano, ordenados por data. */
export function holidaysForYear(year: number): Holiday[] {
  const emCache = cache.get(year);
  if (emCache) return emCache;

  const pascoa = easterSunday(year);
  const lista: Holiday[] = [
    ...FIXOS.map((f) => ({
      date: `${year}-${pad2(f.month)}-${pad2(f.day)}`,
      name: f.name,
      kind: 'fixed' as const,
    })),
    // Deslocamentos a partir do Domingo de Páscoa.
    { date: dateKey(addDays(pascoa, -48)), name: 'Carnaval (segunda-feira)', kind: 'movable' as const },
    { date: dateKey(addDays(pascoa, -47)), name: 'Carnaval', kind: 'movable' as const },
    { date: dateKey(addDays(pascoa, -2)), name: 'Sexta-feira Santa', kind: 'movable' as const },
    { date: dateKey(pascoa), name: 'Páscoa', kind: 'movable' as const },
    { date: dateKey(addDays(pascoa, 60)), name: 'Corpus Christi', kind: 'movable' as const },
  ].sort((a, b) => a.date.localeCompare(b.date));

  cache.set(year, lista);
  return lista;
}

/** Feriados que caem dentro de um intervalo de dias (chaves "AAAA-MM-DD"). */
export function holidaysBetween(startKey: string, endKey: string): Holiday[] {
  const anoInicio = parseInt(startKey.slice(0, 4), 10);
  const anoFim = parseInt(endKey.slice(0, 4), 10);
  if (!anoInicio || !anoFim) return [];

  const out: Holiday[] = [];
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    for (const h of holidaysForYear(ano)) {
      if (h.date >= startKey && h.date <= endKey) out.push(h);
    }
  }
  return out;
}
