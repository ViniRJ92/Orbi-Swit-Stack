/** Fase 90: permite importar os ícones .png dos serviços (o Vite os transforma em URL). */
declare module '*.png' {
  const src: string;
  export default src;
}
