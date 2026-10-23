/*
 * Pushed alerts (ADR-031), imported into the generated service worker (vite.config.ts →
 * workbox.importScripts). The laptop's helper sends the end of a focus session or break here,
 * encrypted for this device; the browser decrypts it and this shows it. Every push must show a
 * notification (userVisibleOnly), so a malformed one still shows a plain "Itqan".
 */
self.addEventListener('push', (event) => {
  let msg = {}
  try { msg = event.data ? event.data.json() : {} } catch { msg = {} }
  event.waitUntil(self.registration.showNotification(String(msg.title || 'Itqan'), {
    body: String(msg.body || ''),
    tag: msg.tag ? String(msg.tag) : undefined,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) if ('focus' in w) return w.focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})
