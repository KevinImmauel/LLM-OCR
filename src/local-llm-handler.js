const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const LaTeXTemplates = require('./latex-templates');

class LocalLLMHandler {
    constructor() {
    this.baseURL = 'http://127.0.0.1:11434'; // Change from localhost to IP
    this.model = 'tinyllama';
    this.timeout = 300000;
}

    async generateDesignDocument(ocrData) {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                console.log(`🤖 Generating design document with Ollama... (Attempt ${retryCount + 1})`);
                
                const prompt = this.createComprehensivePrompt(ocrData);
                const response = await this.callOllamaAPI(prompt);
                const designDocument = this.cleanAndValidateLatex(response);
                
                console.log('✅ Ollama design document generated successfully');
                return {
                    success: true,
                    latex: designDocument,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        model: `ollama-${this.model}`,
                        inputSource: 'mistral-ocr',
                        attempt: retryCount + 1,
                        contentLength: designDocument.length,
                        estimatedPages: Math.ceil(designDocument.length / 3000),
                        isLocalLLM: true
                    }
                };
            } catch (error) {
                console.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    const waitTime = Math.pow(2, retryCount) * 5000;
                    console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);
                    await this.sleep(waitTime);
                    continue;
                }

                return {
                    success: false,
                    error: `Ollama failed: ${error.message}`
                };
            }
        }

        return {
            success: false,
            error: 'Failed after maximum retries with Ollama.'
        };
    }

    async callOllamaAPI(prompt) {
    try {
        console.log('🔍 Electron Network Debug:');
        console.log('  Process type:', process.type || 'main');
        console.log('  baseURL:', this.baseURL);
        console.log('  Working directory:', process.cwd());
        console.log('  Proxy env vars:', {
            HTTP_PROXY: process.env.HTTP_PROXY,
            http_proxy: process.env.http_proxy,
            HTTPS_PROXY: process.env.HTTPS_PROXY,
            https_proxy: process.env.https_proxy
        });
        
        console.log(`📡 Calling Ollama API with model: ${this.model}`);
        
        const response = await axios.post(`${this.baseURL}/api/generate`, {
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
    temperature: 0.3,
    top_p: 0.8,
    num_predict: 8192,      // How much it can generate
                num_ctx: 16384,         // Context window size (INCREASED)
                stop: ["\\end{document}"]
}
        }, {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json'
            },
            proxy: false // Explicitly disable proxy
        });

        if (!response.data || !response.data.response) {
            throw new Error('Invalid response from Ollama API');
        }

        return response.data.response;
    } catch (error) {
        console.error('❌ Electron Ollama Error:');
        console.error('  Code:', error.code);
        console.error('  Message:', error.message);
        console.error('  URL:', error.config?.url);
        console.error('  Proxy:', error.config?.proxy);
        
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Electron cannot connect to Ollama. Try running app from terminal where curl works.');
        }
        throw new Error(`Ollama API error: ${error.message}`);
    }
}


    createComprehensivePrompt(ocrData) {
        const { extractedText, markdown, metadata, structure } = ocrData;
        const content = markdown || extractedText || '';

        const templates = {
            systemArch: LaTeXTemplates.getSystemArchitectureDiagram(),
            database: LaTeXTemplates.getDatabaseERDiagram(),
            deployment: LaTeXTemplates.getDeploymentDiagram(),
            apiFlow: LaTeXTemplates.getAPIFlowDiagram(),
            security: LaTeXTemplates.getSecurityFlowDiagram()
        };

        return `You are a senior software architect AI generating a COMPREHENSIVE, DETAILED software design document. Create a professional, multi-page document with rich content and customized diagrams.

EXTRACTED CONTENT TO ANALYZE:
${content.substring(0, 3500)}

DOCUMENT STRUCTURE INFO:
- Headers found: ${structure.headers?.length || 0}
- Tables found: ${structure.tables?.length || 0}
- Lists found: ${structure.lists?.length || 0}

MANDATORY REQUIREMENTS:
1. Generate a MINIMUM 15-page comprehensive document
2. ALWAYS include diagrams - customize them based on content
3. Fill in realistic details and best practices if content is sparse
4. Each section must have substantial, detailed content (300+ words minimum)
5. Include proper title page, table of contents, and professional structure

DIAGRAM TEMPLATES (CUSTOMIZE THESE BASED ON CONTENT):

SYSTEM ARCHITECTURE TEMPLATE:
${templates.systemArch}

DATABASE TEMPLATE:
${templates.database}

API FLOW TEMPLATE:
${templates.apiFlow}

SECURITY TEMPLATE:
${templates.security}

DEPLOYMENT TEMPLATE:
${templates.deployment}

INSTRUCTIONS FOR DIAGRAM CUSTOMIZATION:
- Change node labels to match the project (e.g., "Student Portal" instead of "Authentication Service")
- Update database entity names based on the content domain
- Modify API endpoint names to reflect actual functionality
- Adjust service names to be project-specific
- Keep all LaTeX syntax intact - only change text content within nodes

GENERATE THIS EXACT STRUCTURE:

\\documentclass[11pt,a4paper,oneside]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{hyperref}
\\usepackage{booktabs,longtable}
\\usepackage{tikz}
\\usetikzlibrary{shapes,arrows,positioning,calc,decorations.pathmorphing,backgrounds,fit,shadows}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage{enumitem}
\\usepackage{float}

\\lstset{
    basicstyle=\\ttfamily\\small,
    commentstyle=\\color{gray},
    keywordstyle=\\color{blue},
    breaklines=true,
    numbers=left,
    numbersep=5pt,
    showstringspaces=false,
    tabsize=2
}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{Software Design Document}
\\fancyhead[R]{Version 1.0}
\\fancyfoot[C]{\\thepage}

\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=cyan,
    pdftitle={Comprehensive Software Design Document},
    pdfauthor={AI System Architect},
    pdfsubject={Software Architecture}
}

\\title{\\Huge\\textbf{Comprehensive Software Design Document}}
\\author{\\Large AI System Architect}
\\date{\\Large\\today}

\\begin{document}

\\maketitle
\\thispagestyle{empty}
\\vfill

\\begin{center}
\\large
\\begin{tabular}{|l|l|}
\\hline
\\textbf{Document Version} & 1.0 \\\\
\\hline
\\textbf{Creation Date} & \\today \\\\
\\hline
\\textbf{Document Status} & Final Draft \\\\
\\hline
\\textbf{Generated By} & AI System Architect \\\\
\\hline
\\textbf{Target Audience} & Development Team, Stakeholders \\\\
\\hline
\\end{tabular}
\\end{center}

\\newpage
\\tableofcontents
\\newpage
\\listoffigures
\\newpage

\\section{Executive Summary}
[Generate 400-500 words covering project overview, business objectives, technical approach, key benefits, and implementation timeline. Base this on the extracted content but fill in realistic details.]

\\section{Requirements Analysis and Specification}
[Detailed requirements analysis with functional and non-functional requirements]

\\section{System Architecture and Design}
[400+ words describing the chosen architecture pattern with detailed justification]
[CUSTOMIZE AND INCLUDE THE SYSTEM ARCHITECTURE DIAGRAM HERE]

\\section{Database Design and Data Architecture}
[400+ words on database design principles and entity relationships]
[CUSTOMIZE AND INCLUDE THE DATABASE ER DIAGRAM HERE]

\\section{API Design and Integration}
[Comprehensive API documentation with detailed endpoint descriptions]
[CUSTOMIZE AND INCLUDE THE API FLOW DIAGRAM HERE]

\\section{Security Architecture and Implementation}
[Comprehensive security analysis with threat identification]
[INCLUDE THE SECURITY FLOW DIAGRAM HERE]

\\section{Deployment and Infrastructure}
[Detailed deployment strategy with auto-scaling and disaster recovery]
[CUSTOMIZE AND INCLUDE THE DEPLOYMENT DIAGRAM HERE]

\\section{Performance and Scalability}
[Detailed performance requirements and optimization strategies]

\\section{Testing and Quality Assurance}
[Comprehensive testing strategy with specific test types]

\\section{Risk Assessment and Mitigation}
[Detailed risk analysis with probability, impact, and mitigation strategies]

\\section{Implementation Roadmap and Timeline}
[Phase-by-phase implementation plan with specific milestones]

\\section{Monitoring and Maintenance}
[System monitoring, alerting, and long-term maintenance procedures]

\\section{Conclusion}
[Comprehensive summary tying together all aspects of the design]

\\end{document}

CRITICAL SUCCESS REQUIREMENTS:
1. ALWAYS customize diagram node names/labels based on the extracted content
2. Generate substantial content for every section (no short paragraphs)
3. If content is sparse, use software engineering best practices to fill gaps
4. Include realistic examples, code samples, and technical specifications
5. Ensure proper LaTeX syntax and compilation
6. Make the document comprehensive and professional (15+ pages)
7. NEVER skip diagrams - always include customized versions

Generate the complete document now with rich, detailed content and customized diagrams based on the specific project requirements identified in the extracted content!`;
    }

    cleanAndValidateLatex(content) {
        let cleaned = content;

        // Remove any text before documentclass
        const docClassMatch = cleaned.match(/\\documentclass/);
        if (docClassMatch) {
            cleaned = cleaned.substring(cleaned.indexOf('\\documentclass'));
        }

        // Ensure proper document structure
        if (!cleaned.includes('\\documentclass')) {
            cleaned = '\\documentclass[11pt,a4paper,oneside]{article}\n' + cleaned;
        }

        if (!cleaned.includes('\\begin{document}')) {
            const insertPoint = this.findInsertionPoint(cleaned);
            cleaned = cleaned.substring(0, insertPoint) + '\n\\begin{document}\n' + cleaned.substring(insertPoint);
        }

        if (!cleaned.includes('\\end{document}')) {
            cleaned += '\n\\end{document}';
        }

        // Fix character escaping carefully
        cleaned = cleaned
            .replace(/([^\\])&(?![a-zA-Z]+;)/g, '$1\\&')
            .replace(/([^\\])%(?![0-9])/g, '$1\\%')
            .replace(/([^\\])#(?![0-9])/g, '$1\\#')
            .replace(/([^\\])_(?![a-zA-Z0-9])/g, '$1\\_')
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/—/g, '---')
            .replace(/–/g, '--')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        return cleaned;
    }

    findInsertionPoint(content) {
        const patterns = [
            /\\hypersetup\{[^}]*\}/s,
            /\\lstset\{[^}]*\}/s,
            /\\usepackage[^}]*\}/g,
            /\\documentclass[^}]*\}/g
        ];

        let lastMatch = 0;
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                lastMatch = Math.max(lastMatch, match.index + match[0].length);
            }
        }

        return lastMatch > 0 ? lastMatch + 1 : content.length;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkHealth() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 5000 });
            return { 
                healthy: true, 
                models: response.data.models || [],
                currentModel: this.model
            };
        } catch (error) {
            return { 
                healthy: false, 
                error: error.code === 'ECONNREFUSED' 
                    ? 'Ollama server is not running. Start with: ollama serve'
                    : error.message
            };
        }
    }

    async saveDesignDocument(latexContent, filename) {
        try {
            const designDocsDir = path.join(__dirname, '..', 'design-documents');
            await fs.ensureDir(designDocsDir);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const latexFilename = `${sanitizedFilename}_ollama_${timestamp}.tex`;
            const latexFilePath = path.join(designDocsDir, latexFilename);

            await fs.writeFile(latexFilePath, latexContent, 'utf8');

            return {
                success: true,
                path: latexFilePath,
                filename: latexFilename
            };
        } catch (error) {
            console.error('Error saving design document:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = LocalLLMHandler;
