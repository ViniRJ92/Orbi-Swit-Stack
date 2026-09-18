/**
 * Assistente de três etapas para adicionar uma nova instância: serviço,
 * nome (e URL, se "customizada") e depois cor de identificação. Continua
 * chamando a mesma API (window.multiwhats.addAccount), agora com os
 * parâmetros extras de serviço/URL da Fase 6.
 *
 * Fase 82: novo visual da etapa de serviço — categorias, busca, cartões com
 * ícone, nome e uma descrição curta, e rodapé com indicador de etapas e os
 * botões Cancelar/Continuar. Escolher o cartão só seleciona; Continuar (ou
 * clique duplo no cartão) avança. Nomes, ícones e a lista de serviços são
 * os mesmos de antes.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Search, UserPlus } from 'lucide-react';
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

type Categoria = 'todos' | 'redes' | 'navegacao' | 'ia';

/** Fase 82 — categoria e descrição curta de cada serviço do cartão. */
const SERVICE_INFO: Partial<Record<AccountService, { categoria: Exclude<Categoria, 'todos'>; descricao: string }>> = {
  whatsapp: { categoria: 'redes', descricao: 'Conversas e atendimento' },
  instagram: { categoria: 'redes', descricao: 'Direct e perfil' },
  tiktok: { categoria: 'redes', descricao: 'Vídeos e mensagens' },
  facebook: { categoria: 'redes', descricao: 'Páginas e perfil' },
  messenger: { categoria: 'redes', descricao: 'Mensagens do Facebook' },
  threads: { categoria: 'redes', descricao: 'Publicações e conversas' },
  x: { categoria: 'redes', descricao: 'Publicações e mensagens' },
  chrome: { categoria: 'navegacao', descricao: 'Buscas sem login' },
  custom: { categoria: 'navegacao', descricao: 'Qualquer site pelo endereço' },
  openai: { categoria: 'ia', descricao: 'Assistente de IA' },
  deepseek: { categoria: 'ia', descricao: 'Assistente de IA' },
  copilot: { categoria: 'ia', descricao: 'Assistente da Microsoft' },
  perplexity: { categoria: 'ia', descricao: 'Pesquisa com IA' },
  grok: { categoria: 'ia', descricao: 'Assistente de IA do X' },
};

const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'redes', label: 'Mensagens e redes' },
  { key: 'navegacao', label: 'Navegação' },
  { key: 'ia', label: 'IA' },
];

/** Rodapé comum às três etapas: indicador de etapa, resumo e botões. */
function Rodape({
  step,
  resumo,
  children,
}: {
  step: 0 | 1 | 2;
  resumo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1" aria-label={`Etapa ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={'h-1 rounded-full transition-all ' + (i <= step ? 'w-6 bg-accent' : 'w-3 bg-border-strong')}
            />
          ))}
        </div>
        <span className="truncate text-[12px] text-text-dim">{resumo}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

const BOTAO_SECUNDARIO =
  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-text-dim transition-colors hover:bg-surface-hover hover:text-text';
const BOTAO_PRIMARIO =
  'rounded-lg accent-gradient px-4 py-2 text-sm font-semibold text-accent-contrast shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60';

