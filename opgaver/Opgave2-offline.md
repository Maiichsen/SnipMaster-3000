# Exercise 2: Implementing Complete Offline Functionality



## Part 1: Enhance the Storage Module with Sync Capabilities

Update your `storage.js` file to add sync functionality:

```javascript
// storage.js - Add these properties and methods to the SnippetStorage object

// Add these as properties to the SnippetStorage object
syncConfig: {
    lastSyncTime: localStorage.getItem('lastSyncTime') || null,
    isSyncing: false,
    syncEndpoint: '/api/sync' // Mock endpoint. No endpoint yet
},

// Get all pending snippets
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

// Mark snippet as synced
markAsSynced: async function(id) {
    const snippet = await this.getById(id);
    if (snippet) {
        snippet.syncStatus = 'synced';
        return this.save(snippet, false); // Pass false to avoid setting pending status again
    }
},

// Save with optional sync status
save: async function(snippet, setPending = true) {
    // Ensure snippet has required fields
    if (!snippet.id) {
        snippet.id = Date.now().toString();
    }
    
    if (!snippet.created) {
        snippet.created = new Date().toISOString();
    }
    
    snippet.lastModified = new Date().toISOString();
    
    // Only set as pending if not already synced and setPending is true
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

// Set up mock server sync (in a real app, this would be an API call)
syncWithServer: async function(snippet) {
    // Simulate API call
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            // Simulate 90% success rate
            if (Math.random() < 0.9) {
                resolve({ success: true, data: snippet });
            } else {
                reject(new Error('Server error'));
            }
        }, 500); // 500ms delay
    });
},

// Sync a single snippet
syncSingleSnippet: async function(id) {
    try {
        // Get the snippet
        const snippet = await this.getById(id);
        if (!snippet || snippet.syncStatus !== 'pending') {
            return { success: false, message: 'Nothing to sync' };
        }
        
        // Send to server
        await this.syncWithServer(snippet);
        
        // Mark as synced
        await this.markAsSynced(snippet.id);
        
        return { success: true };
    } catch (error) {
        console.error(`Failed to sync snippet ${id}:`, error);
        return { success: false, error };
    }
},

// Sync all pending snippets
syncAll: async function() {
    // Prevent multiple simultaneous syncs
    if (this.syncConfig.isSyncing) {
        return { success: false, message: 'Sync already in progress' };
    }
    
    this.syncConfig.isSyncing = true;
    // Notify sync started
    document.dispatchEvent(new CustomEvent('sync-status-change', { 
        detail: { status: 'syncing', message: 'Starting sync...' }
    }));
    
    try {
        const pendingSnippets = await this.getPendingSync();
        
        if (pendingSnippets.length === 0) {
            // Notify nothing to sync
            document.dispatchEvent(new CustomEvent('sync-status-change', { 
                detail: { status: 'sync-success', message: 'Nothing to sync' }
            }));
            this.syncConfig.isSyncing = false;
            return { success: true, message: 'Nothing to sync' };
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const snippet of pendingSnippets) {
            try {
                // Send to server
                await this.syncWithServer(snippet);
                
                // Mark as synced
                await this.markAsSynced(snippet.id);
                
                successCount++;
                
                // Update UI with progress
                document.dispatchEvent(new CustomEvent('sync-status-change', { 
                    detail: { 
                        status: 'syncing', 
                        message: `Syncing ${successCount + errorCount}/${pendingSnippets.length}`
                    }
                }));
                
            } catch (error) {
                console.error(`Failed to sync snippet ${snippet.id}:`, error);
                errorCount++;
            }
        }
        
        // Update last sync time
        if (successCount > 0) {
            this.updateLastSyncTime();
        }
        
        // Notify sync completed
        if (errorCount === 0) {
            document.dispatchEvent(new CustomEvent('sync-status-change', { 
                detail: { 
                    status: 'sync-success', 
                    message: `All ${successCount} snippets synced successfully`
                }
            }));
        } else {
            document.dispatchEvent(new CustomEvent('sync-status-change', { 
                detail: { 
                    status: 'sync-error', 
                    message: `Synced ${successCount}/${pendingSnippets.length} snippets. ${errorCount} failed.`
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
        console.error('Sync failed:', error);
        document.dispatchEvent(new CustomEvent('sync-status-change', { 
            detail: { status: 'sync-error', message: 'Sync failed completely' }
        }));
        return { success: false, error };
    } finally {
        this.syncConfig.isSyncing = false;
    }
},

// Update last sync time
updateLastSyncTime: function() {
    this.syncConfig.lastSyncTime = new Date().toISOString();
    localStorage.setItem('lastSyncTime', this.syncConfig.lastSyncTime);
    
    // Notify any open tabs about the sync (for multi-tab support)
    try {
        localStorage.setItem('syncEvent', Date.now().toString());
    } catch (e) {
        console.error('Failed to notify other tabs about sync:', e);
    }
    
    // Dispatch event for last sync time update
    document.dispatchEvent(new CustomEvent('last-sync-updated', { 
        detail: { time: this.syncConfig.lastSyncTime }
    }));
},

// Get last sync time
getLastSyncTime: function() {
    return this.syncConfig.lastSyncTime;
},

// Register for background sync
registerBackgroundSync: async function() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-snippets');
            console.log('Background sync registered');
            return true;
        } catch (error) {
            console.error('Background sync registration failed:', error);
            return false;
        }
    }
    return false;
}
```

