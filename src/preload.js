const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // OCR functionality
  checkOcrReady: () => ipcRenderer.invoke('check-ocr-ready'),
  selectPdfFile: () => ipcRenderer.invoke('select-pdf-file'),
  processPdfOcr: (filePath) => ipcRenderer.invoke('process-pdf-ocr', filePath),
  saveOcrData: (data, filename) => ipcRenderer.invoke('save-ocr-data', data, filename),
  getSavedFiles: () => ipcRenderer.invoke('get-saved-files'),
  readSavedFile: (filePath) => ipcRenderer.invoke('read-saved-file', filePath),

  // Gemini functionality
  checkGeminiReady: () => ipcRenderer.invoke('check-gemini-ready'),
  generateDesignDocument: (ocrData, filename) => ipcRenderer.invoke('generate-design-document', ocrData, filename),

  // LaTeX functionality
  checkLatexInstallation: () => ipcRenderer.invoke('check-latex-installation'),
  convertLatexToPdf: (latexFilePath) => ipcRenderer.invoke('convert-latex-to-pdf', latexFilePath),

  // Design document management
  getDesignDocuments: () => ipcRenderer.invoke('get-design-documents'),

  // File operations
  openExternal: (path) => ipcRenderer.invoke('open-external', path),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),

  checkOllamaReady: () => ipcRenderer.invoke('check-ollama-ready'),
  generateDesignDocumentOllama: (ocrData, filename) => ipcRenderer.invoke('generate-design-document-ollama', ocrData, filename),
});
