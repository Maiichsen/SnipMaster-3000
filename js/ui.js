// Tilføj til din initialiseringskode i app.js

// Funktion til at initialisere filhåndterere
function initFileHandlers() {
	// Tjek om modulet er tilgængeligt
	if (!window.FileSystem) {
		console.error('FileSystem modul ikke indlæst');
		return;
	}

	// Hent knap
	const loadFileBtn = document.getElementById('loadFileBtn');
	if (loadFileBtn) {
		loadFileBtn.addEventListener('click', handleLoadFile);
	}

	// Vis/skjul knap baseret på browser understøttelse
	if (!FileSystem.isSupported) {
		loadFileBtn.classList.add('disabled');
		loadFileBtn.title = 'Ikke understøttet i denne browser';
	}

	// Tilføj gem fil håndterer
	const saveFileBtn = document.getElementById('saveFileBtn');
	if (saveFileBtn) {
		saveFileBtn.addEventListener('click', handleSaveFile);

		// Vis/skjul knap baseret på browser understøttelse
		if (!FileSystem.isSupported) {
			saveFileBtn.classList.add('disabled');
			saveFileBtn.title = 'Ikke understøttet i denne browser';
		}
	}

	// Initialiser filhåndterere
	if (FileSystem.initFileHandlers) {
		FileSystem.initFileHandlers();
	}

	// Lyt efter fil åbningsbegivenheder
	window.addEventListener('file-system:file-opened', event => {
		const fileData = event.detail;

		// Opret nyt snippet
		document.getElementById('newSnippetBtn').click();

		// Indstil editor indhold
		const codeEditor = document.getElementById('codeEditor');
		const languageSelect = document.getElementById('languageSelect');

		if (codeEditor && languageSelect) {
			codeEditor.value = fileData.content;

			// Indstil sprog hvis det findes i vores muligheder
			if (Array.from(languageSelect.options).some(opt => opt.value === fileData.language)) {
				languageSelect.value = fileData.language;
			}

			// Opdater forhåndsvisning hvis funktionen findes
			if (typeof updatePreview === 'function') {
				updatePreview();
			}

			showMessage(`Åbnet ${fileData.name} succesfuldt!`);
		}
	});

	// Lyt efter fejl
	window.addEventListener('file-system:error', event => {
		showMessage(`Fejl: ${event.detail.message}`, true);
	});
}

// Håndterer for indlæs fil knap
function handleLoadFile() {
	FileSystem.loadFromFile({
		onSuccess: fileData => {
			// Opdater editoren med filindhold
			const codeEditor = document.getElementById('codeEditor');
			const languageSelect = document.getElementById('languageSelect');

			if (codeEditor && languageSelect) {
				// Opret nyt snippet
				document.getElementById('newSnippetBtn').click();

				// Indstil editor indhold
				codeEditor.value = fileData.content;

				// Indstil sprog hvis det findes i vores muligheder
				if (Array.from(languageSelect.options).some(opt => opt.value === fileData.language)) {
					languageSelect.value = fileData.language;
				}

				// Opdater forhåndsvisning hvis funktionen findes
				if (typeof updatePreview === 'function') {
					updatePreview();
				}

				// Vis succesbesked
				showMessage(`Indlæst ${fileData.name} succesfuldt!`);
			}
		},
		onError: error => {
			showMessage(`Fejl: ${error}`, true);
		},
	});
}

// Håndterer for gem fil knap
function handleSaveFile() {
	const codeEditor = document.getElementById('codeEditor');
	const languageSelect = document.getElementById('languageSelect');

	if (!codeEditor || !languageSelect) {
		showMessage('Editor ikke fundet', true);
		return;
	}

	const content = codeEditor.value;
	const language = languageSelect.value;

	// Generer foreslået navn
	let suggestedName = 'snippet';

	// Hvis vi har et nuværende snippet, brug dets navn
	if (typeof currentSnippetId !== 'undefined') {
		const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
		const currentSnippet = snippets.find(s => s.id === currentSnippetId);
		if (currentSnippet && currentSnippet.name) {
			suggestedName = currentSnippet.name;
		}
	}

	// Tilføj filendelse baseret på sprog
	const languageToExtension = {
		javascript: '.js',
		html: '.html',
		css: '.css',
		plaintext: '.txt',
	};

	const extension = languageToExtension[language] || '.txt';

	// Hvis navnet ikke allerede har filendelsen, tilføj den
	if (!suggestedName.endsWith(extension)) {
		suggestedName += extension;
	}

	FileSystem.saveToFile({
		content,
		language,
		suggestedName,
		onSuccess: fileName => {
			showMessage(`Gemt til ${fileName} succesfuldt!`);
		},
		onError: error => {
			showMessage(`Fejl: ${error}`, true);
		},
	});
}

// Kald under initialisering
document.addEventListener('DOMContentLoaded', initFileHandlers);
