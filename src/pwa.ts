/**
 * Service worker registration and update notice, plus the version stamp in the corner.
 *
 * Pages are network first (vite.config.ts), but the browser's HTTP cache can still hand back an old
 * index.html (GitHub Pages allows 10 minutes). So the page compares its own build with `version.json`
 * (never cached):
 *  - right after opening: if a newer build is live, it jumps to it at once through a URL the HTTP cache
 *    has never seen (`?v=<sha>`), then tidies the address bar. No second reload needed.
 *  - while open (or resumed from the home screen): it shows a bar with an "Actualizar" button instead,
 *    so a match in progress is never interrupted.
 */
import { STRINGS } from './data';
import { TOKENS, hex } from './ui/tokens';

const CHECK_EVERY_MS = 60_000;
/** Build this page was opened for by a previous jump (`?v=<sha>`), read before the URL is tidied. */
const requested = new URLSearchParams(location.search).get('v');

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  node.textContent = text;
  return node;
}

function showVersion(): void {
  const c = TOKENS.color;
  const box = el('div', {
    position: 'fixed',
    right: '6px',
    bottom: 'calc(4px + env(safe-area-inset-bottom))',
    font: `11px ${TOKENS.font.body}`,
    color: hex(c.muted),
    opacity: '0.7',
    zIndex: '10',
    pointerEvents: 'auto',
  });
  box.append(`${__BUILD__.sha} · ${__BUILD__.label} · `);
  const link = el('a', { color: 'inherit' }, STRINGS.site.status);
  link.href = './estado/';
  box.append(link);
  document.body.append(box);
}

let shown = false;
function showUpdateBar(onUpdate: () => void): void {
  if (shown) return;
  shown = true;
  const c = TOKENS.color;
  const bar = el('div', {
    position: 'fixed',
    left: '12px',
    right: '12px',
    top: 'calc(12px + env(safe-area-inset-top))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '12px',
    background: hex(c.surface),
    border: `1px solid ${hex(c.accent)}`,
    color: hex(c.ink),
    font: `15px ${TOKENS.font.body}`,
    zIndex: '20',
  });
  bar.append(el('span', {}, STRINGS.site.updateAvailable));
  const button = el(
    'button',
    {
      font: `600 15px ${TOKENS.font.body}`,
      color: hex(c.bg),
      background: hex(c.accent),
      border: '0',
      borderRadius: '999px',
      padding: '8px 16px',
      minHeight: '40px',
    },
    STRINGS.site.update,
  );
  button.addEventListener('click', onUpdate);
  bar.append(button);
  document.body.append(bar);
}

async function liveSha(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const live = (await res.json()) as { sha?: unknown };
    return typeof live.sha === 'string' ? live.sha : null;
  } catch {
    return null; // offline
  }
}

/** Loads the given build through a URL the HTTP cache has never seen. */
const openBuild = (sha: string): void => location.replace(`${location.pathname}?v=${sha}`);

async function checkVersion(onOpen: boolean, registration: ServiceWorkerRegistration | null): Promise<void> {
  const live = await liveSha();
  if (!live || live === __BUILD__.sha) return;
  await registration?.update().catch(() => undefined);
  const alreadyTried = requested === live;
  if (onOpen && !alreadyTried) openBuild(live);
  else showUpdateBar(() => openBuild(live));
}

export function setupPwa(): void {
  showVersion();
  if (requested !== null) history.replaceState(null, '', location.pathname);
  if (import.meta.env.DEV) return;
  const start = (registration: ServiceWorkerRegistration | null) => {
    void checkVersion(true, registration);
    const check = () => void checkVersion(false, registration);
    setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  };
  if (!('serviceWorker' in navigator)) {
    start(null);
    return;
  }
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .catch(() => null)
    .then(start);
}
