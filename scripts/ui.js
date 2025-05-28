// SnippetUI modul: Håndterer brugergrænseflade for snippets
const SnippetUI = {
    // Gemmer referencer til DOM-elementer
    elements: {
        codeEditor: document.getElementById('codeEditor'),
        languageSelect: document.getElementById('languageSelect'),
        saveBtn: document.getElementById('saveBtn'),
        newSnippetBtn: document.getElementById('newSnippetBtn'),
        snippetList: document.getElementById('snippetList')
    },
    
    // Holder styr på nuværende valgte snippet
    currentSnippetId: null,
    
    // Initialiserer UI
    init: async function() {
        // Sætter event listeners
        this.elements.saveBtn.addEventListener('click', this.handlers.saveButtonClick);
        this.elements.newSnippetBtn.addEventListener('click', this.handlers.newButtonClick);
        
        // Viser eksisterende snippets
        await this.renderSnippets();
    },
    
    // Viser alle snippets med synkroniseringsstatus
    renderSnippets: async function() {
        try {
            const snippets = await SnippetStorage.getAll();
            const snippetList = this.elements.snippetList;
            
            snippetList.innerHTML = snippets.map(snippet => {
                // Bestemmer statusikon og klasse
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
                
                let statusTitle = '';
                if (statusClass === 'pending') {
                    statusTitle = 'Afventer synkronisering';
                } else if (statusClass === 'error') {
                    statusTitle = 'Synkronisering fejlede';
                } else {
                    statusTitle = 'Synkroniseret';
                }
                return `
                    <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" 
                         data-id="${snippet.id}">
                        <div class="snippet-info">
                            <div class="snippet-header">
                                <strong>${snippet.language}</strong>
                                <span class="category-tag">${snippet.category || 'General'}</span>
                                <span class="snippet-sync-status ${statusClass}" 
                                      title="${statusTitle}">
                                    ${statusIcon}
                                </span>
                            </div>
                            <div class="snippet-dates">
                                <small>Oprettet: ${new Date(snippet.created).toLocaleDateString()}</small>
                                <small>Ændret: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                                ${snippet.syncStatus === 'pending' ? 
                                    '<small class="sync-message">Synkroniseres når du er online</small>' : ''}
                            </div>
                        </div>
                        <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                        <div class="snippet-actions">
                            <button class="delete-btn" data-id="${snippet.id}">Slet</button>
                            ${snippet.syncStatus === 'pending' && navigator.onLine ? 
                                '<button class="sync-item-btn" data-id="' + snippet.id + '">Synk nu</button>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Tilføjer event listeners
            this.addSnippetEventListeners();
            
        } catch (error) {
            console.error('Fejl ved visning af snippets:', error);
            this.showMessage('Kunne ikke indlæse snippets', true);
        }
    },
    
    // Tilføjer event listeners til snippet-elementer
    addSnippetEventListeners: function() {
        // Funktion til når man trykker på en snippet
        this.elements.snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn') && !e.target.matches('.sync-item-btn')) {
                    const id = item.dataset.id;
                    this.handlers.snippetItemClick(id);
                }
            });
        });
        
        // Slet funktion for de enkelte snippets
        this.elements.snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.handlers.deleteButtonClick(id);
            });
        });
        
        // Synkroniserings funktion for de enkelte snippets
        this.elements.snippetList.querySelectorAll('.sync-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.handlers.syncItemButtonClick(id);
            });
        });
    },
    
    // Viser statusbesked i UI
    showMessage: function(text, isError = false) {
        const message = document.createElement('div');
        message.className = `status-message ${isError ? 'error' : ''}`;
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    },
    
    // Fremhæver valgt snippet
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
                    // Opdaterer eksisterende snippet
                    const existingSnippet = await SnippetStorage.getById(SnippetUI.currentSnippetId);
                    if (existingSnippet) {
                        snippet.id = SnippetUI.currentSnippetId;
                        snippet.created = existingSnippet.created;
                    }
                }
                
                await SnippetStorage.save(snippet);
                
                // Hvis det var en ny snippet, opdater currentSnippetId
                if (!SnippetUI.currentSnippetId) {
                    SnippetUI.currentSnippetId = snippet.id;
                }
                
                // Opdaterer UI
                await SnippetUI.renderSnippets();
                SnippetUI.showMessage('Snippet gemt!');
                
            } catch (error) {
                console.error('Fejl ved gemning af snippet:', error);
                SnippetUI.showMessage('Kunne ikke gemme snippet', true);
            }
        },
        
        newButtonClick: function() {
            SnippetUI.currentSnippetId = null;
            SnippetUI.elements.codeEditor.value = '';
            SnippetUI.elements.languageSelect.value = 'javascript';
            SnippetUI.elements.saveBtn.textContent = 'Gem snippet';
            SnippetUI.highlightSelectedSnippet(null);
        },
        
        snippetItemClick: async function(id) {
            try {
                const snippet = await SnippetStorage.getById(id);
                
                if (snippet) {
                    SnippetUI.currentSnippetId = snippet.id;
                    SnippetUI.elements.codeEditor.value = snippet.code;
                    SnippetUI.elements.languageSelect.value = snippet.language;
                    
                    // Opdaterer UI
                    SnippetUI.elements.saveBtn.textContent = 'Opdater snippet';
                    SnippetUI.highlightSelectedSnippet(id);
                    
                    // Hvis der er preview-funktion
                    if (typeof updatePreview === 'function') {
                        updatePreview();
                    }
                }
                
            } catch (error) {
                console.error('Fejl ved indlæsning af snippet:', error);
                SnippetUI.showMessage('Kunne ikke indlæse snippet', true);
            }
        },
        
        deleteButtonClick: async function(id) {
            if (confirm('Er du sikker på, at du vil slette denne snippet?')) {
                try {
                    await SnippetStorage.delete(id);
                    
                    // Opdaterer UI
                    if (SnippetUI.currentSnippetId === id) {
                        SnippetUI.currentSnippetId = null;
                        SnippetUI.elements.codeEditor.value = '';
                        SnippetUI.elements.saveBtn.textContent = 'Gem snippet';
                    }
                    
                    await SnippetUI.renderSnippets();
                    SnippetUI.showMessage('Snippet slettet!');
                    
                } catch (error) {
                    console.error('Fejl ved sletning af snippet:', error);
                    SnippetUI.showMessage('Kunne ikke slette snippet', true);
                }
            }
        },
        
        syncItemButtonClick: async function(id) {
            try {
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNCING, 'Synkroniserer enkelt snippet...');
                
                const result = await SnippetStorage.syncSingleSnippet(id);
                
                if (result.success) {
                    SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_SUCCESS, 'Snippet synkroniseret');
                } else {
                    SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Kunne ikke synkronisere snippet');
                }
                
                // Opdaterer listen
                await SnippetUI.renderSnippets();
                
            } catch (error) {
                console.error('Fejl ved synkronisering af snippet:', error);
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Fejl ved synkronisering af snippet');
            }
        }
    }
};