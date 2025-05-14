// Common status message function for all modules
function showMessage(message, isError = false) {
  // Create or get status message element
  let statusElement = document.getElementById('status-message');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'status-message';
    document.body.appendChild(statusElement);
  }
  
  // Set message text and class
  statusElement.textContent = message;
  statusElement.className = isError ? 'error' : '';
  
  // Show message
  statusElement.style.display = 'block';
  
  // Clear any existing timeout
  if (statusElement.timeout) {
    clearTimeout(statusElement.timeout);
  }
  
  // Auto hide after delay
  statusElement.timeout = setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

// Make available to window
window.showMessage = showMessage;

// Register the Service Worker
function updateCaches() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
            .then(registration => {
                if (registration) {
                    // Force the service worker to update
                    registration.update();
                }
            });
    }
}

// Add a refresh button to your app UI if you want
const refreshButton = document.getElementById('refresh-app');
if (refreshButton) {
    refreshButton.addEventListener('click', updateCaches);
}
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:',
                        registration.scope);

                    // Optional: Add UI indicator
                    showServiceWorkerStatus('Service Worker registered successfully!');
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);

                    // Optional: Add UI indicator
                    showServiceWorkerStatus('Service Worker registration failed!', true);
                });
        });
    } else {
        console.log('Service Workers not supported in this browser.');
        showServiceWorkerStatus('Service Workers not supported in this browser.', true);
    }
}

// Optional: Add a status display function
function showServiceWorkerStatus(message, isError = false) {
    // Create a status element if it doesn't exist
    let statusElement = document.getElementById('sw-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'sw-status';
        document.body.appendChild(statusElement);
    }

    // Style based on status
    statusElement.className = isError ? 'sw-status error' : 'sw-status success';
    statusElement.textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusElement.style.opacity = '0';
    }, 3000);
}

// Call the registration function
registerServiceWorker();



