const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs-extra');
const path = require('path');
const LaTeXTemplates = require('./latex-templates');

class GeminiHandler {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
            },
        });
    }

    async generateDesignDocument(ocrData) {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                console.log(`Generating comprehensive AI-powered design document... (Attempt ${retryCount + 1})`);
                
                const prompt = this.createComprehensivePrompt(ocrData);
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                let designDocument = response.text();

                // Clean and validate the LaTeX
                designDocument = this.cleanAndValidateLatex(designDocument);
                
                console.log('Comprehensive AI-powered design document generated successfully');
                return {
                    success: true,
                    latex: designDocument,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        model: 'gemini-1.5-flash',
                        inputSource: 'mistral-ocr',
                        attempt: retryCount + 1,
                        contentLength: designDocument.length,
                        estimatedPages: Math.ceil(designDocument.length / 3000),
                        hasCustomDiagrams: true
                    }
                };
            } catch (error) {
                console.error(`Attempt ${retryCount + 1} failed:`, error.message);
                if (error.message.includes('429') && retryCount < maxRetries - 1) {
                    const waitTime = Math.pow(2, retryCount) * 15000;
                    console.log(`Rate limit hit. Waiting ${waitTime/1000} seconds before retry...`);
                    await this.sleep(waitTime);
                    retryCount++;
                    continue;
                }

                return {
                    success: false,
                    error: this.formatErrorMessage(error)
                };
            }
        }

        return {
            success: false,
            error: 'Failed after maximum retries. Please try again later.'
        };
    }

    createComprehensivePrompt(ocrData) {
        const { extractedText, markdown, metadata, structure } = ocrData;
        const content = markdown || extractedText || '';

        // Get templates
        const templates = {
            systemArch: LaTeXTemplates.getSystemArchitectureDiagram(),
            database: LaTeXTemplates.getDatabaseERDiagram(),
            deployment: LaTeXTemplates.getDeploymentDiagram(),
            apiFlow: LaTeXTemplates.getAPIFlowDiagram(),
            security: LaTeXTemplates.getSecurityFlowDiagram()
        };

        return `You are a senior software architect AI generating a COMPREHENSIVE, DETAILED software design document. Your task is to create a professional, multi-page document with rich content and customized diagrams.

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

DIAGRAM TEMPLATES (CUSTOMIZE THESE):

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
- Change node labels to match the project (e.g., "Customer Service" instead of "Authentication Service")
- Update database entity names based on the content domain
- Modify API endpoint names to reflect actual functionality
- Adjust service names to be project-specific
- Keep all LaTeX syntax intact - only change text content

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
\\textbf{Classification} & Internal Use \\\\
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

\\subsection{Project Scope and Objectives}
[300+ words detailing project scope, objectives, and success criteria]

\\subsection{Key Stakeholders and Roles}
[200+ words defining stakeholder groups and responsibilities]

\\section{Requirements Analysis and Specification}

\\subsection{Extracted Requirements Summary}
Based on the document analysis: [Include the actual extracted content here, cleaned and formatted]

\\subsection{Functional Requirements}
[Generate 10-15 detailed functional requirements with acceptance criteria based on content]

\\subsection{Non-Functional Requirements}
[Detailed performance, scalability, security requirements with specific metrics]

\\section{System Architecture and Design}

\\subsection{Architecture Overview}
[400+ words describing the chosen architecture pattern with detailed justification]

[CUSTOMIZE AND INCLUDE THE SYSTEM ARCHITECTURE DIAGRAM HERE - change service names, database names, etc. to match the project]

\\subsection{Component Interaction and Communication}
[300+ words detailing component communication, APIs, data flow]

\\section{Database Design and Data Architecture}

\\subsection{Conceptual Data Model}
[400+ words on database design principles and entity relationships]

[CUSTOMIZE AND INCLUDE THE DATABASE ER DIAGRAM HERE - change entity names and fields to match the project domain]

\\subsection{Physical Database Design}
[Include detailed table structures, indexes, constraints with code examples]

\\section{API Design and Integration}

\\subsection{RESTful API Specification}
[Comprehensive API documentation with detailed endpoint descriptions]

[CUSTOMIZE AND INCLUDE THE API FLOW DIAGRAM HERE - change endpoint names and flow to match actual APIs]

\\subsection{API Security and Rate Limiting}
[Detailed security implementation for APIs]

\\section{Security Architecture and Implementation}

\\subsection{Security Requirements and Threat Model}
[Comprehensive security analysis with threat identification]

[INCLUDE THE SECURITY FLOW DIAGRAM HERE - customize security layers for the specific project]

\\section{Deployment and Infrastructure}

\\subsection{Cloud Infrastructure Design}
[Detailed deployment strategy with auto-scaling and disaster recovery]

[CUSTOMIZE AND INCLUDE THE DEPLOYMENT DIAGRAM HERE - adjust infrastructure components for the project]

\\section{Performance and Scalability}
[Detailed performance requirements and optimization strategies]

\\section{Testing and Quality Assurance}
[Comprehensive testing strategy with specific test types and coverage requirements]

\\section{Risk Assessment and Mitigation}
[Detailed risk analysis with probability, impact, and mitigation strategies]

\\section{Implementation Roadmap and Timeline}
[Phase-by-phase implementation plan with specific milestones and deliverables]

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

Generate the complete document now with rich, detailed content and customized diagrams!`;
    }

    cleanAndValidateLatex(content) {
        // Comprehensive LaTeX cleaning and validation
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

        // Fix character escaping - be more careful with TikZ coordinates
        cleaned = cleaned
            // Fix unescaped characters but preserve TikZ math mode
            .replace(/([^\\])&(?![a-zA-Z]+;)/g, '$1\\&')
            .replace(/([^\\])%(?![0-9])/g, '$1\\%')
            .replace(/([^\\])#(?![0-9])/g, '$1\\#')
            // Fix underscores but not in TikZ node names
            .replace(/([^\\])_(?![a-zA-Z0-9])/g, '$1\\_')
            // Fix quotes and dashes
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/—/g, '---')
            .replace(/–/g, '--')
            // Clean up whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        return cleaned;
    }

    findInsertionPoint(content) {
        // Find the last package declaration
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

    formatErrorMessage(error) {
        if (error.message.includes('429')) {
            return 'Gemini API quota exceeded. Please wait a few minutes before trying again.';
        } else if (error.message.includes('quota')) {
            return 'API quota exceeded. Consider upgrading to a paid plan for higher limits or try again later.';
        }
        return error.message;
    }

    async saveDesignDocument(latexContent, filename) {
        try {
            const designDocsDir = path.join(__dirname, '..', 'design-documents');
            await fs.ensureDir(designDocsDir);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const latexFilename = `${sanitizedFilename}_comprehensive_design_${timestamp}.tex`;
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

module.exports = GeminiHandler;
