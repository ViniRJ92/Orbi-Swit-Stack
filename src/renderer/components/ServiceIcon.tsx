/**
 * Ícones de serviço — dois usos distintos:
 *
 *  - `ServiceGlyph`: glifo plano de uma cor só (recebe `color`), usado onde o
 *    ícone é desenhado por cima do círculo de cor própria da CONTA (sidebar,
 *    paleta de comandos, dashboard) — não é o ícone oficial "estilizado", é
 *    só a forma reconhecível na cor que já está sendo usada ali.
 *  - `ServiceIcon`: o ícone "de app" completo (fundo + glifo já na cor
 *    oficial da marca, sem depender de nenhuma prop de cor) — usado só na
 *    grade da Etapa 1/3 de "Adicionar conta".
 *
 * Fase 19 (pedido explícito do usuário): a grade da Etapa 1/3 passou a usar
 * o padrão visual "ícone de app" (Apple/iOS-like) — fundo em formato
 * squircle (cantos bem arredondados, ~22% do lado) na cor/gradiente oficial
 * de cada marca, com o glifo em branco (ou na cor de marca sobre fundo
 * branco, para marcas cujo ícone oficial é assim: Gmail, Google Calendar,
 * Google Earth, Pesquisa Google) — e sombra sutil, como um ícone de
 * app real. Também foram adicionados Threads e X, no mesmo padrão.
 *
 * O traçado vetorial de cada glifo (o "d" de cada <path>) vem do pacote npm
 * `simple-icons` (licença CC0-1.0 quanto ao desenho do SVG em si — o uso da
 * marca segue as diretrizes de cada empresa; o `simple-icons` não é
 * dependência em runtime, foi usado só para copiar os paths). Instagram e
 * Messenger usam o gradiente oficial da marca como fundo; TikTok usa 3
 * camadas (ciano + vermelho + branco) reproduzindo o efeito da nota musical
 * oficial sobre fundo preto.
 *
 * Fase 23 (serviços de IA): Claude, Google Gemini, DeepSeek e Perplexity
 * seguem exatamente o mesmo processo acima (traçado oficial real do
 * `simple-icons`). OpenAI/ChatGPT, Microsoft Copilot e Grok NÃO estavam
 * disponíveis nessa biblioteca (removidos dela, normalmente por exigência de
 * marca registrada da própria empresa) — a pedido explícito do usuário,
 * entram mesmo assim como uma aproximação geométrica ORIGINAL (não é o
 * traçado oficial de nenhuma das três), documentada em cada componente
 * (`OpenAIFlowerGlyph`, `CopilotWingsGlyph`, `GrokAsteriskGlyph`). Se algum
 * dia essas marcas voltarem a ter um traçado oficial disponível, o ideal é
 * substituir essas três aproximações pelo mesmo processo das demais.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import type { ReactElement, ReactNode } from 'react';
import { AccountService } from '../types';

const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

const INSTAGRAM_PATH =
  'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077';

const GMAIL_PATH =
  'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z';

const TIKTOK_PATH =
  'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

const FACEBOOK_PATH =
  'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z';

const MESSENGER_PATH =
  'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13';

const GOOGLE_CALENDAR_PATH =
  'M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z';

const GOOGLE_EARTH_PATH =
  'M12 0c-1.326 0-2.597.22-3.787.613 4.94-1.243 8.575 1.72 11.096 5.606 1.725 2.695 2.813 2.83 4.207 2.412A11.956 11.956 0 0012 0zM7.658 2.156c-1.644.019-3.295.775-4.931 2.207A11.967 11.967 0 000 12c.184-2.823 2.163-5.128 4.87-5.07 2.104.044 4.648 1.518 7.13 5.289 4.87 7.468 10.917 5.483 11.863 1.51.081-.566.137-1.14.137-1.729 0-.176-.02-.347-.027-.521-1.645 1.725-4.899 2.35-8.264-2.97-2.59-4.363-5.31-6.383-8.05-6.353zM3.33 13.236c-1.675.13-2.657 1.804-2.242 3.756A11.955 11.955 0 0012 24c4.215 0 7.898-2.149 10.037-5.412v-.043c-2.836 3.49-8.946 4.255-13.855-2.182-1.814-2.386-3.544-3.228-4.852-3.127Z';

const GOOGLE_G_PATH =
  'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z';

const THREADS_PATH =
  'M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z';

const X_PATH =
  'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z';

// Fase 23: serviços de IA — traçados oficiais reais (extraídos do pacote
// `simple-icons`, mesmo processo/licença descritos no topo do arquivo).
const CLAUDE_PATH =
  'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z';

const GEMINI_PATH =
  'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81';

const DEEPSEEK_PATH =
  'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45';

const PERPLEXITY_PATH =
  'M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z';

function BrowserGlyphPath({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3.5" width="19" height="17" rx="2.4" stroke={color} strokeWidth="1.6" />
      <path d="M2.5 8h19" stroke={color} strokeWidth="1.6" />
      <circle cx="5.3" cy="5.75" r="0.7" fill={color} />
      <circle cx="7.4" cy="5.75" r="0.7" fill={color} />
      <rect x="9.6" y="5" width="9" height="1.5" rx="0.75" fill={color} />
    </svg>
  );
}

/** Um único path SVG, preenchido com `color` — usado pelos dois modos (glifo plano e ícone de app). */
function PathGlyph({ path, size, color }: { path: string; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill={color} />
    </svg>
  );
}

