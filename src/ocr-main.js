const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs-extra');

class OCRMainHandler {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }
    this.client = new Mistral({ apiKey: this.apiKey });
  }

  async processWithBase64(base64Data, filename) {
    try {
      console.log('Processing OCR request for:', filename);
      
      const ocrResponse = await this.client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: `data:application/pdf;base64,${base64Data}`
        },
        includeImageBase64: true
      });
      
      console.log('OCR processing completed successfully');
      return this.formatOcrResponse(ocrResponse);
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  formatOcrResponse(ocrResponse) {
    return {
      extractedText: ocrResponse.text || '',
      markdown: ocrResponse.markdown || '',
      metadata: {
        processingTime: new Date().toISOString(),
        model: 'mistral-ocr-latest',
        pages: ocrResponse.pages || 0,
        confidence: ocrResponse.confidence || null
      },
      images: ocrResponse.images || [],
      structure: {
        headers: this.extractHeaders(ocrResponse.markdown || ''),
        tables: this.extractTables(ocrResponse.markdown || ''),
        lists: this.extractLists(ocrResponse.markdown || '')
      }
    };
  }

  extractHeaders(markdown) {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const headers = [];
    let match;
    
    while ((match = headerRegex.exec(markdown)) !== null) {
      headers.push({
        level: match[1].length,
        text: match[2].trim()
      });
    }
    
    return headers;
  }

  extractTables(markdown) {
    const lines = markdown.split('\n');
    const tables = [];
    let currentTableRows = [];
    
    for (const line of lines) {
      if (line.trim().match(/^\|.*\|$/)) {
        const row = line.trim().slice(1, -1).split('|').map(cell => cell.trim());
        currentTableRows.push(row);
      } else {
        if (currentTableRows.length > 0) {
          tables.push(currentTableRows);
          currentTableRows = [];
        }
      }
    }
    
    if (currentTableRows.length > 0) {
      tables.push(currentTableRows);
    }
    
    return tables;
  }

  extractLists(markdown) {
    const listRegex = /^[\s]*[-*+]\s+(.+)$/gm;
    const lists = [];
    let match;
    
    while ((match = listRegex.exec(markdown)) !== null) {
      lists.push(match[1].trim());
    }
    
    return lists;
  }
}

module.exports = OCRMainHandler;
