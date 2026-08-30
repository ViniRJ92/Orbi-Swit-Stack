/**
 * Fase 39 — aviso de mensagem nova desenhado pelo PRÓPRIO app, dentro da
 * janela, no canto inferior direito.
 *
 * Por que existe: até aqui o único aviso era a notificação nativa do Windows
 * (ver notificationManager.ts). O sistema operacional é quem desenha aquela
 * caixa — tamanho, espaçamento, ícone e fonte não são ajustáveis pelo app.
 * Este componente resolve isso: quando a janela está visível, o aviso é
 * este aqui, com a mesma identidade visual do resto da interface.
 *
 * Divisão de responsabilidade (ver notificationManager.ts):
 *  - janela VISÍVEL  -> este toast
 *  - janela escondida/minimizada na bandeja -> notificação nativa do Windows,
 *    porque um aviso desenhado dentro de uma janela que não está na tela não
 *    seria visto por ninguém.
 *
 * Clicar no aviso abre a instância correspondente. Nunca mostra conteúdo de
 * mensagem — só o nome da instância e quantas chegaram.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface ToastItem {
  id: number;
  accountId: string;
  accountName: string;
  count: number;
}

const VISIBLE_MS = 5000;
/** Teto de avisos empilhados — acima disso os mais antigos saem. */
const MAX_STACK = 3;

export function MessageToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const switchAccount = useAppStore((s) => s.switchAccount);

  useEffect(() => {
    return window.multiwhats.onNewMessages(({ accountId, accountName, count }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, accountId, accountName, count }].slice(-MAX_STACK));
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), VISIBLE_MS);
    });
  }, []);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.button
            key={item.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => {
              switchAccount(item.accountId);
              dismiss(item.id);
            }}
            className="pointer-events-auto group flex items-center gap-2.5 rounded-2xl border border-border bg-surface py-2.5 pl-2.5 pr-3 text-left shadow-lg transition-colors hover:bg-surface-hover"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl accent-gradient text-accent-contrast">
              <MessageCircle size={16} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[12.5px] font-semibold text-text">{item.accountName}</span>
              <span className="text-[11.5px] font-light text-text-dim">
                {item.count === 1 ? 'Nova mensagem' : `${item.count} mensagens novas`}
              </span>
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                dismiss(item.id);
              }}
              className="ml-1 shrink-0 rounded-lg p-1 text-text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
            >
              <X size={13} />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