/** TikTok em 3 camadas (ciano + vermelho + camada principal), reproduzindo o efeito oficial da nota musical. */
function TikTokLayered({ size, mainColor }: { size: number; mainColor: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d={TIKTOK_PATH} fill="#25F4EE" transform="translate(-0.9, 0.5)" />
      <path d={TIKTOK_PATH} fill="#FE2C55" transform="translate(0.9, -0.5)" />
      <path d={TIKTOK_PATH} fill={mainColor} />
    </svg>
  );
}

/**
 * Um path preenchido com um gradiente linear próprio (não uma cor sólida) —
 * usado só no Gemini, cujo ícone oficial atual é a "sparkle" em degradê
 * azul→roxo→rosa (o traçado em si vem do `simple-icons`, real e oficial; só
 * o preenchimento em degradê é uma escolha nossa para ficar mais fiel ao
 * ícone de app real do Gemini, que raramente aparece em cor sólida).
 */
function GradientPathGlyph({
  path,
  size,
  id,
  stops,
}: {
  path: string;
  size: number;
  id: string;
  stops: [string, string, string];
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="50%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * Fase 23 — três ícones SEM fonte oficial disponível no `simple-icons`
 * (OpenAI/ChatGPT, Microsoft Copilot e Grok foram removidos dessa biblioteca,
 * normalmente por exigência de marca registrada da própria empresa). A
 * pedido do usuário, entram mesmo assim como uma APROXIMAÇÃO GEOMÉTRICA
 * original (não é o traçado vetorial oficial de nenhuma das três marcas):
 *  - OpenAI: "flor" de 6 pétalas radiais, lembrando o nó/laço do logo real.
 *  - Copilot: duas "asas" sobrepostas sobre um degradê azul→roxo→rosa,
 *    ecoando a silhueta de borboleta/redemoinho do ícone atual.
 *  - Grok: asterisco de 6 pontas, no mesmo espírito minimalista do ícone
 *    atual do app (um asterisco estilizado).
 */
function OpenAIFlowerGlyph({ size, color }: { size: number; color: string }) {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {angles.map((angle) => (
        <rect key={angle} x="10.2" y="1.4" width="3.6" height="8.6" rx="1.8" fill={color} transform={`rotate(${angle} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.6" fill={color} />
    </svg>
  );
}

function CopilotWingsGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 12c-1.2-5.4-4.4-8.6-8.6-8.9C1.6 2.9.5 4.2.7 6c.4 3.6 3.9 6.6 11.3 6z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <path
        d="M12 12c1.2 5.4 4.4 8.6 8.6 8.9 1.8.1 2.9-1.2 2.7-3-.4-3.6-3.9-6.6-11.3-6z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <circle cx="12" cy="12" r="2.1" fill="#FFFFFF" />
    </svg>
  );
}

function GrokAsteriskGlyph({ size, color }: { size: number; color: string }) {
  const angles = [0, 60, 120];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {angles.map((angle) => (
        <rect key={angle} x="10.7" y="2.4" width="2.6" height="19.2" rx="1.3" fill={color} transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}

// --- Glifo plano de 1 cor só (ServiceGlyph — composto sobre o círculo de cor da própria conta) ---

const FLAT_GLYPH_BY_SERVICE: Record<AccountService, (props: { size: number; color: string }) => ReactElement> = {
  whatsapp: ({ size, color }) => <PathGlyph path={WHATSAPP_PATH} size={size} color={color} />,
  instagram: ({ size, color }) => <PathGlyph path={INSTAGRAM_PATH} size={size} color={color} />,
  gmail: ({ size, color }) => <PathGlyph path={GMAIL_PATH} size={size} color={color} />,
  tiktok: ({ size, color }) => <PathGlyph path={TIKTOK_PATH} size={size} color={color} />,
  facebook: ({ size, color }) => <PathGlyph path={FACEBOOK_PATH} size={size} color={color} />,
  messenger: ({ size, color }) => <PathGlyph path={MESSENGER_PATH} size={size} color={color} />,
  googlecalendar: ({ size, color }) => <PathGlyph path={GOOGLE_CALENDAR_PATH} size={size} color={color} />,
  chrome: ({ size, color }) => <PathGlyph path={GOOGLE_G_PATH} size={size} color={color} />,
  earth: ({ size, color }) => <PathGlyph path={GOOGLE_EARTH_PATH} size={size} color={color} />,
  custom: ({ size, color }) => <BrowserGlyphPath size={size} color={color} />,
  threads: ({ size, color }) => <PathGlyph path={THREADS_PATH} size={size} color={color} />,
  x: ({ size, color }) => <PathGlyph path={X_PATH} size={size} color={color} />,
  openai: ({ size, color }) => <OpenAIFlowerGlyph size={size} color={color} />,
  gemini: ({ size, color }) => <PathGlyph path={GEMINI_PATH} size={size} color={color} />,
  deepseek: ({ size, color }) => <PathGlyph path={DEEPSEEK_PATH} size={size} color={color} />,
  claude: ({ size, color }) => <PathGlyph path={CLAUDE_PATH} size={size} color={color} />,
  copilot: ({ size }) => <CopilotWingsGlyph size={size} />,
  perplexity: ({ size, color }) => <PathGlyph path={PERPLEXITY_PATH} size={size} color={color} />,
  grok: ({ size, color }) => <GrokAsteriskGlyph size={size} color={color} />,
};

/** Só o glifo (sem fundo próprio, cor controlada por quem chama) — composto sobre o círculo colorido da conta. */
export function ServiceGlyph({
  service,
  size = 16,
  color = 'currentColor',
}: {
  service: AccountService;
  size?: number;
  color?: string;
}) {
  const Glyph = FLAT_GLYPH_BY_SERVICE[service] ?? FLAT_GLYPH_BY_SERVICE.whatsapp;
  return <Glyph size={size} color={color} />;
}

// --- Ícone "de app" (fundo squircle + glifo já na cor oficial) — só a grade da Etapa 1/3 ---

interface AppIconSpec {
  /** Cor sólida ou gradiente CSS de fundo do squircle. */
  background: string;
  render: (glyphSize: number) => ReactElement;
}

function squircleRadius(size: number): number {
  // Aproximação do "squircle" do iOS: ~22.3% do lado — visualmente muito
  // próximo da superelipse real sem precisar de um path SVG customizado.
  return size * 0.223;
}

function Squircle({ size, background, children }: { size: number; background: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background,
        borderRadius: squircleRadius(size),
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.12)',
        position: 'relative',
      }}
      className="flex shrink-0 items-center justify-center overflow-hidden"
    >
      {/* Sutil "sheen" de vidro no topo — aproxima o acabamento sem
          simular um material que só existe de fato como bitmap oficial. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

const INSTAGRAM_GRADIENT =
  'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)';
const MESSENGER_GRADIENT = 'linear-gradient(45deg, #00C6FF 0%, #0068FF 45%, #A033FF 75%, #FF5CA1 100%)';

const APP_ICON_SPECS: Record<AccountService, AppIconSpec> = {
  whatsapp: {
    background: '#25D366',
    render: (s) => <PathGlyph path={WHATSAPP_PATH} size={s} color="#FFFFFF" />,
  },
  instagram: {
    background: INSTAGRAM_GRADIENT,
    render: (s) => <PathGlyph path={INSTAGRAM_PATH} size={s} color="#FFFFFF" />,
  },
  gmail: {
    background: '#FFFFFF',
    render: (s) => <PathGlyph path={GMAIL_PATH} size={s} color="#EA4335" />,
  },
  tiktok: {
    background: '#000000',
    render: (s) => <TikTokLayered size={s} mainColor="#FFFFFF" />,
  },
  facebook: {
    background: '#1877F2',
    render: (s) => <PathGlyph path={FACEBOOK_PATH} size={s} color="#FFFFFF" />,
  },
  messenger: {
    background: MESSENGER_GRADIENT,
    render: (s) => <PathGlyph path={MESSENGER_PATH} size={s} color="#FFFFFF" />,
  },
  googlecalendar: {
    background: '#FFFFFF',
    render: (s) => <PathGlyph path={GOOGLE_CALENDAR_PATH} size={s} color="#1A73E8" />,
  },
  chrome: {
    background: '#FFFFFF',
    render: (s) => <PathGlyph path={GOOGLE_G_PATH} size={s} color="#4285F4" />,
  },
  earth: {
    background: '#FFFFFF',
    render: (s) => <PathGlyph path={GOOGLE_EARTH_PATH} size={s} color="#1B9C6E" />,
  },
  custom: {
    background: '#8B5CF6',
    render: (s) => <BrowserGlyphPath size={s} color="#FFFFFF" />,
  },
  threads: {
    background: '#000000',
    render: (s) => <PathGlyph path={THREADS_PATH} size={s} color="#FFFFFF" />,
  },
  x: {
    background: '#000000',
    render: (s) => <PathGlyph path={X_PATH} size={s} color="#FFFFFF" />,
  },
  openai: {
    // Fase 25: pedido explícito do usuário — logo em preto sólido centralizado
    // sobre fundo branco sólido, igual ao ícone do app ChatGPT na App Store.
    // Sem traçado oficial disponível (ver comentário de `OpenAIFlowerGlyph`
    // acima), então o desenho em si continua sendo uma aproximação geométrica
    // original — só as cores (preto puro sobre branco) seguem a descrição
    // exata pedida.
    background: '#FFFFFF',
    render: (s) => <OpenAIFlowerGlyph size={s} color="#000000" />,
  },
  gemini: {
    // Fase 25: pedido explícito do usuário — fundo escuro/preto (era branco),
    // com a "sparkle" em degradê azul→roxo, igual ao ícone do app Gemini na
    // App Store. O traçado da estrela é o oficial real (`simple-icons`).
    background: '#0B0B0E',
    render: (s) => <GradientPathGlyph path={GEMINI_PATH} size={s} id="gemini-app-icon-gradient" stops={['#4C8DF6', '#8B6EF0', '#B26BF2']} />,
  },
  deepseek: {
    // Fase 25: pedido explícito do usuário — baleia azul sobre fundo branco
    // sólido. Já era exatamente assim (traçado oficial real); mantido.
    background: '#FFFFFF',
    render: (s) => <PathGlyph path={DEEPSEEK_PATH} size={s} color="#5786FE" />,
  },
  claude: {
    background: '#F0EEE6',
    render: (s) => <PathGlyph path={CLAUDE_PATH} size={s} color="#D97757" />,
  },
  copilot: {
    // Fase 23/25: sem traçado oficial disponível — aproximação com o degradê
    // azul→roxo→rosa característico da marca (documentado nas diretrizes
    // públicas de marca da Microsoft) por trás de uma silhueta abstrata de
    // "asas", igual ao espírito do ícone atual do app na App Store.
    background: 'linear-gradient(135deg, #0FAFFF 0%, #7C4DFF 55%, #F72585 100%)',
    render: (s) => <CopilotWingsGlyph size={s} />,
  },
  perplexity: {
    // Fase 25: fundo escurecido (era um teal claro) para casar com o ícone
    // real do app na App Store, que é escuro/quase preto — o traçado
    // (pinwheel) continua sendo o oficial real (`simple-icons`), só o fundo
    // mudou.
    background: '#151A1B',
    render: (s) => <PathGlyph path={PERPLEXITY_PATH} size={s} color="#FFFFFF" />,
  },
  grok: {
    // Fase 23: sem traçado oficial disponível — aproximação (asterisco de 6
    // pontas) em branco sobre preto, no mesmo espírito do ícone real do app.
    background: '#000000',
    render: (s) => <GrokAsteriskGlyph size={s} color="#FFFFFF" />,
  },
};

/** Ícone "de app" (squircle, fundo + glifo oficiais) — usado na grade de "Adicionar conta". */
export function ServiceIcon({
  service,
  iconDataUrl,
  size = 16,
  className,
}: {
  service: AccountService;
  iconDataUrl?: string;
  size?: number;
  className?: string;
}) {
  if (iconDataUrl) {
    return (
      <img
        src={iconDataUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: squircleRadius(size) }}
        className={'object-cover ' + (className ?? '')}
      />
    );
  }

  const spec = APP_ICON_SPECS[service] ?? APP_ICON_SPECS.whatsapp;
  const glyphSize = Math.round(size * 0.58);

  return (
    <Squircle size={size} background={spec.background}>
      <div className={className}>{spec.render(glyphSize)}</div>
    </Squircle>
  );
}
