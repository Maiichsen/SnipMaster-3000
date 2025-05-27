
## Exercise: Creating Your Manifest

### Objective
Create a complete Web App Manifest for SnipMaster 3000, add appropriate meta tags, prepare app icons, and implement a custom install button.


### Steps

#### 1. Create Your Web App Manifest
1. **Create or update manifest.json in the project root:**
   ```json
   {
     "name": "SnipMaster 3000 - Code Snippet Manager",
     "short_name": "SnipMaster",
     "description": "Save and organize your code snippets",
     "start_url": "/index.html",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#3498db",
     "icons": [
       {
         "src": "images/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "images/icon-512.png",
         "sizes": "512x512",
         "type": "image/png"
       },
       {
         "src": "images/maskable-icon.png",
         "sizes": "512x512",
         "type": "image/png",
         "purpose": "maskable"
       }
     ]
   }
   ```

2. **Link your manifest in the HTML:**
   ```html
   <head>
     <!-- Existing head content -->
     <link rel="manifest" href="/manifest.json">
     <meta name="theme-color" content="#3498db">
     <link rel="apple-touch-icon" href="/images/icon-192.png">
   </head>
   ```

#### 2. Prepare App Icons 
1. **Create the necessary icon files:**
   - Find or create your own icons
   - Save to /images/ directory
   - Create at least:
     - icon-192.png (192×192)
     - icon-512.png (512×512)
     - maskable-icon.png

2. **Add browser-specific meta tags:**
   Find out what the meta tag does. Search, and dont use ChatGpt for this step.
   ```html
   <head>
     <!-- Existing head content -->
     <!-- iOS specific -->
     <meta name="apple-mobile-web-app-capable" content="yes">
     <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
     <meta name="apple-mobile-web-app-title" content="SnipMaster">
     
     <!-- Windows tiles -->
     <meta name="msapplication-TileImage" content="/images/icon-144.png">
     <meta name="msapplication-TileColor" content="#3498db">
   </head>
   ```

#### 3. Add Custom Install Button
1. **Add the button to your UI:**
   ```html
   <button id="install-button" style="display: none;" class="install-button">
     Install SnipMaster 3000
   </button>
   ```

2. **Add this to your app.js:**
   ```javascript
   // PWA Installation
   let deferredPrompt;

   window.addEventListener('beforeinstallprompt', (e) => {
     // Prevent Chrome from automatically showing the prompt
     e.preventDefault();
     
     // Stash the event so it can be triggered later
     deferredPrompt = e;
     
     // Show the install button
     const installButton = document.getElementById('install-button');
     if (installButton) {
       installButton.style.display = 'block';
       
       installButton.addEventListener('click', () => {
         // Show the install prompt
         deferredPrompt.prompt();
         
         // Wait for the user to respond to the prompt
         deferredPrompt.userChoice.then((choiceResult) => {
           if (choiceResult.outcome === 'accepted') {
             console.log('User accepted the installation');
             installButton.style.display = 'none';
           }
           deferredPrompt = null;
         });
       });
     }
   });

   // Hide button when app is installed
   window.addEventListener('appinstalled', () => {
     console.log('Application installed');
     const installButton = document.getElementById('install-button');
     if (installButton) {
       installButton.style.display = 'none';
     }
   });
   ```

3. **Add button styling to your CSS:**
   ```css
   .install-button {
     position: fixed;
     right: 20px;
     bottom: 20px;
     background-color: #3498db;
     color: white;
     border: none;
     border-radius: 4px;
     padding: 10px 15px;
     font-size: 16px;
     cursor: pointer;
     box-shadow: 0 2px 5px rgba(0,0,0,0.3);
     z-index: 1000;
     display: none;
   }

   .install-button:hover {
     background-color: #2980b9;
   }
   ```

### Verification Steps
1. Open your PWA in Chrome
2. Inspect with DevTools > Application > Manifest
3. Verify all fields are correctly loaded
4. Check that icons are properly referenced
5. Test the install button functionality
6. Validate installation experience


