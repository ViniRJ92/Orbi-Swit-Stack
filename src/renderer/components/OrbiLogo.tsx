/**
 * Marca "Orbi Swit Stack": um squircle neutro (grafite, sem associação a
 * nenhum serviço específico) com duas esferas em órbita — a maior
 * representa o "hub" central, a menor (com um leve halo da cor de fundo
 * separando as duas formas) representa uma conta orbitando. O halo garante
 * contraste em tamanhos minúsculos (bandeja do sistema, favicon).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
export function OrbiLogo({ size = 32, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={rounded ? undefined : { borderRadius: 0 }}
    >
      <defs>
        <linearGradient id="orbi-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1B2229" />
          <stop offset="100%" stopColor="#0D1013" />
        </linearGradient>
        <linearGradient id="orbi-satellite" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6C8CF5" />
          <stop offset="100%" stopColor="#8B6FF5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="16" fill="url(#orbi-bg)" />
      <circle cx="27" cy="28" r="15" fill="#F4F6F8" />
      <circle cx="42" cy="42" r="15" fill="url(#orbi-bg)" />
      <circle cx="42" cy="42" r="12" fill="url(#orbi-satellite)" stroke="#0A0C0F" strokeWidth="1.6" />
    </svg>
  );
}
