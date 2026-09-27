// Service worker de Agent OS: recibe los avisos cifrados de la PC, guarda el último estado y muestra la notificación.
const CACHE = "agentos-v1";
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "badge-96.png"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para recibir actualizaciones de la app); si no hay conexión, lo guardado.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request)));
});

function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("agentos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function guardar(clave, valor) {
  const d = await db();
  return new Promise((res) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(valor, clave); t.oncomplete = res; t.onerror = res; });
}
async function leer(clave) {
  const d = await db();
  return new Promise((res) => { const t = d.transaction("kv").objectStore("kv").get(clave); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); });
}

const TITULOS = {
  permiso: (e) => (e.s || "Una sesión") + " necesita tu permiso",
  espera: (e) => (e.s || "Una sesión") + " terminó y te espera",
  agente: (e) => "Terminó un agente" + (e.s ? " en " + e.s : ""),
  error: (e) => "Error en " + (e.s || "una sesión"),
  inicio: (e) => "Se abrió " + (e.s || "una sesión"),
  fin: (e) => "Se cerró " + (e.s || "una sesión"),
  prueba: () => "Agent OS conectado",
};
const IMPORTANTES = new Set(["permiso", "espera", "agente", "error", "prueba"]);

self.addEventListener("push", (evento) => {
  evento.waitUntil((async () => {
    let datos = {};
    try { datos = evento.data ? evento.data.json() : {}; } catch { datos = {}; }
    const ev = datos.ev || { k: "prueba" };
    if (datos.ses) await guardar("estado", datos);
    const lista = (await leer("eventos")) || [];
    lista.unshift({ t: datos.t || new Date().toISOString(), k: ev.k, s: ev.s || null, d: ev.d || null });
    await guardar("eventos", lista.slice(0, 40));

    const importante = IMPORTANTES.has(ev.k);
    const n = (datos.ses || []).length;
    const titulo = (TITULOS[ev.k] || (() => "Agent OS"))(ev);
    const cuerpo = ev.d || (n ? n + (n === 1 ? " sesión abierta" : " sesiones abiertas") + (datos.maq ? " en " + datos.maq : "") : "");
    await self.registration.showNotification(importante ? titulo : "Agent OS · " + n + (n === 1 ? " sesión" : " sesiones"), {
      body: importante ? cuerpo : titulo,
      icon: "icon-192.png",
      badge: "badge-96.png",
      // Una notificación por sesión para lo importante; una sola, silenciosa, para aperturas y cierres.
      tag: importante ? "agentos-" + (ev.s || ev.k) : "agentos-estado",
      renotify: importante,
      silent: !importante,
      timestamp: Date.parse(datos.t || "") || Date.now(),
      data: { url: "./" },
    });
    for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage("actualizado");
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (ventanas.length) return ventanas[0].focus();
    return self.clients.openWindow("./");
  })());
});
