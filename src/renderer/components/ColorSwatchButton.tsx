/**
 * Botão que mostra a cor atual de algo (instância ou agrupamento) e abre,
 * num menu, o mesmo seletor de cores usado na criação de conta.
 * Orbi — Criado por Vinicius Braga
 *
 * Fase 59: até aqui a cor só era escolhida no assistente de adicionar
 * conta e nunca mais podia ser trocada, e agrupamento não tinha cor
 * nenhuma. Este botão é o ponto único de troca nos dois casos.
 *
 * Reaproveita AccountColorPicker (Fase 57) inteiro — as 16 cores prontas, o
 * seletor do sistema e o campo HEX — em vez de manter uma segunda paleta
 * que sairia do lugar quando uma das duas mudasse.
 *
 * O menu é desenhado FORA da árvore, direto no <body>, com posição fixa
 * calculada a partir do botão. Motivo concreto: os dois lugares onde ele é
 * usado ficam dentro de contêineres com rolagem — a tabela de instâncias
 * (`overflow-x-auto`) e a lista de cartões de Gerenciar contas
 * (`overflow-y-auto`). Um menu posicionado dentro dessas caixas seria
 * cortado nas bordas, porque `overflow` num eixo também recorta o outro.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccountColorPicker } from './AccountColorPicker';

const LARGURA_MENU = 280;
const ALTURA_ESTIMADA = 190;
const MARGEM = 8;

export function ColorSwatchButton({
  value,
  onChange,
  title,
  size = 14,
}: {
  /** Cor atual em HEX. Vazio/indefinido desenha o botão como "sem cor". */
  value: string | undefined;
  onChange: (hex: string) => void;
  title: string;
  /** Diâmetro do círculo em px — a tabela de instâncias e as pílulas de
   *  agrupamento usam tamanhos diferentes. */
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Alinha o menu pela DIREITA do botão (nas últimas colunas da tabela,
  // alinhar pela esquerda jogaria o painel para fora da tela) e o joga para
  // cima quando não há altura suficiente embaixo. Depois disso, prende tudo
  // dentro da janela com uma margem de folga.
  const reposicionar = useCallback(() => {
    const alvo = botaoRef.current;
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    const cabeEmbaixo = r.bottom + 6 + ALTURA_ESTIMADA <= window.innerHeight - MARGEM;
    const top = cabeEmbaixo ? r.bottom + 6 : Math.max(MARGEM, r.top - 6 - ALTURA_ESTIMADA);
    const left = Math.min(
      Math.max(MARGEM, r.right - LARGURA_MENU),
      window.innerWidth - LARGURA_MENU - MARGEM
    );
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (open) reposicionar();
  }, [open, reposicionar]);

  // Rolar ou redimensionar move o botão; sem isto o menu ficaria "solto" no
  // meio da tela. `true` (captura) para pegar também a rolagem dos
  // contêineres internos, que não emitem evento na janela.
  useEffect(() => {
    if (!open) return;
    const aoMover = () => reposicionar();
    window.addEventListener('resize', aoMover);
    document.addEventListener('scroll', aoMover, true);
    return () => {
      window.removeEventListener('resize', aoMover);
      document.removeEventListener('scroll', aoMover, true);
    };
  }, [open, reposicionar]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const alvo = e.target as Node;
      // O menu vive no <body>, fora do botão, então precisa ser checado à
      // parte — senão qualquer clique dentro dele fecharia o próprio menu.
      if (botaoRef.current?.contains(alvo) || menuRef.current?.contains(alvo)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Esc fecha só este menu. Sem `stopPropagation` o mesmo Esc chegaria ao
  // ouvinte do modal de Configurações e fecharia a tela inteira junto —
  // exatamente o problema já corrigido na Fase 50 para a renomeação de
  // agrupamento.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          'shrink-0 rounded-full border transition-transform hover:scale-110 ' +
          (open ? 'border-accent ' : 'border-border-strong ')
        }
        style={{ width: size, height: size, background: value || 'transparent' }}
      />

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label={title}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: LARGURA_MENU }}
            className="z-[125] rounded-xl border border-border bg-surface p-3 shadow-2xl"
          >
            <AccountColorPicker value={value || '#25D366'} onChange={onChange} />
          </div>,
          document.body
        )}
    </>
  );
}
