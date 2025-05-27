// Fælles funktion til at vise statusbeskeder for alle moduler
function showMessage(message, isError = false) {
	// Opret eller hent statusbeskeds-element
	let statusElement = document.getElementById('status-message');
	if (!statusElement) {
		statusElement = document.createElement('div');
		statusElement.id = 'status-message';
		document.body.appendChild(statusElement);
	}

	// Indstil beskedtekst og klasse
	statusElement.textContent = message;
	statusElement.className = isError ? 'error' : '';

	// Vis beskeden
	statusElement.style.display = 'block';

	// Ryd eventuelle eksisterende timeouts
	if (statusElement.timeout) {
		clearTimeout(statusElement.timeout);
	}

	// Skjul automatisk efter forsinkelse
	statusElement.timeout = setTimeout(() => {
		statusElement.style.display = 'none';
	}, 3000);
}

// Gør funktionen tilgængelig globalt
window.showMessage = showMessage;

// Registrer Service Worker for offline funktionalitet
function updateCaches() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistration().then(registration => {
			if (registration) {
				// Tving service worker til at opdatere
				registration.update();
			}
		});
	}
}

// Tilføj en opdateringsknap til app UI hvis ønsket
const refreshButton = document.getElementById('refresh-app');
if (refreshButton) {
	refreshButton.addEventListener('click', updateCaches);
}

// Funktion til at registrere Service Worker for offline funktionalitet og caching
function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker
				.register('/sw.js')
				.then(registration => {
					console.log('ServiceWorker registrering succesfuld med scope:', registration.scope);

					// Valgfrit: Tilføj UI indikator
					showServiceWorkerStatus('Service Worker registreret succesfuldt!');
				})
				.catch(error => {
					console.error('ServiceWorker registrering fejlede:', error);

					// Valgfrit: Tilføj UI indikator
					showServiceWorkerStatus('Service Worker registrering fejlede!', true);
				});
		});
	} else {
		console.log('Service Workers understøttes ikke i denne browser.');
		showServiceWorkerStatus('Service Workers understøttes ikke i denne browser.', true);
	}
}

// Funktion til at vise Service Worker status i brugergrænsefladen
function showServiceWorkerStatus(message, isError = false) {
	// Opret status element hvis det ikke findes
	let statusElement = document.getElementById('sw-status');
	if (!statusElement) {
		statusElement = document.createElement('div');
		statusElement.id = 'sw-status';
		document.body.appendChild(statusElement);
	}

	// Stil baseret på status
	statusElement.className = isError ? 'sw-status error' : 'sw-status success';
	statusElement.textContent = message;

	// Skjul automatisk efter 3 sekunder
	setTimeout(() => {
		statusElement.style.opacity = '0';
	}, 3000);
}

// Kald registreringsfunktionen
registerServiceWorker();

