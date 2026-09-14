/**
 * Fase 77 — histórico de dias com interação por contato, usado SÓ pela
 * Classificação das Interações (ver interactionClassification.ts).
 *
 * Por que um arquivo separado: chatActivity.json guarda eventos por 30 dias,
 * pouco para reconhecer um contato Reativado ou Esporádico. Aqui fica apenas
 * (instância, nome do contato, dias em que ele mandou mensagem), por 180
 * dias. Nenhum texto, número ou conteúdo de mensagem.
 *
 * Alimentação: copia os dias dos eventos RECEBIDOS que chatActivityStore já
 * registrou (leitura, nunca escrita naquele store). Só acrescenta dias, então
 * a poda de 30 dias do chatActivity.json não apaga o que já foi copiado.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { InteractionDays, dayKey } from './interactionClassification';

const STORE_FILE = 'interactionHistory.json';
const RETENTION_DAYS = 180;
const HISTORY_VERSION = 2;

export class InteractionHistoryStore {
  private readonly filePath: string;
  private days: InteractionDays;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.days = this.load();
  }

  private load(): InteractionDays {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        // Fase 80 — versão 2 = só dias de conversa aberta. Arquivo antigo
        // (com dias vindos da estimativa pela lista) recomeça vazio e é
        // preenchido de novo pelo sync, a partir dos eventos confirmados.
        if (parsed && parsed.version === HISTORY_VERSION && typeof parsed.days === 'object' && parsed.days) {
          return parsed.days as InteractionDays;
        }
      }
    } catch (err) {
      console.error('[InteractionHistoryStore] Falha ao ler interactionHistory.json, iniciando vazio:', err);
    }
    return {};
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify({ version: HISTORY_VERSION, days: this.days }), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[InteractionHistoryStore] Falha ao salvar interactionHistory.json:', err);
    }
  }

  /** Acrescenta os dias de interação ainda não guardados e poda o que passou de 180 dias. */
  sync(inbound: { a: string; k: string; day: string }[]): void {
    let changed = false;
    for (const { a, k, day } of inbound) {
      const byContact = (this.days[a] ??= {});
      const list = (byContact[k] ??= []);
      if (list.includes(day)) continue;
      list.push(day);
      list.sort();
      changed = true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffDay = dayKey(cutoff);
    for (const [accountId, byContact] of Object.entries(this.days)) {
      for (const [contact, list] of Object.entries(byContact)) {
        const kept = list.filter((d) => d >= cutoffDay);
        if (kept.length === list.length) continue;
        changed = true;
        if (kept.length === 0) delete byContact[contact];
        else byContact[contact] = kept;
      }
      if (Object.keys(byContact).length === 0) delete this.days[accountId];
    }

    if (changed) this.persist();
  }

  getDays(): InteractionDays {
    return this.days;
  }

  /** Conta removida — some junto o histórico dela. */
  forget(accountId: string): void {
    if (!this.days[accountId]) return;
    delete this.days[accountId];
    this.persist();
  }

  /** Acompanha o "Limpar histórico" do Analytics. */
  clear(): void {
    this.days = {};
    this.persist();
  }
}
