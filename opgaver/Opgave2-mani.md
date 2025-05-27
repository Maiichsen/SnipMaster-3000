
## Exercise: Complete Desktop Integration

### Objective
Enhance the SnipMaster 3000 app with advanced manifest features focused on desktop integration, including file handling, custom shortcuts, and protocol handlers.



### Steps

#### 1. Implement Advanced Manifest Features
1. **Update manifest.json with advanced features:**
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
     ],
     "shortcuts": [
       {
         "name": "New Snippet",
         "short_name": "New",
         "description": "Create a new code snippet",
         "url": "/index.html?new=true",
         "icons": [{ "src": "images/add-icon.png", "sizes": "96x96" }]
       },
       {
         "name": "Recent Snippets",
         "short_name": "Recent",
         "description": "View your recent snippets",
         "url": "/index.html?filter=recent"
       }
     ],
     "file_handlers": [
       {
         "action": "/",
         "accept": {
           "text/*": [".txt", ".js", ".html", ".css", ".json", ".md"]
         }
       }
     ],
     "protocol_handlers": [
       {
         "protocol": "web+snippet",
         "url": "/index.html?snippet=%s"
       }
     ],
     "categories": ["productivity", "development", "utilities"],
     "screenshots": [
       {
         "src": "screenshots/screenshot1.png",
         "sizes": "1280x720",
         "type": "image/png"
       }
     ]
   }
   ```

2. **Create additional icons needed:**
   - Create add-icon.png (96×96) for the New Snippet shortcut
   - Add to your images directory

#### 2. Implement File Handling
1. **Add file handling JavaScript:**
   ```javascript
   // Add to app.js
   
   // Handle files opened with the app
   if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
     window.launchQueue.setConsumer(async (launchParams) => {
       if (!launchParams.files.length) {
         return;
       }
       
       // Handle each file
       for (const fileHandle of launchParams.files) {
         try {
           const file = await fileHandle.getFile();
           const content = await file.text();
           
           // Create a new snippet from the file
           createSnippetFromFile({
             name: file.name,
             language: detectLanguage(file.name),
             code: content
           });
         } catch (error) {
           console.error('Error handling file:', error);
           showError('Failed to open file. ' + error.message);
         }
       }
     });
   }
   
   // Detect language based on file extension
   function detectLanguage(filename) {
     const extension = filename.split('.').pop().toLowerCase();
     
     const extensionMap = {
       'js': 'javascript',
       'html': 'html',
       'css': 'css',
       'py': 'python',
       'java': 'java',
       'php': 'php',
       'rb': 'ruby',
       'md': 'markdown',
       'json': 'json',
       'xml': 'xml',
       'sql': 'sql',
       'sh': 'bash',
       'c': 'c',
       'cpp': 'cpp',
       'cs': 'csharp',
       'ts': 'typescript'
     };
     
     return extensionMap[extension] || 'plaintext';
   }
   
   // Create snippet from file content
   function createSnippetFromFile({ name, language, code }) {
     // Set editor values
     const codeEditor = document.getElementById('codeEditor');
     const languageSelect = document.getElementById('languageSelect');
     
     if (codeEditor && languageSelect) {
       // Set values
       codeEditor.value = code;
       
       // Try to set the language if supported
       if (Array.from(languageSelect.options).some(opt => opt.value === language)) {
         languageSelect.value = language;
       }
       
       // Update UI
       if (typeof updatePreview === 'function') {
         updatePreview();
       }
       
       // Show success message
       showMessage(`Opened file: ${name}`);
     }
   }
   ```

#### 3. Implement Protocol Handler 
1. **Add protocol handler support:**
   ```javascript
   // Add to app.js
   
   // Handle protocol invocation
   document.addEventListener('DOMContentLoaded', () => {
     // Check if we were launched via protocol
     const urlParams = new URLSearchParams(window.location.search);
     const snippetId = urlParams.get('snippet');
     
     if (snippetId) {
       // Try to load the snippet by ID
       loadSnippetById(snippetId);
     }
     
     // Handle the "new" parameter
     if (urlParams.has('new') && urlParams.get('new') === 'true') {
       // Create a new snippet
       document.getElementById('newSnippetBtn')?.click();
     }
     
     // Handle the "filter" parameter
     if (urlParams.has('filter')) {
       const filter = urlParams.get('filter');
       if (filter === 'recent') {
         displayRecentSnippets();
       }
     }
   });
   
   // Function to load snippet by ID
   function loadSnippetById(id) {
     // Get snippets from localStorage
     const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
     
     // Find the snippet
     const snippet = snippets.find(s => s.id === id);
     
     if (snippet) {
       // Load it into the editor
       loadSnippet(id);
     } else {
       showError(`Snippet not found: ${id}`);
     }
   }
   
   // Display recent snippets
   function displayRecentSnippets() {
     const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
     
     // Sort by last modified date, newest first
     const recentSnippets = [...snippets].sort((a, b) => {
       return new Date(b.lastModified) - new Date(a.lastModified);
     }).slice(0, 5); // Get top 5
     
     // Highlight these in the UI
     // This depends on your specific UI implementation
     highlightSnippets(recentSnippets.map(s => s.id));
   }
   
   // Highlight snippets in the list
   function highlightSnippets(ids) {
     document.querySelectorAll('.snippet-item').forEach(item => {
       if (ids.includes(item.dataset.id)) {
         item.classList.add('highlighted');
       } else {
         item.classList.remove('highlighted');
       }
     });
   }
   ```

2. **Add CSS for highlighted snippets:**
   ```css
   /* Add to styles.css */
   .snippet-item.highlighted {
     border-left: 4px solid #e74c3c;
     animation: pulse 1.5s infinite;
   }
   
   @keyframes pulse {
     0% { background-color: rgba(231, 76, 60, 0.1); }
     50% { background-color: rgba(231, 76, 60, 0.2); }
     100% { background-color: rgba(231, 76, 60, 0.1); }
   }
   ```

#### 4. Add Screenshot Support
1. **Create a screenshots directory in your project root**

2. **Take a screenshot of your app and save it as screenshots/screenshot1.png**
   - Ideal size: 1280×720
   - Show your app in action

3. **Update your manifest to include the screenshot**
   (This was done in step 1)

#### 5. Test Installation and Features
1. **Test basic installation:**
   - Install the app using your custom install button
   - Check that icons appear correctly
   - Verify it launches in standalone mode

2. **Test shortcuts:**
   - Right-click on app icon (in taskbar/dock/desktop)
   - Verify shortcuts appear and work correctly

3. **Test file handling:**
   - Create a test .js file
   - Open the file with your installed PWA
   - Verify the content loads correctly

4. **Test protocol handler:**
   - Create a test link: `<a href="web+snippet:test">Open Test Snippet</a>`
   - Test opening it (you may need to register the protocol first)

5. **Verify appearance:**
   - Check theme colors are applied
   - Test window controls
   - Verify screenshots appear in installation dialog

### Success Criteria
- App can be installed from custom button
- Shortcuts appear when right-clicking the app icon
- App can open text files directly
- Protocol handler is configured correctly
- App icons appear correctly in all locations
- Window controls and theme colors are applied properly
