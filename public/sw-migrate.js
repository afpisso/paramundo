/*
 * Imported by the generated service worker (vite.config.ts, workbox.importScripts).
 * One-time migration: the first service workers cached the game's HTML, so phones that had them kept
 * showing an old version until a second reload. The first time this worker activates on a device it
 * reloads the open pages once, so they come back network first. Afterwards it does nothing: later
 * updates are offered with the "Actualizar" bar (src/pwa.ts), never forced.
 *
 * The reload is started after activation, not awaited inside it: a navigation needs this worker to
 * answer its fetch, and fetches wait until activation ends.
 */
const MIGRATION_MARK = 'paramundo-sw-v2';

self.addEventListener('activate', (event) => {
  const firstTime = caches.has(MIGRATION_MARK).then(async (done) => {
    if (done) return false;
    await caches.open(MIGRATION_MARK);
    return true;
  });
  event.waitUntil(firstTime);
  firstTime.then(async (reload) => {
    if (!reload) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((client) => client.navigate(client.url).catch(() => undefined));
  });
});
