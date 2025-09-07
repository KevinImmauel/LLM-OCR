const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const OCRMainHandler = require("./ocr-main");
const GeminiHandler = require("./gemini-handler");
const LaTeXConverter = require("./latex-converter");
const LocalLLMHandler = require("./local-llm-handler");

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join("=");
        }
      }
    }
  }
}

loadEnv();

// Linux optimizations
if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("--disable-gpu");
  app.commandLine.appendSwitch("--disable-gpu-compositing");

  // Suppress GTK warnings
  process.env.GTK_DEBUG = "";
}

class App {
  constructor() {
    this.mainWindow = null;
    this.ocrHandler = null;
    this.geminiHandler = null;
    this.latexConverter = null;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    app.whenReady().then(() => {
      this.initializeHandlers();
      this.createWindow();
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") app.quit();
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
    });

    // Remove possible existing handlers before registering new ones
    ipcMain.removeHandler("select-pdf-file");
    ipcMain.removeHandler("process-pdf-ocr");
    ipcMain.removeHandler("generate-design-document");
    ipcMain.removeHandler("convert-latex-to-pdf");
    ipcMain.removeHandler("save-ocr-data");
    ipcMain.removeHandler("get-saved-files");
    ipcMain.removeHandler("read-saved-file");
    ipcMain.removeHandler("get-design-documents");
    ipcMain.removeHandler("open-external");
    ipcMain.removeHandler("show-item-in-folder");
    ipcMain.removeHandler("check-ollama-ready");
    ipcMain.removeHandler("generate-design-document-ollama");
    ipcMain.removeHandler("check-ocr-ready");
    ipcMain.removeHandler("check-gemini-ready");
    ipcMain.removeHandler("check-latex-installation");

    // Then register handlers
    ipcMain.handle("select-pdf-file", this.handleSelectPdfFile.bind(this));
    ipcMain.handle("process-pdf-ocr", this.handleProcessPdfOCR.bind(this));
    ipcMain.handle(
      "generate-design-document",
      this.handleGenerateDesignDocument.bind(this)
    );
    ipcMain.handle(
      "generate-design-document-ollama",
      this.handleGenerateDesignDocumentOllama.bind(this)
    );
    ipcMain.handle(
      "convert-latex-to-pdf",
      this.handleConvertLatexToPdf.bind(this)
    );
    ipcMain.handle("save-ocr-data", this.handleSaveOcrData.bind(this));
    ipcMain.handle("get-saved-files", this.handleGetSavedFiles.bind(this));
    ipcMain.handle("read-saved-file", this.handleReadSavedFile.bind(this));
    ipcMain.handle(
      "get-design-documents",
      this.handleGetDesignDocuments.bind(this)
    );
    ipcMain.handle("open-external", this.handleOpenExternal.bind(this));
    ipcMain.handle(
      "show-item-in-folder",
      this.handleShowItemInFolder.bind(this)
    );
    ipcMain.handle(
      "check-ollama-ready",
      this.handleCheckOllamaReady.bind(this)
    );
    ipcMain.handle("check-ocr-ready", this.handleCheckOCRReady.bind(this));
    ipcMain.handle(
      "check-gemini-ready",
      this.handleCheckGeminiReady.bind(this)
    );
    ipcMain.handle(
      "check-latex-installation",
      this.handleCheckLatexInstallation.bind(this)
    );
  }

