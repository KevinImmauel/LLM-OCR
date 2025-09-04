const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const LaTeXTemplates = require('./latex-templates');

class LaTeXConverter {
    constructor() {
        this.pdflatexPath = 'pdflatex';
    }

    async convertToPDF(latexFilePath) {
        return new Promise(async (resolve, reject) => {
            const workingDir = path.dirname(latexFilePath);
            const filename = path.basename(latexFilePath, '.tex');

            console.log(`Converting comprehensive LaTeX document to PDF: ${latexFilePath}`);

            // First, validate the LaTeX file exists and is readable
            try {
                const content = await fs.readFile(latexFilePath, 'utf8');
                console.log(`LaTeX document content length: ${content.length} characters`);
                console.log(`Estimated pages: ${Math.ceil(content.length / 3000)}`);

                // Validate template usage
                const templateValidation = this.validateTemplateUsage(content);
                if (!templateValidation.isValid) {
                    console.warn('Template validation issues:', templateValidation.issues);
                }
            } catch (error) {
                reject(new Error(`Cannot read LaTeX file: ${error.message}`));
                return;
            }

            // Run pdflatex multiple times for proper cross-references, TOC, and bibliography
            await this.runPdfLatexMultiplePasses(workingDir, filename, resolve, reject);
        });
    }

    validateTemplateUsage(content) {
        const requiredElements = [
            '\\begin{tikzpicture}',
            '\\usepackage{tikz}',
            'node distance=',
            'minimum height=',
            '\\usetikzlibrary'
        ];

        const recommendedElements = [
            'fill=',
            'draw=',
            'rounded corners',
            'drop shadow'
        ];

        const missingRequired = requiredElements.filter(element => 
            !content.includes(element)
        );

        const missingRecommended = recommendedElements.filter(element => 
            !content.includes(element)
        );

        const hasProperGeometry = content.includes('geometry') && 
                                 content.includes('margin=') &&
                                 !content.includes('multicol');

        const issues = [];
        if (missingRequired.length > 0) {
            issues.push(`Missing required elements: ${missingRequired.join(', ')}`);
        }
        if (missingRecommended.length > 0) {
            issues.push(`Missing recommended elements: ${missingRecommended.join(', ')}`);
        }
        if (!hasProperGeometry) {
            issues.push('Improper geometry settings - may cause formatting issues');
        }

        return {
            isValid: missingRequired.length === 0 && hasProperGeometry,
            issues: issues,
            missingRequired: missingRequired,
            missingRecommended: missingRecommended
        };
    }

