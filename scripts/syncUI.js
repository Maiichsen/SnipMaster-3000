// SyncUI modul: Håndterer synkroniseringsstatus og feedback i UI
const SyncUI = {
  // Apptilstande
  APP_STATES: {
    ONLINE: "online",
    OFFLINE: "offline",
    SYNCING: "syncing",
    SYNC_ERROR: "sync-error",
    SYNC_SUCCESS: "sync-success",
  },

  // Elementer i UI
  elements: {
    statusContainer: null,
    syncButton: null,
    lastSyncTime: null,
    offlineBanner: null,
  },

  // Aktuel apptilstand
  currentState: null,

  // Initialiserer sync UI
  init: function () {
    // Sætter UI-elementer op
    this.createStatusContainer();
    this.createSyncButton();
    this.createLastSyncTimeDisplay();
    this.createOfflineBanner();

    // Sætter event listeners
    this.setupEventListeners();

    // Sætter initial tilstand
    this.updateAppState(
      navigator.onLine ? this.APP_STATES.ONLINE : this.APP_STATES.OFFLINE
    );
  },

  // Opretter status-container til statusmeddelelser
  createStatusContainer: function () {
    let container = document.getElementById("app-status-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "app-status-container";
      document.querySelector(".status-bar").appendChild(container);
    }
    this.elements.statusContainer = container;
  },

  // Opretter synkroniseringsknap
  createSyncButton: function () {
    const header = document.querySelector(".toolbar");
    if (!header) return;

    const syncButton = document.createElement("button");
    syncButton.id = "sync-button";
    syncButton.className = "sync-button online-only";
    syncButton.innerHTML = "🔄 Synkroniser nu";

    header.appendChild(syncButton);
    this.elements.syncButton = syncButton;
  },

  // Opretter visning for sidste synkroniseringstidspunkt
  createLastSyncTimeDisplay: function () {
    const syncTimeElement = document.createElement("div");
    syncTimeElement.id = "last-sync-time";
    syncTimeElement.className = "last-sync-time";

    // Tilføjer ved siden af sync-knappen
    const header = document.querySelector(".toolbar");
    if (header) {
      header.appendChild(syncTimeElement);
    }

    this.elements.lastSyncTime = syncTimeElement;

    // Første opdatering
    this.updateLastSyncTimeDisplay();
  },

  // Opretter offline-banner
  createOfflineBanner: function () {
    const banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.className = "offline-banner show-when-offline";
    banner.innerHTML = `
          <div class="offline-content">
              <div class="offline-icon">📴</div>
              <div class="offline-message">
                  <h3>Du arbejder offline</h3>
                  <p>Ændringer gemmes og synkroniseres, når du er online igen.</p>
              </div>
          </div>
      `;

    document.body.insertBefore(banner, document.body.firstChild);
    this.elements.offlineBanner = banner;
  },

  // Sætter event listeners for netværk, sync og UI
  setupEventListeners: function () {
    // Netværksstatus events
    window.addEventListener(
      "online",
      this.handlers.onlineStatusChange.bind(this)
    );
    window.addEventListener(
      "offline",
      this.handlers.offlineStatusChange.bind(this)
    );

    // Synkroniseringsknap klik
    if (this.elements.syncButton) {
      this.elements.syncButton.addEventListener(
        "click",
        this.handlers.syncButtonClick.bind(this)
      );
    }

    // Sync-status ændring
    document.addEventListener(
      "sync-status-change",
      this.handlers.syncStatusChange.bind(this)
    );

    // Opdatering af sidste sync-tid
    document.addEventListener(
      "last-sync-updated",
      this.handlers.lastSyncUpdated.bind(this)
    );
  },

  // Opdaterer apptilstand og viser status i UI
  updateAppState: function (newState, message = "") {
    console.log({ newState, message }, new Error());
    const statusContainer = this.elements.statusContainer;
    if (!statusContainer) return;

    // Opdaterer aktuel tilstand
    this.currentState = newState;

    // Fjerner tidligere status
    statusContainer.innerHTML = "";

    // Opretter nyt statuselement
    const statusElement = document.createElement("div");
    statusElement.className = `app-status ${newState}`;

    // Sætter ikon og besked afhængigt af tilstand
    let icon = "",
      defaultMessage = "";

    switch (newState) {
      case this.APP_STATES.ONLINE:
        icon = "🟢";
        defaultMessage = "Online";
        break;
      case this.APP_STATES.OFFLINE:
        icon = "🔴";
        defaultMessage = "Offline";
        break;
      case this.APP_STATES.SYNCING:
        icon = "🔄";
        defaultMessage = message || "Synkroniserer...";
        break;
      case this.APP_STATES.SYNC_ERROR:
        icon = "⚠️";
        defaultMessage = message || "Synkroniseringsfejl";
        break;
      case this.APP_STATES.SYNC_SUCCESS:
        icon = "✅";
        defaultMessage = message || "Synkroniseret";
        break;
    }

    // Viser kun detaljeret besked for syncing, error og success
    const showDetailedMessage = [
      this.APP_STATES.SYNCING,
      this.APP_STATES.SYNC_ERROR,
      this.APP_STATES.SYNC_SUCCESS,
    ].includes(newState);

    // Tilføjer ikon
    const iconSpan = document.createElement("span");
    iconSpan.className = "status-icon";
    iconSpan.textContent = icon;
    statusElement.appendChild(iconSpan);

    // Tilføjer besked hvis nødvendigt
    if (showDetailedMessage) {
      const messageSpan = document.createElement("span");
      messageSpan.className = "status-message";
      messageSpan.textContent = defaultMessage;
      statusElement.appendChild(messageSpan);
    }

    // Tilføjer til container
    statusContainer.appendChild(statusElement);

    // Hvis synkronisering lykkes, vis online efter 3 sekunder
    if (newState === this.APP_STATES.SYNC_SUCCESS) {
      setTimeout(() => {
        this.updateAppState(this.APP_STATES.ONLINE);
      }, 3000);
    }

    // Opdaterer body class for CSS
    document.body.className = `app-state-${newState}`;
  },

  // Opdaterer visning af sidste synkroniseringstidspunkt
  updateLastSyncTimeDisplay: function () {
    const timeElement = this.elements.lastSyncTime;
    if (!timeElement) return;

    const lastSyncTime = SnippetStorage.getLastSyncTime();

    if (lastSyncTime) {
      const syncDate = new Date(lastSyncTime);
      const now = new Date();
      const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));

      let timeText = "";
      if (diffMinutes < 1) {
        timeText = "lige nu";
      } else if (diffMinutes < 60) {
        timeText = `${diffMinutes} minut${diffMinutes === 1 ? "" : "ter"} siden`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        timeText = `${hours} time${hours === 1 ? "" : "r"} siden`;
      } else {
        timeText =
          syncDate.toLocaleDateString() +
          " " +
          syncDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
      }

      timeElement.textContent = `Sidst synkroniseret: ${timeText}`;
      timeElement.style.display = "block";
    } else {
      timeElement.textContent = "Aldrig synkroniseret";
      timeElement.style.display = "block";
    }
  },

  // Event handlers
  handlers: {
    onlineStatusChange: async function () {
      if (navigator.onLine) {
        // Opdaterer UI til online
        this.updateAppState(this.APP_STATES.ONLINE);

        try {
          // Tjekker om der er ventende ændringer
          const pendingChanges = await SnippetStorage.getPendingChanges();

          if (pendingChanges && pendingChanges.length > 0) {
            // Hvis der er ventende ændringer, start synkronisering
            this.updateAppState(
              this.APP_STATES.SYNCING,
              `Synkroniserer ${pendingChanges.length} ændringer...`
            );

            // Prøv background sync først
            const registered = await SnippetStorage.registerBackgroundSync();

            // Hvis background sync ikke er understøttet, brug manuel sync
            if (!registered) {
              const result = await SnippetStorage.syncAll();
              if (result.success) {
                this.updateAppState(
                  this.APP_STATES.SYNC_SUCCESS,
                  "Alle ændringer synkroniseret"
                );
              } else {
                this.updateAppState(
                  this.APP_STATES.SYNC_ERROR,
                  "Kunne ikke synkronisere ændringer"
                );
              }
            }
          }

          // Opdaterer snippets i UI
          await SnippetUI.renderSnippets();
        } catch (error) {
          console.error("Fejl under online synk:", error);
          this.updateAppState(
            this.APP_STATES.SYNC_ERROR,
            "Fejl under synkronisering af ændringer"
          );
        }
      }
    },

    offlineStatusChange: function () {
      if (!navigator.onLine) {
        this.updateAppState(this.APP_STATES.OFFLINE);
      }
    },

    syncButtonClick: async function () {
      this.updateAppState(this.APP_STATES.SYNCING, "Starter synkronisering...");

      try {
        const result = await SnippetStorage.syncAll();

        // Opdaterer snippets i UI efter sync
        await SnippetUI.renderSnippets();
      } catch (error) {
        console.error("Fejl under manuel synk:", error);
        this.updateAppState(this.APP_STATES.SYNC_ERROR, "Synkronisering fejlede");
      }
    },

    syncStatusChange: function (event) {
      const { status, message } = event.detail;
      this.updateAppState(status, message);
    },

    lastSyncUpdated: function (event) {
      this.updateLastSyncTimeDisplay();
    },
  },
};