document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');
    const saveBtn = document.getElementById('saveBtn');
    const newSnippetBtn = document.getElementById('newSnippetBtn');
    const snippetList = document.getElementById('snippetList');

    // Track current snippet
    let currentSnippetId = null;
    // First add this to your HTML in the toolbar
    const categories = ['General', 'Utils', 'Components', 'Scripts'];
    const categorySelect = document.createElement('select');
    categorySelect.innerHTML = categories.map(cat =>
        `<option value="${cat}">${cat}</option>`
    ).join('');
    document.querySelector('.toolbar').appendChild(categorySelect);

    // Then the complete saveSnippet function
    function saveSnippet() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

        const snippet = {
            code: codeEditor.value,
            language: languageSelect.value,
            category: categorySelect.value || 'General',  // This is the new part
            lastModified: new Date().toISOString()
        };

        if (currentSnippetId) {
            // Update existing snippet
            const index = snippets.findIndex(s => s.id === currentSnippetId);
            if (index !== -1) {
                snippet.id = currentSnippetId;
                snippet.created = snippets[index].created;
                snippets[index] = snippet;
            }
        } else {
            // Create new snippet
            snippet.id = Date.now().toString();
            snippet.created = snippet.lastModified;
            snippets.push(snippet);
        }

        localStorage.setItem('snippets', JSON.stringify(snippets));
        displaySnippets();

        showMessage('Snippet saved!');
    }

    function saveSnippet() {
  // Your existing save code
  
  // After successful save, show notification
  const snippetName = getCurrentSnippetName() || 'Snippet';
  
  NotificationManager.showNotification(
    'Snippet Saved',
    `Your snippet "${snippetName}" has been saved`,
    {
      action: 'openSnippet',
      snippetId: currentSnippetId
    }
  );
    }

    // Helper function to get snippet name
    function getCurrentSnippetName() {
    if (!currentSnippetId) return null;
    
    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    const currentSnippet = snippets.find(s => s.id === currentSnippetId);
    
    return currentSnippet ? (currentSnippet.name || `Snippet ${currentSnippet.language}`) : null;
    }

    // Load snippet for editing
    function loadSnippet(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);

        if (snippet) {
            currentSnippetId = snippet.id;
            codeEditor.value = snippet.code;
            languageSelect.value = snippet.language;

            // Update UI to show we're editing
            saveBtn.textContent = 'Update Snippet';
            highlightSelectedSnippet(id);
        }
    }

    // Display snippets with improved UI
    function displaySnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        snippetList.innerHTML = snippets.map(snippet => `
        <div class="snippet-item ${snippet.id === currentSnippetId ? 'selected' : ''}" 
             data-id="${snippet.id}">
            <div class="snippet-info">
                <div class="snippet-header">
                    <strong>${snippet.language}</strong>
                    <span class="category-tag">${snippet.category}</span>
                </div>
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

        // Add click handlers
        snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    loadSnippet(item.dataset.id);
                }
            });
        });

        // Add delete handlers
        snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSnippet(btn.dataset.id);
            });
        });

          document.querySelectorAll('.snippet-item').forEach(item => {
    // Add reminder button if not already present
    if (!item.querySelector('.reminder-btn')) {
      const reminderBtn = document.createElement('button');
      reminderBtn.className = 'reminder-btn';
      reminderBtn.title = 'Set reminder for this snippet';
      reminderBtn.innerHTML = '<span class="icon">⏰</span>';
      reminderBtn.dataset.id = item.dataset.id;
      
      // Find the actions section or create one
      let actionsSection = item.querySelector('.snippet-actions');
      if (!actionsSection) {
        actionsSection = document.createElement('div');
        actionsSection.className = 'snippet-actions';
        item.appendChild(actionsSection);
      }
      
      actionsSection.appendChild(reminderBtn);
      
      // Add event listener
      reminderBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering snippet selection
        setReminderForSnippet(item.dataset.id);
      });
    }
  });
}

// Function to set reminder
function setReminderForSnippet(snippetId) {
  // Find snippet details
  const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
  const snippet = snippets.find(s => s.id === snippetId);
  
  if (!snippet) {
    showMessage('Snippet not found', true);
    return;
  }
  
  // Prompt for time
  const minutes = prompt('Set reminder in minutes:', '30');
  
  if (minutes && !isNaN(minutes)) {
    const snippetName = snippet.name || `Snippet ${snippet.language}`;
    
    NotificationManager.scheduleNotification(
      'Snippet Reminder',
      `Don't forget to work on "${snippetName}"`,
      parseInt(minutes)
    );
  }
}
    }

    // Update your snippet rendering function that creates the snippet list items

    // Delete snippet
    function deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            let snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
            snippets = snippets.filter(s => s.id !== id);
            localStorage.setItem('snippets', JSON.stringify(snippets));

            if (currentSnippetId === id) {
                currentSnippetId = null;
                codeEditor.value = '';
                saveBtn.textContent = 'Save Snippet';
            }

            displaySnippets();
            showMessage('Snippet deleted!');
        }
    }

    // Show status message
    function showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    // Highlight selected snippet
    function highlightSelectedSnippet(id) {
        document.querySelectorAll('.snippet-item').forEach((item) => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    }

    // Event listeners
    saveBtn.addEventListener('click', saveSnippet);

    newSnippetBtn.addEventListener('click', () => {
        currentSnippetId = null;
        codeEditor.value = '';
        languageSelect.value = 'javascript';
        saveBtn.textContent = 'Save Snippet';
        highlightSelectedSnippet(null);
    });

    // Initial load
    displaySnippets();
});
// Add to your existing JavaScript
function updatePreview() {
    const code = codeEditor.value;
    const language = languageSelect.value;

    const previewDiv = document.getElementById('codePreview');
    previewDiv.innerHTML = `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;

    // Apply highlighting
    hljs.highlightElement(previewDiv.querySelector('code'));
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add to your event listeners
codeEditor.addEventListener('input', updatePreview);
languageSelect.addEventListener('change', updatePreview);

// Call after loading a snippet
function loadSnippet(id) {
    // ... existing loadSnippet code ...
    updatePreview();
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    if (navigator.onLine) {
        statusElement.innerHTML = "🟢 Online";
        statusElement.style.backgroundColor = "#f1fff0";
    } else {
        statusElement.innerHTML = "🔴 Offline";
        statusElement.style.backgroundColor = "#fff0f0";
    }
}

// Update status when online/offline events occur
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Initial check
document.addEventListener('DOMContentLoaded', updateConnectionStatus);

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the prompt
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show the install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.style.display = 'block';

        installButton.addEventListener('click', () => {
            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the installation');
                    installButton.style.display = 'none';
                }
                deferredPrompt = null;
            });
        });
    }
});

// Hide button when app is installed
window.addEventListener('appinstalled', () => {
    console.log('Application installed');
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.style.display = 'none';
    }
});

// Handle files opened with the app
if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
    window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) {
            return;
        }

        // Handle each file
        for (const fileHandle of launchParams.files) {
            try {
                const file = await fileHandle.getFile();
                const content = await file.text();

                // Create a new snippet from the file
                createSnippetFromFile({
                    name: file.name,
                    language: detectLanguage(file.name),
                    code: content
                });
            } catch (error) {
                console.error('Error handling file:', error);
                showError('Failed to open file. ' + error.message);
            }
        }
    });
}

// Detect language based on file extension
function detectLanguage(filename) {
    const extension = filename.split('.').pop().toLowerCase();

    const extensionMap = {
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'py': 'python',
        'java': 'java',
        'php': 'php',
        'rb': 'ruby',
        'md': 'markdown',
        'json': 'json',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'bash',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'ts': 'typescript'
    };

    return extensionMap[extension] || 'plaintext';
}

// Create snippet from file content
function createSnippetFromFile({ name, language, code }) {
    // Set editor values
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');

    if (codeEditor && languageSelect) {
        // Set values
        codeEditor.value = code;

        // Try to set the language if supported
        if (Array.from(languageSelect.options).some(opt => opt.value === language)) {
            languageSelect.value = language;
        }

        // Update UI
        if (typeof updatePreview === 'function') {
            updatePreview();
        }

        // Show success message
        showMessage(`Opened file: ${name}`);
    }
}

// Handle protocol invocation
document.addEventListener('DOMContentLoaded', () => {
    
    // Check if we were launched via protocol
    const urlParams = new URLSearchParams(window.location.search);
    const snippetId = urlParams.get('snippet');

    if (snippetId) {
        // Try to load the snippet by ID
        loadSnippetById(snippetId);
    }

    // Handle the "new" parameter
    if (urlParams.has('new') && urlParams.get('new') === 'true') {
        // Create a new snippet
        document.getElementById('newSnippetBtn')?.click();
    }

    // Handle the "filter" parameter
    if (urlParams.has('filter')) {
        const filter = urlParams.get('filter');
        if (filter === 'recent') {
            displayRecentSnippets();
        }
    }
});

// Register application-specific keyboard shortcuts
function registerAppShortcuts() {
  // Make sure keyboard manager is loaded
  if (!window.KeyboardManager) {
    console.error('Keyboard Manager not loaded');
    return;
  }
  
  // Load file with Ctrl+O
  KeyboardManager.registerShortcut('loadFile', {
    key: 'o',
    ctrl: true, 
    description: 'Load file from disk',
    handler: () => {
      if (window.FileSystem && typeof FileSystem.loadFromFile === 'function') {
        FileSystem.loadFromFile({
          onSuccess: (file) => {
            showMessage(`Loaded ${file.name}`);
          },
          onError: (error) => {
            showMessage(`Error loading file: ${error}`, true);
          }
        });
      }
    }
  });
  
  // Save file with Ctrl+S
  KeyboardManager.registerShortcut('saveFile', {
    key: 's',
    ctrl: true,
    shift: true,
    description: 'Save to file',
    handler: () => {
      if (window.FileSystem && typeof FileSystem.saveToFile === 'function') {
        // Get current editor content
        const editor = document.getElementById('codeEditor');
        const language = document.getElementById('languageSelect')?.value || 'javascript';
        
        if (editor) {
          FileSystem.saveToFile({
            content: editor.value,
            language: language,
            onSuccess: (filename) => {
              showMessage(`Saved to ${filename}`);
            },
            onError: (error) => {
              showMessage(`Error saving file: ${error}`, true);
            }
          });
        }
      }
    }
  });
}

// Call during initialization
document.addEventListener('DOMContentLoaded', () => {
  // Register app-specific shortcuts
  registerAppShortcuts();
});

// Function to load snippet by ID
function loadSnippetById(id) {
    // Get snippets from localStorage
    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

    // Find the snippet
    const snippet = snippets.find(s => s.id === id);

    if (snippet) {
        // Load it into the editor
        loadSnippet(id);
    } else {
        showError(`Snippet not found: ${id}`);
    }
}

// Display recent snippets
function displayRecentSnippets() {
    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

    // Sort by last modified date, newest first
    const recentSnippets = [...snippets].sort((a, b) => {
        return new Date(b.lastModified) - new Date(a.lastModified);
    }).slice(0, 5); // Get top 5

    // Highlight these in the UI
    // This depends on your specific UI implementation
    highlightSnippets(recentSnippets.map(s => s.id));
}

// Highlight snippets in the list
function highlightSnippets(ids) {
    document.querySelectorAll('.snippet-item').forEach(item => {
        if (ids.includes(item.dataset.id)) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}