## Part 2: Create a Sync UI Module

Create a new file called `syncUI.js` to handle all sync-related UI:
```javascript
const SyncUI = {
    // App states
    APP_STATES: {
        ONLINE: 'online',
        OFFLINE: 'offline',
        SYNCING: 'syncing',
        SYNC_ERROR: 'sync-error',
        SYNC_SUCCESS: 'sync-success'
    },
    
    // Elements
    elements: {
        statusContainer: null,
        syncButton: null,
        lastSyncTime: null,
        offlineBanner: null
    },
    
    // Current app state
    currentState: null,
    
    // Initialize sync UI
    init: function() {
        // Set up UI elements
        this.createStatusContainer();
        this.createSyncButton();
        this.createLastSyncTimeDisplay();
        this.createOfflineBanner();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set initial state
        this.updateAppState(navigator.onLine ? this.APP_STATES.ONLINE : this.APP_STATES.OFFLINE);
    },
    
    // Create status container
    createStatusContainer: function() {
        let container = document.getElementById('app-status-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-status-container';
            document.body.appendChild(container);
        }
        this.elements.statusContainer = container;
    },
    
    // Create sync button
    createSyncButton: function() {
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        const syncButton = document.createElement('button');
        syncButton.id = 'sync-button';
        syncButton.className = 'sync-button online-only';
        syncButton.innerHTML = '🔄 Sync Now';
        
        header.appendChild(syncButton);
        this.elements.syncButton = syncButton;
    },
    
    // Create last sync time display
    createLastSyncTimeDisplay: function() {
        const syncTimeElement = document.createElement('div');
        syncTimeElement.id = 'last-sync-time';
        syncTimeElement.className = 'last-sync-time';
        
        // Add it near your sync button
        const header = document.querySelector('.app-header');
        if (header) {
            header.appendChild(syncTimeElement);
        }
        
        this.elements.lastSyncTime = syncTimeElement;
        
        // Initial update
        this.updateLastSyncTimeDisplay();
    },
    
    // Create offline banner
    createOfflineBanner: function() {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner show-when-offline';
        banner.innerHTML = `
            <div class="offline-content">
                <div class="offline-icon">📴</div>
                <div class="offline-message">
                    <h3>You're working offline</h3>
                    <p>Changes will be saved and synced when you reconnect.</p>
                </div>
            </div>
        `;
        
        document.body.insertBefore(banner, document.body.firstChild);
        this.elements.offlineBanner = banner;
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Network status events
        window.addEventListener('online', this.handlers.onlineStatusChange.bind(this));
        window.addEventListener('offline', this.handlers.offlineStatusChange.bind(this));
        
        // Sync button click
        if (this.elements.syncButton) {
            this.elements.syncButton.addEventListener('click', this.handlers.syncButtonClick.bind(this));
        }
        
        // Sync status change event
        document.addEventListener('sync-status-change', this.handlers.syncStatusChange.bind(this));
        
        // Last sync time update
        document.addEventListener('last-sync-updated', this.handlers.lastSyncUpdated.bind(this));
    },
    
    // Update app state
    updateAppState: function(newState, message = '') {
        const statusContainer = this.elements.statusContainer;
        if (!statusContainer) return;
        
        // Update current state
        this.currentState = newState;
        
        // Clear previous status
        statusContainer.innerHTML = '';
        
        // Create new status element
        const statusElement = document.createElement('div');
        statusElement.className = `app-status ${newState}`;
        
        // Set icon and message based on state
        let icon = '', defaultMessage = '';
        
        switch (newState) {
            case this.APP_STATES.ONLINE:
                icon = '🟢';
                defaultMessage = 'Online - All changes saved';
                break;
            case this.APP_STATES.OFFLINE:
                icon = '🔴';
                defaultMessage = 'Offline - Changes will sync when online';
                break;
            case this.APP_STATES.SYNCING:
                icon = '🔄';
                defaultMessage = 'Syncing changes...';
                break;
            case this.APP_STATES.SYNC_ERROR:
                icon = '⚠️';
                defaultMessage = 'Sync error - Will retry later';
                break;
            case this.APP_STATES.SYNC_SUCCESS:
                icon = '✅';
                defaultMessage = 'All changes synced successfully';
                break;
        }
        
        statusElement.innerHTML = `
            <span class="status-icon">${icon}</span>
            <span class="status-message">${message || defaultMessage}</span>
        `;
        
        // Add to container
        statusContainer.appendChild(statusElement);
        
        // If sync success, auto-revert to online after 3 seconds
        if (newState === this.APP_STATES.SYNC_SUCCESS) {
            setTimeout(() => {
                this.updateAppState(this.APP_STATES.ONLINE);
            }, 3000);
        }
        
        // Update body class for CSS targeting
        document.body.className = `app-state-${newState}`;
    },
    
    // Update last sync time display
    updateLastSyncTimeDisplay: function() {
        const timeElement = this.elements.lastSyncTime;
        if (!timeElement) return;
        
        const lastSyncTime = SnippetStorage.getLastSyncTime();
        
        if (lastSyncTime) {
            const syncDate = new Date(lastSyncTime);
            const now = new Date();
            const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));
            
            let timeText = '';
            if (diffMinutes < 1) {
                timeText = 'just now';
            } else if (diffMinutes < 60) {
                timeText = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                timeText = `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else {
                timeText = syncDate.toLocaleDateString() + ' ' + 
                          syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            
            timeElement.textContent = `Last synced: ${timeText}`;
            timeElement.style.display = 'block';
        } else {
            timeElement.textContent = 'Never synced';
            timeElement.style.display = 'block';
        }
    },
    
    // Event handlers
    handlers: {
        onlineStatusChange: function() {
            if (navigator.onLine) {
                this.updateAppState(this.APP_STATES.ONLINE);
                
                // Try background sync first
                SnippetStorage.registerBackgroundSync().then(registered => {
                    // If background sync is not supported or registration failed, try manual sync
                    if (!registered) {
                        this.handlers.syncButtonClick.call(this);
                    }
                });
            }
        },
        
        offlineStatusChange: function() {
            if (!navigator.onLine) {
                this.updateAppState(this.APP_STATES.OFFLINE);
            }
        },
        
        syncButtonClick: async function() {
            this.updateAppState(this.APP_STATES.SYNCING, 'Starting sync...');
            
            try {
                const result = await SnippetStorage.syncAll();
                
                // Refresh snippets display after sync
                await SnippetUI.renderSnippets();
                
            } catch (error) {
                console.error('Error during manual sync:', error);
                this.updateAppState(this.APP_STATES.SYNC_ERROR, 'Sync failed');
            }
        },
        
        syncStatusChange: function(event) {
            const { status, message } = event.detail;
            this.updateAppState(status, message);
        },
        
        lastSyncUpdated: function(event) {
            this.updateLastSyncTimeDisplay();
        }
    }
};
```
## Part 3: Enhance the UI Module for Item-Level Sync

Modify your `ui.js` file to add item-level sync indicators and controls:

```javascript
// Add to the SnippetUI object in ui.js

