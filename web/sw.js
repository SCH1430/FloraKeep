const cachePrefix = `flora-keep:${self.registration.scope}:`;
const cacheName = `${cachePrefix}__FLORA_BUILD_ID__`;
const scope = new URL(self.registration.scope);
const appURL = new URL('./index.html', scope).href;
const buildAssets = [/* generated-shell-assets */];
const shell = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'download.html', ...buildAssets];
const shellURLs = new Set(shell.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...shellURLs].map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(name => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(oldCaches.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  url.search = '';
  const key = url.pathname === scope.pathname && request.mode === 'navigate' ? appURL : url.href;
  if (!shellURLs.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(key) ?? fetch(request);
  })());
});