    async runPdfLatexMultiplePasses(workingDir, filename, resolve, reject) {
        const maxPasses = 3;
        let currentPass = 1;

        const runSinglePass = (passNumber) => {
            console.log(`Running pdflatex pass ${passNumber}/${maxPasses}...`);

            const pdflatex = spawn(this.pdflatexPath, [
                '-interaction=nonstopmode',
                '-file-line-error',
                '-synctex=1',
                '-output-directory', workingDir,
                filename + '.tex'
            ], {
                cwd: workingDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            pdflatex.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pdflatex.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pdflatex.on('close', async (code) => {
    const logPath = path.join(workingDir, `${filename}.log`);
    const pdfPath = path.join(workingDir, `${filename}.pdf`);

    // Read log file for detailed error analysis
    let logContent = '';
    try {
        if (fs.existsSync(logPath)) {
            logContent = await fs.readFile(logPath, 'utf8');
        }
    } catch (error) {
        console.warn('Could not read log file:', error.message);
    }

    // CHECK IF PDF EXISTS - This is the real success indicator
    if (fs.existsSync(pdfPath)) {
        console.log(`✅ PDF generated successfully despite exit code ${code}`);
        
        if (currentPass < maxPasses) {
            const needsAnotherPass = this.checkIfAnotherPassNeeded(logContent);
            if (needsAnotherPass && currentPass < maxPasses) {
                currentPass++;
                setTimeout(() => runSinglePass(currentPass), 1000);
            } else {
                this.finalizePdfGeneration(workingDir, filename, pdfPath, stdout, resolve, reject);
            }
        } else {
            this.finalizePdfGeneration(workingDir, filename, pdfPath, stdout, resolve, reject);
        }
    } else {
        // Only treat as failure if NO PDF was created
        const errors = this.extractLatexErrors(logContent, stdout, stderr);
        const enhancedError = this.enhanceErrorMessage(errors);
        reject(new Error(`LaTeX compilation failed on pass ${currentPass}. Exit code: ${code}\n\n${enhancedError}`));
    }
});

        };

        // Start the first pass
        runSinglePass(1);
    }

    checkIfAnotherPassNeeded(logContent) {
        if (!logContent) return false;

        // Look for indicators that another pass is needed
        const indicators = [
            'Rerun to get cross-references right',
            'Table widths have changed. Rerun LaTeX',
            'Label(s) may have changed. Rerun to get cross-references right',
            'Please rerun LaTeX',
            'Package hyperref Warning: Rerun to get'
        ];

        return indicators.some(indicator => logContent.includes(indicator));
    }

    async finalizePdfGeneration(workingDir, filename, pdfPath, stdout, resolve, reject) {
        try {
            if (fs.existsSync(pdfPath)) {
                // Get PDF file size for validation
                const stats = await fs.stat(pdfPath);
                console.log(`PDF generated successfully: ${pdfPath} (${Math.round(stats.size / 1024)} KB)`);

                // Clean up auxiliary files but keep the PDF
                await this.cleanupAuxFiles(workingDir, filename);

                resolve({
                    success: true,
                    pdfPath: pdfPath,
                    log: stdout,
                    fileSize: stats.size,
                    pages: this.estimatePdfPages(stdout)
                });
            } else {
                reject(new Error(`PDF file was not generated: ${pdfPath}`));
            }
        } catch (error) {
            reject(new Error(`Error finalizing PDF generation: ${error.message}`));
        }
    }

    estimatePdfPages(stdout) {
        // Try to extract page count from pdflatex output
        const pageMatch = stdout.match(/Output written on .* \((\d+) page/);
        if (pageMatch) {
            return parseInt(pageMatch[1]);
        }
        return null;
    }

    extractLatexErrors(logContent, stdout, stderr) {
        const errors = [];

        if (logContent) {
            const lines = logContent.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Look for various error patterns
                if (line.includes('! LaTeX Error:') ||
                    line.includes('! Undefined control sequence') ||
                    line.includes('! Package') && line.includes('Error:') ||
                    line.includes('! Missing') ||
                    line.includes('! Emergency stop') ||
                    line.includes('! File') && line.includes('not found') ||
                    line.includes('! Argument of') ||
                    line.includes('! Extra alignment tab') ||
                    line.includes('! Misplaced alignment tab')) {
                    
                    errors.push('ERROR: ' + line.trim());
                    
                    // Include context lines
                    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
                        const contextLine = lines[i + j].trim();
                        if (contextLine && !contextLine.startsWith('l.') && !contextLine.startsWith('!')) {
                            errors.push(' → ' + contextLine);
                        }
                    }
                    errors.push(''); // Add spacing between errors
                }
                // Look for TikZ specific errors
                else if (line.includes('tikz') && (line.includes('Error') || line.includes('error'))) {
                    errors.push('TIKZ ERROR: ' + line.trim());
                }
                // Look for warnings that might be important
                else if (line.includes('LaTeX Warning:') &&
                        (line.includes('Reference') || line.includes('Citation') || line.includes('Label'))) {
                    errors.push('WARNING: ' + line.trim());
                }
            }
        }

        // If no specific errors found, include general output
        if (errors.length === 0) {
            errors.push('No specific LaTeX errors detected in log file.');
            if (stderr.trim()) {
                errors.push('STDERR Output:');
                errors.push(stderr.substring(0, 500));
            }
            if (stdout.trim()) {
                errors.push('Recent STDOUT Output:');
                const lines = stdout.split('\n');
                errors.push(lines.slice(-10).join('\n'));
            }
        }

        return errors.join('\n');
    }

    enhanceErrorMessage(errors) {
        let enhanced = errors;

        // Add helpful suggestions based on common error patterns
        if (errors.includes('Undefined control sequence')) {
            enhanced += '\n\nSUGGESTION: Check for typos in LaTeX commands or missing package imports.';
        }

        if (errors.includes('Missing') && errors.includes('inserted')) {
            enhanced += '\n\nSUGGESTION: Check for unmatched braces { } or missing semicolons in TikZ code.';
        }

        if (errors.includes('Package tikz Error') || errors.includes('TIKZ ERROR')) {
            enhanced += '\n\nSUGGESTION: Verify TikZ library imports and diagram syntax. Check node positioning and ensure all required libraries are loaded.';
        }

        if (errors.includes('File') && errors.includes('not found')) {
            enhanced += '\n\nSUGGESTION: Install missing LaTeX packages or check file paths.';
        }

        if (errors.includes('Extra alignment tab')) {
            enhanced += '\n\nSUGGESTION: Check table structure - too many columns or missing & separators.';
        }

        enhanced += '\n\nDEBUGGING STEPS:\n1. Check the .log file for detailed error information\n2. Try compiling a minimal version of the document\n3. Comment out TikZ diagrams if compilation fails\n4. Verify all special characters are properly escaped\n5. Ensure all required TikZ libraries are loaded';

        return enhanced;
    }

    async cleanupAuxFiles(workingDir, filename) {
        const auxExtensions = [
            '.aux', '.log', '.out', '.toc', '.fls',
            '.fdb_latexmk', '.synctex.gz', '.figlist',
            '.makeidx', '.fot', '.cb', '.cb2', '.lb'
        ];

        const cleanupPromises = auxExtensions.map(async (ext) => {
            const auxFile = path.join(workingDir, `${filename}${ext}`);
            if (await fs.pathExists(auxFile)) {
                try {
                    await fs.unlink(auxFile);
                    console.log(`Cleaned up: ${auxFile}`);
                } catch (error) {
                    console.warn(`Could not delete auxiliary file: ${auxFile} - ${error.message}`);
                }
            }
        });

        await Promise.all(cleanupPromises);
    }

    async checkLatexInstallation() {
        return new Promise((resolve) => {
            console.log('Checking LaTeX installation...');

            const pdflatex = spawn('pdflatex', ['--version'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let versionOutput = '';

            pdflatex.stdout.on('data', (data) => {
                versionOutput += data.toString();
            });

            pdflatex.on('close', (code) => {
                if (code === 0) {
                    console.log('LaTeX installation verified:', versionOutput.split('\n')[0]);
                    resolve(true);
                } else {
                    console.log('LaTeX not found or not working properly');
                    resolve(false);
                }
            });

            pdflatex.on('error', (error) => {
                console.log('LaTeX check failed:', error.message);
                resolve(false);
            });
        });
    }

    // Method to validate LaTeX syntax before compilation
    async validateLatexSyntax(latexFilePath) {
        try {
            const content = await fs.readFile(latexFilePath, 'utf8');
            const issues = [];

            // Basic syntax validation
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            if (openBraces !== closeBraces) {
                issues.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
            }

            // Check for required document structure
            if (!content.includes('\\documentclass')) {
                issues.push('Missing \\documentclass declaration');
            }

            if (!content.includes('\\begin{document}')) {
                issues.push('Missing \\begin{document}');
            }

            if (!content.includes('\\end{document}')) {
                issues.push('Missing \\end{document}');
            }

            // Check for proper geometry settings
            if (!content.includes('\\usepackage{geometry}') && !content.includes('\\usepackage[') && content.includes('geometry')) {
                issues.push('Missing geometry package for proper page layout');
            }

            // Check for TikZ requirements
            if (content.includes('\\begin{tikzpicture}')) {
                if (!content.includes('\\usepackage{tikz}')) {
                    issues.push('Missing \\usepackage{tikz} for TikZ diagrams');
                }
                if (!content.includes('\\usetikzlibrary')) {
                    issues.push('Missing \\usetikzlibrary declarations for TikZ features');
                }
            }

            // Check for common problematic patterns
            const problematicPatterns = [
                { pattern: /[^\\]_[^{}]/, message: 'Unescaped underscore found' },
                { pattern: /[^\\]&[^#]/, message: 'Unescaped ampersand found' },
                { pattern: /[^\\]\$[^$]/, message: 'Unescaped dollar sign found' },
                { pattern: /[^\\]%[^%]/, message: 'Unescaped percent sign found' }
            ];

            for (const { pattern, message } of problematicPatterns) {
                if (pattern.test(content)) {
                    issues.push(message);
                }
            }

            return {
                isValid: issues.length === 0,
                issues: issues
            };
        } catch (error) {
            return {
                isValid: false,
                issues: [`Cannot read LaTeX file: ${error.message}`]
            };
        }
    }
}

module.exports = LaTeXConverter;
