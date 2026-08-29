/**
 * Modal "O que há de novo" — abre sozinha na primeira vez que o usuário
 * abre uma versão nova do app (comparação feita no processo principal,
 * ver main/releaseNotes.ts e store/useAppStore.ts). Puramente informativa:
 * um botão só, "Entendi", que fecha e marca a versão como vista.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './Modal';

export function WhatsNewModal() {
  const whatsNew = useAppStore((s) => s.whatsNew);
  const dismissWhatsNew = useAppStore((s) => s.dismissWhatsNew);

  return (
    <Modal open={whatsNew !== null} onClose={dismissWhatsNew} title="O que há de novo" icon={<Sparkles size={15} />}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-text-faint">Versão {whatsNew?.version}</p>
        {/* Texto simples, sem markdown — cada linha em branco vira um parágrafo, o resto quebra normalmente. */}
        <div className="whitespace-pre-line text-[13px] leading-relaxed text-text-dim">{whatsNew?.notes}</div>
        <button
          className="ml-auto rounded-lg accent-gradient px-4 py-2 text-sm font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90"
          onClick={dismissWhatsNew}
        >
          Entendi
        </button>
      </div>
    </Modal>
  );
}
