/**
 * Empacota o processo principal (src/main) com o esbuild num único arquivo
 * por ponto de entrada, com TODAS as dependências de npm embutidas — a
 * única coisa deixada de fora é o próprio módulo `electron`, que é
 * fornecido pelo runtime do Electron em tempo de execução.
 *
 * Isso existe porque o processo principal agora tem uma dependência de npm
 * de verdade em tempo de execução (electron-updater, ver Fase 27) — antes
 * disso, o `tsc` sozinho bastava porque nenhum arquivo de main.ts pra baixo
 * usava `require()` de um pacote externo (só Node/Electron embutidos), e o
 * instalador excluía `node_modules` inteiro (ver package.json -> build.files
 * antes desta fase). O problema: `electron-updater` tem dependências
 * transitivas duplicadas em versões diferentes dentro de node_modules (por
 * conflito com o próprio electron-builder), e o empacotador automático do
 * electron-builder às vezes falha silenciosamente em decidir qual cópia
 * incluir — um `require()` que funciona em desenvolvimento pode
 * simplesmente não existir dentro do instalador final. Embutir tudo aqui
 * elimina essa classe inteira de bug: não importa mais o que está ou não
 * dentro de node_modules no momento de gerar o instalador.
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ENTRY_POINTS = ['main.ts', 'preload.ts', 'webviewPreload.ts'];

await build({
  entryPoints: ENTRY_POINTS.map((f) => path.join(rootDir, 'src', 'main', f)),
  outdir: path.join(rootDir, 'dist', 'main'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  // "electron" é o único módulo que não pode (nem precisa) ser embutido —
  // ele só existe dentro do runtime do próprio Electron em tempo de
  // execução, nunca é um pacote de verdade em node_modules.
  external: ['electron'],
  logLevel: 'info',
});
