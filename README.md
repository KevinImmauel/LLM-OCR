# LLM-OCR

LLM-OCR is a desktop application that uses Optical Character Recognition (OCR) and Large Language Models (LLMs) to process PDF requirement documents and convert them into design documents using AI.

## Features

- **OCR:** Extract text from PDFs using Mistral AI.
- **LLM Integration:**
  - **Google Gemini:** Leverage the power of Google's Gemini model for advanced data extraction and analysis.
  - **Mistral AI:** Integrate with Mistral AI models for OCR and text generation.
  - **Local LLM:** Support for running a local LLM for offline processing.
- **Design Document Generation:** Convert extracted data from requirement documents into design documents.
- **LaTeX Conversion:**
  - Convert extracted data into LaTeX format using predefined templates.
  - Validate the generated LaTeX code.
- **User-Friendly Interface:** A simple and intuitive user interface built with Electron.

## Installation

To run this application locally, you'll need to have Node.js and npm installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kevinimmauel/LLM-OCR.git
   cd LLM-OCR
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Load a PDF:** Click on the "Load PDF" button to select a PDF file.

3. **Perform OCR:** The application will automatically perform OCR on the loaded PDF and display the extracted text.

4. **Use LLM features:** Use the provided UI elements to interact with the integrated LLMs (Gemini, Mistral, or local).

5. **Convert to LaTeX:** Click on the "Convert to LaTeX" button to convert the extracted data into LaTeX format.

## Development

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the application with hot-reloading enabled, so you can see your changes in real-time.

## Building

To build the application for your platform, use the following command:

```bash
npm run dist
```

This will create a distributable package in the `dist` directory.

## Dependencies

This project relies on the following key dependencies:

- **Electron:** A framework for building cross-platform desktop applications with JavaScript, HTML, and CSS.
- **@google/generative-ai:** The official Google AI JavaScript SDK for Gemini.
- **@mistralai/mistralai:** The official Mistral AI JavaScript SDK, used for OCR and text generation.
- **electron-builder:** A complete solution to package and build a ready for distribution Electron app.

For a full list of dependencies, please see the `package.json` file.