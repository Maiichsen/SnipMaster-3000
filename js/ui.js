// Add to your initialization code in app.js

function initFileHandlers() {
  // Check if the module is available
  if (!window.FileSystem) {
    console.error('FileSystem module not loaded');
    return;
  }
  
  // Get button
  const loadFileBtn = document.getElementById('loadFileBtn');
  if (loadFileBtn) {
    loadFileBtn.addEventListener('click', handleLoadFile);
  }
  
  // Show/hide button based on browser support
  if (!FileSystem.isSupported) {
    loadFileBtn.classList.add('disabled');
    loadFileBtn.title = 'Not supported in this browser';
  }
  
  // Add save file handler
  const saveFileBtn = document.getElementById('saveFileBtn');
  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', handleSaveFile);
    
    // Show/hide button based on browser support
    if (!FileSystem.isSupported) {
      saveFileBtn.classList.add('disabled');
      saveFileBtn.title = 'Not supported in this browser';
    }
  }
  // Add to your initialization code

function initFileHandlers() {
  // Existing code for buttons...
  
  // Initialize file handlers
  if (FileSystem.initFileHandlers) {
    FileSystem.initFileHandlers();
  }
  
  // Listen for file open events
  window.addEventListener('file-system:file-opened', (event) => {
    const fileData = event.detail;
    
    // Create new snippet
    document.getElementById('newSnippetBtn').click();
    
    // Set editor content
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');
    
    if (codeEditor && languageSelect) {
      codeEditor.value = fileData.content;
      
      // Set language if it exists in our options
      if (Array.from(languageSelect.options).some(opt => opt.value === fileData.language)) {
        languageSelect.value = fileData.language;
      }
      
      // Update preview if function exists
      if (typeof updatePreview === 'function') {
        updatePreview();
      }
      
      showMessage(`Opened ${fileData.name} successfully!`);
    }
  });
  
  // Listen for errors
  window.addEventListener('file-system:error', (event) => {
    showMessage(`Error: ${event.detail.message}`, true);
  });
}
}

// Handler for load file button
function handleLoadFile() {
  FileSystem.loadFromFile({
    onSuccess: (fileData) => {
      // Update the editor with file content
      const codeEditor = document.getElementById('codeEditor');
      const languageSelect = document.getElementById('languageSelect');
      
      if (codeEditor && languageSelect) {
        // Create new snippet
        document.getElementById('newSnippetBtn').click();
        
        // Set editor content
        codeEditor.value = fileData.content;
        
        // Set language if it exists in our options
        if (Array.from(languageSelect.options).some(opt => opt.value === fileData.language)) {
          languageSelect.value = fileData.language;
        }
        
        // Update preview if function exists
        if (typeof updatePreview === 'function') {
          updatePreview();
        }
        
        // Show success message
        showMessage(`Loaded ${fileData.name} successfully!`);
      }
    },
    onError: (error) => {
      showMessage(`Error: ${error}`, true);
    }
  });
}

// Handler for save file button
function handleSaveFile() {
  const codeEditor = document.getElementById('codeEditor');
  const languageSelect = document.getElementById('languageSelect');
  
  if (!codeEditor || !languageSelect) {
    showMessage('Editor not found', true);
    return;
  }
  
  const content = codeEditor.value;
  const language = languageSelect.value;
  
  // Generate suggested name
  let suggestedName = 'snippet';
  
  // If we have a current snippet, use its name
  if (typeof currentSnippetId !== 'undefined') {
    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    const currentSnippet = snippets.find(s => s.id === currentSnippetId);
    if (currentSnippet && currentSnippet.name) {
      suggestedName = currentSnippet.name;
    }
  }
  
  // Add extension based on language
  const languageToExtension = {
    'javascript': '.js',
    'html': '.html',
    'css': '.css',
    'plaintext': '.txt'
  };
  
  const extension = languageToExtension[language] || '.txt';
  
  // If the name doesn't already have the extension, add it
  if (!suggestedName.endsWith(extension)) {
    suggestedName += extension;
  }
  
  FileSystem.saveToFile({
    content,
    language,
    suggestedName,
    onSuccess: (fileName) => {
      showMessage(`Saved to ${fileName} successfully!`);
    },
    onError: (error) => {
      showMessage(`Error: ${error}`, true);
    }
  });
}

// Call during initialization
document.addEventListener('DOMContentLoaded', initFileHandlers);