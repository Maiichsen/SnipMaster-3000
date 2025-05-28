// Initialiserer applikationen, når DOM er loaded
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Først migrer data fra localStorage til IndexedDB
    await SnippetStorage.migrateFromLocalStorage();

    // Initialiser UI-modulerne
    await SnippetUI.init();
    SyncUI.init();

    // Sætter event listeners og preview for kodeeditoren
    setupCodeEditor();

    console.log("SnipMaster 3000 initialiseret med succes");
  } catch (error) {
    console.error("Fejl under initialisering af applikationen:", error);
  }
});

// Sætter event listeners og preview for kodeeditoren
function setupCodeEditor() {
  const codeEditor = document.getElementById("codeEditor");
  const languageSelect = document.getElementById("languageSelect");

  // Opdaterer preview, når indholdet ændres
  if (codeEditor) {
    codeEditor.addEventListener("input", updatePreview);
  }

  if (languageSelect) {
    languageSelect.addEventListener("change", updatePreview);
  }

  // Første gang opdateres preview
  updatePreview();
}

// Opdaterer kodepreview med syntax highlighting
function updatePreview() {
  const codeEditor = document.getElementById("codeEditor");
  const languageSelect = document.getElementById("languageSelect");
  const previewDiv = document.getElementById("codePreview");

  if (!codeEditor || !languageSelect || !previewDiv) return;

  const code = codeEditor.value;
  const language = languageSelect.value;

  previewDiv.innerHTML = `<pre><code class="language-${language}">${escapeHtml(
    code
  )}</code></pre>`;

  // Anvender highlighting hvis hljs er tilgængelig
  if ("hljs" in window) {
    hljs.highlightElement(previewDiv.querySelector("code"));
  }
}

// Hjælpefunktion til at escape HTML (for at undgå XSS)
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Opdaterer forbindelsesstatus (online/offline) i UI
function updateConnectionStatus() {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) return;

  if (navigator.onLine) {
    statusElement.innerHTML = "🟢 Online";
    statusElement.style.backgroundColor = "#f1fff0";
  } else {
    statusElement.innerHTML = "🔴 Offline";
    statusElement.style.backgroundColor = "#fff0f0";
  }
}

// Håndterer PWA installationsprompt og install-knap
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Forhindrer Chrome i automatisk at vise prompten
  e.preventDefault();

  // Gemmer begivenheden, så den kan aktiveres senere
  deferredPrompt = e;

  // Viser installationsknappen
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "block";

    installButton.addEventListener("click", () => {
      // Viser installationsprompten
      deferredPrompt.prompt();

      // Venter på, at brugeren reagerer på prompten
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("Brugeren accepterede installationen");
          installButton.style.display = "none";
        }
        deferredPrompt = null;
      });
    });
  }
});

// Skjuler installationsknap, når appen er installeret
window.addEventListener("appinstalled", () => {
  console.log("Applikationen er installeret");
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "none";
  }
});

// Registrerer Service Worker for offline-funktionalitet
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "ServiceWorker registrering lykkedes med scope:",
            registration.scope
          );
        })
        .catch((error) => {
          console.error("ServiceWorker registrering fejlede:", error);
        });
    });
  } else {
    console.log("Service Workers understøttes ikke i denne browser.");
  }
}

// Kalder registreringsfunktionen for Service Worker
registerServiceWorker();