// Initialiser applikationen når DOM'en er indlæst
document.addEventListener('DOMContentLoaded', () => {
	// Hent DOM elementer til brug i applikationen
	const codeEditor = document.getElementById('codeEditor');
	const languageSelect = document.getElementById('languageSelect');
	const saveBtn = document.getElementById('saveBtn');
	const newSnippetBtn = document.getElementById('newSnippetBtn');
	const snippetList = document.getElementById('snippetList');

	// Hold styr på det aktuelle snippet der redigeres
	let currentSnippetId = null;

	// Tilføj kategorier til værktøjslinjen for bedre organisering
	const categories = ['General', 'Utils', 'Components', 'Scripts'];
	const categorySelect = document.createElement('select');
	categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
	document.querySelector('.toolbar').appendChild(categorySelect);

	// Funktion til at gemme snippets lokalt og synkronisere med server
	function saveSnippet() {
		const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
		// 1. Gem lokalt
		const snippet = {
			code: codeEditor.value,
			language: languageSelect.value,
			category: categorySelect.value || 'General',
			lastModified: new Date().toISOString(),
		};

		if (currentSnippetId) {
			// Opdater eksisterende snippet
			const index = snippets.findIndex(s => s.id === currentSnippetId);
			if (index !== -1) {
				snippet.id = currentSnippetId;
				snippet.created = snippets[index].created;
				snippets[index] = snippet;
			}
		} else {
			// Opret nyt snippet
			snippet.id = Date.now().toString();
			snippet.created = snippet.lastModified;
			snippets.push(snippet);
		}

		localStorage.setItem('snippets', JSON.stringify(snippets));
		displaySnippets();
		// 2. Vis besked
		showMessage('Snippet gemt!');

		// Efter succesfuld gemning, vis notifikation
		const snippetName = getCurrentSnippetName() || 'Snippet';

		NotificationManager.showNotification('Snippet Gemt', `Dit snippet "${snippetName}" er blevet gemt`, {
			action: 'openSnippet',
			snippetId: currentSnippetId,
		});
	}

	// Hjælpefunktion til at hente navnet på det aktuelle snippet
	function getCurrentSnippetName() {
		if (!currentSnippetId) return null;

		const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
		const currentSnippet = snippets.find(s => s.id === currentSnippetId);

		return currentSnippet ? currentSnippet.name || `Snippet ${currentSnippet.language}` : null;
	}

	// Indlæs et eksisterende snippet til redigering
	function loadSnippet(id) {
		const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
		const snippet = snippets.find(s => s.id === id);

		if (snippet) {
			currentSnippetId = snippet.id;
			codeEditor.value = snippet.code;
			languageSelect.value = snippet.language;

			// Opdater UI for at vise vi redigerer
			saveBtn.textContent = 'Opdater Snippet';
			highlightSelectedSnippet(id);
		}
	}

	// Vis alle snippets i listen med forbedret UI og interaktivitet
	function displaySnippets() {
		const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
		snippetList.innerHTML = snippets
			.map(
				snippet => `
            <div class="snippet-item ${snippet.id === currentSnippetId ? 'selected' : ''}" 
                 data-id="${snippet.id}">
                <div class="snippet-info">
                    <div class="snippet-header">
                        <strong>${snippet.language}</strong>
                        <span class="category-tag">${snippet.category}</span>
                    </div>
                    <div class="snippet-dates">
                        <small>Oprettet: ${new Date(snippet.created).toLocaleDateString()}</small>
                        <small>Ændret: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                    </div>
                </div>
                <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                <div class="snippet-actions">
                    <button class="delete-btn" data-id="${snippet.id}">Slet</button>
                </div>
            </div>
        `
			)
			.join('');

		// Tilføj klik-håndterere
		snippetList.querySelectorAll('.snippet-item').forEach(item => {
			item.addEventListener('click', e => {
				if (!e.target.matches('.delete-btn')) {
					loadSnippet(item.dataset.id);
				}
			});
		});

		// Tilføj slet-håndterere
		snippetList.querySelectorAll('.delete-btn').forEach(btn => {
			btn.addEventListener('click', e => {
				e.stopPropagation();
				deleteSnippet(btn.dataset.id);
			});
		});

		// Tilføj påmindelsesknapper til hvert snippet
		document.querySelectorAll('.snippet-item').forEach(item => {
			// Tilføj påmindelsesknap hvis den ikke allerede findes
			if (!item.querySelector('.reminder-btn')) {
				const reminderBtn = document.createElement('button');
				reminderBtn.className = 'reminder-btn';
				reminderBtn.title = 'Sæt påmindelse for dette snippet';
				reminderBtn.innerHTML = '<span class="icon">⏰</span>';
				reminderBtn.dataset.id = item.dataset.id;

				// Find actions sektionen eller opret en ny
				let actionsSection = item.querySelector('.snippet-actions');
				if (!actionsSection) {
					actionsSection = document.createElement('div');
					actionsSection.className = 'snippet-actions';
					item.appendChild(actionsSection);
				}

				actionsSection.appendChild(reminderBtn);

				// Tilføj event listener
				reminderBtn.addEventListener('click', e => {
					e.stopPropagation(); // Forhindre snippet valg
					setReminderForSnippet(item.dataset.id);
				});
			}
		});
	}

	// Funktion til at sætte påmindelser for et specifikt snippet
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

	// Slet et snippet efter bekræftelse
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

	// Vis midlertidige statusbeskeder i brugergrænsefladen
	function showMessage(text) {
		const message = document.createElement('div');
		message.className = 'status-message';
		message.textContent = text;
		document.body.appendChild(message);

		setTimeout(() => {
			message.remove();
		}, 2000);
	}

	// Fremhæv det valgte snippet i listen
	function highlightSelectedSnippet(id) {
		document.querySelectorAll('.snippet-item').forEach(item => {
			item.classList.toggle('selected', item.dataset.id === id);
		});
	}

	// Tilføj event listeners til knapper og interaktioner
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

// Opdater forhåndsvisningen af koden med syntax highlighting
function updatePreview() {
	const code = codeEditor.value;
	const language = languageSelect.value;

	const previewDiv = document.getElementById('codePreview');
	previewDiv.innerHTML = `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;

	// Apply highlighting
	hljs.highlightElement(previewDiv.querySelector('code'));
}

// Hjælpefunktion til at sikre HTML-tegn vises korrekt
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Indlæs et snippet og opdater forhåndsvisningen
function loadSnippet(id) {
	// ... existing loadSnippet code ...
	updatePreview();
}

// Opdater forbindelsesstatus og synkroniser med server hvis online
function updateConnectionStatus() {
	const statusElement = document.getElementById('connection-status');
	if (!statusElement) return;
	// 3. Hvis online, synkroniser med server
	if (navigator.onLine) {
		statusElement.innerHTML = '🟢 Online';
		statusElement.style.backgroundColor = '#f1fff0';
	} else {
		statusElement.innerHTML = '🔴 Offline';
		statusElement.style.backgroundColor = '#fff0f0';
	}
}

// Opdater status når online/offline begivenheder opstår
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Indledende tjek
document.addEventListener('DOMContentLoaded', updateConnectionStatus);

// Håndter PWA installationsprocessen
let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
	// Forhindre Chrome i automatisk at vise prompten
	e.preventDefault();

	// Gem begivenheden så den kan aktiveres senere
	deferredPrompt = e;

	// Vis installationsknappen
	const installButton = document.getElementById('install-button');
	if (installButton) {
		installButton.style.display = 'block';

		installButton.addEventListener('click', () => {
			// Vis installationsprompten
			deferredPrompt.prompt();

			// Vent på brugerens svar på prompten
			deferredPrompt.userChoice.then(choiceResult => {
				if (choiceResult.outcome === 'accepted') {
					console.log('Bruger accepterede installationen');
					installButton.style.display = 'none';
				}
				deferredPrompt = null;
			});
		});
	}
});

// Skjul knap når appen er installeret
window.addEventListener('appinstalled', () => {
	console.log('Applikation installeret');
	const installButton = document.getElementById('install-button');
	if (installButton) {
		installButton.style.display = 'none';
	}
});

// Håndter filer der åbnes med appen
if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
	window.launchQueue.setConsumer(async launchParams => {
		if (!launchParams.files.length) {
			return;
		}

		// Håndter hver fil
		for (const fileHandle of launchParams.files) {
			try {
				const file = await fileHandle.getFile();
				const content = await file.text();

				// Opret et nyt snippet fra filen
				createSnippetFromFile({
					name: file.name,
					language: detectLanguage(file.name),
					code: content,
				});
			} catch (error) {
				console.error('Fejl ved håndtering af fil:', error);
				showError('Kunne ikke åbne filen. ' + error.message);
			}
		}
	});
}

// Detekter sprog baseret på filendelse
function detectLanguage(filename) {
	const extension = filename.split('.').pop().toLowerCase();

	const extensionMap = {
		js: 'javascript',
		html: 'html',
		css: 'css',
		py: 'python',
		java: 'java',
		php: 'php',
		rb: 'ruby',
		md: 'markdown',
		json: 'json',
		xml: 'xml',
		sql: 'sql',
		sh: 'bash',
		c: 'c',
		cpp: 'cpp',
		cs: 'csharp',
		ts: 'typescript',
	};

	return extensionMap[extension] || 'plaintext';
}

// Opret snippet fra filindhold
function createSnippetFromFile({ name, language, code }) {
	// Indstil editor værdier
	const codeEditor = document.getElementById('codeEditor');
	const languageSelect = document.getElementById('languageSelect');

	if (codeEditor && languageSelect) {
		// Indstil værdier
		codeEditor.value = code;

		// Prøv at indstille sproget hvis det understøttes
		if (Array.from(languageSelect.options).some(opt => opt.value === language)) {
			languageSelect.value = language;
		}

		// Opdater brugergrænsefladen
		if (typeof updatePreview === 'function') {
			updatePreview();
		}

		// Vis succesbesked
		showMessage(`Åbnede fil: ${name}`);
	}
}

// Håndter protokol-invokation
document.addEventListener('DOMContentLoaded', () => {
	// Tjek om vi blev startet via protokol
	const urlParams = new URLSearchParams(window.location.search);
	const snippetId = urlParams.get('snippet');

	if (snippetId) {
		// Prøv at indlæse snippet efter ID
		loadSnippetById(snippetId);
	}

	// Håndter "new" parameteren
	if (urlParams.has('new') && urlParams.get('new') === 'true') {
		// Opret et nyt snippet
		document.getElementById('newSnippetBtn')?.click();
	}

	// Håndter "filter" parameteren
	if (urlParams.has('filter')) {
		const filter = urlParams.get('filter');
		if (filter === 'recent') {
			displayRecentSnippets();
		}
	}
});

// Registrer applikationsspecifikke tastaturgenveje
function registerAppShortcuts() {
	// Sørg for at tastaturmanager er indlæst
	if (!window.KeyboardManager) {
		console.error('Tastatur Manager ikke indlæst');
		return;
	}

	// Indlæs fil med Ctrl+O
	KeyboardManager.registerShortcut('loadFile', {
		key: 'o',
		ctrl: true,
		description: 'Indlæs fil fra disk',
		handler: () => {
			if (window.FileSystem && typeof FileSystem.loadFromFile === 'function') {
				FileSystem.loadFromFile({
					onSuccess: file => {
						showMessage(`Indlæst ${file.name}`);
					},
					onError: error => {
						showMessage(`Fejl ved indlæsning af fil: ${error}`, true);
					},
				});
			}
		},
	});

	// Gem fil med Ctrl+S
	KeyboardManager.registerShortcut('saveFile', {
		key: 's',
		ctrl: true,
		shift: true,
		description: 'Gem til fil',
		handler: () => {
			if (window.FileSystem && typeof FileSystem.saveToFile === 'function') {
				// Hent nuværende editor indhold
				const editor = document.getElementById('codeEditor');
				const language = document.getElementById('languageSelect')?.value || 'javascript';

				if (editor) {
					FileSystem.saveToFile({
						content: editor.value,
						language: language,
						onSuccess: filename => {
							showMessage(`Gemt til ${filename}`);
						},
						onError: error => {
							showMessage(`Fejl ved gemning af fil: ${error}`, true);
						},
					});
				}
			}
		},
	});
}

// Kald under initialisering
document.addEventListener('DOMContentLoaded', () => {
	// Registrer app-specifikke genveje
	registerAppShortcuts();
});

// Funktion til at indlæse snippet efter ID
function loadSnippetById(id) {
	// Hent snippets fra localStorage
	const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

	// Find snippet
	const snippet = snippets.find(s => s.id === id);

	if (snippet) {
		// Indlæs det i editoren
		loadSnippet(id);
	} else {
		showError(`Snippet ikke fundet: ${id}`);
	}
}

// Vis seneste snippets
function displayRecentSnippets() {
	const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

	// Sorter efter sidste ændringsdato, nyeste først
	const recentSnippets = [...snippets]
		.sort((a, b) => {
			return new Date(b.lastModified) - new Date(a.lastModified);
		})
		.slice(0, 5); // Hent top 5

	// Fremhæv disse i brugergrænsefladen
	// Dette afhænger af din specifikke UI implementering
	highlightSnippets(recentSnippets.map(s => s.id));
}

// Fremhæv snippets i listen
function highlightSnippets(ids) {
	document.querySelectorAll('.snippet-item').forEach(item => {
		if (ids.includes(item.dataset.id)) {
			item.classList.add('highlighted');
		} else {
			item.classList.remove('highlighted');
		}
	});
}