  initializeHandlers() {
    // Initialize OCR handler
    try {
      this.ocrHandler = new OCRMainHandler();
      console.log("OCR handler initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OCR handler:", error);
      this.ocrHandler = null;
    }

    try {
      this.localLLMHandler = new LocalLLMHandler();
      console.log("🤖 Ollama handler initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Ollama handler:", error);
      this.localLLMHandler = null;
    }

    // Initialize Gemini handler
    try {
      this.geminiHandler = new GeminiHandler();
      console.log(
        "Gemini handler initialized successfully for comprehensive documents"
      );
    } catch (error) {
      console.error("Failed to initialize Gemini handler:", error);
      this.geminiHandler = null;
    }

    // Initialize LaTeX converter
    try {
      this.latexConverter = new LaTeXConverter();
      console.log("Enhanced LaTeX converter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize LaTeX converter:", error);
      this.latexConverter = null;
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 1000,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        webSecurity: true,
      },
      icon:
        process.platform === "linux"
          ? path.join(__dirname, "../assets/icon.png")
          : undefined,
      title: "Comprehensive PDF OCR + Design Document Generator",
    });

    this.mainWindow.loadFile(path.join(__dirname, "index.html"));

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });

    if (process.argv.includes("--dev")) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  // System status handlers
  async handleCheckOCRReady() {
    return {
      ready: !!this.ocrHandler,
      error: !this.ocrHandler
        ? "OCR handler not initialized. Check your MISTRAL_API_KEY."
        : null,
    };
  }

  async handleCheckGeminiReady() {
    return {
      ready: !!this.geminiHandler,
      error: !this.geminiHandler
        ? "Gemini handler not initialized. Check your GEMINI_API_KEY."
        : null,
    };
  }

  async handleCheckLatexInstallation() {
    if (!this.latexConverter) {
      return { installed: false, error: "LaTeX converter not initialized" };
    }

    const installed = await this.latexConverter.checkLatexInstallation();
    return {
      installed,
      error: !installed
        ? "LaTeX not found. Please install TeX Live, MiKTeX, or another LaTeX distribution."
        : null,
    };
  }

  async handleCheckOllamaReady() {
    if (!this.localLLMHandler) {
      return { ready: false, error: "Ollama handler not initialized" };
    }

    const health = await this.localLLMHandler.checkHealth();
    return {
      ready: health.healthy,
      error: health.healthy ? null : health.error,
      models: health.models,
      currentModel: health.currentModel,
    };
  }

  async handleGenerateDesignDocumentOllama(event, ocrData, filename) {
    try {
      if (!this.localLLMHandler) {
        throw new Error("Ollama handler not available");
      }

      console.log(`🤖 Generating design document with Ollama for: ${filename}`);
      const result = await this.localLLMHandler.generateDesignDocument(ocrData);

      if (result.success) {
        const saveResult = await this.localLLMHandler.saveDesignDocument(
          result.latex,
          filename
        );
        return {
          success: true,
          latex: result.latex,
          metadata: result.metadata,
          savedPath: saveResult.success ? saveResult.path : null,
          savedFilename: saveResult.success ? saveResult.filename : null,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ Error generating design document with Ollama:", error);
      return { success: false, error: error.message };
    }
  }

  // File operations
  async handleSelectPdfFile() {
    try {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ["openFile"],
        filters: [
          { name: "PDF Files", extensions: ["pdf"] },
          { name: "All Files", extensions: ["*"] },
        ],
        title: "Select PDF Requirements Document",
        defaultPath:
          process.platform === "linux" ? require("os").homedir() : undefined,
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      console.error("File dialog error:", error);
      return null;
    }
  }

  // OCR processing
  async handleProcessPdfOCR(event, filePath) {
    try {
      if (!this.ocrHandler) {
        throw new Error("OCR handler not available");
      }

      if (!filePath || typeof filePath !== "string") {
        throw new Error("Invalid file path provided");
      }

      console.log(`Processing PDF for comprehensive analysis: ${filePath}`);

      const buffer = await fs.readFile(filePath);
      const base64Data = buffer.toString("base64");
      const filename = path.basename(filePath);

      const result = await this.ocrHandler.processWithBase64(
        base64Data,
        filename
      );

      console.log(
        `OCR completed. Text length: ${
          result.extractedText?.length || 0
        } characters`
      );

      return { success: true, data: result };
    } catch (error) {
      console.error("Error processing PDF OCR:", error);
      return { success: false, error: error.message };
    }
  }

  // Design document generation
  async handleGenerateDesignDocument(event, ocrData, filename) {
    try {
      if (!this.geminiHandler) {
        throw new Error("Gemini handler not available");
      }

      console.log(`Generating comprehensive design document for: ${filename}`);
      console.log(
        `Input data size: ${JSON.stringify(ocrData).length} characters`
      );

      const result = await this.geminiHandler.generateDesignDocument(ocrData);

      if (result.success) {
        // Save the LaTeX document
        const saveResult = await this.geminiHandler.saveDesignDocument(
          result.latex,
          filename
        );

        console.log(
          `Design document generated: ${result.latex.length} characters`
        );
        console.log(`Estimated pages: ${result.metadata.estimatedPages}`);

        return {
          success: true,
          latex: result.latex,
          metadata: result.metadata,
          savedPath: saveResult.success ? saveResult.path : null,
          savedFilename: saveResult.success ? saveResult.filename : null,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error generating design document:", error);
      return { success: false, error: error.message };
    }
  }

  // LaTeX to PDF conversion
  async handleConvertLatexToPdf(event, latexFilePath) {
    try {
      if (!this.latexConverter) {
        throw new Error("LaTeX converter not available");
      }

      console.log(`Converting comprehensive LaTeX document: ${latexFilePath}`);

      // Validate LaTeX syntax first
      const validation = await this.latexConverter.validateLatexSyntax(
        latexFilePath
      );
      if (!validation.isValid) {
        console.warn("LaTeX validation issues detected:", validation.issues);
      }

      const result = await this.latexConverter.convertToPDF(latexFilePath);

      console.log(`PDF conversion completed: ${result.pdfPath}`);
      console.log(`File size: ${Math.round(result.fileSize / 1024)} KB`);
      if (result.pages) {
        console.log(`Pages: ${result.pages}`);
      }

      return {
        success: true,
        pdfPath: result.pdfPath,
        log: result.log,
        fileSize: result.fileSize,
        pages: result.pages,
      };
    } catch (error) {
      console.error("Error converting LaTeX to PDF:", error);
      return { success: false, error: error.message };
    }
  }

  // Data management
  async handleSaveOcrData(event, data, filename) {
    try {
      const extractedDataDir = path.join(__dirname, "..", "extracted-data");
      await fs.ensureDir(extractedDataDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedFilename = filename
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const outputFilename = `${sanitizedFilename}_ocr_${timestamp}.json`;
      const outputPath = path.join(extractedDataDir, outputFilename);

      // Add metadata to saved data
      const enrichedData = {
        ...data,
        savedMetadata: {
          originalFilename: filename,
          savedAt: new Date().toISOString(),
          version: "2.0",
          application: "Comprehensive PDF OCR + Design Generator",
        },
      };

      await fs.writeJson(outputPath, enrichedData, { spaces: 2 });

      return { success: true, path: outputPath };
    } catch (error) {
      console.error("Error saving OCR data:", error);
      return { success: false, error: error.message };
    }
  }

  async handleGetSavedFiles() {
    try {
      const extractedDataDir = path.join(__dirname, "..", "extracted-data");
      await fs.ensureDir(extractedDataDir);

      const files = await fs.readdir(extractedDataDir);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      const fileList = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(extractedDataDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            created: stats.birthtime,
            modified: stats.mtime,
            size: stats.size,
            type: "ocr-data",
          };
        })
      );

      return fileList.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error("Error getting saved files:", error);
      return [];
    }
  }

  async handleReadSavedFile(event, filePath) {
    try {
      if (!filePath || typeof filePath !== "string") {
        return null;
      }

      const data = await fs.readJson(filePath);
      return data;
    } catch (error) {
      console.error("Error reading saved file:", error);
      return null;
    }
  }

  async handleGetDesignDocuments() {
    try {
      const designDocsDir = path.join(__dirname, "..", "design-documents");
      await fs.ensureDir(designDocsDir);

      const files = await fs.readdir(designDocsDir);
      const documentFiles = files.filter(
        (file) => file.endsWith(".tex") || file.endsWith(".pdf")
      );

      const fileList = await Promise.all(
        documentFiles.map(async (file) => {
          const filePath = path.join(designDocsDir, file);
          const stats = await fs.stat(filePath);
          const extension = path.extname(file);

          return {
            name: file,
            path: filePath,
            type: extension === ".pdf" ? "pdf" : "latex",
            created: stats.birthtime,
            modified: stats.mtime,
            size: stats.size,
          };
        })
      );

      return fileList.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error("Error getting design documents:", error);
      return [];
    }
  }

  // System operations
  async handleOpenExternal(event, filePath) {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error("Error opening external file:", error);
      return { success: false, error: error.message };
    }
  }

  async handleShowItemInFolder(event, filePath) {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error("Error showing item in folder:", error);
      return { success: false, error: error.message };
    }
  }
}

new App();
