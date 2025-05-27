# Exercise 1: Implementing Basic Offline Data Storage


### Objective
Transform our SnipMaster 3000 application to use IndexedDB instead of localStorage, providing a foundation for robust offline data access and manipulation. 


## Part 1: Set Up Database Module

Create a new file called `storage.js` in your js folder with the following content:

```javascript
// storage.js - Responsible for data persistence using IndexedDB


```

## Part 2: Create UI Module 

Create a new file called `ui.js` with the following content:
(Or integrate in previous created)
```javascript
// ui.js - Responsible for user interface

const SnippetUI = {
    // Store DOM elements
    elements: {
        codeEditor: document.getElementById('codeEditor'),
        languageSelect: document.getElementById('languageSelect'),
        saveBtn: document.getElementById('saveBtn'),
        newSnippetBtn: document.getElementById('newSnippetBtn'),
        snippetList: document.getElementById('snippetList'),
        connectionStatus: null
    },
    
    // Track current snippet
    currentSnippetId: null,
    
    // Initialize UI
    init: async function() {
        // Set up event listeners
        this.elements.saveBtn.addEventListener('click', this.handlers.saveButtonClick);
        this.elements.newSnippetBtn.addEventListener('click', this.handlers.newButtonClick);
        
        // Set up connection status
        this.setupConnectionStatus();
        
        // Display existing snippets
        await this.renderSnippets();
    },
    
    // Set up connection status indicator
    setupConnectionStatus: function() {
        // Create status element if it doesn't exist
        const statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status';
        document.body.appendChild(statusElement);
        
        // Save reference
        this.elements.connectionStatus = statusElement;
        
        // Set up event listeners
        window.addEventListener('online', this.handlers.onlineStatusChange);
        window.addEventListener('offline', this.handlers.onlineStatusChange);
        
        // Initial update
        this.updateConnectionStatus();
    },
    
    // Update connection status display
    updateConnectionStatus: function() {
        const statusElement = this.elements.connectionStatus;
        if (!statusElement) return;
        
        if (navigator.onLine) {
            statusElement.textContent = '🟢 Online';
            statusElement.classList.remove('offline');
            statusElement.classList.add('online');
        } else {
            statusElement.textContent = '🔴 Offline';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
        }
    },
    
    // Render all snippets
    renderSnippets: async function() {
        try {
            const snippets = await SnippetStorage.getAll();
            const snippetList = this.elements.snippetList;
            
            snippetList.innerHTML = snippets.map(snippet => `
                <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" 
                     data-id="${snippet.id}">
                    <div class="snippet-info">
                        <strong>${snippet.language}</strong>
                        <div class="snippet-dates">
                            <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                            <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                    <div class="snippet-actions">
                        <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners
            this.addSnippetEventListeners();
            
        } catch (error) {
            console.error('Error displaying snippets:', error);
            this.showMessage('Failed to load snippets', true);
        }
    },
    
    // Add event listeners to snippet items
    addSnippetEventListeners: function() {
        // Snippet item click
        this.elements.snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
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
    },
    
    // Show status message
    showMessage: function(text, isError = false) {
        const message = document.createElement('div');
        message.className = `status-message ${isError ? 'error' : ''}`;
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    },
    
    // Highlight selected snippet
    highlightSelectedSnippet: function(id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    },
    
    // Event handlers
    handlers: {
        saveButtonClick: async function() {
            try {
                const snippet = {
                    code: SnippetUI.elements.codeEditor.value,
                    language: SnippetUI.elements.languageSelect.value
                };
                
                if (SnippetUI.currentSnippetId) {
                    // Update existing snippet
                    const existingSnippet = await SnippetStorage.getById(SnippetUI.currentSnippetId);
                    if (existingSnippet) {
                        snippet.id = SnippetUI.currentSnippetId;
                        snippet.created = existingSnippet.created;
                    }
                }
                
                await SnippetStorage.save(snippet);
                
                // If this was a new snippet, update currentSnippetId
                if (!SnippetUI.currentSnippetId) {
                    SnippetUI.currentSnippetId = snippet.id;
                }
                
                // Update UI
                await SnippetUI.renderSnippets();
                SnippetUI.showMessage('Snippet saved!');
                
            } catch (error) {
                console.error('Error saving snippet:', error);
                SnippetUI.showMessage('Failed to save snippet', true);
            }
        },
        
        newButtonClick: function() {
            SnippetUI.currentSnippetId = null;
            SnippetUI.elements.codeEditor.value = '';
            SnippetUI.elements.languageSelect.value = 'javascript';
            SnippetUI.elements.saveBtn.textContent = 'Save Snippet';
            SnippetUI.highlightSelectedSnippet(null);
        },
        
        snippetItemClick: async function(id) {
            try {
                const snippet = await SnippetStorage.getById(id);
                
                if (snippet) {
                    SnippetUI.currentSnippetId = snippet.id;
                    SnippetUI.elements.codeEditor.value = snippet.code;
                    SnippetUI.elements.languageSelect.value = snippet.language;
                    
                    // Update UI
                    SnippetUI.elements.saveBtn.textContent = 'Update Snippet';
                    SnippetUI.highlightSelectedSnippet(id);
                    
                    // If you have a preview feature
                    if (typeof updatePreview === 'function') {
                        updatePreview();
                    }
                }
                
            } catch (error) {
                console.error('Error loading snippet:', error);
                SnippetUI.showMessage('Failed to load snippet', true);
            }
        },
        
        deleteButtonClick: async function(id) {
            if (confirm('Are you sure you want to delete this snippet?')) {
                try {
                    await SnippetStorage.delete(id);
                    
                    // Update UI
                    if (SnippetUI.currentSnippetId === id) {
                        SnippetUI.currentSnippetId = null;
                        SnippetUI.elements.codeEditor.value = '';
                        SnippetUI.elements.saveBtn.textContent = 'Save Snippet';
                    }
                    
                    await SnippetUI.renderSnippets();
                    SnippetUI.showMessage('Snippet deleted!');
                    
                } catch (error) {
                    console.error('Error deleting snippet:', error);
                    SnippetUI.showMessage('Failed to delete snippet', true);
                }
            }
        },
        
        onlineStatusChange: function() {
            SnippetUI.updateConnectionStatus();
        }
    }
};
```

## Part 3: Update your HTML and App.js

### Step 1: Update your index.html
Add the new script files to your index.html file, before your app.js script:

```html
<!-- Add these script tags before app.js -->
<script src="js/storage.js"></script>
<script src="js/ui.js"></script>
```

### Step 2: Update your app.js
Simplify your app.js to use the new modules:

```javascript
// app.js - Application entry point

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // First migrate data from localStorage to IndexedDB
        await SnippetStorage.migrateFromLocalStorage();
        
        // Then initialize the UI
        await SnippetUI.init();
        
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

