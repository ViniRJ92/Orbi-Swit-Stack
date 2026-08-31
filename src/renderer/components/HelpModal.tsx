/**
 * Fase 50 — Central de Ajuda: manual de uso do aplicativo.
 *
 * Substituiu o botão "Sobre" no topo. O conteúdo é escrito à mão aqui mesmo,
 * em vez de vir de um arquivo externo ou da internet: assim o manual é sempre
 * o da versão instalada, funciona sem rede e não pode ficar dessincronizado
 * do app.
 *
 * Estrutura: índice fixo à esquerda e conteúdo rolável à direita. Clicar num
 * item do índice leva até a seção; rolar o conteúdo destaca o item
 * correspondente no índice.
 *
 * Orbi — Criado por Vinicius Braga
 */
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Bell, HelpCircle, Keyboard, LayoutGrid, Mail, MessageCircle, Rocket, Settings, X } from 'lucide-react';

/** Fase 51 — contatos do suporte, exibidos como texto no card do rodapé. */
const SUPORTE_WHATSAPP_EXIBICAO = '(21) 97161-2853';
const SUPORTE_EMAIL = 'viniciusbraga.rio@gmail.com';

interface HelpSection {
  id: string;
  label: string;
  icon: ReactNode;
  body: ReactNode;
}

/** Um passo numerado dentro de uma seção. */
function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
        {n}
      </span>
      <span className="text-[13px] leading-6 text-text-dim">{children}</span>
    </li>
  );
}

function Bloco({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="mb-2 text-[13.5px] font-semibold text-text">{title}</h4>
      {children}
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-lg border border-border bg-surface-hover/50 px-3 py-2 text-[12.5px] leading-6 text-text-dim">
      {children}
    </p>
  );
}

