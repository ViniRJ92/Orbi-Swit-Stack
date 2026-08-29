/**
 * Gera o ícone de selo (badge) com o total de mensagens não lidas, usado no
 * ícone da barra de tarefas do Windows (BrowserWindow.setOverlayIcon).
 * Desenhado manualmente em um buffer de pixels (sem libs externas de
 * canvas/imagem) — um círculo vermelho com o número em branco, usando uma
 * fonte de pixels minúscula própria.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { nativeImage, NativeImage } from 'electron';

const DIGIT_FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
};

const SIZE = 32;

/** Retorna null quando não há nada a mostrar (badge deve ser removido). */
export function buildUnreadBadge(count: number): NativeImage | null {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  // Buffer BGRA (formato esperado por nativeImage.createFromBitmap).
  const buffer = Buffer.alloc(SIZE * SIZE * 4);
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const idx = (y * SIZE + x) * 4;
    buffer[idx] = b;
    buffer[idx + 1] = g;
    buffer[idx + 2] = r;
    buffer[idx + 3] = a;
  };

  // Fundo: círculo vermelho preenchendo quase todo o ícone.
  const center = SIZE / 2;
  const radius = SIZE / 2 - 1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(x, y, 0xe5, 0x39, 0x35, 255);
      }
    }
  }

  // Número em branco, centralizado, usando a fonte de pixels 3x5.
  const scale = label.length <= 1 ? 4 : label.length === 2 ? 3 : 2;
  const gap = scale;
  const glyphW = 3 * scale;
  const glyphH = 5 * scale;
  const totalWidth = label.length * glyphW + (label.length - 1) * gap;
  const startX = Math.round((SIZE - totalWidth) / 2);
  const startY = Math.round((SIZE - glyphH) / 2);

  for (let i = 0; i < label.length; i++) {
    const glyph = DIGIT_FONT[label[i]];
    if (!glyph) continue;
    const glyphX = startX + i * (glyphW + gap);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (glyph[row][col] !== '1') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPixel(glyphX + col * scale + sx, startY + row * scale + sy, 255, 255, 255, 255);
          }
        }
      }
    }
  }

  return nativeImage.createFromBitmap(buffer, { width: SIZE, height: SIZE });
}
