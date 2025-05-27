// Version control - change these when you update your app
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `snipmaster-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `snipmaster-dynamic-${CACHE_VERSION}`;
const SNIPPETS_CACHE = `snipmaster-snippets-${CACHE_VERSION}`;

// Log events for easier debugging
console.log('Service Worker: Loaded');

const INITIAL_CACHED_RESOURCES = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/app.js',
    '/scripts/storage.js',
    '/scripts/ui.js',
    '/scripts/syncUI.js',
    '/offline.html',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/maskable-icon.png',
    '/images/icon-144.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(INITIAL_CACHED_RESOURCES);
            })
            .then(() => {
                console.log('Service Worker: Install Completed');
                return self.skipWaiting();
            })
    );
});


self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, SNIPPETS_CACHE];
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return cacheNames.filter(cacheName => 
                    cacheName.startsWith('snipmaster-') && 
                    !currentCaches.includes(cacheName)
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

// Add background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-snippets') {
        console.log('Background sync triggered');
        event.waitUntil(syncSnippets());
    }
});

// Sync function
async function syncSnippets() {
    try {
        const snippetsToSync = await getSnippetsToSync();
        if (snippetsToSync.length === 0) {
            console.log('No snippets to sync');
            return;
        }
        
        console.log(`Syncing ${snippetsToSync.length} snippets in background`);
        
        for (const snippet of snippetsToSync) {
            try {
                await syncSnippet(snippet);
                await markSnippetSynced(snippet.id);
            } catch (error) {
                console.error(`Failed to sync snippet ${snippet.id}:`, error);
                // Let the sync process continue with other snippets
            }
        }
        
        console.log('Background sync completed');
        
    } catch (error) {
        console.error('Background sync failed:', error);
        // Rethrow to allow the system to retry later
        throw error;
    }
}

// Helper functions - using IndexedDB from service worker
async function getSnippetsToSync() {
    // Access IndexedDB directly from service worker
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SnipMasterDB', 1);
        
        request.onerror = reject;
        
        request.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction('snippets', 'readonly');
            const store = transaction.objectStore('snippets');
            
            // Get all snippets with pending sync status
            const index = store.index('by-sync-status');
            const query = index.getAll('pending');
            
            query.onsuccess = () => {
                resolve(query.result);
            };
            
            query.onerror = reject;
        };
    });
}
// ------- 10% chance for at den fejler med at Sync--------
async function syncSnippet(snippet) {
    // Mock server sync - in a real app, this would be an API call
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < 0.9) {
                resolve({ success: true });
            } else {
                reject(new Error('Server error'));
            }
        }, 500);
    });
}

async function markSnippetSynced(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SnipMasterDB', 1);
        
        request.onerror = reject;
        
        request.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction('snippets', 'readwrite');
            const store = transaction.objectStore('snippets');
            
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const snippet = getRequest.result;
                if (snippet) {
                    snippet.syncStatus = 'synced';
                    const updateRequest = store.put(snippet);
                    
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = reject;
                } else {
                    resolve(); // Snippet not found, nothing to do
                }
            };
            
            getRequest.onerror = reject;
        };
    });
}

// Fetch event listener with different strategies
self.addEventListener('fetch', event => {
    // Skip cache if the request explicitly asks for fresh content
    if (event.request.headers.get('Cache-Control') === 'no-cache') {
        event.respondWith(fetch(event.request));
        return;
    }

    const url = new URL(event.request.url);

    if (event.request.url.startsWith("chrome-extension://")) {
        return; // Ignore Chrome extensions
    }

    // 1. For API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(event));
        return;
    }

    // 2. For snippet data
    if (url.pathname.includes('snippets') || 
        event.request.headers.get('accept')?.includes('application/json')) {
        event.respondWith(staleWhileRevalidate(event));
        return;
    }

    // 3. For page navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(networkFirst(event));
        return;
    }

    // 4. For static assets (JS, CSS, images, etc.)
    if (url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')) {
        event.respondWith(cacheFirst(event));
        return;
    }

    // 5. Default strategy for everything else
    event.respondWith(networkFirst(event));
});

// Cache-first strategy for static assets
function cacheFirst(event) {
    return caches.match(event.request)
        .then(cachedResponse => {
            // Return cached response if found
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise fetch from network
            return fetch(event.request)
                .then(networkResponse => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    // Clone the response (response can only be consumed once)
                    const responseToCache = networkResponse.clone();
                    // Add to cache for future requests
                    caches.open(STATIC_CACHE)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return networkResponse;
                });
        });
}

// Network-first strategy for dynamic content
function networkFirst(event) {
    return fetch(event.request)
        .then(networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
            }
            // Clone the response
            const responseToCache = networkResponse.clone();
            // Add to dynamic cache
            caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    cache.put(event.request, responseToCache);
                });
            return networkResponse;
        })
        .catch(() => {
            // If network fails, try the cache
            return caches.match(event.request)
                .then(cachedResponse => {
                    // If found in cache, return it
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // For HTML requests, return the offline page
                    if(event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/offline.html');
                    }
                    // For other requests, we'll just have to fail
                });
        });
}

// Stale-while-revalidate for user snippets
function staleWhileRevalidate(event) {
    return caches.open(SNIPPETS_CACHE)
        .then(cache => {
            return cache.match(event.request)
                .then(cachedResponse => {
                    // Create a promise for updating the cache
                    const fetchPromise = fetch(event.request)
                        .then(networkResponse => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        })
                        .catch(error => {
                            console.error('Failed to update cache:', error);
                            // We still return null here to fall back to cached response
                            return null;
                        });
                    // Return the cached response immediately or wait for the network response
                    return cachedResponse || fetchPromise;
                });
        });
}