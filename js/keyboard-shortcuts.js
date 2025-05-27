const KeyboardManager = {
	// Registrerede tastaturgenveje
	shortcuts: {},

	// Hjælpedialog tilstand
	helpDialogVisible: false,

	// Initialisering
	init() {
		console.log('Keyboard Manager initialized');

		// Opsæt globale tastaturlyttere
		this.setupListeners();

		// Registrer standard genveje
		this.registerDefaultShortcuts();

		// Opret hjælpedialog
		this.createHelpDialog();
	},

	/**
	 * Opsætter tastatur event lytters
	 */
	setupListeners() {
		// Global keydown håndterer
		document.addEventListener('keydown', e => this.handleKeyPress(e));
	},

	/**
	 * Registrerer en tastaturgenvej
	 * @param {string} id - Genvejs identifikator
	 * @param {Object} shortcut - Genvejs konfiguration
	 */
	registerShortcut(id, shortcut) {
		this.shortcuts[id] = {
			key: shortcut.key,
			ctrl: shortcut.ctrl || false,
			shift: shortcut.shift || false,
			alt: shortcut.alt || false,
			description: shortcut.description || '',
			handler: shortcut.handler,
			showIndicator: shortcut.showIndicator !== false,
		};

		// Opdater hjælpedialog hvis den findes
		this.updateHelpDialog();
	},

	/**
	 * Registrerer standard applikations genveje
	 */
	registerDefaultShortcuts() {
		// Vis hjælpedialog
		this.registerShortcut('showHelp', {
			key: 'F1',
			description: 'Vis tastaturgenveje hjælp',
			handler: () => this.toggleHelpDialog(),
			showIndicator: true,
		});

		// Gem snippet
		this.registerShortcut('saveSnippet', {
			key: 's',
			ctrl: true,
			description: 'Gem nuværende snippet',
			handler: () => {
				// Kald app's gem funktion hvis tilgængelig
				if (typeof saveSnippet === 'function') {
					saveSnippet();
				}
			},
		});

		// Ny snippet
		this.registerShortcut('newSnippet', {
			key: 'n',
			ctrl: true,
			description: 'Opret ny snippet',
			handler: () => {
				// Enten kald funktionen eller klik på knappen
				if (typeof createNewSnippet === 'function') {
					createNewSnippet();
				} else {
					const newBtn = document.getElementById('newSnippetBtn');
					if (newBtn) newBtn.click();
				}
			},
		});

		// Skift fuldskærms tilstand
		this.registerShortcut('toggleFullscreen', {
			key: 'f',
			ctrl: true,
			shift: true,
			description: 'Skift fuldskærms tilstand',
			handler: () => this.toggleFullscreen(),
		});

		// Luk dialogs med Escape
		this.registerShortcut('closeDialogs', {
			key: 'Escape',
			description: 'Luk dialogs',
			handler: () => this.closeAllDialogs(),
			showIndicator: false,
		});
	},

	/**
	 * Håndterer tastatur events
	 * @param {KeyboardEvent} e - Tastatur event
	 */
	handleKeyPress(e) {
		// Spring over hvis i tekstfelter medmindre det er en global genvej
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && e.key !== 'F1' && e.key !== 'Escape') {
			return;
		}

		// Tjek hver registreret genvej
		for (const id in this.shortcuts) {
			const shortcut = this.shortcuts[id];

			// Tjek om genvejen matcher
			if (this.matchesShortcut(e, shortcut)) {
				e.preventDefault();

				// Vis indikator hvis aktiveret
				if (shortcut.showIndicator) {
					this.showShortcutIndicator(shortcut);
				}

				// Kald håndterer
				shortcut.handler();
				return;
			}
		}
	},

	/**
	 * Tjekker om event matcher genvej
	 * @param {KeyboardEvent} e - Tastatur event
	 * @param {Object} shortcut - Genvej at tjekke
	 * @returns {boolean} Om eventet matcher genvejen
	 */
	matchesShortcut(e, shortcut) {
		return (
			e.key.toLowerCase() === shortcut.key.toLowerCase() &&
			e.ctrlKey === shortcut.ctrl &&
			e.shiftKey === shortcut.shift &&
			e.altKey === shortcut.alt
		);
	},

	/**
	 * Viser visuel indikator for udført genvej
	 * @param {Object} shortcut - Udført genvej
	 */
	showShortcutIndicator(shortcut) {
		// Opret eller hent indikator element
		let indicator = document.getElementById('shortcut-indicator');
		if (!indicator) {
			indicator = document.createElement('div');
			indicator.id = 'shortcut-indicator';
			document.body.appendChild(indicator);
		}

		// Formater genvejstaster til visning
		let keysText = '';
		if (shortcut.ctrl) keysText += '<span class="key">Ctrl</span> + ';
		if (shortcut.shift) keysText += '<span class="key">Shift</span> + ';
		if (shortcut.alt) keysText += '<span class="key">Alt</span> + ';
		keysText += `<span class="key">${shortcut.key}</span>`;

		// Sæt indhold
		indicator.innerHTML = `
      <div class="shortcut-keys">${keysText}</div>
      <div class="shortcut-description">${shortcut.description}</div>
    `;

		// Vis indikator
		indicator.classList.add('visible');

		// Skjul efter forsinkelse
		setTimeout(() => {
			indicator.classList.remove('visible');
		}, 2000);
	},

	/**
	 * Opretter tastaturgenvej hjælpedialog
	 */
	createHelpDialog() {
		// Tjek om dialog allerede findes
		if (document.getElementById('keyboard-help-dialog')) {
			return;
		}

		// Opret dialog
		const dialog = document.createElement('div');
		dialog.id = 'keyboard-help-dialog';
		dialog.className = 'dialog';
		dialog.innerHTML = `
      <div class="dialog-header">
        <h3>Tastaturgenveje</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="dialog-content">
        <table class="shortcut-table" id="shortcuts-table">
          <tbody></tbody>
        </table>
      </div>
    `;

		// Tilføj til body
		document.body.appendChild(dialog);

		// Tilføj event lytters til luk knap
		dialog.querySelector('.close-btn').addEventListener('click', () => {
			this.toggleHelpDialog();
		});

		// Opdater med registrerede genveje
		this.updateHelpDialog();
	},

	/**
	 * Opdaterer hjælpedialog med registrerede genveje
	 */
	updateHelpDialog() {
		const table = document.querySelector('#shortcuts-table tbody');
		if (!table) return;

		// Ryd eksisterende rækker
		table.innerHTML = '';

		// Tilføj genveje
		for (const id in this.shortcuts) {
			const shortcut = this.shortcuts[id];

			// Formater taster til visning
			let keysHtml = '';
			if (shortcut.ctrl) keysHtml += '<span class="key">Ctrl</span> + ';
			if (shortcut.shift) keysHtml += '<span class="key">Shift</span> + ';
			if (shortcut.alt) keysHtml += '<span class="key">Alt</span> + ';
			keysHtml += `<span class="key">${shortcut.key}</span>`;

			// Opret række
			const row = document.createElement('tr');
			row.innerHTML = `
        <td>${keysHtml}</td>
        <td>${shortcut.description}</td>
      `;

			table.appendChild(row);
		}
	},

	/**
	 * Skifter hjælpedialog synlighed
	 */
	toggleHelpDialog() {
		const dialog = document.getElementById('keyboard-help-dialog');
		if (!dialog) return;

		if (this.helpDialogVisible) {
			dialog.style.display = 'none';
			this.helpDialogVisible = false;
		} else {
			dialog.style.display = 'block';
			this.helpDialogVisible = true;
		}
	},

	/**
	 * Lukker alle dialogs
	 */
	closeAllDialogs() {
		// Luk hjælpedialog hvis åben
		if (this.helpDialogVisible) {
			this.toggleHelpDialog();
		}

		// Luk andre dialogs med .dialog klasse
		document.querySelectorAll('.dialog').forEach(dialog => {
			if (dialog.id !== 'keyboard-help-dialog' && dialog.style.display !== 'none') {
				dialog.style.display = 'none';
			}
		});
	},

	/**
	 * Skifter fuldskærms tilstand
	 */
	toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
	},
};

// Initialiser ved indlæsning
document.addEventListener('DOMContentLoaded', () => {
	KeyboardManager.init();
});

// Gør det tilgængeligt globalt
window.KeyboardManager = KeyboardManager;
