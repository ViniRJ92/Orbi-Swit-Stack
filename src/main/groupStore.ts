/**
 * Persistência simples em JSON dos grupos/pastas de instâncias (ex.:
 * "Vendas", "Suporte"). Um grupo é só um rótulo com ordem de exibição — a
 * associação de cada conta a um grupo mora no próprio AccountRecord
 * (`groupId`), gerenciado por AccountStore.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const STORE_FILE = 'groups.json';

export interface GroupRecord {
  id: string;
  name: string;
  order: number;
}

interface StoreShape {
  groups: GroupRecord[];
}

export class GroupStore {
  private filePath: string;
  private data: StoreShape;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), STORE_FILE);
    this.data = this.load();
  }

  private load(): StoreShape {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as StoreShape;
        if (Array.isArray(parsed.groups)) return parsed;
      }
    } catch (err) {
      console.error('[GroupStore] Falha ao ler groups.json, iniciando vazio:', err);
    }
    return { groups: [] };
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[GroupStore] Falha ao salvar groups.json:', err);
    }
  }

  list(): GroupRecord[] {
    return [...this.data.groups].sort((a, b) => a.order - b.order);
  }

  get(id: string): GroupRecord | undefined {
    return this.data.groups.find((g) => g.id === id);
  }

  /** Nomes vazios e duplicados (sem diferenciar maiúsculas/minúsculas) são rejeitados. */
  private validateName(name: string, ignoreId?: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return 'O nome do agrupamento não pode ficar vazio.';
    const clash = this.data.groups.some(
      (g) => g.id !== ignoreId && g.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) return 'Já existe um agrupamento com esse nome.';
    return null;
  }

  create(name: string): GroupRecord | { error: string } {
    const error = this.validateName(name);
    if (error) return { error };
    const record: GroupRecord = {
      id: randomUUID(),
      name: name.trim(),
      order: this.data.groups.length,
    };
    this.data.groups.push(record);
    this.persist();
    return record;
  }

  rename(id: string, name: string): { error: string } | { ok: true } {
    const group = this.get(id);
    if (!group) return { error: 'Agrupamento não encontrado.' };
    const error = this.validateName(name, id);
    if (error) return { error };
    group.name = name.trim();
    this.persist();
    return { ok: true };
  }

  remove(id: string): void {
    this.data.groups = this.data.groups.filter((g) => g.id !== id);
    this.data.groups.forEach((g, i) => (g.order = i));
    this.persist();
  }

  reorder(orderedIds: string[]): void {
    const known = new Set(this.data.groups.map((g) => g.id));
    const ordered = orderedIds.filter((id) => known.has(id));
    const rest = this.list()
      .map((g) => g.id)
      .filter((id) => !ordered.includes(id));
    [...ordered, ...rest].forEach((id, index) => {
      const g = this.get(id);
      if (g) g.order = index;
    });
    this.persist();
  }
}
