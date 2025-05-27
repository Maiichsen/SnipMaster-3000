// sw.js - Service Worker for SnipMaster 3000

// Cache navne med versions identifikatorer
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `snipmaster-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `snipmaster-dynamic-${CACHE_VERSION}`;
const SNIPPETS_CACHE = `snipmaster-snippets-${CACHE_VERSION}`;

// Filer der skal caches ved start (app shell)
const APP_SHELL = [
	'/',
	'/index.html',
	'/styles/main.css',
	'/js/app.js',
	'/js/file-system.js',
	'/js/ui.js',
	'/offline.html',
];

// Installer event - cacher app shell
self.addEventListener('install', event => {
	console.log('Service Worker: Installing...');

	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then(cache => {
				console.log('Service Worker: Caching App Shell');
				return cache.addAll(APP_SHELL);
			})
			.then(() => {
				console.log('Service Worker: Install Completed');
				return self.skipWaiting();
			})
	);
});

// Aktiver event - rydder op i gamle caches
self.addEventListener('activate', event => {
	console.log('Service Worker: Activating...');

	const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, SNIPPETS_CACHE];

	event.waitUntil(
		caches
			.keys()
			.then(cacheNames => {
				return cacheNames.filter(
					cacheName => cacheName.startsWith('snipmaster-') && !currentCaches.includes(cacheName)
				);
			})
			.then(cachesToDelete => {
				return Promise.all(
					cachesToDelete.map(cacheToDelete => {
						console.log('Service Worker: Deleting old cache', cacheToDelete);
						return caches.delete(cacheToDelete);
					})
				);
			})
			.then(() => {
				console.log('Service Worker: Activation Completed');
				return self.clients.claim();
			})
	);
});

// Fetch event - håndterer forskellige typer af requests med forskellige strategier
self.addEventListener('fetch', event => {
	const url = new URL(event.request.url);

	// Håndterer forskellige URLs med forskellige strategier

	// 1. For API requests (hvis din app har dem)
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(networkFirst(event));
		return;
	}

	// 2. For snippet data
	if (url.pathname.includes('snippets') || event.request.headers.get('accept').includes('application/json')) {
		event.respondWith(staleWhileRevalidate(event));
		return;
	}

	// 3. For side navigations requests
	if (event.request.mode === 'navigate') {
		event.respondWith(networkFirst(event));
		return;
	}

	// 4. For statiske assets (JS, CSS, billeder, etc.)
	if (
		url.pathname.endsWith('.js') ||
		url.pathname.endsWith('.css') ||
		url.pathname.endsWith('.png') ||
		url.pathname.endsWith('.jpg') ||
		url.pathname.endsWith('.svg') ||
		url.pathname.endsWith('.ico')
	) {
		event.respondWith(cacheFirst(event));
		return;
	}

	// 5. Standard strategi for alt andet
	event.respondWith(networkFirst(event));
});

// Cache-først strategi for statiske assets
function cacheFirst(event) {
	return caches.match(event.request).then(cachedResponse => {
		// Returnerer cached response hvis den findes
		if (cachedResponse) {
			return cachedResponse;
		}

		// Ellers hent fra netværket
		return fetch(event.request).then(networkResponse => {
			// Tjek om vi modtog et gyldigt svar
			if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
				return networkResponse;
			}

			// Klon responsen (respons kan kun bruges én gang)
			const responseToCache = networkResponse.clone();

			// Tilføj til cache for fremtidige requests
			caches.open(STATIC_CACHE).then(cache => {
				cache.put(event.request, responseToCache);
			});

			return networkResponse;
		});
	});
}

// Netværk-først strategi for dynamisk indhold
function networkFirst(event) {
	return fetch(event.request)
		.then(networkResponse => {
			// Tjek om vi modtog et gyldigt svar
			if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
				return networkResponse;
			}

			// Klon responsen
			const responseToCache = networkResponse.clone();

			// Tilføj til dynamisk cache
			caches.open(DYNAMIC_CACHE).then(cache => {
				cache.put(event.request, responseToCache);
			});

			return networkResponse;
		})
		.catch(() => {
			// Hvis netværket fejler, prøv cachen
			return caches.match(event.request).then(cachedResponse => {
				// Hvis fundet i cache, returner det
				if (cachedResponse) {
					return cachedResponse;
				}

				// For HTML requests, returner offline siden
				if (event.request.headers.get('accept').includes('text/html')) {
					return caches.match('/offline.html');
				}

				// For andre requests, må vi bare fejle
				// Du kunne returnere fallback billeder her
			});
		});
}

// Stale-while-revalidate strategi for bruger snippets
function staleWhileRevalidate(event) {
	return caches.open(SNIPPETS_CACHE).then(cache => {
		return cache.match(event.request).then(cachedResponse => {
			// Opret et promise for at opdatere cachen
			const fetchPromise = fetch(event.request)
				.then(networkResponse => {
					cache.put(event.request, networkResponse.clone());
					return networkResponse;
				})
				.catch(error => {
					console.error('Failed to update cache:', error);
					// Vi returnerer stadig null her for at falde tilbage til cached response
					return null;
				});

			// Returner den cached response med det samme eller vent på netværks responsen
			return cachedResponse || fetchPromise;
		});
	});
}