export function AddAccountWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addAccount = useAppStore((s) => s.addAccount);
  const switchAccount = useAppStore((s) => s.switchAccount);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [service, setService] = useState<AccountService>('whatsapp');
  const [customUrl, setCustomUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [categoria, setCategoria] = useState<Categoria>('todos');
  const [busca, setBusca] = useState('');

  const reset = () => {
    setStep(0);
    setService('whatsapp');
    setCustomUrl('');
    setName('');
    setColor(COLOR_CHOICES[0]);
    setSubmitting(false);
    setCategoria('todos');
    setBusca('');
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

  const contagem = useMemo(() => {
    const c: Record<Categoria, number> = { todos: SERVICE_GRID.length, redes: 0, navegacao: 0, ia: 0 };
    for (const key of SERVICE_GRID) {
      const cat = SERVICE_INFO[key]?.categoria;
      if (cat) c[cat] += 1;
    }
    return c;
  }, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return SERVICE_GRID.filter((key) => {
      if (categoria !== 'todos' && SERVICE_INFO[key]?.categoria !== categoria) return false;
      if (!q) return true;
      return SERVICES[key].label.toLowerCase().includes(q) || (SERVICE_INFO[key]?.descricao ?? '').toLowerCase().includes(q);
    });
  }, [busca, categoria]);

  const avancarDoServico = (key: AccountService) => {
    setService(key);
    setStep(1);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Adicionar conta · etapa ${step + 1}/3`}
      icon={<UserPlus size={15} />}
      size="lg"
    >
      {step === 0 && (
        <>
          <p className="mb-3 text-[12.5px] text-text-dim">Qual serviço você quer conectar?</p>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-input p-1">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategoria(c.key)}
                  aria-pressed={categoria === c.key}
                  className={
                    'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                    (categoria === c.key ? 'accent-gradient text-accent-contrast' : 'text-text-dim hover:text-text')
                  }
                >
                  {c.label} ({contagem[c.key]})
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar serviço..."
                className="w-44 rounded-lg border border-border bg-input py-1.5 pl-8 pr-2 text-[12px] text-text placeholder:text-text-faint focus:border-accent"
              />
            </div>
          </div>

          {visiveis.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-text-faint">Nenhum serviço encontrado.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {visiveis.map((key) => {
                const def = SERVICES[key];
                const selecionado = service === key;
                return (
                  <button
                    key={key}
                    onClick={() => setService(key)}
                    onDoubleClick={() => avancarDoServico(key)}
                    aria-pressed={selecionado}
                    className={
                      'group relative flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ' +
                      (selecionado
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface-hover/40 hover:border-border-strong hover:bg-surface-hover')
                    }
                  >
                    <ServiceIcon service={key} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold leading-tight text-text">{def.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                        {SERVICE_INFO[key]?.descricao ?? ''}
                      </span>
                    </span>
                    {selecionado && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <Rodape
            step={0}
            resumo={
              <>
                Serviço selecionado: <span className="font-semibold text-text">{SERVICES[service].label}</span>
              </>
            }
          >
            <button className={BOTAO_SECUNDARIO} onClick={handleClose}>
              Cancelar
            </button>
            <button className={BOTAO_PRIMARIO} onClick={() => setStep(1)}>
              Continuar
            </button>
          </Rodape>
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

          <Rodape
            step={1}
            resumo={
              <>
                Serviço: <span className="font-semibold text-text">{SERVICES[service].label}</span>
              </>
            }
          >
            <button className={BOTAO_SECUNDARIO} onClick={() => setStep(0)}>
              <ArrowLeft size={14} />
              Voltar
            </button>
            <button
              disabled={!canAdvanceFromName}
              className={BOTAO_PRIMARIO}
              onClick={() => {
                if (!name.trim()) setName(suggestedName);
                setStep(2);
              }}
            >
              Próximo
            </button>
          </Rodape>
        </>
      )}

      {step === 2 && (
        <>
          <label className="mb-2 block text-xs font-medium text-text-dim">Cor de identificação</label>
          {/* Fase 57: 16 cores prontas + seletor do sistema + campo HEX,
              tudo em AccountColorPicker.tsx. O valor continua sendo a
              mesma string HEX que `addAccount` sempre recebeu. */}
          <AccountColorPicker value={color} onChange={setColor} />
          <Rodape
            step={2}
            resumo={
              <>
                <span className="font-semibold text-text">{name.trim() || suggestedName}</span> ·{' '}
                {SERVICES[service].label}
              </>
            }
          >
            <button className={BOTAO_SECUNDARIO} onClick={() => setStep(1)}>
              <ArrowLeft size={14} />
              Voltar
            </button>
            <button disabled={submitting} className={BOTAO_PRIMARIO} onClick={confirm}>
              {submitting ? 'Criando...' : 'Criar conta'}
            </button>
          </Rodape>
        </>
      )}
    </Modal>
  );
}
