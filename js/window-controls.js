/**
 * window-controls.js - Håndterer vindue kontrol og visningstilstand funktioner
 */

const WindowManager = {
	// Nuværende visningstilstand
	displayMode: 'browser',

	// Wake lock instans
	wakeLock: null,

	// Initialisering
	init() {
		console.log('Window Manager initialized');

		// Tjek initial visningstilstand
		this.detectDisplayMode();

		// Tjek for vindue kontrol overlay
		this.checkWindowControlsOverlay();

		// Opsæt event lytters
		this.setupEventListeners();

		// Tilføj UI kontroller hvis nødvendigt
		this.setupUI();
	},

	/**
	 * Opsætter event lytters
	 */
	setupEventListeners() {
		// Lyt efter visningstilstand ændringer
		window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
			this.detectDisplayMode();
		});

		// Lyt efter vindue kontrol overlay ændringer
		if ('windowControlsOverlay' in navigator) {
			navigator.windowControlsOverlay.addEventListener('geometrychange', () => this.checkWindowControlsOverlay());
		}

		// Lyt efter online/offline events
		window.addEventListener('online', () => this.updateConnectionStatus());
		window.addEventListener('offline', () => this.updateConnectionStatus());

		// Lyt efter app installation
		window.addEventListener('appinstalled', () => {
			this.showStatusMessage('App installeret succesfuldt!');

			// Tjek visningstilstand efter kort forsinkelse
			setTimeout(() => this.detectDisplayMode(), 1000);
		});
	},

	/**
	 * Tilføjer UI elementer til vindue kontroller
	 */
	setupUI() {
		// Tilføj visningstilstand indikator
		this.addDisplayModeIndicator();

		// Tilføj wake lock knap hvis understøttet
		if ('wakeLock' in navigator) {
			this.addWakeLockButton();
		}
	},

	/**
	 * Tilføjer visningstilstand indikator til UI
	 */
	addDisplayModeIndicator() {
		// Opret eller hent status bar
		let statusBar = document.querySelector('.status-bar');
		if (!statusBar) {
			statusBar = document.createElement('div');
			statusBar.className = 'status-bar';
			document.body.appendChild(statusBar);
		}

		// Tilføj visningstilstand indikator
		const displayModeIndicator = document.createElement('div');
		displayModeIndicator.id = 'display-mode-indicator';
		displayModeIndicator.className = 'status-indicator';
		displayModeIndicator.textContent = `Tilstand: ${this.displayMode}`;

		statusBar.appendChild(displayModeIndicator);
	},

	/**
	 * Tilføjer wake lock knap
	 */
	addWakeLockButton() {
		// Find værktøjslinje
		const toolbar = document.querySelector('.toolbar') || document.querySelector('.app-header');
		if (!toolbar) return;

		// Opret knap
		const wakeLockBtn = document.createElement('button');
		wakeLockBtn.id = 'wake-lock-btn';
		wakeLockBtn.className = 'action-button';
		wakeLockBtn.title = 'Hold skærm tændt';
		wakeLockBtn.innerHTML = '<span class="icon">👁️</span>';

		// Tilføj til værktøjslinje
		toolbar.appendChild(wakeLockBtn);

		// Tilføj klik lytters
		wakeLockBtn.addEventListener('click', () => this.toggleWakeLock());
	},

	/**
	 * Detekterer nuværende visningstilstand
	 */
	detectDisplayMode() {
		let newMode = 'browser';

		// Tjek forskellige visningstilstande
		if (window.matchMedia('(display-mode: standalone)').matches) {
			newMode = 'standalone';
		} else if (window.matchMedia('(display-mode: fullscreen)').matches) {
			newMode = 'fullscreen';
		} else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
			newMode = 'minimal-ui';
		} else if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
			newMode = 'window-controls-overlay';
		}

		// Opdater hvis ændret
		if (newMode !== this.displayMode) {
			this.displayMode = newMode;

			// Opdater UI
			this.updateDisplayModeUI();

			// Log ændring
			console.log('Display mode changed:', this.displayMode);
		}

		return this.displayMode;
	},

	/**
	 * Opdaterer UI for at afspejle nuværende visningstilstand
	 */
	updateDisplayModeUI() {
		// Tilføj visningstilstand attribut til body
		document.body.setAttribute('data-display-mode', this.displayMode);

		// Opdater indikator hvis den findes
		const indicator = document.getElementById('display-mode-indicator');
		if (indicator) {
			indicator.textContent = `Tilstand: ${this.displayMode}`;
		}

		// Vis besked om tilstandsændring
		this.showStatusMessage(`Visningstilstand: ${this.displayMode}`);
	},

	/**
	 * Tjekker om vindue kontrol overlay er tilgængelig og synlig
	 */
	checkWindowControlsOverlay() {
		if ('windowControlsOverlay' in navigator) {
			const wco = navigator.windowControlsOverlay;

			// Opdater body klasse baseret på WCO synlighed
			document.body.classList.toggle('wco-visible', wco.visible);

			if (wco.visible) {
				console.log('Window Controls Overlay is visible');
				console.log('Title bar area:', {
					x: wco.getTitlebarAreaRect().x,
					y: wco.getTitlebarAreaRect().y,
					width: wco.getTitlebarAreaRect().width,
					height: wco.getTitlebarAreaRect().height,
				});

				// Juster UI for WCO når synlig
				this.adjustUIForWCO(true);
			} else {
				// Nulstil UI når WCO ikke er synlig
				this.adjustUIForWCO(false);
			}

			return wco.visible;
		}

		return false;
	},

	/**
	 * Justerer UI for Window Controls Overlay
	 * @param {boolean} isVisible - Om WCO er synlig
	 */
	adjustUIForWCO(isVisible) {
		// Denne funktion bør tilpasses baseret på din app's UI
		// Eksempel: juster header layout
		const header = document.querySelector('.app-header');
		if (header) {
			if (isVisible) {
				// Hent titel bar rektangel
				const rect = navigator.windowControlsOverlay.getTitlebarAreaRect();

				// Style header til at passe i titel bar område
				header.style.position = 'fixed';
				header.style.left = `${rect.x}px`;
				header.style.top = `${rect.y}px`;
				header.style.width = `${rect.width}px`;
				header.style.height = `${rect.height}px`;
			} else {
				// Nulstil styles
				header.style.position = '';
				header.style.left = '';
				header.style.top = '';
				header.style.width = '';
				header.style.height = '';
			}
		}
	},

	/**
	 * Skifter skærm wake lock
	 */
	async toggleWakeLock() {
		// Hvis wake lock ikke understøttes, vis besked og afslut
		if (!('wakeLock' in navigator)) {
			this.showStatusMessage('Wake Lock ikke understøttet i denne browser', true);
			return false;
		}

		try {
			if (this.wakeLock) {
				// Frigør wake lock
				await this.wakeLock.release();
				this.wakeLock = null;

				// Opdater UI
				document.getElementById('wake-lock-btn')?.classList.remove('active');
				this.showStatusMessage('Skærm kan nu time out normalt');
			} else {
				// Anmod om wake lock
				this.wakeLock = await navigator.wakeLock.request('screen');

				// Opdater UI
				document.getElementById('wake-lock-btn')?.classList.add('active');
				this.showStatusMessage('Skærm forbliver tændt mens app er åben');

				// Tilføj frigør lytters
				this.wakeLock.addEventListener('release', () => {
					// Opdater UI når wake lock frigøres
					document.getElementById('wake-lock-btn')?.classList.remove('active');
					this.wakeLock = null;
				});
			}

			return true;
		} catch (error) {
			console.error('Wake lock error:', error);
			this.showStatusMessage('Kunne ikke skifte wake lock: ' + error.message, true);
			return false;
		}
	},

	/**
	 * Opdaterer forbindelses status indikator
	 */
	updateConnectionStatus() {
		// Opret status element hvis det ikke findes
		let statusElement = document.getElementById('connection-status');
		if (!statusElement) {
			statusElement = document.createElement('div');
			statusElement.id = 'connection-status';
			statusElement.className = 'status-indicator';

			const statusBar = document.querySelector('.status-bar');
			if (statusBar) {
				statusBar.appendChild(statusElement);
			} else {
				// Opret status bar hvis den ikke findes
				const newStatusBar = document.createElement('div');
				newStatusBar.className = 'status-bar';
				newStatusBar.appendChild(statusElement);
				document.body.appendChild(newStatusBar);
			}
		}

		// Opdater status
		if (navigator.onLine) {
			statusElement.innerHTML = '🟢 Online';
			statusElement.classList.remove('offline');
			statusElement.classList.add('online');
		} else {
			statusElement.innerHTML = '🔴 Offline';
			statusElement.classList.remove('online');
			statusElement.classList.add('offline');
		}
	},

	/**
	 * Viser status besked
	 * @param {string} message - Besked at vise
	 * @param {boolean} isError - Om dette er en fejlbesked
	 */
	showStatusMessage(message, isError = false) {
		// Brug app's status besked funktion hvis tilgængelig
		if (typeof showMessage === 'function') {
			showMessage(message, isError);
		} else {
			console.log(message);
		}
	},
};

// Initialiser ved indlæsning
document.addEventListener('DOMContentLoaded', () => {
	WindowManager.init();
});

// Gør det tilgængeligt globalt
window.WindowManager = WindowManager;
