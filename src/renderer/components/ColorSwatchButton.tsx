/**
 * Bolinha com a cor atual de algo (instância ou agrupamento). Clicar nela
 * abre direto o seletor de cores do sistema.
 * Orbi — Criado por Vinicius Braga
 *
 * Fase 59: até aqui a cor só era escolhida no assistente de adicionar
 * conta e nunca mais podia ser trocada, e agrupamento não tinha cor
 * nenhuma.
 *
 * Sem menu intermediário, a pedido do usuário: um clique na bolinha já
 * abre o seletor, em vez de abrir uma paleta que exigiria um segundo
 * clique. A paleta de 16 cores continua existindo, mas só onde faz
 * sentido escolher rápido: na criação da conta (AccountColorPicker).
 *
 * O <input type="color"> fica invisível POR CIMA da bolinha, e não
 * escondido com `display:none`: é o clique nele mesmo que abre o seletor
 * nativo, então ele precisa continuar recebendo o evento.
 */
import { useEffect, useRef, useState } from 'react';

const COR_PADRAO = '#25D366';

export function ColorSwatchButton({
  value,
  onChange,
  title,
  size = 14,
}: {
  /** Cor atual em HEX. Ausente cai na cor padrão só para o seletor abrir
   *  em algum lugar coerente. */
  value: string | undefined;
  onChange: (hex: string) => void;
  title: string;
  /** Diâmetro do círculo em px — a tabela de instâncias e as pílulas de
   *  agrupamento usam tamanhos diferentes. */
  size?: number;
}) {
  // O seletor nativo dispara a cada movimento do cursor dentro dele, para
  // dar prévia ao vivo. Pintamos a bolinha na hora com o valor local, mas
  // só gravamos depois de uma pausa — senão seria uma escrita em disco por
  // pixel arrastado.
  const [local, setLocal] = useState(value || COR_PADRAO);
  const timerRef = useRef<number | undefined>(undefined);
  const pendenteRef = useRef<string | null>(null);

  useEffect(() => setLocal(value || COR_PADRAO), [value]);

  const gravarAgora = () => {
    window.clearTimeout(timerRef.current);
    const hex = pendenteRef.current;
    pendenteRef.current = null;
    if (hex) onChange(hex);
  };

  // Se o componente sair da tela antes da pausa terminar (a linha some da
  // tabela, o modal fecha), grava o que estava pendente em vez de perder.
  useEffect(() => () => gravarAgora());

  const aoEscolher = (hex: string) => {
    const normalizado = hex.toUpperCase();
    setLocal(normalizado);
    pendenteRef.current = normalizado;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(gravarAgora, 200);
  };

  return (
    <span
      className="relative inline-block shrink-0 rounded-full border border-border-strong align-middle transition-transform hover:scale-110"
      style={{ width: size, height: size, background: local }}
      title={title}
    >
      <input
        type="color"
        value={local}
        onChange={(e) => aoEscolher(e.target.value)}
        onBlur={gravarAgora}
        aria-label={title}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
