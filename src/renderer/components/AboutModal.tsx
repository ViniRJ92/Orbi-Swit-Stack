/**
 * Modal "Sobre". Orbi Swit Stack — Criado por Vinicius Braga
 */
import { Info } from 'lucide-react';
import { AppInfo } from '../types';
import { Modal } from './Modal';
import { OrbiLogo } from './OrbiLogo';

export function AboutModal({ open, onClose, appInfo }: { open: boolean; onClose: () => void; appInfo: AppInfo | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Sobre" icon={<Info size={15} />} closeOnEscape>
      <div className="flex flex-col items-center text-center">
        <div className="mb-3.5 h-16 w-16 overflow-hidden rounded-2xl shadow-lg">
          <OrbiLogo size={64} />
        </div>
        <h3 className="text-lg font-semibold text-text">Orbi</h3>
        <p className="mt-0.5 text-xs text-text-faint">Versão {appInfo?.version ?? ''}</p>

        {/*
          Fase 41: texto institucional enxuto, no lugar do parágrafo longo que
          explicava a origem do nome. `leading-7` dá mais respiro entre as
          linhas do que o `leading-relaxed` anterior.
        */}
        <p className="mt-4 max-w-md text-sm leading-7 text-text-dim">
          O <strong className="font-semibold text-text">Orbi</strong> foi criado para centralizar e acelerar a
          gestão das suas instâncias em um só lugar, oferecendo controle total e produtividade para o seu fluxo de
          trabalho.
        </p>

        {/* Fase 41: `mt-4` (16px) separa a assinatura do texto acima. */}
        <div className="mt-4 rounded-full border border-border px-4 py-1.5 text-sm text-text">
          Criado por <strong className="font-semibold text-accent">{appInfo?.creator ?? 'Vinicius Braga'}</strong>
        </div>
      </div>
    </Modal>
  );
}
