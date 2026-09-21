/**
 * Log de diagnóstico simples, em arquivo de texto — sem dependências externas
 * (evitando adicionar uma lib como `electron-log` só para isso, como pedido).
 *
 * Não registra conteúdo de mensagens do WhatsApp nem dados de sessão — só
 * eventos do próprio app (abrir/fechar, criar/remover conta, suspender,
 * falhas de carregamento, erros não tratados) para ajudar a diagnosticar
 * problemas relatados pelo usuário.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Fase 83 — nomes com "Orbi". Os antigos são renomeados uma vez, na
// primeira execução, então o conteúdo do log é mantido.
const LOG_FILE = "orbi.log";
const OLD_LOG_FILE = "orbi.old.log";
const LEGACY_LOG_FILE = "orbi-swit-stack.log";
const LEGACY_OLD_LOG_FILE = "orbi-swit-stack.old.log";

/** Renomeia o arquivo antigo para o novo nome, só se o novo ainda não existir. */
function migrateLegacy(from: string, to: string): void {
  try {
    const origem = path.join(logDir, from);
    const destino = path.join(logDir, to);
    if (fs.existsSync(origem) && !fs.existsSync(destino)) fs.renameSync(origem, destino);
  } catch (err) {
    console.error("[Logger] Falha ao renomear log antigo:", err);
  }
}

let logDir = '';
let logFilePath = '';
let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  logDir = path.join(app.getPath('userData'), 'logs');
  logFilePath = path.join(logDir, LOG_FILE);
  try {
    fs.mkdirSync(logDir, { recursive: true });
    migrateLegacy(LEGACY_LOG_FILE, LOG_FILE);
    migrateLegacy(LEGACY_OLD_LOG_FILE, OLD_LOG_FILE);
    rotateIfNeeded();
  } catch (err) {
    console.error('[Logger] Falha ao preparar pasta de logs:', err);
  }
  initialized = true;
}

function rotateIfNeeded(): void {
  try {
    const stat = fs.statSync(logFilePath);
    if (stat.size > MAX_LOG_SIZE_BYTES) {
      const oldPath = path.join(logDir, OLD_LOG_FILE);
      fs.rmSync(oldPath, { force: true });
      fs.renameSync(logFilePath, oldPath);
    }
  } catch {
    // Arquivo ainda não existe na primeira execução — nada a fazer.
  }
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  ensureInitialized();
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    rotateIfNeeded();
    fs.appendFileSync(logFilePath, line, 'utf-8');
  } catch (err) {
    console.error('[Logger] Falha ao gravar log:', err);
  }
  if (level === 'ERROR') console.error(message);
}

export const logger = {
  info: (message: string) => write('INFO', message),
  warn: (message: string) => write('WARN', message),
  error: (message: string) => write('ERROR', message),
  getLogDir: (): string => {
    ensureInitialized();
    return logDir;
  },
  /** Tamanho atual do arquivo de log em bytes (0 se ainda não existir). */
  getLogSizeBytes: (): number => {
    ensureInitialized();
    try {
      return fs.statSync(logFilePath).size;
    } catch {
      return 0;
    }
  },
  /**
   * Fase 70 — apaga o log de diagnóstico (o arquivo atual e o antigo da
   * rotação) e registra que foi limpo, para o painel mostrar o que houve.
   */
  clear: (): void => {
    ensureInitialized();
    try {
      fs.writeFileSync(logFilePath, '', 'utf-8');
      fs.rmSync(path.join(logDir, OLD_LOG_FILE), { force: true });
    } catch (err) {
      console.error('[Logger] Falha ao limpar log:', err);
    }
    write('INFO', 'Log limpo pelo usuário.');
  },
  /** Últimas N linhas do log, para um visualizador simples dentro do app (Configurações → Diagnóstico). */
  readTail: (maxLines: number): string[] => {
    ensureInitialized();
    try {
      const content = fs.readFileSync(logFilePath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.length > 0);
      return lines.slice(-maxLines);
    } catch {
      return [];
    }
  },
};
