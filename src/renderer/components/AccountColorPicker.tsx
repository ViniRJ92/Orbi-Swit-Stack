/**
 * Seletor da cor de identificação de uma instância.
 * Orbi — Criado por Vinicius Braga
 *
 * Fase 57: antes eram 8 círculos fixos, sem jeito de escolher qualquer
 * outro tom. Agora são 16 cores prontas (vibrantes, pastéis e escuras) numa
 * grade 8x2, mais um botão de gota que abre o seletor de cores do sistema e
 * um campo para digitar o código HEX à mão.
 *
 * O VALOR GUARDADO CONTINUA SENDO HEX (`#RRGGBB`, maiúsculo), exatamente
 * como antes: quem usa este componente recebe a mesma string que já recebia
 * dos círculos, então nada muda no estado da aplicação nem no que é salvo.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Droplet } from 'lucide-react';

/**
 * As 8 primeiras são as cores originais, na mesma ordem: uma instância
 * criada antes desta mudança continua batendo com um círculo da grade.
 * As 8 seguintes cobrem o que faltava — tons vibrantes, pastéis e escuros.
 */
export const COLOR_CHOICES = [
  '#25D366',
  '#128C7E',
  '#34B7F1',
  '#F1A208',
  '#9B59B6',
  '#F15C6D',
  '#00A884',
  '#5865F2',
  '#E1306C',
  '#FF7A45',
  '#FFD166',
  '#7ED9A4',
  '#A0C4FF',
  '#C9A7EB',
  '#64748B',
  '#2C3E50',
];

/**
 * Aceita `#abc`, `abc`, `#AABBCC` ou `AABBCC` e devolve sempre `#AABBCC`
 * maiúsculo. Devolve `null` para qualquer coisa que não seja um HEX válido,
 * e nesse caso o valor guardado NÃO é alterado — o campo só avisa em
 * vermelho e espera o usuário terminar de digitar.
 */
export function normalizarHex(entrada: string): string | null {
  const bruto = entrada.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(bruto)) {
    const [r, g, b] = bruto.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(bruto)) return `#${bruto}`.toUpperCase();
  return null;
}

export function AccountColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  // O campo de texto é livre enquanto se digita (dá para apagar tudo e
  // recomeçar sem o componente "brigar" a cada tecla). Só quando o texto
  // vira um HEX válido é que a cor de verdade muda.
  const [texto, setTexto] = useState(value);
  const inputCorRef = useRef<HTMLInputElement>(null);

  // Mantém o campo em dia quando a cor muda por fora dele (clique num
  // círculo, seletor do sistema, ou o formulário sendo reiniciado).
  useEffect(() => {
    setTexto(value);
  }, [value]);

  const textoValido = normalizarHex(texto) !== null;
  const personalizada = !COLOR_CHOICES.includes(value.toUpperCase());

  // Enquanto digita, só vale o formato de 6 dígitos. O atalho de 3 (`#ABC`)
  // é aceito apenas ao sair do campo: se valesse durante a digitação, quem
  // está escrevendo `#ABCDEF` veria o texto virar `#AABBCC` no terceiro
  // dígito e não conseguiria terminar.
  const aplicarTexto = (novo: string) => {
    setTexto(novo);
    const bruto = novo.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(bruto)) onChange(`#${bruto}`.toUpperCase());
  };

  const confirmarTexto = () => {
    const hex = normalizarHex(texto);
    if (hex) onChange(hex);
    else setTexto(value);
  };

  return (
    <div className="grid grid-cols-8 gap-2">
      {COLOR_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          className={
            'flex aspect-square w-full items-center justify-center rounded-full transition-transform hover:scale-110 ' +
            (value.toUpperCase() === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-text' : '')
          }
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
        >
          {value.toUpperCase() === c && <Check size={14} className="text-white drop-shadow" />}
        </button>
      ))}

      {/* Último item da lista: abre o seletor de cores do sistema. O
          <input type="color"> fica invisível por cima do botão em vez de
          escondido com `display:none` — assim o clique cai nele mesmo, que é
          o único jeito confiável de abrir o seletor nativo. O anel aparece
          quando a cor em uso não é nenhuma das prontas, para o usuário ver
          que a escolha ativa é uma cor personalizada. */}
      <div
        className={
          'relative flex aspect-square w-full items-center justify-center rounded-full border border-border-strong transition-transform hover:scale-110 ' +
          (personalizada ? 'ring-2 ring-offset-2 ring-offset-surface ring-text' : '')
        }
        style={{ background: personalizada ? value : 'transparent' }}
        title="Escolher outra cor"
      >
        <Droplet
          size={14}
          className={'pointer-events-none ' + (personalizada ? 'text-white drop-shadow' : 'text-text-dim')}
        />
        <input
          ref={inputCorRef}
          type="color"
          value={normalizarHex(value) ?? '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Escolher outra cor"
        />
      </div>

      {/* Ocupa as 7 colunas que sobraram da terceira linha, então a grade
          continua 8 colunas em qualquer largura, sem sobra nem quebra. */}
      <input
        type="text"
        value={texto}
        onChange={(e) => aplicarTexto(e.target.value)}
        onBlur={confirmarTexto}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmarTexto();
        }}
        placeholder="#FF5733"
        spellCheck={false}
        maxLength={7}
        aria-label="Código HEX da cor"
        className={
          'col-span-7 min-w-0 rounded-lg border bg-input px-3 text-sm uppercase text-text transition-colors placeholder:normal-case placeholder:text-text-faint focus:outline-none ' +
          (textoValido ? 'border-border focus:border-accent' : 'border-danger')
        }
      />
    </div>
  );
}
