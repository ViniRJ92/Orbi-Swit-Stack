/**
 * Parte do Analytics separada de AnalyticsModal.tsx (Fase 85), sem mudança
 * de lógica. Ver AnalyticsModal.tsx para a página que busca os dados.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { CalendarRange } from 'lucide-react';
import { AnalyticsPeriod } from '../../types';
import { PERIODS } from './shared';

/**
 * Fase 78 — o seletor de período do topo, extraído sem mudar o visual, para
 * que todo lugar do Analytics que escolhe período use exatamente o mesmo
 * componente (topo, Fluxo de mensagens, Atividade das instâncias e
 * Classificação das interações). Cada seção continua com as próprias opções.
 */
export function SeletorPeriodo<K extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
}: {
  opcoes: { key: K; label: string; icon?: React.ReactNode }[];
  valor: K;
  onChange: (k: K) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-1 rounded-lg bg-input p-1">
      {opcoes.map((o) => (
        <button
          key={o.key}
          aria-pressed={valor === o.key}
          className={
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ' +
            (valor === o.key ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
          }
          onClick={() => onChange(o.key)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const OPCOES_PERIODO: { key: AnalyticsPeriod; label: string; icon?: React.ReactNode }[] = [
  ...PERIODS,
  { key: 'custom', label: 'Personalizado', icon: <CalendarRange size={13} /> },
];
