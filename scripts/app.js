// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // First migrate data from localStorage to IndexedDB
    await SnippetStorage.migrateFromLocalStorage();

    // Initialize the UI modules
    await SnippetUI.init();
    SyncUI.init();

    // Set up the code editor and preview functionality
    setupCodeEditor();

    console.log("SnipMaster 3000 initialized successfully");
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});

// Set up code editor and preview functionality
function setupCodeEditor() {
  const codeEditor = document.getElementById("codeEditor");
  const languageSelect = document.getElementById("languageSelect");

  // Update the preview when content changes
  if (codeEditor) {
    codeEditor.addEventListener("input", updatePreview);
  }

  if (languageSelect) {
    languageSelect.addEventListener("change", updatePreview);
  }

  // Initial preview update
  updatePreview();
}

// Update code preview with syntax highlighting
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

  // Apply highlighting if hljs is available
  if ("hljs" in window) {
    hljs.highlightElement(previewDiv.querySelector("code"));
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize connection status display
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

// PWA Installation
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome from automatically showing the prompt
  e.preventDefault();

  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show the install button
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "block";

    installButton.addEventListener("click", () => {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the installation");
          installButton.style.display = "none";
        }
        deferredPrompt = null;
      });
    });
  }
});

// Hide button when app is installed
window.addEventListener("appinstalled", () => {
  console.log("Application installed");
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.style.display = "none";
  }
});

// Register the Service Worker
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "ServiceWorker registration successful with scope:",
            registration.scope
          );
        })
        .catch((error) => {
          console.error("ServiceWorker registration failed:", error);
        });
    });
  } else {
    console.log("Service Workers not supported in this browser.");
  }
}

// Call the registration function
registerServiceWorker();
