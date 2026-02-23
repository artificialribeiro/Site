const CACHE_NAME = 'boutique-diniz-v2'; // Versão atualizada

// Ficheiros essenciais para a App abrir rápido e funcionar sem internet
const ASSETS_TO_CACHE = [
    '/',
    '/site.html',
    '/manifest.json',
    '/logo.png',
    '/layout.js',
    '/chavetoken.js',
    '/recuperar-dados-padrao.js',
    '/motor-ia.js',
    '/buscador.js',
    '/seguranca.js'
];

// 1. INSTALAÇÃO
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Ficheiros guardados em cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. ATIVAÇÃO (Limpa caches antigos)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

// 3. INTERCETADOR DE REDE
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 4. CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Lê a URL que enviámos junto com a notificação
    const urlDestino = event.notification.data.url || '/site.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Se a app já estiver aberta, foca nela e muda a página
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(urlDestino);
                    return client.focus();
                }
            }
            // Se a app estiver fechada, abre uma nova janela
            if (clients.openWindow) {
                return clients.openWindow(urlDestino);
            }
        })
    );
});
