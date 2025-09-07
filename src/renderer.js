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

    // Debug: Check for missing elements
    console.log('🔍 Checking for missing elements:');
    Object.keys(this.elements).forEach(key => {
      if (!this.elements[key] || (this.elements[key].length !== undefined && this.elements[key].length === 0)) {
        console.error(`❌ Missing element: ${key}`);
      } else {
        console.log(`✅ Found element: ${key}`);
      }
    });
  }

  setupEventListeners() {
    // Main workflow buttons with null checks
    if (this.elements.selectFile) {
      this.elements.selectFile.addEventListener('click', () => this.selectFile());
    } else {
      console.error('❌ selectFile button not found');
    }

    if (this.elements.processOcr) {
      this.elements.processOcr.addEventListener('click', () => this.processOCR());
    } else {
      console.error('❌ processOcr button not found');
    }

    if (this.elements.generateDesign) {
      this.elements.generateDesign.addEventListener('click', () => this.generateDesignDocument());
    } else {
      console.error('❌ generateDesign button not found');
    }

    if (this.elements.generateDesignOllama) {
      this.elements.generateDesignOllama.addEventListener('click', () => this.generateDesignDocumentOllama());
    } else {
      console.error('❌ generateDesignOllama button not found');
    }

    if (this.elements.previewLatex) {
      this.elements.previewLatex.addEventListener('click', () => this.toggleLatexPreview());
    }

    if (this.elements.convertToPdf) {
      this.elements.convertToPdf.addEventListener('click', () => this.convertToPdf());
    }

    if (this.elements.downloadPdf) {
      this.elements.downloadPdf.addEventListener('click', () => this.downloadPdf());
    }

    // File management buttons
    if (this.elements.viewSaved) {
      this.elements.viewSaved.addEventListener('click', () => this.toggleSavedFiles());
    }

    if (this.elements.viewDesignDocs) {
      this.elements.viewDesignDocs.addEventListener('click', () => this.toggleDesignDocuments());
    }

    // Small action buttons
    if (this.elements.refreshPdf) {
      this.elements.refreshPdf.addEventListener('click', () => this.refreshPdfPreview());
    }

    if (this.elements.copyOcrResults) {
      this.elements.copyOcrResults.addEventListener('click', () => this.copyOcrResults());
    }

    if (this.elements.copyLatex) {
      this.elements.copyLatex.addEventListener('click', () => this.copyLatexContent());
    }

    if (this.elements.editLatex) {
      this.elements.editLatex.addEventListener('click', () => this.openLatexEditor());
    }

    if (this.elements.saveLatex) {
      this.elements.saveLatex.addEventListener('click', () => this.saveLatexDocument());
    }

    // Modal events
    if (this.elements.closeModal) {
      this.elements.closeModal.addEventListener('click', () => this.closeLatexModal());
    }

    if (this.elements.cancelLatexEdit) {
      this.elements.cancelLatexEdit.addEventListener('click', () => this.closeLatexModal());
    }

    if (this.elements.saveLatexChanges) {
      this.elements.saveLatexChanges.addEventListener('click', () => this.saveLatexChanges());
    }

    // Step navigation
    if (this.elements.steps && this.elements.steps.length > 0) {
      this.elements.steps.forEach(step => {
        step.addEventListener('click', () => this.navigateToStep(parseInt(step.dataset.step)));
      });
    }

    // Close modal on outside click
    if (this.elements.latexModal) {
      this.elements.latexModal.addEventListener('click', (e) => {
        if (e.target === this.elements.latexModal) {
          this.closeLatexModal();
        }
      });
    }
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
    if (this.elements.steps && this.elements.steps.length > 0) {
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
    if (this.elements.latexSection) {
      this.elements.latexSection.style.display = 'none';
    }
    if (this.elements.fileLists) {
      this.elements.fileLists.style.display = 'none';
    }

    // Show relevant content based on step
    switch (stepNumber) {
      case 1:
        // Show PDF and OCR results
        break;
      case 2:
        if (this.currentLatexContent && this.elements.latexSection) {
          this.elements.latexSection.style.display = 'block';
        }
        break;
      case 3:
        // PDF conversion step - keep LaTeX visible
        if (this.currentLatexContent && this.elements.latexSection) {
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
      if (this.elements.generateDesignOllama) {
        this.elements.generateDesignOllama.disabled = true;
      }

      const result = await window.electronAPI.generateDesignDocumentOllama(
        this.currentOcrData,
        this.getFileName(this.currentFile)
      );

      if (result.success) {
        this.currentLatexContent = result.latex;
        this.currentLatexPath = result.savedPath;

        this.updateStatus('✅ Design document generated with Ollama!', 'success');
        
        if (this.elements.convertToPdf) this.elements.convertToPdf.disabled = false;
        if (this.elements.previewLatex) this.elements.previewLatex.disabled = false;
        
        this.updateStepNavigation(3);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.updateStatus(`❌ Ollama generation failed: ${error.message}`, 'error');
    } finally {
      if (this.elements.generateDesignOllama) {
        this.elements.generateDesignOllama.disabled = false;
      }
    }
  }

  async selectFile() {
    console.log('selectFile button clicked');
    try {
      const filePath = await window.electronAPI.selectPdfFile();
      console.log('File picked:', filePath);
      
      if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
        this.currentFile = filePath;
        
        // Get filename before using it
        const fileName = this.getFileName(filePath);
        
        // Enable buttons and update UI
        if (this.elements.processOcr) this.elements.processOcr.disabled = false;
        if (this.elements.refreshPdf) this.elements.refreshPdf.disabled = false;
        
        // Update status and display preview
        this.updateStatus(`Selected: ${fileName}`, 'success');
        this.displayPdfPreview(filePath);
        
      } else {
        this.updateStatus('No file selected', 'info');
        if (this.elements.processOcr) this.elements.processOcr.disabled = true;
      }
    } catch (error) {
      this.updateStatus(`Error selecting file: ${error.message}`, 'error');
      if (this.elements.processOcr) this.elements.processOcr.disabled = true;
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
    if (!this.elements.pdfViewer) return;
    
    const fileName = this.getFileName(filePath);
    this.elements.pdfViewer.innerHTML = `
      <div class="pdf-preview">
        <h3>Selected PDF</h3>
        <p><strong>File:</strong> ${fileName}</p>
        <p><strong>Path:</strong> ${filePath}</p>
        <p>Click "Start OCR" to extract text and data from this PDF.</p>
      </div>
    `;
  }

  async processOCR() {
    console.log('🔍 processOCR method called');
    console.log('🔍 currentFile:', this.currentFile);
    console.log('🔍 processOcr button disabled state:', this.elements.processOcr?.disabled);
    
    if (!this.currentFile) {
      console.log('🔍 No current file, exiting early');
      this.updateStatus('No file selected', 'error');
      return;
    }

    try {
      console.log('🔍 Starting OCR process...');
      this.updateStatus('Processing PDF with Mistral OCR...', 'processing');
      this.showProgress(20);
      
      if (this.elements.processOcr) this.elements.processOcr.disabled = true;
      
      console.log('🔍 About to call window.electronAPI.processPdfOcr...');
      const result = await window.electronAPI.processPdfOcr(this.currentFile);
      console.log('🔍 OCR result received:', result);
      
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
          
          // Enable next step buttons
          if (this.elements.generateDesign) this.elements.generateDesign.disabled = false;
          if (this.elements.generateDesignOllama) this.elements.generateDesignOllama.disabled = false;
          if (this.elements.copyOcrResults) this.elements.copyOcrResults.disabled = false;
          
          this.updateStepNavigation(2);
          console.log('🔍 OCR process completed successfully');
        } else {
          this.updateStatus(`OCR completed but save failed: ${saveResult.error}`, 'warning');
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('🔍 OCR error:', error);
      this.updateStatus(`OCR processing failed: ${error.message}`, 'error');
    } finally {
      if (this.elements.processOcr) this.elements.processOcr.disabled = false;
      this.hideProgress();
      console.log('🔍 processOCR method finished');
    }
  }

  displayOCRResults(ocrResult) {
    if (!this.elements.ocrResults) return;
    
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
      if (this.elements.generateDesign) this.elements.generateDesign.disabled = true;

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
        
        if (this.elements.previewLatex) this.elements.previewLatex.disabled = false;
        if (this.elements.editLatex) this.elements.editLatex.disabled = false;
        if (this.elements.copyLatex) this.elements.copyLatex.disabled = false;
        if (this.elements.convertToPdf) this.elements.convertToPdf.disabled = false;

        if (this.elements.latexSection) this.elements.latexSection.style.display = 'block';
        this.updateStepNavigation(3);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.updateStatus(`Design document generation failed: ${error.message}`, 'error');
    } finally {
      if (this.elements.generateDesign) this.elements.generateDesign.disabled = false;
      this.hideProgress();
    }
  }

  displayLatexContent(latexContent, metadata) {
    if (!this.elements.latexContent) return;
    
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
    if (!this.elements.latexSection || !this.elements.previewLatex) return;
    
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
      if (this.elements.convertToPdf) this.elements.convertToPdf.disabled = true;

      const result = await window.electronAPI.convertLatexToPdf(this.currentLatexPath);
      this.showProgress(80);

      if (result.success) {
        this.currentPdfPath = result.pdfPath;
        this.showProgress(100);

        this.updateStatus('PDF generated successfully!', 'success');
        if (this.elements.downloadPdf) this.elements.downloadPdf.disabled = false;

        // Show success message with file info
        const fileName = this.getFileName(result.pdfPath);
        this.updateStatus(`PDF created: ${fileName}`, 'success');
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.updateStatus(`PDF conversion failed: ${error.message}`, 'error');
    } finally {
      if (this.elements.convertToPdf) this.elements.convertToPdf.disabled = false;
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
    if (!this.elements.fileLists) return;
    
    const isVisible = this.elements.fileLists.style.display !== 'none';

    if (isVisible) {
      this.elements.fileLists.style.display = 'none';
    } else {
      await this.loadSavedFiles();
      this.elements.fileLists.style.display = 'block';
    }
  }

  async toggleDesignDocuments() {
    if (!this.elements.fileLists) return;
    
    const isVisible = this.elements.fileLists.style.display !== 'none';

    if (isVisible) {
      this.elements.fileLists.style.display = 'none';
    } else {
      await this.loadDesignDocuments();
      this.elements.fileLists.style.display = 'block';
    }
  }

  async loadSavedFiles() {
    if (!this.elements.filesList) return;
    
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
    if (!this.elements.designFilesList) return;
    
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
        
        if (this.elements.generateDesign) this.elements.generateDesign.disabled = false;
        if (this.elements.generateDesignOllama) this.elements.generateDesignOllama.disabled = false;
        if (this.elements.copyOcrResults) this.elements.copyOcrResults.disabled = false;
        
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
        // For now, just indicate that we opened it
        this.updateStatus(`Loaded LaTeX document: ${this.getFileName(filePath)}`, 'success');
      }
    } catch (error) {
      this.updateStatus(`Error opening design document: ${error.message}`, 'error');
    }
  }

  // LaTeX Editor Functions
  openLatexEditor() {
    if (!this.currentLatexContent || !this.elements.latexEditor || !this.elements.latexModal) {
      this.updateStatus('No LaTeX content to edit', 'error');
      return;
    }

    this.elements.latexEditor.value = this.currentLatexContent;
    this.elements.latexModal.style.display = 'flex';
  }

  closeLatexModal() {
    if (this.elements.latexModal) {
      this.elements.latexModal.style.display = 'none';
    }
  }

  async saveLatexChanges() {
    if (!this.elements.latexEditor) return;
    
    try {
      const newContent = this.elements.latexEditor.value;
      this.currentLatexContent = newContent;
      
      this.displayLatexContent(newContent, {
        generatedAt: new Date().toISOString(),
        model: 'User edited',
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

    // For now, just indicate that we would save it
    this.updateStatus('LaTeX document would be saved here', 'info');
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
    if (this.elements.progressBar && this.elements.progressFill) {
      this.elements.progressBar.style.display = 'block';
      this.elements.progressFill.style.width = `${percentage}%`;
    }
  }

  hideProgress() {
    setTimeout(() => {
      if (this.elements.progressBar && this.elements.progressFill) {
        this.elements.progressBar.style.display = 'none';
        this.elements.progressFill.style.width = '0%';
      }
    }, 1000);
  }

  escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateStatus(message, type = 'info') {
    // Add null check for status element
    if (!this.elements.status) {
      console.warn('❌ Status element not found, logging message:', message);
      return;
    }

    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (this.elements.status && this.elements.status.classList.contains('success')) {
          this.elements.status.textContent = 'Ready for next operation';
          this.elements.status.className = 'status';
        }
      }, 5000);
    }
  }
}
