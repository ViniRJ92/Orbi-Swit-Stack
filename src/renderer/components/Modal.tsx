/**
 * Casca visual comum a todos os modais (Sobre, Configurações, Renomear):
 * overlay com leve desfoque, cartão elevado com cabeçalho consistente
 * (ícone + título + botão de fechar) e a mesma animação de entrada/saída.
 * Centralizar isso aqui evita que cada modal reimplemente o mesmo chrome
 * com pequenas inconsistências visuais.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'w-[360px]',
  md: 'w-[440px]',
  // Altura fixa (dentro do teto de max-h-[85vh] logo abaixo) para que o
  // rail de abas + painel de conteúdo, ambos flex-1, tenham uma área real
  // para dividir — sem isso a rolagem interna do painel nunca entraria em
  // ação porque o cartão encolheria para caber no conteúdo.
  lg: 'w-[860px] h-[620px]',
  // Fase 28: Analytics ganhou mais conteúdo (relatório Hoje x Ontem por
  // instância, além dos KPIs/gráficos que já existiam) — precisa de mais
  // espaço horizontal e vertical que o "lg" sem espremer nada.
  xl: 'w-[1180px] h-[760px]',
};

export function Modal({
  open,
  onClose,
  title,
  icon,
  wide,
  size,
  /** Substitui o wrapper padrão (`overflow-y-auto px-5 py-5`) do corpo do
   * modal — use quando o conteúdo precisa controlar seu próprio layout de
   * rolagem interna (ex.: abas com rail fixo + painel que rola sozinho),
   * para nunca ter dois scrolls (o do modal E o do conteúdo) ao mesmo tempo. */
  contentClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  /** @deprecated use `size="md"` */
  wide?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  contentClassName?: string;
  children: ReactNode;
}) {
  const resolvedSize = size ?? (wide ? 'md' : 'sm');
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={
              'flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ' +
              SIZE_CLASSES[resolvedSize]
            }
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">{icon}</span>}
                <h2 className="text-[15px] font-semibold text-text">{title}</h2>
              </div>
              <button
                className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
                onClick={onClose}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className={contentClassName ?? 'overflow-y-auto px-5 py-5'}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
