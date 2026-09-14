/**
 * Fase 80 — cobertura do Analytics.
 *
 * Só informa, não mexe em número nenhum. A cada leitura periódica de main.ts
 * (a mesma que alimenta o chatActivityStore), registra quais instâncias
 * estavam carregadas e conectadas. Assim o Analytics consegue avisar quando
 * uma instância ficou sem ser observada em parte do período, e os números
 * podem estar abaixo do real.
 *
 * Guarda por dia: quantas leituras o app fez e em quantas cada instância
 * estava observável. Nada de conversa, nome de contato ou mensagem.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { dayKey } from './interactionClassification';
import { AnalyticsRange, CoverageSummary } from './types';

const STORE_FILE = 'coverage.json';
const RETENTION_DAYS = 35;
const PERSIST_EVERY_MS = 60_000;
/** Abaixo desta fração do tempo observado, a instância aparece como parcial. */
export const COVERAGE_MIN_FRACTION = 0.9;

interface DayCoverage {
  ticks: number;
  observed: Record<string, number>;
}

export class CoverageStore {
  private readonly filePath: string;
  private days: Record<string, DayCoverage>;
  private lastPersist = 0;

  constructor(filePath = path.join(app.getPath('userData'), STORE_FILE)) {
    this.filePath = filePath;
    this.days = this.load();
  }

  private load(): Record<string, DayCoverage> {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (parsed && typeof parsed.days === 'object' && parsed.days) return parsed.days;
      }
    } catch (err) {
      console.error('[CoverageStore] Falha ao ler coverage.json, iniciando vazio:', err);
    }
    return {};
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify({ days: this.days }), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[CoverageStore] Falha ao salvar coverage.json:', err);
    }
  }

  /** Uma leitura periódica: conta a leitura e marca as instâncias carregadas e conectadas. */
  record(statuses: { id: string; loaded: boolean; isOnline: boolean; loadError: boolean }[], now = Date.now()): void {
    const day = dayKey(new Date(now));
    const entry = (this.days[day] ??= { ticks: 0, observed: {} });
    entry.ticks += 1;
    for (const s of statuses) {
      if (s.loaded && s.isOnline && !s.loadError) entry.observed[s.id] = (entry.observed[s.id] ?? 0) + 1;
    }
    if (now - this.lastPersist >= PERSIST_EVERY_MS) {
      this.lastPersist = now;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
      const cutoffDay = dayKey(cutoff);
      for (const d of Object.keys(this.days)) if (d < cutoffDay) delete this.days[d];
      this.persist();
    }
  }

  summary(range: AnalyticsRange, accounts: { id: string; name: string }[]): CoverageSummary {
    const startDay = dayKey(new Date(range.startTs));
    const endDay = dayKey(new Date(range.endTs));
    let totalTicks = 0;
    const observed: Record<string, number> = {};
    for (const [day, entry] of Object.entries(this.days)) {
      if (day < startDay || day > endDay) continue;
      totalTicks += entry.ticks;
      for (const [id, n] of Object.entries(entry.observed)) observed[id] = (observed[id] ?? 0) + n;
    }
    const partial =
      totalTicks === 0
        ? []
        : accounts
            .map((a) => ({ accountId: a.id, name: a.name, fraction: Math.min(1, (observed[a.id] ?? 0) / totalTicks) }))
            .filter((a) => a.fraction < COVERAGE_MIN_FRACTION)
            .sort((a, b) => a.fraction - b.fraction);
    return { totalTicks, totalAccounts: accounts.length, partial };
  }
}

let instance: CoverageStore | null = null;

/** Instância única, criada só depois do app pronto (usa a pasta de dados do usuário). */
export function getCoverageStore(): CoverageStore {
  return (instance ??= new CoverageStore());
}
