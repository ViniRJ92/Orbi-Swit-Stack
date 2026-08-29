/**
 * Modal "Sobre". Orbi Swit Stack — Criado por Vinicius Braga
 */
import { Info } from 'lucide-react';
import { AppInfo } from '../types';
import { Modal } from './Modal';
import { OrbiLogo } from './OrbiLogo';

export function AboutModal({ open, onClose, appInfo }: { open: boolean; onClose: () => void; appInfo: AppInfo | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Sobre" icon={<Info size={15} />}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-3.5 h-16 w-16 overflow-hidden rounded-2xl shadow-lg">
          <OrbiLogo size={64} />
        </div>
        <h3 className="text-lg font-semibold text-text">Orbi Swit Stack</h3>
        <p className="mt-0.5 text-xs text-text-faint">Versão {appInfo?.version ?? ''}</p>

        <p className="mt-4 text-sm leading-relaxed text-text-dim">
          O <strong className="font-semibold text-text">Orbi Swit Stack</strong> foi idealizado para centralizar e elevar a
          gestão de múltiplos ambientes virtuais. O nome <strong className="font-semibold text-text">Orbi</strong> faz
          referência ao ecossistema onde todas as suas contas orbitam em perfeita sintonia em um único lugar. A tecnologia{' '}
          <strong className="font-semibold text-text">SwitStack</strong> une os conceitos de alternância (
          <em>Switch</em>) rápida de janelas com o empilhamento (<em>Stack</em>) produtivo de instâncias, oferecendo total
          controle e fluidez para o seu fluxo de trabalho.
        </p>

        <div className="mt-4 rounded-full border border-border px-4 py-1.5 text-sm text-text">
          Criado por <strong className="font-semibold text-accent">{appInfo?.creator ?? 'Vinicius Braga'}</strong>
        </div>
      </div>
    </Modal>
  );
}
