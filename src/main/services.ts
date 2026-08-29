/**
 * Definição das plataformas que uma instância pode abrir. Cada serviço é só
 * uma URL oficial carregada dentro de uma WebContentsView isolada — mesmo
 * modelo já usado para o WhatsApp Web, sem nenhuma API não oficial, scraping
 * ou automação. "URL customizada" e "Navegador livre" simplesmente abrem a
 * página que o usuário pedir, como uma aba isolada de qualquer navegador.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */

export type AccountService =
  | 'whatsapp'
  | 'instagram'
  | 'gmail'
  | 'tiktok'
  | 'facebook'
  | 'messenger'
  | 'googlecalendar'
  | 'chrome'
  | 'earth'
  | 'custom'
  | 'threads'
  | 'x'
  | 'openai'
  | 'gemini'
  | 'deepseek'
  | 'claude'
  | 'copilot'
  | 'perplexity'
  | 'grok';

export interface ServiceDefinition {
  id: AccountService;
  label: string;
  /** URL carregada por padrão (serviços "custom" usam a URL informada pelo usuário em vez desta). */
  defaultUrl: string;
  /**
   * Domínios permitidos para navegação dentro da view. `null` = sem
   * restrição (usado por "Navegador livre" e "URL customizada", que existem
   * justamente para abrir qualquer site). O WhatsApp mantém a trava mais
   * estrita, por exigência do próprio projeto.
   */
  allowedHosts: string[] | null;
  /** Cor de marca usada no ícone padrão do serviço. */
  color: string;
}

export const SERVICES: Record<AccountService, ServiceDefinition> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp Web',
    defaultUrl: 'https://web.whatsapp.com/',
    allowedHosts: ['web.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com'],
    color: '#25D366',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    defaultUrl: 'https://www.instagram.com/',
    allowedHosts: ['instagram.com', 'cdninstagram.com', 'fbcdn.net'],
    color: '#E1306C',
  },
  gmail: {
    id: 'gmail',
    label: 'Gmail',
    defaultUrl: 'https://mail.google.com/mail/',
    allowedHosts: ['mail.google.com', 'accounts.google.com', 'www.google.com', 'google.com', 'gstatic.com', 'googleusercontent.com'],
    color: '#EA4335',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    defaultUrl: 'https://www.tiktok.com/',
    allowedHosts: ['tiktok.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'ibyteimg.com', 'ibytedtos.com'],
    color: '#FE2C55',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    defaultUrl: 'https://www.facebook.com/',
    allowedHosts: ['facebook.com', 'fbcdn.net'],
    color: '#1877F2',
  },
  messenger: {
    id: 'messenger',
    label: 'Messenger',
    defaultUrl: 'https://www.messenger.com/',
    allowedHosts: ['messenger.com', 'facebook.com', 'fbcdn.net'],
    color: '#0084FF',
  },
  googlecalendar: {
    id: 'googlecalendar',
    label: 'Google Calendar',
    defaultUrl: 'https://calendar.google.com/calendar/',
    allowedHosts: ['calendar.google.com', 'accounts.google.com', 'www.google.com', 'google.com', 'gstatic.com', 'googleusercontent.com'],
    color: '#1A73E8',
  },
  chrome: {
    id: 'chrome',
    // Fase 18: renomeado de "Navegador livre" para "Pesquisa Google" (pedido
    // explícito do usuário) — mesmo serviço/URL de sempre (abre o Google),
    // só o rótulo e o ícone (logo do "G") mudaram.
    label: 'Pesquisa Google',
    defaultUrl: 'https://www.google.com/',
    allowedHosts: null,
    color: '#4285F4',
  },
  earth: {
    id: 'earth',
    label: 'Google Earth',
    defaultUrl: 'https://earth.google.com/web/',
    allowedHosts: ['earth.google.com', 'accounts.google.com', 'www.google.com', 'google.com', 'gstatic.com', 'googleusercontent.com'],
    // Verde-azulado, evocando o globo/continentes — distinto do azul do
    // "Pesquisa Google" para diferenciar as duas contas na sidebar mesmo com
    // ícones parecidos (ambos são "G"/globo do Google).
    color: '#1B9C6E',
  },
  custom: {
    id: 'custom',
    // Fase 18: renomeado de "URL customizada" para "Web Explorer" (pedido
    // explícito do usuário) — mesmo comportamento de sempre (usuário digita
    // qualquer endereço na Etapa 2/3).
    label: 'Web Explorer',
    defaultUrl: 'https://',
    allowedHosts: null,
    color: '#8B5CF6',
  },
  // Fase 19: adicionados a pedido do usuário.
  threads: {
    id: 'threads',
    label: 'Threads',
    defaultUrl: 'https://www.threads.net/',
    allowedHosts: ['threads.net', 'instagram.com', 'cdninstagram.com', 'fbcdn.net'],
    color: '#000000',
  },
  x: {
    id: 'x',
    label: 'X',
    defaultUrl: 'https://x.com/',
    allowedHosts: ['x.com', 'twitter.com', 'twimg.com'],
    color: '#000000',
  },
  // Fase 23: serviços de IA, adicionados a pedido do usuário.
  openai: {
    id: 'openai',
    label: 'ChatGPT',
    defaultUrl: 'https://chatgpt.com/',
    allowedHosts: ['chatgpt.com', 'chat.openai.com', 'openai.com', 'auth0.com', 'auth.openai.com'],
    color: '#000000',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    defaultUrl: 'https://gemini.google.com/',
    allowedHosts: ['gemini.google.com', 'accounts.google.com', 'www.google.com', 'google.com', 'gstatic.com', 'googleusercontent.com'],
    color: '#8E75B2',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultUrl: 'https://chat.deepseek.com/',
    allowedHosts: ['chat.deepseek.com', 'deepseek.com'],
    color: '#5786FE',
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    defaultUrl: 'https://claude.ai/',
    allowedHosts: ['claude.ai', 'anthropic.com'],
    color: '#D97757',
  },
  copilot: {
    id: 'copilot',
    label: 'Microsoft Copilot',
    defaultUrl: 'https://copilot.microsoft.com/',
    allowedHosts: ['copilot.microsoft.com', 'login.microsoftonline.com', 'login.live.com', 'microsoft.com'],
    color: '#0FAFFF',
  },
  perplexity: {
    id: 'perplexity',
    label: 'Perplexity',
    defaultUrl: 'https://www.perplexity.ai/',
    allowedHosts: ['perplexity.ai', 'www.perplexity.ai'],
    color: '#1FB8CD',
  },
  grok: {
    id: 'grok',
    label: 'Grok',
    defaultUrl: 'https://grok.com/',
    allowedHosts: ['grok.com', 'x.ai', 'twitter.com', 'x.com'],
    color: '#000000',
  },
};

/** Resolve a URL inicial de uma conta: a customUrl (se houver) tem prioridade sobre o padrão do serviço. */
export function resolveAccountUrl(service: AccountService, customUrl?: string): string {
  if ((service === 'custom' || !SERVICES[service]) && customUrl && customUrl.trim()) {
    return normalizeUrl(customUrl.trim());
  }
  if (customUrl && customUrl.trim() && service === 'custom') {
    return normalizeUrl(customUrl.trim());
  }
  return SERVICES[service]?.defaultUrl ?? SERVICES.custom.defaultUrl;
}

export function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function isHostAllowed(allowedHosts: string[] | null, hostname: string): boolean {
  if (allowedHosts === null) return true;
  return allowedHosts.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}
