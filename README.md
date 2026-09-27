# Agent OS · móvil

App web instalable (PWA) que recibe en el celular los avisos de Agent OS: el estado de las sesiones de Claude Code de una PC.

- **Los avisos llegan por Web Push, cifrados de punta a punta** (RFC 8291 + VAPID). Los manda la propia PC; no hay servidor intermedio.
- **Este repositorio solo contiene la interfaz.** No hay datos: el estado vive cifrado en tránsito y después solo en el celular.
- La clave VAPID de `index.html` es pública por diseño. La privada nunca sale de la PC.
