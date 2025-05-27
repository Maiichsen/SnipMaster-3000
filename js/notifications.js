const NotificationManager = {
	// Nuværende tilladelses status
	permission: Notification.permission,

	// Gemmer planlagte notifikations timere
	scheduledNotifications: [],

	/**
	 * Initialiserer notifikations modulet
	 */
	init() {
		console.log('Notification Manager initialized');
		console.log('Current permission:', this.permission);

		// Tjek om notifikations UI elementer findes og opsæt lytters
		this.setupNotificationUI();
	},

	/**
	 * Opsætter UI elementer for notifikationer
	 */
	setupNotificationUI() {
		// Tilføj notifikations tilladelses knap hvis nødvendigt
		if (this.permission !== 'granted' && this.permission !== 'denied') {
			this.addPermissionButton();
		}
	},

	/**
	 * Tilføjer tilladelses knap til UI
	 */
	addPermissionButton() {
		// Tjek om knappen allerede findes
		if (document.getElementById('notification-permission-btn')) {
			return;
		}

		// Opret tilladelses knap
		const permissionBtn = document.createElement('button');
		permissionBtn.id = 'notification-permission-btn';
		permissionBtn.textContent = 'Aktiver notifikationer';
		permissionBtn.className = 'permission-btn';
		permissionBtn.addEventListener('click', () => this.requestPermission());

		// Tilføj til UI - juster selector baseret på din app struktur
		const targetElement = document.querySelector('.sidebar-header') || document.querySelector('.app-header');
		if (targetElement) {
			targetElement.appendChild(permissionBtn);
		}
	},

	/**
	 * Anmoder om notifikations tilladelse
	 */
	async requestPermission() {
		try {
			this.permission = await Notification.requestPermission();

			// Håndter tilladelses resultat
			if (this.permission === 'granted') {
				// Fjern tilladelses knappen
				const permissionBtn = document.getElementById('notification-permission-btn');
				if (permissionBtn) {
					permissionBtn.remove();
				}

				// Vis succes besked
				this.showStatusMessage('Notifikationer aktiveret!');
			} else {
				this.showStatusMessage('Notifikations tilladelse afvist', true);
			}

			return this.permission;
		} catch (error) {
			console.error('Error requesting notification permission:', error);
			this.showStatusMessage('Fejl ved anmodning om tilladelse', true);
		}
	},

	/**
	 * Viser en grundlæggende notifikation
	 * @param {string} title - Notifikations titel
	 * @param {string} body - Notifikations tekst
	 * @param {Object} options - Yderligere notifikations muligheder
	 */
	async showNotification(title, body, options = {}) {
		// Tjek tilladelse
		if (this.permission !== 'granted') {
			const newPermission = await this.requestPermission();
			if (newPermission !== 'granted') {
				return false;
			}
		}

		// Standard muligheder
		const notificationOptions = {
			body: body,
			icon: '/icons/icon-192.png',
			...options,
		};

		try {
			// Opret notifikation
			const notification = new Notification(title, notificationOptions);

			// Tilføj klik håndterer
			notification.onclick = () => {
				window.focus();
				notification.close();

				// Håndter handling hvis specificeret
				if (options.action) {
					this.handleNotificationAction(options.action);
				}
			};

			return true;
		} catch (error) {
			console.error('Error showing notification:', error);
			return false;
		}
	},

	/**
	 * Viser en avanceret notifikation med handlinger
	 * @param {string} title - Notifikations titel
	 * @param {string} body - Notifikations tekst
	 * @param {Array} actions - Array af handling objekter
	 */
	async showAdvancedNotification(title, body, actions = []) {
		// Tjek tilladelse
		if (this.permission !== 'granted') {
			const newPermission = await this.requestPermission();
			if (newPermission !== 'granted') {
				return false;
			}
		}

		try {
			// Tjek for service worker support
			if (!('serviceWorker' in navigator)) {
				// Fallback til grundlæggende notifikation
				return this.showNotification(title, body);
			}

			// Hent service worker registrering
			const registration = await navigator.serviceWorker.ready;

			// Vis notifikation med handlinger
			await registration.showNotification(title, {
				body: body,
				icon: '/icons/icon-192.png',
				actions: actions,
			});

			return true;
		} catch (error) {
			console.error('Error showing advanced notification:', error);

			// Prøv at falde tilbage til grundlæggende notifikation
			return this.showNotification(title, body);
		}
	},

	/**
	 * Planlægger en notifikation til senere
	 * @param {string} title - Notifikations titel
	 * @param {string} body - Notifikations tekst
	 * @param {number} delayMinutes - Minutter at forsinke før visning
	 */
	scheduleNotification(title, body, delayMinutes = 5) {
		// Valider forsinkelse
		if (isNaN(delayMinutes) || delayMinutes < 1) {
			this.showStatusMessage('Ugyldig forsinkelsestid', true);
			return;
		}

		// Konverter til millisekunder
		const delayMs = delayMinutes * 60 * 1000;

		// Sæt timeout
		const timerId = setTimeout(() => {
			this.showNotification(title, body);
		}, delayMs);

		// Gem timer ID til potentiel annullering
		this.scheduledNotifications.push(timerId);

		// Vis bekræftelse
		this.showStatusMessage(`Notifikation planlagt til ${delayMinutes} minutter fra nu`);

		return timerId;
	},

	/**
	 * Håndterer notifikations handling
	 * @param {string} action - Handling at udføre
	 * @param {Object} data - Yderligere data til handlingen
	 */
	handleNotificationAction(action, data = {}) {
		switch (action) {
			case 'openSnippet':
				if (data.snippetId) {
					// Kald din app's funktion til at indlæse et snippet
					if (typeof loadSnippet === 'function') {
						loadSnippet(data.snippetId);
					}
				}
				break;

			case 'newSnippet':
				// Kald din app's funktion til at oprette et nyt snippet
				if (typeof createNewSnippet === 'function') {
					createNewSnippet();
				} else {
					// Fallback - klik på ny snippet knap
					const newButton = document.getElementById('newSnippetBtn');
					if (newButton) newButton.click();
				}
				break;
		}
	},

	/**
	 * Viser status besked til brugeren
	 * @param {string} message - Besked at vise
	 * @param {boolean} isError - Om dette er en fejlbesked
	 */
	showStatusMessage(message, isError = false) {
		// Brug app's status besked funktion hvis tilgængelig
		if (typeof showMessage === 'function') {
			showMessage(message, isError);
		} else {
			// Simpel alert fallback
			if (isError) {
				console.error(message);
			} else {
				console.log(message);
			}
		}
	},

	/**
	 * Rydder op i ventende notifikations timere
	 */
	cleanup() {
		this.scheduledNotifications.forEach(timerId => {
			clearTimeout(timerId);
		});
		this.scheduledNotifications = [];
	},
};

// Initialiser ved indlæsning
document.addEventListener('DOMContentLoaded', () => {
	NotificationManager.init();
});

// Gør det tilgængeligt globalt
window.NotificationManager = NotificationManager;