// Enhanced renderSnippets function with sync status
renderSnippets: async function() {
    try {
        const snippets = await SnippetStorage.getAll();
        const snippetList = this.elements.snippetList;
        
        snippetList.innerHTML = snippets.map(snippet => {
            // Determine status icon and class
            let statusIcon = '';
            let statusClass = '';
            
            if (snippet.syncStatus === 'pending') {
                statusIcon = '🔄';
                statusClass = 'pending';
            } else if (snippet.syncStatus === 'error') {
                statusIcon = '⚠️';
                statusClass = 'error';
            } else {
                statusIcon = '✓';
                statusClass = 'synced';
            }
            
            return `
                <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" 
                     data-id="${snippet.id}">
                    <div class="snippet-info">
                        <div class="snippet-header">
                            <strong>${snippet.language}</strong>
                            <span class="snippet-sync-status ${statusClass}" 
                                  title="${statusClass === 'pending' ? 'Waiting to sync' : 
                                          statusClass === 'error' ? 'Sync failed' : 'Synced'}">
                                ${statusIcon}
                            </span>
                        </div>
                        <div class="snippet-dates">
                            <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                            <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                            ${snippet.syncStatus === 'pending' ? 
                                '<small class="sync-message">Will sync when online</small>' : ''}
                        </div>
                    </div>
                    <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                    <div class="snippet-actions">
                        <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                        ${snippet.syncStatus === 'pending' && navigator.onLine ? 
                            '<button class="sync-item-btn" data-id="' + snippet.id + '">Sync Now</button>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        this.addSnippetEventListeners();
        
    } catch (error) {
        console.error('Error displaying snippets:', error);
        this.showMessage('Failed to load snippets', true);
    }
},

// Enhance addSnippetEventListeners with sync button handlers
addSnippetEventListeners: function() {
    // Snippet item click
    this.elements.snippetList.querySelectorAll('.snippet-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.matches('.delete-btn') && !e.target.matches('.sync-item-btn')) {
                const id = item.dataset.id;
                this.handlers.snippetItemClick(id);
            }
        });
    });
    
    // Delete button click
    this.elements.snippetList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            this.handlers.deleteButtonClick(id);
        });
    });
    
    // Sync item button click
    this.elements.snippetList.querySelectorAll('.sync-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            this.handlers.syncItemButtonClick(id);
        });
    });
},

// Add syncItemButtonClick to handlers
handlers: {
    // ... existing handlers
    
    syncItemButtonClick: async function(id) {
        try {
            SyncUI.updateAppState(SyncUI.APP_STATES.SYNCING, 'Syncing single snippet...');
            
            const result = await SnippetStorage.syncSingleSnippet(id);
            
            if (result.success) {
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_SUCCESS, 'Snippet synced successfully');
            } else {
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Failed to sync snippet');
            }
            
            // Refresh the list
            await SnippetUI.renderSnippets();
            
        } catch (error) {
            console.error('Error syncing snippet:', error);
            SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Error syncing snippet');
        }
    }
}
```

## Part 4: Update Service Worker for Background Sync 

Update your service worker file (`sw.js`) to add background sync support:

```javascript
// service-worker.js - Add background sync

// Add this listener for background sync
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
```

## Part 5: Add CSS Styles for Improved UI

```css
/* Add to your styles.css file */

/* App-wide status system */
#app-status-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
}

.app-status {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    border-radius: 4px;
    margin-bottom: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
}

.app-status .status-icon {
    margin-right: 8px;
    font-size: 16px;
}

/* Status-specific styles */
.app-status.online {
    background-color: #d4edda;
    color: #155724;
}

.app-status.offline {
    background-color: #f8d7da;
    color: #721c24;
}

.app-status.syncing {
    background-color: #cce5ff;
    color: #004085;
}

.app-status.sync-error {
    background-color: #fff3cd;
    color: #856404;
}

.app-status.sync-success {
    background-color: #d4edda;
    color: #155724;
}

/* Animation */
@keyframes slideIn {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

/* Item-level indicators */
.snippet-sync-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    margin-left: 8px;
}

.snippet-sync-status.pending {
    background-color: #ffeb3b;
    color: #333;
    animation: pulse 1.5s infinite;
}

.snippet-sync-status.error {
    background-color: #f44336;
    color: white;
}

.snippet-sync-status.synced {
    background-color: #4CAF50;
    color: white;
}

@keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
}

/* Sync button */
.sync-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    margin-left: 10px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
}

.sync-button:hover {
    background-color: #45a049;
}

.sync-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

/* Sync item button */
.sync-item-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 0.8em;
    cursor: pointer;
    margin-left: 5px;
}

.sync-item-btn:hover {
    background-color: #2980b9;
}

/* When offline */
.app-state-offline .online-only {
    opacity: 0.5;
    pointer-events: none;
}

.app-state-offline .show-when-offline {
    display: block;
}

.show-when-offline {
    display: none;
}

/* Offline banner */
.offline-banner {
    background-color: #f8d7da;
    color: #721c24;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid #f5c6cb;
    display: none;
}

.app-state-offline .offline-banner {
    display: block;
    animation: slideDown 0.3s ease-out;
}

.offline-content {
    display: flex;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
    padding: 10px;
}

.offline-icon {
    font-size: 24px;
    margin-right: 15px;
}

.offline-message {
    flex: 1;
}

.offline-message h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
}

.offline-message p {
    margin: 0;
    font-size: 14px;
}

@keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
}

/* Last sync time display */
.last-sync-time {
    font-size: 12px;
    color: #666;
    margin-left: 15px;
    align-self: center;
}

/* Sync message in snippet item */
.sync-message {
    color: #856404;
    background-color: #fff3cd;
    padding: 2px 5px;
    border-radius: 3px;
    font-style: italic;
    margin-top: 5px;
    display: inline-block;
}

/* Create a clearer look when offline */
.app-state-offline .app-container {
    border: 2px solid #f8d7da;
    box-shadow: 0 0 10px rgba(220, 53, 69, 0.1);
}

.app-state-syncing .app-container {
    border: 2px solid #cce5ff;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.1);
}
```

## Part 6: Update App.js to Wire Everything Together 

Update your main application file to use the new modules:

```javascript
// app.js - Application entry point

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // First migrate data from localStorage to IndexedDB
        await SnippetStorage.migrateFromLocalStorage();
        
        // Initialize the UI modules
        await SnippetUI.init();
        SyncUI.init();
        
        console.log('SnipMaster 3000 initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Register the Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:', 
                                registration.scope);
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        });
    } else {
        console.log('Service Workers not supported in this browser.');
    }
}

// Call the registration function
registerServiceWorker();
```

Update your HTML to include the new script files:

```html
<script src="js/storage.js"></script>
<script src="js/ui.js"></script>
<script src="js/syncUI.js"></script>
<script src="js/app.js"></script>
```

## Testing Your Implementation

### Basic Offline Functionality
1. **Test IndexedDB Storage:**
   - Open Chrome DevTools and go to Application > IndexedDB
   - Verify the SnipMasterDB and snippets store are created
   - Check that the by-sync-status index exists

2. **Test Snippet Management:**
   - Create, edit, and delete snippets
   - Verify changes persist in IndexedDB
   - Check that snippets have proper sync status

3. **Test Offline Capability:**
   - Make changes while online
   - Go to DevTools > Network tab, check "Offline"
   - Make additional changes offline
   - Verify that changes show pending sync status
   - Notice visual indicators of offline mode

### Sync Testing
1. **Test Manual Sync:**
   - Make changes offline
   - Go back online
   - Click the "Sync Now" button
   - Verify sync status indicators update
   - Check sync UI feedback

2. **Test Background Sync:**
   - Make changes offline
   - Go back online
   - Observe if background sync occurs
   - Check console for sync messages

3. **Test Per-Item Sync:**
   - Make multiple changes offline
   - Go online but don't perform full sync
   - Click "Sync Now" on a specific item
   - Verify only that item syncs

### UI Feedback Testing
1. **Test Status Indicators:**
   - Verify online/offline status changes
   - Check sync progress indicators
   - Verify error handling
   - Test the offline banner

2. **Test Visual Feedback:**
   - Check snippet sync status indicators
   - Verify disabled controls when offline
   - Check last sync time display
   - Verify animations work properly



## Bonus Challenges (if time permits)

1. **Add Conflict Resolution:**
   - Implement a simple version system
   - Add a conflict resolution UI
   - Allow user to choose which version to keep

2. **Implement Selective Sync:**
   - Add options to prioritize certain snippets for offline use
   - Create a "Favorites" system that ensures those items are available offline
   - Add UI to manage offline storage

3. **Multi-tab Support:**
   - Use BroadcastChannel or localStorage events
   - Sync UI state across tabs
   - Prevent sync conflicts between tabs

## Success Criteria
- [x] Complete offline CRUD functionality with modular code structure
- [x] Visual sync status indicators
- [x] Automatic sync when going online
- [x] Background sync implementation
- [x] Per-item sync controls
- [x] Enhanced offline UI
- [x] Last sync tracking
- [x] Proper error handling