const SECTIONS: HelpSection[] = [
  {
    id: 'inicio',
    label: 'Primeiros passos',
    icon: <Rocket size={14} />,
    body: (
      <>
        <Bloco title="O que é o Orbi">
          <p className="text-[13px] leading-6 text-text-dim">
            O Orbi mantém várias contas de WhatsApp e de outros serviços abertas ao mesmo tempo, cada uma separada da
            outra. Uma conta nunca enxerga a sessão da outra, então você troca de número sem precisar sair e entrar de
            novo.
          </p>
        </Bloco>

        <Bloco title="Adicionar sua primeira conta">
          <ol className="flex flex-col gap-2">
            <Passo n={1}>Clique em "Adicionar conta", no fim da barra lateral esquerda.</Passo>
            <Passo n={2}>Escolha o serviço, por exemplo WhatsApp.</Passo>
            <Passo n={3}>Dê um nome que faça sentido para você, como "Atendimento 1", e escolha uma cor.</Passo>
            <Passo n={4}>A instância abre com o QR Code. Leia pelo celular, igual ao WhatsApp Web normal.</Passo>
          </ol>
          <Aviso>
            A leitura do QR Code só é necessária uma vez por conta. Depois disso ela reabre já conectada, mesmo depois
            de fechar o aplicativo.
          </Aviso>
        </Bloco>

        <Bloco title="Trocar de conta">
          <p className="text-[13px] leading-6 text-text-dim">
            Clique na conta desejada na barra lateral. Também dá para usar Ctrl+1 até Ctrl+9 para as nove primeiras, e
            Ctrl+Tab para passar de uma para a próxima.
          </p>
        </Bloco>
      </>
    ),
  },
  {
    id: 'contas',
    label: 'Gerenciar contas',
    icon: <LayoutGrid size={14} />,
    body: (
      <>
        <Bloco title="Onde fica">
          <p className="text-[13px] leading-6 text-text-dim">
            Botão "Gerenciar contas", no topo. É a central de tudo relacionado às instâncias: renomear, trocar ícone,
            organizar em agrupamentos e excluir.
          </p>
        </Bloco>

        <Bloco title="Organizar em agrupamentos">
          <ol className="flex flex-col gap-2">
            <Passo n={1}>Abra Configurações e vá na aba "Instâncias e Agrupamentos".</Passo>
            <Passo n={2}>Crie um agrupamento, por exemplo "Vendas" ou "Suporte".</Passo>
            <Passo n={3}>Na lista de instâncias, escolha o agrupamento de cada uma.</Passo>
          </ol>
          <Aviso>
            Os agrupamentos aparecem como pastas na barra lateral e também servem de filtro no Analytics, para você ver
            o movimento de um grupo só.
          </Aviso>
        </Bloco>

        <Bloco title="Instância suspensa">
          <p className="text-[13px] leading-6 text-text-dim">
            Para economizar memória, contas que ficam paradas em segundo plano podem ser suspensas. Uma conta suspensa
            não é lida pelo Analytics e não recebe aviso de mensagem. Basta clicar nela para voltar ao normal, sem
            precisar ler o QR Code de novo.
          </p>
          <Aviso>
            Quantas contas ficam ativas ao mesmo tempo é definido em Configurações, na aba "Desempenho e Notificações".
          </Aviso>
        </Bloco>

        <Bloco title="Recarregar uma instância">
          <p className="text-[13px] leading-6 text-text-dim">
            Se uma conta travar ou parar de atualizar, use o botão de recarregar no topo, ou aperte F5. Recarregar não
            desconecta a conta.
          </p>
        </Bloco>
      </>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={14} />,
    body: (
      <>
        <Bloco title="O que ele mede">
          <p className="text-[13px] leading-6 text-text-dim">
            O Analytics conta o movimento das suas conversas individuais. Grupos ficam de fora. Ele nunca guarda o
            conteúdo das mensagens, só quantidades.
          </p>
        </Bloco>

        <Bloco title="Entendendo os números">
          <ul className="flex flex-col gap-2 text-[13px] leading-6 text-text-dim">
            <li>
              <strong className="font-semibold text-text">Interações</strong>: quantas pessoas diferentes falaram com
              você no dia. Se a mesma pessoa mandar vinte mensagens, continua sendo uma interação.
            </li>
            <li>
              <strong className="font-semibold text-text">Recebidas</strong>: mensagens que chegaram até você.
            </li>
            <li>
              <strong className="font-semibold text-text">Enviadas</strong>: mensagens que saíram da sua operação.
            </li>
            <li>
              <strong className="font-semibold text-text">Volume total</strong>: recebidas mais enviadas.
            </li>
          </ul>
        </Bloco>

        <Bloco title="Filtrar e exportar">
          <ol className="flex flex-col gap-2">
            <Passo n={1}>Escolha o período no topo: hoje, últimos 7 ou 30 dias, ou um intervalo personalizado.</Passo>
            <Passo n={2}>Use o seletor de agrupamento para ver só um grupo de instâncias.</Passo>
            <Passo n={3}>Ligue "Comparar com período anterior" para ver se subiu ou caiu.</Passo>
            <Passo n={4}>Clique em CSV para salvar o período num arquivo que abre no Excel.</Passo>
          </ol>
        </Bloco>

        <Bloco title="Por que abrir a conversa melhora a contagem">
          <p className="text-[13px] leading-6 text-text-dim">
            Com a conversa fechada, o aplicativo só enxerga o aviso de não lidas da lista lateral, que é uma estimativa.
            Ao abrir a conversa, ele lê cada mensagem individualmente e corrige o número daquele dia. Por isso o valor
            pode subir depois que você abre uma conversa.
          </p>
          <Aviso>
            Mensagem enviada só é contada nas conversas que você abre. Em conversa fechada o WhatsApp não mostra nada
            sobre envios, então a coluna "Enviadas" fica em zero até você abrir.
          </Aviso>
        </Bloco>

        <Bloco title="Recomeçar do zero">
          <p className="text-[13px] leading-6 text-text-dim">
            Em Configurações, na aba "Backup e Diagnóstico", existe a opção de limpar os dados do Analytics. Ela apaga
            só o histórico de métricas. Contas, conversas e logins não são afetados.
          </p>
        </Bloco>
      </>
    ),
  },
  {
    id: 'notificacoes',
    label: 'Notificações',
    icon: <Bell size={14} />,
    body: (
      <>
        <Bloco title="Os dois tipos de aviso">
          <ul className="flex flex-col gap-2 text-[13px] leading-6 text-text-dim">
            <li>
              <strong className="font-semibold text-text">Notificações do Windows</strong>: a caixa do sistema. É a que
              você vê quando o aplicativo está minimizado ou atrás de outra janela.
            </li>
            <li>
              <strong className="font-semibold text-text">Notificações internas</strong>: o aviso que aparece no canto
              inferior direito. Só existe com a janela do Orbi aberta na frente.
            </li>
          </ul>
        </Bloco>

        <Bloco title="Como configurar">
          <ol className="flex flex-col gap-2">
            <Passo n={1}>Abra Configurações e vá na aba "Desempenho e Notificações".</Passo>
            <Passo n={2}>Use a chave geral para ligar ou desligar todos os avisos de uma vez.</Passo>
            <Passo n={3}>Abaixo dela, ligue ou desligue cada tipo separadamente.</Passo>
          </ol>
          <Aviso>
            Clicar no aviso abre direto a instância que recebeu a mensagem. Mesmo com os dois desligados, o contador de
            não lidas continua marcando na barra lateral.
          </Aviso>
        </Bloco>
      </>
    ),
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: <Settings size={14} />,
    body: (
      <>
        <Bloco title="Geral e Aparência">
          <p className="text-[13px] leading-6 text-text-dim">
            Tema claro ou escuro, posição da barra lateral, tamanho dos ícones, se o aplicativo abre junto com o
            Windows e o que acontece ao clicar no X da janela.
          </p>
        </Bloco>

        <Bloco title="Desempenho">
          <p className="text-[13px] leading-6 text-text-dim">
            Define quantas instâncias ficam prontas ao mesmo tempo. Quanto mais instâncias ativas, mais memória o
            aplicativo usa, e mais rápido é trocar entre elas. No modo Personalizado você escolhe o número.
          </p>
        </Bloco>

        <Bloco title="Backup e Diagnóstico">
          <p className="text-[13px] leading-6 text-text-dim">
            Exporta e restaura nomes, cores, ordem e agrupamentos das instâncias. O backup não inclui login nem
            conversas, então restaurar num computador novo não dispensa a leitura do QR Code.
          </p>
          <Aviso>
            Nesta aba também ficam o uso de memória e CPU do aplicativo e o acesso aos logs, úteis quando algo não está
            funcionando como esperado.
          </Aviso>
        </Bloco>

        <Bloco title="Atualizações">
          <p className="text-[13px] leading-6 text-text-dim">
            O Orbi verifica sozinho se existe versão nova, ao abrir e de tempos em tempos. Nesta aba dá para verificar
            na hora, baixar e instalar.
          </p>
        </Bloco>
      </>
    ),
  },
  {
    id: 'atalhos',
    label: 'Atalhos de teclado',
    icon: <Keyboard size={14} />,
    body: (
      <Bloco title="Lista completa">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <tbody className="text-text-dim">
              {[
                ['Ctrl + 1 até Ctrl + 9', 'Vai direto para a instância daquela posição'],
                ['Ctrl + Tab', 'Passa para a próxima instância'],
                ['Ctrl + Shift + Tab', 'Volta para a instância anterior'],
                ['Ctrl + K', 'Abre a busca rápida de contas'],
                ['F5 ou Ctrl + R', 'Recarrega a instância que está aberta'],
                ['Esc', 'Fecha a tela aberta no momento'],
              ].map(([tecla, oQueFaz]) => (
                <tr key={tecla} className="border-b border-border/60 last:border-b-0">
                  <td className="w-[190px] px-3.5 py-2.5">
                    <span className="rounded-md border border-border bg-input px-2 py-1 text-[11.5px] font-medium text-text">
                      {tecla}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 leading-6">{oQueFaz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>
    ),
  },
];

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  // Esc fecha, igual ao botão X do canto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Toda vez que reabre, volta para o começo do manual.
  useEffect(() => {
    if (open) setActiveId(SECTIONS[0].id);
  }, [open]);

  /**
   * Folga no fim do conteúdo, calculada em vez de fixa.
   *
   * Ela existe por um motivo só: sem nada depois da última seção, a rolagem
   * termina antes de o título dela chegar ao topo, e clicar no índice deixa a
   * seção parada no meio da tela.
   *
   * A versão anterior usava um valor fixo (45vh), o que sobrava e deixava uma
   * área vazia grande, dando a impressão de que a página tinha continuação.
   * Aqui é medido o mínimo necessário: a rolagem passa a terminar exatamente
   * onde a última seção encosta no topo, sem vazio de sobra.
   */
  const [espacoFinal, setEspacoFinal] = useState(0);

  useLayoutEffect(() => {
    if (!open) return;
    const container = contentRef.current;
    const ultima = document.getElementById(`ajuda-${SECTIONS[SECTIONS.length - 1].id}`);
    if (!container || !ultima) return;

    const espacoInterno = parseFloat(getComputedStyle(container).paddingTop) || 0;
    // Altura do conteúdo desconsiderando a folga já aplicada, para o cálculo
    // não depender de si mesmo.
    const alturaSemFolga = container.scrollHeight - espacoFinal;
    const rolagemAlvo = distanciaAteOTopo(ultima, container) - espacoInterno;
    const necessario = Math.max(0, rolagemAlvo - (alturaSemFolga - container.clientHeight));

    // Tolerância de 1px evita ficar recalculando por arredondamento.
    if (Math.abs(necessario - espacoFinal) > 1) setEspacoFinal(necessario);
  }, [open, espacoFinal]);

  /**
   * Distância real, em pixels, entre o topo de uma seção e o topo do conteúdo
   * rolável.
   *
   * CORREÇÃO: antes isto usava `offsetTop`, que mede a distância até o
   * ancestral POSICIONADO mais próximo. O painel de rolagem daqui não tem
   * posicionamento próprio, então esse ancestral acabava sendo outro elemento
   * mais acima e o número saía errado. Resultado: clicar no índice parava a
   * rolagem no lugar errado, geralmente abaixo do título da seção.
   *
   * Medir pela posição na tela dos dois elementos e somar a rolagem atual dá
   * o valor certo, sem depender de como o CSS está posicionado.
   */
  function distanciaAteOTopo(alvo: HTMLElement, container: HTMLElement): number {
    return alvo.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  }

  function irPara(id: string) {
    setActiveId(id);
    const alvo = document.getElementById(`ajuda-${id}`);
    const container = contentRef.current;
    if (!alvo || !container) return;
    // O painel tem um espaço interno no topo; descontar isso encosta o título
    // exatamente na primeira linha visível, sem cortar nada acima.
    const espacoInterno = parseFloat(getComputedStyle(container).paddingTop) || 0;
    container.scrollTo({ top: Math.max(0, distanciaAteOTopo(alvo, container) - espacoInterno), behavior: 'smooth' });
  }

  /** Destaca no índice a seção que está sendo lida. */
  function onScroll() {
    const container = contentRef.current;
    if (!container) return;
    // Mesma medição do clique, para o destaque bater com o que está no topo.
    const espacoInterno = parseFloat(getComputedStyle(container).paddingTop) || 0;
    // Margem de tolerância: a seção passa a ser "a atual" quando seu título
    // cruza um pouco abaixo do topo, evitando piscar entre duas na fronteira.
    const linhaDeCorte = container.scrollTop + espacoInterno + 24;
    let atual = SECTIONS[0].id;
    for (const s of SECTIONS) {
      const el = document.getElementById(`ajuda-${s.id}`);
      if (el && distanciaAteOTopo(el, container) <= linhaDeCorte) atual = s.id;
    }
    // Rolou até o fim: destaca a última seção, mesmo que ela seja curta demais
    // para chegar ao topo.
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
      atual = SECTIONS[SECTIONS.length - 1].id;
    }
    setActiveId(atual);
  }

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
            className="flex h-[680px] w-[960px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg accent-gradient text-accent-contrast">
                  <HelpCircle size={15} />
                </span>
                <h2 className="text-[15px] font-semibold text-text">Ajuda</h2>
                <span className="text-[12px] text-text-faint">Manual de uso</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1">
              {/* Índice navegável */}
              <nav className="mw-scroll w-56 shrink-0 overflow-y-auto border-r border-border p-2.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => irPara(s.id)}
                    className={
                      'relative mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ' +
                      (activeId === s.id
                        ? 'bg-accent/20 font-semibold text-accent before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-accent'
                        : 'text-text-dim hover:bg-surface-hover hover:text-text')
                    }
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </nav>

              {/* Conteúdo */}
              <div ref={contentRef} onScroll={onScroll} className="mw-scroll min-w-0 flex-1 overflow-y-auto py-5 pb-8 pl-6 pr-4">
                {SECTIONS.map((s) => (
                  <section key={s.id} id={`ajuda-${s.id}`} className="mb-8 last:mb-0">
                    <h3 className="mb-3.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">
                      {s.icon}
                      {s.label}
                    </h3>
                    {s.body}
                  </section>
                ))}

                {/*
                  Fase 51 — atendimento, no fim de tudo. Os contatos são TEXTO,
                  não link: a pessoa seleciona e copia. `select-text` e
                  `cursor-text` deixam claro que dá para selecionar.
                */}
                <div className="mt-2 rounded-2xl border border-border bg-surface-hover/40 px-5 py-5">
                  <h3 className="text-[14px] font-semibold text-text">Ainda precisa de ajuda?</h3>
                  <p className="mt-1 text-[13px] leading-6 text-text-dim">
                    Se algo não funcionou como esperado ou ficou dúvida, fale direto com o suporte.
                  </p>
                  <div className="mt-3.5 flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                      <MessageCircle size={15} className="shrink-0 text-accent" />
                      <span className="text-[13px] text-text-dim">
                        WhatsApp:{' '}
                        <span className="select-text cursor-text font-semibold text-text">
                          {SUPORTE_WHATSAPP_EXIBICAO}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
                      <Mail size={15} className="shrink-0 text-accent" />
                      <span className="text-[13px] text-text-dim">
                        E-mail:{' '}
                        <span className="select-text cursor-text font-semibold text-text">{SUPORTE_EMAIL}</span>
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[12px] leading-5 text-text-faint">
                    Ao relatar um problema, diga qual instância, o que você fez e o que aconteceu. Isso resolve bem mais
                    rápido.
                  </p>
                </div>

                {/* Folga mínima calculada — ver `espacoFinal` acima. */}
                <div aria-hidden style={{ height: espacoFinal }} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
