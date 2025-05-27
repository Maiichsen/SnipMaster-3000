// fil system integration for SnipMaster 3000
//adgang til at læse og skrive filer (Load og save knapper)

// Tjekker om File System Access API er understøttet i browseren
const isFileSystemSupported = 'showOpenFilePicker' in window;

// Eksporterer vores modul funktioner
const FileSystem = {
	isSupported: isFileSystemSupported,

	// Funktion til at vise support status i brugergrænsefladen
	checkSupport() {
		if (!this.isSupported) {
			console.warn('File System Access API not supported');
			// Valgfrit: Vis UI indikation at fil system funktioner ikke er tilgængelige
		}
		return this.isSupported;
	},

	// We'll add more functions below
	// Add inside the FileSystem object

	/**
	 * Åbner en gem dialog og skriver indhold til den valgte fil
	 * @param {Object} options - Konfigurations muligheder
	 * @param {string} options.content - Indhold der skal gemmes
	 * @param {string} options.language - Sprog for indholdet
	 * @param {string} options.suggestedName - Forslag til filnavn
	 * @param {Function} options.onSuccess - Success callback funktion
	 * @param {Function} options.onError - Fejl callback funktion
	 */
	async loadFromFile(options = {}) {
		if (!this.checkSupport()) {
			if (options.onError) {
				options.onError('File System Access API not supported');
			}
			return;
		}

		try {
			// Standard filtyper hvis ikke specificeret
			const extensions = options.extensions || ['.js', '.html', '.css', '.txt'];

			// Forbereder accept objekt til fil vælgeren
			const accept = {};
			if (extensions.includes('.js')) accept['text/javascript'] = ['.js'];
			if (extensions.includes('.html')) accept['text/html'] = ['.html', '.htm'];
			if (extensions.includes('.css')) accept['text/css'] = ['.css'];
			if (extensions.includes('.txt')) accept['text/plain'] = ['.txt'];

			// Viser fil vælger dialog
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: 'Code Files',
						accept,
					},
				],
				multiple: false,
			});

			// Henter filen
			const file = await fileHandle.getFile();

			// Læser indholdet
			const content = await file.text();

			// Bestemmer sprog baseret på filendelse
			const fileName = file.name;
			const fileExtension = fileName.split('.').pop().toLowerCase();

			// Mapper filendelser til sprog muligheder
			const extensionToLanguage = {
				js: 'javascript',
				html: 'html',
				htm: 'html',
				css: 'css',
				txt: 'plaintext',
			};

			// Bestemmer sprog
			const language = extensionToLanguage[fileExtension] || 'javascript';

			// Kalder success callback med fil information
			if (options.onSuccess) {
				options.onSuccess({
					name: fileName,
					content,
					language,
					extension: fileExtension,
				});
			}

			return {
				name: fileName,
				content,
				language,
			};
		} catch (error) {
			console.error('Error loading file:', error);
			if (options.onError) {
				options.onError(error.message || 'Failed to load file');
			}
		}
	},

	// Funktion til at gemme filer
	async saveToFile(options = {}) {
		if (!this.checkSupport()) {
			if (options.onError) {
				options.onError('File System Access API not supported');
			}
			return;
		}

		try {
			// Sikrer at der er indhold at gemme
			const content = options.content || '';
			if (!content && options.onError) {
				options.onError('No content to save');
				return;
			}

			// Bestemmer filendelse baseret på sprog
			const language = options.language || 'javascript';

			// Mapper sprog til filendelse
			const languageToExtension = {
				javascript: '.js',
				html: '.html',
				css: '.css',
				plaintext: '.txt',
			};

			const extension = languageToExtension[language] || '.txt';

			// Bruger foreslået navn eller laver et standard navn
			const suggestedName = options.suggestedName || `snippet${extension}`;

			// Viser gem fil dialog
			const fileHandle = await window.showSaveFilePicker({
				suggestedName,
				types: [
					{
						description: 'Code File',
						accept: {
							'text/plain': [extension],
						},
					},
				],
			});

			// Opretter en skrivbar stream
			const writable = await fileHandle.createWritable();

			// Skriver indholdet
			await writable.write(content);

			// Lukker og gemmer
			await writable.close();

			// Kalder success callback
			if (options.onSuccess) {
				options.onSuccess(fileHandle.name || suggestedName);
			}

			return fileHandle.name || suggestedName;
		} catch (error) {
			console.error('Error saving file:', error);
			if (options.onError) {
				options.onError(error.message || 'Failed to save file');
			}
		}
	},

	/**
	 * Sætter håndterere op for filer der åbnes fra operativsystemet
	 */
	initFileHandlers() {
		if ('launchQueue' in window) {
			window.launchQueue.setConsumer(async launchParams => {
				if (!launchParams.files.length) return;

				// Henter fil håndteringen
				const fileHandle = launchParams.files[0];

				try {
					// Henter filen
					const file = await fileHandle.getFile();

					// Læser indholdet
					const content = await file.text();

					// Bestemmer sprog baseret på filendelse
					const fileName = file.name;
					const fileExtension = fileName.split('.').pop().toLowerCase();

					// Mapper filendelser til sprog muligheder (samme mapping som før)
					const extensionToLanguage = {
						js: 'javascript',
						html: 'html',
						htm: 'html',
						css: 'css',
						txt: 'plaintext',
					};

					// Udløser fil åbnet event
					const event = new CustomEvent('file-system:file-opened', {
						detail: {
							name: fileName,
							content,
							language: extensionToLanguage[fileExtension] || 'javascript',
							extension: fileExtension,
						},
					});

					window.dispatchEvent(event);
				} catch (error) {
					console.error('Error handling file:', error);
					const event = new CustomEvent('file-system:error', {
						detail: {
							message: 'Failed to open file',
							error,
						},
					});

					window.dispatchEvent(event);
				}
			});
		}
	},
};

// Gør det tilgængeligt globalt for nu
// I en produktions app ville du bruge proper imports/exports
window.FileSystem = FileSystem;
