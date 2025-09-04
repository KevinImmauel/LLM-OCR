class PDFOCRApp {
  constructor() {
    this.currentFile = null;
    this.currentOcrData = null;
    this.currentLatexContent = null;
    this.currentLatexPath = null;
    this.currentPdfPath = null;
    this.currentStep = 1;

    this.initializeElements();
    this.setupEventListeners();
    this.checkSystemStatus();
  }

  initializeElements() {
    this.elements = {
      // Navigation
      steps: document.querySelectorAll('.step'),

      // Buttons
      selectFile: document.getElementById('selectFile'),
      processOcr: document.getElementById('processOcr'),
      generateDesign: document.getElementById('generateDesign'),
      previewLatex: document.getElementById('previewLatex'),
      convertToPdf: document.getElementById('convertToPdf'),
      downloadPdf: document.getElementById('downloadPdf'),
      viewSaved: document.getElementById('viewSaved'),
      viewDesignDocs: document.getElementById('viewDesignDocs'),

      // Content areas
      status: document.getElementById('status'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      pdfViewer: document.getElementById('pdfViewer'),
      ocrResults: document.getElementById('ocrResults'),
      latexSection: document.getElementById('latexSection'),
      latexContent: document.getElementById('latexContent'),
      fileLists: document.getElementById('fileLists'),
      filesList: document.getElementById('filesList'),
      designFilesList: document.getElementById('designFilesList'),

      // Small buttons
      refreshPdf: document.getElementById('refreshPdf'),
      copyOcrResults: document.getElementById('copyOcrResults'),
      copyLatex: document.getElementById('copyLatex'),
      editLatex: document.getElementById('editLatex'),
      saveLatex: document.getElementById('saveLatex'),

      // Modal
      latexModal: document.getElementById('latexModal'),
      latexEditor: document.getElementById('latexEditor'),
      saveLatexChanges: document.getElementById('saveLatexChanges'),
      cancelLatexEdit: document.getElementById('cancelLatexEdit'),
      closeModal: document.getElementById('closeModal'),

      // System status
      ocrStatus: document.getElementById('ocrStatus'),
      geminiStatus: document.getElementById('geminiStatus'),
      latexStatus: document.getElementById('latexStatus'),

      generateDesignOllama: document.getElementById('generateDesignOllama'),
      ollamaStatus: document.getElementById('ollamaStatus'),
    };
  }

  setupEventListeners() {
    // Main workflow buttons
    this.elements.selectFile.addEventListener('click', () => this.selectFile());
    this.elements.processOcr.addEventListener('click', () => this.processOCR());
    this.elements.generateDesign.addEventListener('click', () => this.generateDesignDocument());
    this.elements.previewLatex.addEventListener('click', () => this.toggleLatexPreview());
    this.elements.convertToPdf.addEventListener('click', () => this.convertToPdf());
    this.elements.downloadPdf.addEventListener('click', () => this.downloadPdf());

    // File management buttons
    this.elements.viewSaved.addEventListener('click', () => this.toggleSavedFiles());
    this.elements.viewDesignDocs.addEventListener('click', () => this.toggleDesignDocuments());

    // Small action buttons
    this.elements.refreshPdf.addEventListener('click', () => this.refreshPdfPreview());
    this.elements.copyOcrResults.addEventListener('click', () => this.copyOcrResults());
    this.elements.copyLatex.addEventListener('click', () => this.copyLatexContent());
    this.elements.editLatex.addEventListener('click', () => this.openLatexEditor());
    this.elements.saveLatex.addEventListener('click', () => this.saveLatexDocument());

    // Modal events
    this.elements.closeModal.addEventListener('click', () => this.closeLatexModal());
    this.elements.cancelLatexEdit.addEventListener('click', () => this.closeLatexModal());
    this.elements.saveLatexChanges.addEventListener('click', () => this.saveLatexChanges());

    this.elements.generateDesignOllama.addEventListener('click', () => this.generateDesignDocumentOllama());

    // Step navigation
    this.elements.steps.forEach(step => {
      step.addEventListener('click', () => this.navigateToStep(parseInt(step.dataset.step)));
    });

    // Close modal on outside click
    this.elements.latexModal.addEventListener('click', (e) => {
      if (e.target === this.elements.latexModal) {
        this.closeLatexModal();
      }
    });
  }

  async checkSystemStatus() {
    this.updateStatus('Checking system status...', 'processing');

    const ollamaResult = await window.electronAPI.checkOllamaReady();
    this.updateSystemStatus('ollama', ollamaResult.ready, ollamaResult.error);
    if (ollamaResult.ready && ollamaResult.models) {
      console.log('📋 Available Ollama models:', ollamaResult.models.map(m => m.name));
    }

    try {
      // Check OCR status
      const ocrResult = await window.electronAPI.checkOcrReady();
      this.updateSystemStatus('ocr', ocrResult.ready, ocrResult.error);

      // Check Gemini status
      const geminiResult = await window.electronAPI.checkGeminiReady();
      this.updateSystemStatus('gemini', geminiResult.ready, geminiResult.error);

      // Check LaTeX installation
      const latexResult = await window.electronAPI.checkLatexInstallation();
      this.updateSystemStatus('latex', latexResult.installed, latexResult.error);

      // Update overall status
      if (ocrResult.ready && geminiResult.ready) {
        this.updateStatus('System ready. Select a PDF file to begin.', 'success');
      } else {
        const issues = [];
        if (!ocrResult.ready) issues.push('OCR');
        if (!geminiResult.ready) issues.push('Gemini');
        this.updateStatus(`System issues detected: ${issues.join(', ')}`, 'error');
      }

    } catch (error) {
      this.updateStatus(`Error checking system status: ${error.message}`, 'error');
    }
  }

  updateSystemStatus(service, isReady, error) {
    const statusElement = this.elements[`${service}Status`];
    if (statusElement) {
      statusElement.textContent = isReady ? 'Ready' : (error ? 'Error' : 'Not Ready');
      statusElement.className = `status-value ${isReady ? 'ready' : 'error'}`;
      if (!isReady && error) {
        statusElement.title = error;
      }
    }
  }

  updateStepNavigation(currentStep) {
    this.currentStep = currentStep;
    this.elements.steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed');

      if (stepNumber === currentStep) {
        step.classList.add('active');
      } else if (stepNumber < currentStep) {
        step.classList.add('completed');
      }
    });
  }

  navigateToStep(stepNumber) {
    // Only allow navigation to completed steps or current step
    if (stepNumber <= this.currentStep || this.isStepAccessible(stepNumber)) {
      this.updateStepNavigation(stepNumber);
      this.showStepContent(stepNumber);
    }
  }

  isStepAccessible(stepNumber) {
    switch (stepNumber) {
      case 1: return true;
      case 2: return !!this.currentOcrData;
      case 3: return !!this.currentLatexContent;
      default: return false;
    }
  }

  showStepContent(stepNumber) {
    // Hide all sections first
    this.elements.latexSection.style.display = 'none';
    this.elements.fileLists.style.display = 'none';

    // Show relevant content based on step
    switch (stepNumber) {
      case 1:
        // Show PDF and OCR results
        break;
      case 2:
        if (this.currentLatexContent) {
          this.elements.latexSection.style.display = 'block';
        }
        break;
      case 3:
        // PDF conversion step - keep LaTeX visible
        if (this.currentLatexContent) {
          this.elements.latexSection.style.display = 'block';
        }
        break;
    }
  }

  async generateDesignDocumentOllama() {
    if (!this.currentOcrData) {
      this.updateStatus('No OCR data available. Process a PDF first.', 'error');
      return;
    }

    try {
      this.updateStatus('🤖 Generating design document with Ollama...', 'processing');
      this.elements.generateDesignOllama.disabled = true;

      const result = await window.electronAPI.generateDesignDocumentOllama(
        this.currentOcrData,
        this.getFileName(this.currentFile)
      );

      if (result.success) {
        this.currentLatexContent = result.latex;
        this.currentLatexPath = result.savedPath;

        this.updateStatus('✅ Design document generated with Ollama!', 'success');
        this.elements.convertToPdf.disabled = false;
        this.elements.previewLatex.disabled = false;

        this.updateStepNavigation(3);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.updateStatus(`❌ Ollama generation failed: ${error.message}`, 'error');
    } finally {
      this.elements.generateDesignOllama.disabled = false;
    }
  }


  async selectFile() {
    try {
      const filePath = await window.electronAPI.selectPdfFile();

      if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
        this.currentFile = filePath;
        const fileName = this.getFileName(filePath);
        this.updateStatus(`Selected: ${fileName}`, 'success');
        this.elements.processOcr.disabled = false;
        this.elements.refreshPdf.disabled = false;
        this.displayPdfPreview(filePath);
      } else {
        this.updateStatus('No file selected', 'info');
        this.elements.processOcr.disabled = true;
      }
    } catch (error) {
      this.updateStatus(`Error selecting file: ${error.message}`, 'error');
      this.elements.processOcr.disabled = true;
    }
  }

  getFileName(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return 'Unknown file';
    }
    const separator = filePath.includes('/') ? '/' : '\\';
    const parts = filePath.split(separator);
    return parts[parts.length - 1] || 'Unknown file';
  }

  displayPdfPreview(filePath) {
    const fileName = this.getFileName(filePath);
    this.elements.pdfViewer.innerHTML = `
      <div class="pdf-preview">
        <h3>Selected PDF</h3>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Path:</strong> ${filePath}</p>
        <p>Click "Process with OCR" to extract text and data from this PDF.</p>
      </div>
    `;
  }

  async processOCR() {
    if (!this.currentFile) {
      this.updateStatus('No file selected', 'error');
      return;
    }

    try {
      this.updateStatus('Processing PDF with Mistral OCR...', 'processing');
      this.showProgress(20);
      this.elements.processOcr.disabled = true;

      const result = await window.electronAPI.processPdfOcr(this.currentFile);
      this.showProgress(70);

      if (result.success) {
        this.currentOcrData = result.data;
        this.displayOCRResults(result.data);
        this.showProgress(90);

        // Save results
        const fileName = this.getFileName(this.currentFile).replace('.pdf', '');
        const saveResult = await window.electronAPI.saveOcrData(result.data, fileName);

        this.showProgress(100);

        if (saveResult.success) {
          this.updateStatus('OCR completed successfully!', 'success');
          this.elements.generateDesign.disabled = false;
          this.elements.copyOcrResults.disabled = false;
          this.updateStepNavigation(2);
        } else {
          this.updateStatus(`OCR completed but save failed: ${saveResult.error}`, 'warning');
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.updateStatus(`OCR processing failed: ${error.message}`, 'error');
    } finally {
      this.elements.processOcr.disabled = false;
      this.hideProgress();
    }
  }

  displayOCRResults(ocrResult) {
    const { extractedText, markdown, metadata, structure } = ocrResult;

    this.elements.ocrResults.innerHTML = `
      <div class="ocr-data">
        <h3>OCR Results</h3>
        
        <div class="metadata">
          <strong>Metadata:</strong><br>
          Processing Time: ${metadata.processingTime}<br>
          Model: ${metadata.model}<br>
          Pages: ${metadata.pages || 'Unknown'}<br>
          ${metadata.confidence ? `Confidence: ${metadata.confidence}` : ''}
        </div>

        <h4>Extracted Text (Markdown)</h4>
        <div class="ocr-content">${this.escapeHtml(markdown || extractedText)}</div>

        ${structure.headers && structure.headers.length > 0 ? `
          <h4>Document Structure - Headers</h4>
          <div class="structure-info">
            ${structure.headers.map(h => `<div>H${h.level}: ${this.escapeHtml(h.text)}</div>`).join('')}
          </div>
        ` : ''}

        ${structure.tables && structure.tables.length > 0 ? `
          <h4>Tables Found</h4>
          <div class="structure-info">
            ${structure.tables.length} table(s) detected
          </div>
        ` : ''}

        ${structure.lists && structure.lists.length > 0 ? `
          <h4>Lists Found</h4>
          <div class="structure-info">
            ${structure.lists.length} list item(s) detected
          </div>
        ` : ''}
      </div>
    `;
  }

  async generateDesignDocument() {
    if (!this.currentOcrData) {
      this.updateStatus('No OCR data available', 'error');
      return;
    }

    try {
      this.updateStatus('Generating design document with Gemini...', 'processing');
      this.showProgress(10);
      this.elements.generateDesign.disabled = true;

      const fileName = this.getFileName(this.currentFile || 'document').replace('.pdf', '');
      this.showProgress(30);

      const result = await window.electronAPI.generateDesignDocument(this.currentOcrData, fileName);
      this.showProgress(80);

      if (result.success) {
        this.currentLatexContent = result.latex;
        this.currentLatexPath = result.savedPath;

        this.displayLatexContent(result.latex, result.metadata);
        this.showProgress(100);

        this.updateStatus('Design document generated successfully!', 'success');
        this.elements.previewLatex.disabled = false;
        this.elements.editLatex.disabled = false;
        this.elements.copyLatex.disabled = false;
        this.elements.convertToPdf.disabled = false;

        this.elements.latexSection.style.display = 'block';
        this.updateStepNavigation(3);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.updateStatus(`Design document generation failed: ${error.message}`, 'error');
    } finally {
      this.elements.generateDesign.disabled = false;
      this.hideProgress();
    }
  }

  displayLatexContent(latexContent, metadata) {
    this.elements.latexContent.innerHTML = `
      <div class="latex-document">
        <div class="metadata">
          <strong>Generated:</strong> ${metadata.generatedAt}<br>
          <strong>Model:</strong> ${metadata.model}<br>
          <strong>Source:</strong> ${metadata.inputSource}
        </div>
        
        <h4>LaTeX Source Code</h4>
        <div class="latex-code">${this.escapeHtml(latexContent)}</div>
      </div>
    `;
  }

  toggleLatexPreview() {
    const isVisible = this.elements.latexSection.style.display !== 'none';
    this.elements.latexSection.style.display = isVisible ? 'none' : 'block';
    this.elements.previewLatex.textContent = isVisible ? 'Show LaTeX' : 'Hide LaTeX';
  }

  async convertToPdf() {
    if (!this.currentLatexPath) {
      this.updateStatus('No LaTeX document to convert', 'error');
      return;
    }

    try {
      this.updateStatus('Converting LaTeX to PDF...', 'processing');
      this.showProgress(20);
      this.elements.convertToPdf.disabled = true;

      const result = await window.electronAPI.convertLatexToPdf(this.currentLatexPath);
      this.showProgress(80);

      if (result.success) {
        this.currentPdfPath = result.pdfPath;
        this.showProgress(100);

        this.updateStatus('PDF generated successfully!', 'success');
        this.elements.downloadPdf.disabled = false;

        // Show success message with file info
        const fileName = this.getFileName(result.pdfPath);
        this.updateStatus(`PDF created: ${fileName}`, 'success');
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.updateStatus(`PDF conversion failed: ${error.message}`, 'error');
    } finally {
      this.elements.convertToPdf.disabled = false;
      this.hideProgress();
    }
  }

  async downloadPdf() {
    if (!this.currentPdfPath) {
      this.updateStatus('No PDF available to download', 'error');
      return;
    }

    try {
      await window.electronAPI.showItemInFolder(this.currentPdfPath);
      this.updateStatus('PDF location opened in file explorer', 'success');
    } catch (error) {
      // Fallback: try to open the PDF directly
      try {
        await window.electronAPI.openExternal(this.currentPdfPath);
        this.updateStatus('PDF opened successfully', 'success');
      } catch (openError) {
        this.updateStatus(`Could not open PDF: ${error.message}`, 'error');
      }
    }
  }

  // File Management Functions
  async toggleSavedFiles() {
    const isVisible = this.elements.fileLists.style.display !== 'none';

    if (isVisible) {
      this.elements.fileLists.style.display = 'none';
    } else {
      await this.loadSavedFiles();
      this.elements.fileLists.style.display = 'block';
    }
  }

  async toggleDesignDocuments() {
    const isVisible = this.elements.fileLists.style.display !== 'none';

    if (isVisible) {
      this.elements.fileLists.style.display = 'none';
    } else {
      await this.loadDesignDocuments();
      this.elements.fileLists.style.display = 'block';
    }
  }

  async loadSavedFiles() {
    try {
      const files = await window.electronAPI.getSavedFiles();

      if (files.length === 0) {
        this.elements.filesList.innerHTML = '<p>No saved OCR data found.</p>';
        return;
      }

      this.elements.filesList.innerHTML = files.map(file => `
        <div class="file-item" onclick="app.openSavedFile('${file.path.replace(/'/g, "\\'")}')">
          <div class="file-info">
            <div class="file-name">${this.escapeHtml(file.name)}</div>
            <div class="file-meta">
              Created: ${new Date(file.created).toLocaleString()} | 
              Size: ${Math.round(file.size / 1024)}KB
            </div>
          </div>
        </div>
      `).join('');

    } catch (error) {
      this.updateStatus(`Error loading saved files: ${error.message}`, 'error');
    }
  }

  async loadDesignDocuments() {
    try {
      const files = await window.electronAPI.getDesignDocuments();

      if (files.length === 0) {
        this.elements.designFilesList.innerHTML = '<p>No design documents found.</p>';
        return;
      }

      this.elements.designFilesList.innerHTML = files.map(file => `
        <div class="file-item" onclick="app.openDesignDocument('${file.path.replace(/'/g, "\\'")}', '${file.type}')">
          <div class="file-info">
            <div class="file-name">${this.escapeHtml(file.name)} ${file.type === 'pdf' ? '📄' : '📝'}</div>
            <div class="file-meta">
              Created: ${new Date(file.created).toLocaleString()} | 
              Size: ${Math.round(file.size / 1024)}KB | 
              Type: ${file.type.toUpperCase()}
            </div>
          </div>
        </div>
      `).join('');

    } catch (error) {
      this.updateStatus(`Error loading design documents: ${error.message}`, 'error');
    }
  }

  async openSavedFile(filePath) {
    try {
      const data = await window.electronAPI.readSavedFile(filePath);
      if (data) {
        this.currentOcrData = data;
        this.displayOCRResults(data);
        this.updateStatus(`Loaded OCR data from: ${this.getFileName(filePath)}`, 'success');
        this.elements.generateDesign.disabled = false;
        this.elements.copyOcrResults.disabled = false;
        this.updateStepNavigation(2);
      }
    } catch (error) {
      this.updateStatus(`Error opening saved file: ${error.message}`, 'error');
    }
  }

  async openDesignDocument(filePath, fileType) {
    try {
      if (fileType === 'pdf') {
        await window.electronAPI.openExternal(filePath);
        this.updateStatus(`Opened PDF: ${this.getFileName(filePath)}`, 'success');
      } else if (fileType === 'latex') {
        // Read LaTeX file and display it
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        this.currentLatexContent = content;
        this.currentLatexPath = filePath;
        this.displayLatexContent(content, {
          generatedAt: new Date().toISOString(),
          model: 'gemini-1.5-pro (loaded)',
          inputSource: 'file'
        });
        this.elements.latexSection.style.display = 'block';
        this.elements.previewLatex.disabled = false;
        this.elements.editLatex.disabled = false;
        this.elements.copyLatex.disabled = false;
        this.elements.convertToPdf.disabled = false;
        this.updateStatus(`Loaded LaTeX document: ${this.getFileName(filePath)}`, 'success');
      }
    } catch (error) {
      this.updateStatus(`Error opening design document: ${error.message}`, 'error');
    }
  }

  // LaTeX Editor Functions
  openLatexEditor() {
    if (!this.currentLatexContent) {
      this.updateStatus('No LaTeX content to edit', 'error');
      return;
    }

    this.elements.latexEditor.value = this.currentLatexContent;
    this.elements.latexModal.style.display = 'flex';
  }

  closeLatexModal() {
    this.elements.latexModal.style.display = 'none';
  }

  async saveLatexChanges() {
    try {
      const newContent = this.elements.latexEditor.value;

      if (this.currentLatexPath) {
        // Save to existing file
        const fs = require('fs');
        fs.writeFileSync(this.currentLatexPath, newContent, 'utf8');
      }

      this.currentLatexContent = newContent;
      this.displayLatexContent(newContent, {
        generatedAt: new Date().toISOString(),
        model: 'gemini-1.5-pro (edited)',
        inputSource: 'user-edited'
      });

      this.closeLatexModal();
      this.updateStatus('LaTeX document updated successfully', 'success');
    } catch (error) {
      this.updateStatus(`Error saving LaTeX changes: ${error.message}`, 'error');
    }
  }

  async saveLatexDocument() {
    if (!this.currentLatexContent) {
      this.updateStatus('No LaTeX content to save', 'error');
      return;
    }

    try {
      const result = await window.electronAPI.saveLatexDocument(
        this.currentLatexContent,
        this.getFileName(this.currentFile || 'document').replace('.pdf', '')
      );

      if (result.success) {
        this.currentLatexPath = result.path;
        this.updateStatus(`LaTeX document saved: ${result.filename}`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.updateStatus(`Error saving LaTeX document: ${error.message}`, 'error');
    }
  }

  // Utility Functions
  refreshPdfPreview() {
    if (this.currentFile) {
      this.displayPdfPreview(this.currentFile);
    }
  }

  async copyOcrResults() {
    if (!this.currentOcrData) return;

    try {
      const textToCopy = this.currentOcrData.markdown || this.currentOcrData.extractedText;
      await navigator.clipboard.writeText(textToCopy);
      this.updateStatus('OCR results copied to clipboard', 'success');
    } catch (error) {
      this.updateStatus('Failed to copy to clipboard', 'error');
    }
  }

  async copyLatexContent() {
    if (!this.currentLatexContent) return;

    try {
      await navigator.clipboard.writeText(this.currentLatexContent);
      this.updateStatus('LaTeX content copied to clipboard', 'success');
    } catch (error) {
      this.updateStatus('Failed to copy to clipboard', 'error');
    }
  }

  showProgress(percentage) {
    this.elements.progressBar.style.display = 'block';
    this.elements.progressFill.style.width = `${percentage}%`;
  }

  hideProgress() {
    setTimeout(() => {
      this.elements.progressBar.style.display = 'none';
      this.elements.progressFill.style.width = '0%';
    }, 1000);
  }

  escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateStatus(message, type = 'info') {
    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (this.elements.status.classList.contains('success')) {
          this.elements.status.textContent = 'Ready for next operation';
          this.elements.status.className = 'status';
        }
      }, 5000);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PDFOCRApp();
});
