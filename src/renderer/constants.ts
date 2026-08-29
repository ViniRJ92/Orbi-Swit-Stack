/**
 * Constantes compartilhadas do renderer. Espelha os limites de
 * src/main/settingsStore.ts para a barra de redimensionamento da sidebar.
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 450;
export const SIDEBAR_WIDTH_DEFAULT = 268;

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)));
}
