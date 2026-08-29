/**
 * Persistência simples em JSON dos metadados das contas (nome, cor, ordem, etc).
 * NÃO armazena credenciais nem tokens de autenticação — isso é responsabilidade
 * exclusiva da sessão isolada do Electron (partition), que já persiste cookies,
 * localStorage e IndexedDB automaticamente em disco.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AccountBackupEntry, AccountRecord } from './types';
import { AccountService } from './services';

const STORE_FILE = 'accounts.json';

const DEFAULT_COLORS = ['#25D366', '#128C7E', '#34B7F1', '#ECE5DD', '#075E54', '#00A884'];

interface StoreShape {
  accounts: AccountRecord[];
}

export class AccountStore {
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
        if (Array.isArray(parsed.accounts)) {
          // Migração: contas salvas antes da Fase 6 não tinham `service`/`groupId`.
          for (const acc of parsed.accounts) {
            if (!acc.service) acc.service = 'whatsapp';
            if (acc.groupId === undefined) acc.groupId = null;
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('[AccountStore] Falha ao ler accounts.json, iniciando vazio:', err);
    }
    return { accounts: [] };
  }

  private persist(): void {
    try {
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[AccountStore] Falha ao salvar accounts.json:', err);
    }
  }

  list(): AccountRecord[] {
    return [...this.data.accounts].sort((a, b) => a.order - b.order);
  }

  get(id: string): AccountRecord | undefined {
    return this.data.accounts.find((a) => a.id === id);
  }

  create(name: string, color?: string, service: AccountService = 'whatsapp', customUrl?: string): AccountRecord {
    const order = this.data.accounts.length;
    const record: AccountRecord = {
      id: randomUUID(),
      name,
      color: color || DEFAULT_COLORS[order % DEFAULT_COLORS.length],
      order,
      createdAt: Date.now(),
      suspended: false,
      favorite: false,
      service,
      customUrl: service === 'custom' ? customUrl : undefined,
      groupId: null,
    };
    this.data.accounts.push(record);
    this.persist();
    return record;
  }

  setIcon(id: string, iconDataUrl: string | undefined): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.iconDataUrl = iconDataUrl;
    this.persist();
  }

  setGroup(id: string, groupId: string | null): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.groupId = groupId;
    this.persist();
  }

  /** Limpa o grupo de todas as contas que apontam para um grupo excluído. */
  clearGroupReferences(groupId: string): void {
    for (const acc of this.data.accounts) {
      if (acc.groupId === groupId) acc.groupId = null;
    }
    this.persist();
  }

  setFavorite(id: string, favorite: boolean): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.favorite = favorite;
    this.persist();
  }

  rename(id: string, newName: string): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.name = newName.trim() || acc.name;
    this.persist();
  }

  setPhone(id: string, phone: string | undefined): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.phone = phone;
    this.persist();
  }

  setSuspended(id: string, suspended: boolean): void {
    const acc = this.get(id);
    if (!acc) return;
    acc.suspended = suspended;
    this.persist();
  }

  remove(id: string): void {
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    this.persist();
  }

  /**
   * Reordena as contas conforme a lista de ids recebida (arrastar e soltar
   * na sidebar/tela de gerenciamento). Ids desconhecidos são ignorados; ids
   * existentes que não aparecerem na lista mantêm a ordem relativa entre si
   * e vão para o final, para nunca perder uma conta de vista por engano.
   */
  reorder(orderedIds: string[]): void {
    const known = new Set(this.data.accounts.map((a) => a.id));
    const ordered = orderedIds.filter((id) => known.has(id));
    const rest = this.list()
      .map((a) => a.id)
      .filter((id) => !ordered.includes(id));
    [...ordered, ...rest].forEach((id, index) => {
      const acc = this.get(id);
      if (acc) acc.order = index;
    });
    this.persist();
  }

  /**
   * Exporta só os metadados das contas (nome, cor, ordem, telefone) — nunca
   * cookies, tokens ou qualquer dado de sessão, que ficam exclusivamente na
   * partition isolada de cada conta e não fazem parte deste backup.
   */
  exportBackup(): AccountBackupEntry[] {
    return this.list().map((acc) => ({
      id: acc.id,
      name: acc.name,
      phone: acc.phone,
      color: acc.color,
      order: acc.order,
      favorite: acc.favorite,
      service: acc.service,
      customUrl: acc.customUrl,
      iconDataUrl: acc.iconDataUrl,
      groupId: acc.groupId,
    }));
  }

  /**
   * Restaura metadados de um backup. Contas cujo `id` já existe têm o nome/cor
   * atualizados; contas novas são recriadas com o MESMO id do backup — se a
   * partition isolada correspondente ainda existir em disco (ex.: reinstalação
   * sem apagar dados do usuário), a sessão volta autenticada; caso contrário,
   * a conta é recriada "vazia" e vai pedir para logar de novo normalmente
   * (QR Code no caso do WhatsApp; a tela de login própria de cada serviço
   * nos demais casos — ver webviewPreload.ts, Fase 10).
   */
  restore(entries: AccountBackupEntry[]): { restored: number; updated: number } {
    let restored = 0;
    let updated = 0;
    for (const entry of entries) {
      const existing = this.get(entry.id);
      if (existing) {
        existing.name = entry.name;
        existing.color = entry.color;
        existing.phone = entry.phone;
        existing.favorite = entry.favorite ?? existing.favorite;
        existing.service = entry.service ?? existing.service ?? 'whatsapp';
        existing.customUrl = entry.customUrl ?? existing.customUrl;
        existing.iconDataUrl = entry.iconDataUrl ?? existing.iconDataUrl;
        existing.groupId = entry.groupId !== undefined ? entry.groupId : existing.groupId;
        updated++;
      } else {
        this.data.accounts.push({
          id: entry.id,
          name: entry.name,
          color: entry.color,
          phone: entry.phone,
          order: this.data.accounts.length,
          createdAt: Date.now(),
          suspended: false,
          favorite: entry.favorite ?? false,
          service: entry.service ?? 'whatsapp',
          customUrl: entry.customUrl,
          iconDataUrl: entry.iconDataUrl,
          groupId: entry.groupId ?? null,
        });
        restored++;
      }
    }
    // Renumera a ordem de exibição para refletir o backup, sem depender dos
    // valores de `order` originais (que podem colidir após o merge).
    this.list().forEach((acc, index) => {
      acc.order = index;
    });
    this.persist();
    return { restored, updated };
  }

  /** Nome da partition isolada usada pela sessão desta conta. */
  static partitionFor(id: string): string {
    return `persist:account-${id}`;
  }
}
