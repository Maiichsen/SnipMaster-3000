const SnippetStorage = {
    // Konfiguration for IndexedDB database
    dbConfig: {
        name: 'SnipMasterDB',
        version: 1,
        storeName: 'snippets'
    },
    
    // Konfiguration for synkronisering (fx endpoint og status)
    syncConfig: {
        lastSyncTime: localStorage.getItem('lastSyncTime') || null,
        isSyncing: false,
        syncEndpoint: '/api/sync' // Mock endpoint. Ingen rigtig endpoint endnu
    },
    
    // Åbner forbindelse til IndexedDB og opretter nødvendige object stores og indexes
    openDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);
            
            // Håndterer database-opgradering/oprettelse
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Opretter snippets object store hvis den ikke findes
                if (!db.objectStoreNames.contains(this.dbConfig.storeName)) {
                    const store = db.createObjectStore(this.dbConfig.storeName, { keyPath: 'id' });
                    
                    // Opretter nyttige indexes
                    store.createIndex('by-language', 'language', { unique: false });
                    store.createIndex('by-modified', 'lastModified', { unique: false });
                    store.createIndex('by-sync-status', 'syncStatus', { unique: false });
                    
                    console.log('Database-skema oprettet');
                }
            };
            
            // Success handler
            request.onsuccess = (event) => {
                const db = event.target.result;
                console.log('Database åbnet');
                resolve(db);
            };
            
            // Fejl handler
            request.onerror = (event) => {
                console.error('Databasefejl:', event.target.error);
                reject('Fejl ved åbning af database');
            };
        });
    },
    
    // Henter alle snippets fra databasen
    getAll: async function() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Henter én snippet ud fra ID
    getById: async function(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Gemmer (opretter/opdaterer) en snippet i databasen
    save: async function(snippet, setPending = true) {
        // Sikrer at snippet har nødvendige felter
        if (!snippet.id) {
            snippet.id = Date.now().toString();
        }
        
        if (!snippet.created) {
            snippet.created = new Date().toISOString();
        }
        
        snippet.lastModified = new Date().toISOString();
        
        // Sæt kun som pending hvis ikke allerede synkroniseret og setPending er true
        if (setPending && snippet.syncStatus !== 'synced') {
            snippet.syncStatus = 'pending';
        }
        
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.put(snippet);
            
            request.onsuccess = () => resolve(snippet);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Sletter en snippet fra databasen
    delete: async function(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Henter alle snippets for et bestemt sprog
    getByLanguage: async function(language) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-language');
            const request = index.getAll(language);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Henter alle snippets, der venter på at blive synkroniseret
    getPendingSync: async function() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-sync-status');
            const request = index.getAll('pending');
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Markerer en snippet som synkroniseret
    markAsSynced: async function(id) {
        const snippet = await this.getById(id);
        if (snippet) {
            snippet.syncStatus = 'synced';
            return this.save(snippet, false); // Undgår at sætte pending igen
        }
    },
    
    // Migrerer data fra localStorage til IndexedDB (engangsmigration)
    migrateFromLocalStorage: async function() {
        // Tjek om migration allerede er udført
        if (localStorage.getItem('dbMigrationDone')) {
            console.log('Migration allerede udført');
            return;
        }
        
        try {
            // Hent snippets fra localStorage
            const localSnippets = JSON.parse(localStorage.getItem('snippets') || '[]');
            
            if (localSnippets.length > 0) {
                console.log(`Migrerer ${localSnippets.length} snippets til IndexedDB...`);
                
                // Gem hver snippet i IndexedDB
                for (const snippet of localSnippets) {
                    await this.save(snippet);
                }
                
                console.log('Migration gennemført');
            } else {
                console.log('Ingen snippets at migrere');
            }
            
            // Marker migration som udført
            localStorage.setItem('dbMigrationDone', 'true');
            
        } catch (error) {
            console.error('Fejl under migration:', error);
        }
    },
    
    // Mock-server synkronisering (simulerer API-kald)
    syncWithServer: async function(snippet) {
        // Simulerer API-kald
        return new Promise((resolve, reject) => {
            // Simulerer netværksforsinkelse
            setTimeout(() => {
                // Simulerer 90% succesrate
                if (Math.random() < 0.9) {
                    resolve({ success: true, data: snippet });
                } else {
                    reject(new Error('Serverfejl'));
                }
            }, 500); // 500ms forsinkelse
        });
    },

    // Synkroniserer én snippet med serveren
    syncSingleSnippet: async function(id) {
        try {
            // Hent snippet
            const snippet = await this.getById(id);
            if (!snippet || snippet.syncStatus !== 'pending') {
                return { success: false, message: 'Intet at synkronisere' };
            }
            
            // Send til server
            await this.syncWithServer(snippet);
            
            // Marker som synkroniseret
            await this.markAsSynced(snippet.id);
            
            return { success: true };
        } catch (error) {
            console.error(`Kunne ikke synkronisere snippet ${id}:`, error);
            return { success: false, error };
        }
    },

    // Synkroniserer alle ventende snippets med serveren
    syncAll: async function() {
        // Forhindrer flere samtidige synkroniseringer
        if (this.syncConfig.isSyncing) {
            return { success: false, message: 'Synkronisering allerede i gang' };
        }
        
        this.syncConfig.isSyncing = true;
        // Notificerer at synkronisering er startet
        document.dispatchEvent(new CustomEvent('sync-status-change', { 
            detail: { status: 'syncing', message: 'Starter synkronisering...' }
        }));
        
        try {
            const pendingSnippets = await this.getPendingSync();
            
            if (pendingSnippets.length === 0) {
                // Notificerer at der ikke er noget at synkronisere
                document.dispatchEvent(new CustomEvent('sync-status-change', { 
                    detail: { status: 'sync-success', message: 'Intet at synkronisere' }
                }));
                this.syncConfig.isSyncing = false;
                return { success: true, message: 'Intet at synkronisere' };
            }
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const snippet of pendingSnippets) {
                try {
                    // Send til server
                    await this.syncWithServer(snippet);
                    
                    // Marker som synkroniseret
                    await this.markAsSynced(snippet.id);
                    
                    successCount++;
                    
                    // Opdater UI med fremdrift
                    document.dispatchEvent(new CustomEvent('sync-status-change', { 
                        detail: { 
                            status: 'syncing', 
                            message: `Synkroniserer ${successCount + errorCount}/${pendingSnippets.length}`
                        }
                    }));
                    
                } catch (error) {
                    console.error(`Kunne ikke synkronisere snippet ${snippet.id}:`, error);
                    errorCount++;
                }
            }
            
            // Opdaterer tidspunkt for sidste synkronisering
            if (successCount > 0) {
                this.updateLastSyncTime();
            }
            
            // Notificerer at synkronisering er færdig
            if (errorCount === 0) {
                document.dispatchEvent(new CustomEvent('sync-status-change', { 
                    detail: { 
                        status: 'sync-success', 
                        message: `Alle ${successCount} snippets synkroniseret` 
                    }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('sync-status-change', { 
                    detail: { 
                        status: 'sync-error', 
                        message: `Synkroniserede ${successCount}/${pendingSnippets.length} snippets. ${errorCount} fejlede.`
                    }
                }));
            }
            
            return { 
                success: true, 
                totalCount: pendingSnippets.length,
                successCount,
                errorCount
            };
            
        } catch (error) {
            console.error('Synkronisering fejlede:', error);
            document.dispatchEvent(new CustomEvent('sync-status-change', { 
                detail: { status: 'sync-error', message: 'Synkronisering fejlede helt' }
            }));
            return { success: false, error };
        } finally {
            this.syncConfig.isSyncing = false;
        }
    },
    
    // Opdaterer tidspunkt for sidste synkronisering
    updateLastSyncTime: function() {
        this.syncConfig.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.syncConfig.lastSyncTime);
        
        // Notificerer andre åbne faner om sync (multi-tab support)
        try {
            localStorage.setItem('syncEvent', Date.now().toString());
        } catch (e) {
            console.error('Kunne ikke notificere andre faner om sync:', e);
        }
        
        // Udsender event for opdatering af sidste sync-tid
        document.dispatchEvent(new CustomEvent('last-sync-updated', { 
            detail: { time: this.syncConfig.lastSyncTime }
        }));
    },
    
    // Henter tidspunkt for sidste synkronisering
    getLastSyncTime: function() {
        return this.syncConfig.lastSyncTime;
    },
    
    // Registrerer background sync
    registerBackgroundSync: async function() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-snippets');
                console.log('Background sync registreret');
                return true;
            } catch (error) {
                console.error('Registrering af background sync fejlede:', error);
                return false;
            }
        }
        return false;
    }
};