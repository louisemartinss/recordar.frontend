const CACHE_NAME = "recordar-v11";
const ARQUIVOS = [
  "./",
  "index.html",
  "html/login.html",
  "html/cadastro.html",
  "html/recuperar.html",
  "html/paciente.html",
  "html/medico.html",
  "html/admin.html",
  "style.css",
  "app.js",
  "auth.js",
  "js/paciente.js",
  "js/medico.js",
  "js/admin.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "GET" || url.pathname.startsWith("/api")) return;

  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request, { ignoreSearch: true }))
  );
});
