/**
 * Assistente de três etapas para adicionar uma nova instância: serviço,
 * nome (e URL, se "customizada") e depois cor de identificação. Continua
 * chamando a mesma API (window.multiwhats.addAccount), agora com os
 * parâmetros extras de serviço/URL da Fase 6.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useState } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './Modal';
import { AccountService, SERVICES } from '../types';
import { ServiceIcon } from './ServiceIcon';
import { AccountColorPicker, COLOR_CHOICES } from './AccountColorPicker';


// Fase 19: Threads e X (antigo Twitter) adicionados a pedido do usuário,
// mesmo padrão visual "ícone de app" dos demais (ver ServiceIcon.tsx).
// Fase 23: serviços de IA adicionados a pedido do usuário (mesmo padrão
// visual — ver o comentário no topo de ServiceIcon.tsx sobre os 3 que não
// tinham traçado oficial disponível).
// Fase 31.1 (2026-08-30): Gmail, Google Calendar, Google Earth e Gemini
// saíram desta lista. Motivo: todos exigem entrar com uma conta Google, e o
// Google recusa esse login dentro de navegadores embutidos (é a tela "esse
// navegador ou app pode não ser seguro") — sem opção de continuar mesmo
// assim, por ser uma proteção deliberada contra captura de senha. Oferecer
// esses serviços aqui só criava instância que nunca ia conseguir logar.
// "Pesquisa Google" (`chrome`) CONTINUA na lista: buscar no Google não exige
// login nenhum e funciona normalmente.
// As definições desses serviços seguem existindo em services.ts/types.ts de
// propósito — assim qualquer instância que o usuário já tenha criado antes
// continua abrindo normalmente em vez de virar outra coisa.
const SERVICE_GRID: AccountService[] = [
  'whatsapp',
  'instagram',
  'tiktok',
  'facebook',
  'messenger',
  'chrome',
  'custom',
  'threads',
  'x',
  'openai',
  'deepseek',
  'copilot',
  'perplexity',
  'grok',
];

export function AddAccountWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addAccount = useAppStore((s) => s.addAccount);
  const switchAccount = useAppStore((s) => s.switchAccount);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [service, setService] = useState<AccountService>('whatsapp');
  const [customUrl, setCustomUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(0);
    setService('whatsapp');
    setCustomUrl('');
    setName('');
    setColor(COLOR_CHOICES[0]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canAdvanceFromName = name.trim().length >= 0 && (service !== 'custom' || customUrl.trim().length > 0);

  const confirm = async () => {
    setSubmitting(true);
    const result = await addAccount(name.trim(), color, service, service === 'custom' ? customUrl.trim() : undefined);
    setSubmitting(false);
    if ('error' in result) {
      window.alert(result.error);
      return;
    }
    await switchAccount(result.id);
    handleClose();
  };

  // Fase 18: pedido explícito do usuário para remover o sufixo numérico
  // automático (ex.: "Instagram 14") — o campo agora sugere só o nome puro
  // da plataforma, e o usuário digita o que quiser por cima.
  const suggestedName = SERVICES[service].label;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Adicionar conta · etapa ${step + 1}/3`}
      icon={<UserPlus size={15} />}
      size="md"
    >
      {step === 0 && (
        <>
          <label className="mb-2 block text-xs font-medium text-text-dim">Qual serviço você quer conectar?</label>
          {/* Fase 20: 3 colunas (em vez de 4) — com nomes como "Google
              Calendar"/"Pesquisa Google" por extenso e sem abreviar, 4
              colunas não deixava largura suficiente sem cortar. O nome quebra
              em até 2 linhas (sem `truncate`, sem "..."), nunca reduz a fonte
              abaixo de um tamanho legível. */}
          <div className="grid grid-cols-3 gap-2.5">
            {SERVICE_GRID.map((key) => {
              const def = SERVICES[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                    setService(key);
                    setStep(1);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 text-center transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <ServiceIcon service={key} size={36} />
                  <span className="w-full text-[11.5px] font-medium leading-tight text-text-dim">{def.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <label className="mb-1.5 block text-xs font-medium text-text-dim">Nome de exibição</label>
          <input
            autoFocus
            type="text"
            maxLength={40}
            value={name}
            placeholder={suggestedName}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAdvanceFromName) setStep(2);
            }}
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text transition-colors focus:border-accent"
          />
          <p className="mt-2 text-xs text-text-faint">Deixe em branco para usar "{suggestedName}".</p>

          {service === 'custom' && (
            <>
              <label className="mb-1.5 mt-4 block text-xs font-medium text-text-dim">Endereço do site</label>
              <input
                type="text"
                value={customUrl}
                placeholder="https://exemplo.com"
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text transition-colors focus:border-accent"
              />
            </>
          )}

          <div className="mt-5 flex justify-between gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text transition-colors hover:border-border-strong hover:bg-surface-hover"
              onClick={() => setStep(0)}
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
            <button
              disabled={!canAdvanceFromName}
              className="rounded-lg accent-gradient px-4 py-2 text-sm font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              onClick={() => {
                if (!name.trim()) setName(suggestedName);
                setStep(2);
              }}
            >
              Próximo
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <label className="mb-2 block text-xs font-medium text-text-dim">Cor de identificação</label>
          {/* Fase 57: 16 cores prontas + seletor do sistema + campo HEX,
              tudo em AccountColorPicker.tsx. O valor continua sendo a
              mesma string HEX que `addAccount` sempre recebeu. */}
          <AccountColorPicker value={color} onChange={setColor} />
          <div className="mt-5 flex justify-between gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text transition-colors hover:border-border-strong hover:bg-surface-hover"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
            <button
              disabled={submitting}
              className="rounded-lg accent-gradient px-4 py-2 text-sm font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              onClick={confirm}
            >
              {submitting ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
