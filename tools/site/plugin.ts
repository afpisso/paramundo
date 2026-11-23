/**
 * Build-time extras for the published site, so Andrés can check everything with links and no terminal:
 *  - `__BUILD__`: short commit id and date of the build, shown in a corner of the game.
 *  - `version.json`: the same data; the game polls it to offer an update when a newer build is live.
 *  - `prototipo/index.html`: the original prototype, copied byte for byte from `referencias/`.
 *  - `estado/index.html`: one page with the published version, test links and the state of each encargo.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { TOKENS, hex } from '../../src/ui/tokens.ts';

export interface BuildInfo {
  sha: string;
  /** ISO date of the commit. */
  date: string;
  /** Human date in Colombia time, for display. */
  label: string;
}

const REPO = 'https://github.com/afpisso/paramundo';
const PAGES = 'https://afpisso.github.io/paramundo/';

function git(args: string): string | null {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export function readBuildInfo(): BuildInfo {
  const sha = (process.env['GITHUB_SHA'] ?? git('rev-parse HEAD') ?? 'local').slice(0, 7);
  const date = git('log -1 --format=%cI') ?? new Date().toISOString();
  const label = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date));
  return { sha, date, label };
}

interface Encargo {
  file: string;
  title: string;
  state: string;
}

function readEncargos(root: string): Encargo[] {
  const dir = resolve(root, 'docs/encargos');
  return readdirSync(dir)
    .filter((f) => /^\d{3}-.*\.md$/.test(f))
    .sort()
    .map((file) => {
      const text = readFileSync(resolve(dir, file), 'utf8');
      const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? file;
      const state = /^Estado:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? 'sin estado';
      return { file, title, state };
    });
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const STATE_COLOR: Record<string, number> = {
  pendiente: TOKENS.color.muted,
  'en curso': TOKENS.color.player,
  entregado: TOKENS.color.accent,
  corregir: TOKENS.color.rival,
  aprobado: TOKENS.color.monte,
};

function statusPage(info: BuildInfo, encargos: Encargo[]): string {
  const c = TOKENS.color;
  const rows = encargos
    .map((e) => {
      const color = hex(STATE_COLOR[e.state] ?? c.muted);
      return `<li><a href="${REPO}/blob/main/docs/encargos/${e.file}">${escapeHtml(e.title)}</a><span style="color:${color}">${escapeHtml(e.state)}</span></li>`;
    })
    .join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paramundo: estado</title>
<style>
body{margin:0;background:${hex(c.bg)};color:${hex(c.ink)};font:16px/1.5 ${TOKENS.font.body};padding:24px 16px}
main{max-width:520px;margin:0 auto}
h1{font:700 26px/1.1 ${TOKENS.font.display};margin:0 0 4px}
h2{font:700 15px ${TOKENS.font.display};color:${hex(c.accent)};margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em}
p{margin:0;color:${hex(c.muted)}}
a{color:${hex(c.ink)}}
ul{list-style:none;margin:0;padding:0}
li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid ${hex(c.line)}}
li span{white-space:nowrap;font-weight:600}
.big a{display:block;padding:14px 16px;margin:8px 0;border:1px solid ${hex(c.line)};border-radius:12px;background:${hex(c.surface)};text-decoration:none;font-weight:600}
.big small{display:block;font-weight:400;color:${hex(c.muted)}}
</style></head><body><main>
<h1>Paramundo</h1>
<p>Versión publicada: <b style="color:${hex(c.ink)}">${info.sha}</b> · ${escapeHtml(info.label)}</p>
<h2>Probar</h2>
<div class="big">
<a href="../">Juego actual<small>Lo último que está en main</small></a>
<a href="../prototipo/">Prototipo original<small>El HTML de referencia, sin cambios</small></a>
</div>
<h2>Encargos de Codex</h2>
<ul>${rows}</ul>
<h2>Arte</h2>
<div class="big">
<a href="${REPO}/blob/main/docs/art/prompts-chatgpt.md">Prompts para ChatGPT<small>Qué pegar en ChatGPT para cada carta</small></a>
<a href="${REPO}/upload/main/art-src/cards">Subir imágenes<small>Arrastra las imágenes y pulsa Commit changes</small></a>
</div>
</main></body></html>
`;
}

export function sitePlugin(info: BuildInfo): Plugin {
  let root = process.cwd();
  return {
    name: 'paramundo-site',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify(info)}\n` });
      this.emitFile({
        type: 'asset',
        fileName: 'prototipo/index.html',
        source: readFileSync(resolve(root, 'referencias/prototipo-hex-triad.html')),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'estado/index.html',
        source: statusPage(info, readEncargos(root)),
      });
    },
  };
}

export const SITE_URLS = {
  game: PAGES,
  prototype: `${PAGES}prototipo/`,
  status: `${PAGES}estado/`,
} as const;