### Step 3: Add CSS for Connection Status
Add these styles to your CSS file:

```css
/* Connection status indicator */
.connection-status {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.connection-status.online {
    background-color: #d4edda;
    color: #155724;
}

.connection-status.offline {
    background-color: #f8d7da;
    color: #721c24;
}

/* Status message */
.status-message {
    position: fixed;
    bottom: 60px;
    right: 20px;
    background-color: #2ecc71;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: fadeInOut 2s ease-in-out;
}

.status-message.error {
    background-color: #e74c3c;
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}
```

## Part 4: Update Service Worker for Offline Access

Update your service worker to cache the new js files:
(Not 100% what you might have)
```javascript
// In your service worker file (sw.js)
const CACHE_NAME = 'snipmaster-cache-v1';
const INITIAL_CACHED_RESOURCES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/storage.js',  // Add this line
    '/js/ui.js',       // Add this line
    '/highlight.min.js',
    '/highlight.styles.css',
    '/offline.html'
];

// Rest of your service worker code...
```

## Testing Your Implementation

1. **Check Database Setup:**
   - Open Chrome DevTools and go to Application > IndexedDB
   - Verify the SnipMasterDB and snippets store are created

2. **Test Data Migration:**
   - Reload your app and check the console for migration messages
   - Verify snippets show up in the UI

3. **Test Offline Capability:**
   - Make some edits while online
   - Go to Chrome DevTools > Network tab, check "Offline"
   - Refresh the page and verify:
     - The app still loads
     - Your snippets are still available
     - You can view and edit snippets

4. **Test Connection Indicator:**
   - Toggle between online/offline in DevTools
   - Check that the indicator updates accordingly



## Bonus Challenges (if time permits)

1. Add a "Last Synced" timestamp to the UI
2. Create a "Force Refresh" button that fetches the latest version
3. Add error handling for when IndexedDB is not available (use localStorage as fallback)

## Success Criteria
- [x] IndexedDB database is set up and working
- [x] Data successfully migrates from localStorage
- [x] App loads and functions offline
- [x] Online/offline status indicator works
- [x] CRUD operations work with IndexedDB
- [x] Code is well-organized in a modular pattern