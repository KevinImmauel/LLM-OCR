class LaTeXValidator {
    static validateAndCleanLatex(latexContent) {
        let cleaned = latexContent;

        // Fix common issues
        cleaned = this.fixCommonIssues(cleaned);
        
        // Add comprehensive packages
        cleaned = this.addComprehensivePackages(cleaned);
        
        // Validate structure
        const validation = this.validateStructure(cleaned);

        return {
            content: cleaned,
            isValid: validation.isValid,
            errors: validation.errors
        };
    }

    static addComprehensivePackages(content) {
        const packages = [
            '\\usepackage[utf8]{inputenc}',
            '\\usepackage[margin=1in,top=1.2in,bottom=1.2in]{geometry}',
            '\\usepackage{graphicx}',
            '\\usepackage{amsmath,amsfonts,amssymb}',
            '\\usepackage{hyperref}',
            '\\usepackage{booktabs,longtable}',
            '\\usepackage{tikz}',
            '\\usetikzlibrary{shapes,arrows,positioning,calc,decorations.pathmorphing,backgrounds,fit,shadows,chains,scopes}',
            '\\usepackage{pgfplots}',
            '\\usepackage{listings}',
            '\\usepackage{xcolor}',
            '\\usepackage{fancyhdr}',
            '\\usepackage{tocloft}',
            '\\usepackage{enumitem}',
            '\\usepackage{float}',
            '\\usepackage{subcaption}',
            '',
            '% Configure listings for code',
            '\\lstset{',
            '    basicstyle=\\ttfamily\\small,',
            '    commentstyle=\\color{gray},',
            '    keywordstyle=\\color{blue},',
            '    numberstyle=\\tiny\\color{gray},',
            '    stringstyle=\\color{red},',
            '    breakatwhitespace=false,',
            '    breaklines=true,',
            '    captionpos=b,',
            '    keepspaces=true,',
            '    numbers=left,',
            '    numbersep=5pt,',
            '    showspaces=false,',
            '    showstringspaces=false,',
            '    showtabs=false,',
            '    tabsize=2',
            '}',
            '',
            '% Configure page headers',
            '\\pagestyle{fancy}',
            '\\fancyhf{}',
            '\\fancyhead[L]{Software Design Document}',
            '\\fancyhead[R]{\\today}',
            '\\fancyfoot[C]{\\thepage}',
            '',
            '% Configure hyperref',
            '\\hypersetup{',
            '    colorlinks=true,',
            '    linkcolor=blue,',
            '    filecolor=magenta,',
            '    urlcolor=cyan,',
            '    pdftitle={Software Design Document},',
            '    pdfauthor={System Generated},',
            '    pdfsubject={Software Architecture},',
            '    pdfkeywords={software, design, architecture}',
            '}',
            ''
        ];

        // Find insertion point after \documentclass
        const docClassMatch = content.match(/\\documentclass[^}]*}/);
        if (docClassMatch) {
            const insertPoint = content.indexOf('\n', docClassMatch.index + docClassMatch[0].length);
            if (insertPoint !== -1) {
                content = content.substring(0, insertPoint + 1) +
                    packages.join('\n') + '\n' +
                    content.substring(insertPoint + 1);
            }
        }

        return content;
    }

    static fixCommonIssues(content) {
        let fixed = content;

        // Remove any text before \documentclass
        const docClassMatch = fixed.match(/\\documentclass/);
        if (docClassMatch) {
            fixed = fixed.substring(fixed.indexOf('\\documentclass'));
        }

        // Ensure proper document structure
        if (!fixed.includes('\\documentclass')) {
            fixed = '\\documentclass[11pt,a4paper,oneside]{article}\n' + fixed;
        }

        if (!fixed.includes('\\begin{document}')) {
            const afterPackages = this.findInsertionPoint(fixed);
            fixed = fixed.substring(0, afterPackages) + '\\begin{document}\n' + fixed.substring(afterPackages);
        }

        if (!fixed.includes('\\end{document}')) {
            fixed += '\n\\end{document}';
        }

        // Fix character escaping with more precision
        fixed = fixed
            // Fix unescaped underscores (but not in LaTeX commands or URLs)
            .replace(/([^\\])_([^_\s\\{])/g, '$1\\_$2')
            // Fix unescaped ampersands (but not HTML entities)
            .replace(/([^\\])&(?!(amp;|lt;|gt;|quot;|#))/g, '$1\\&')
            // Fix unescaped dollar signs
            .replace(/([^\\])\$([^$\\])/g, '$1\\$$2')
            // Fix unescaped percent signs
            .replace(/([^\\])%([^%])/g, '$1\\%$2')
            // Fix unescaped hash signs
            .replace(/([^\\])#([^#])/g, '$1\\#$2')
            // Fix quotes and dashes
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/—/g, '---')
            .replace(/–/g, '--')
            // Fix common TikZ issues
            .replace(/tikzpicture/g, 'tikzpicture')
            .replace(/\\node\s*\[/g, '\\node[')
            .replace(/\\draw\s*\[/g, '\\draw[')
            // Ensure proper spacing in TikZ
            .replace(/node distance=([0-9.]+)([a-z]+)/g, 'node distance=$1$2')
            .replace(/minimum height=([0-9.]+)([a-z]+)/g, 'minimum height=$1$2');

        return fixed;
    }

    static findInsertionPoint(content) {
        // Find a good place to insert \begin{document}
        const patterns = [
            /\\hypersetup\{[^}]*\}/s,
            /\\lstset\{[^}]*\}/s,
            /\\fancyfoot\{[^}]*\}/,
            /\\fancyhead\[[LCR]\]\{[^}]*\}/,
            /\\pagestyle\{[^}]*\}/,
            /\\usepackage[^}]*\}/g,
            /\\usetikzlibrary\{[^}]*\}/,
            /\\documentclass[^}]*\}/
        ];

        let lastMatch = 0;
        for (const pattern of patterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                lastMatch = Math.max(lastMatch, match.index + match[0].length);
            }
        }

        return lastMatch > 0 ? lastMatch + 1 : content.length;
    }

    static validateStructure(content) {
        const errors = [];
        const warnings = [];

        // Check for required document elements
        if (!content.includes('\\documentclass')) {
            errors.push('Missing \\documentclass declaration');
        }

        if (!content.includes('\\begin{document}')) {
            errors.push('Missing \\begin{document}');
        }

        if (!content.includes('\\end{document}')) {
            errors.push('Missing \\end{document}');
        }

        // Check for proper geometry
        if (!content.includes('\\usepackage{geometry}') && !content.includes('\\usepackage[') || !content.includes('geometry')) {
            warnings.push('Missing geometry package for proper page layout');
        }

        // Check for TikZ requirements if TikZ is used
        if (content.includes('\\begin{tikzpicture}')) {
            if (!content.includes('\\usepackage{tikz}')) {
                errors.push('TikZ diagrams found but missing \\usepackage{tikz}');
            }
            if (!content.includes('\\usetikzlibrary')) {
                warnings.push('TikZ diagrams found but no \\usetikzlibrary declarations');
            }
        }

        // Check for balanced braces
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        }

        // Check for template usage indicators
        const templateIndicators = [
            'node distance=',
            'minimum height=',
            'fill=',
            'draw=',
            'rounded corners'
        ];

        const foundTemplateElements = templateIndicators.filter(indicator => 
            content.includes(indicator)
        ).length;

        if (content.includes('\\begin{tikzpicture}') && foundTemplateElements < 3) {
            warnings.push('TikZ diagrams may not be using proper templates - missing styling elements');
        }

        // Check for proper document class settings
        if (content.includes('\\documentclass') && !content.includes('oneside')) {
            warnings.push('Consider using oneside document class option for better single-sided printing');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    static validateTikZTemplate(content) {
        const tikzValidation = {
            hasProperLibraries: content.includes('\\usetikzlibrary{shapes,arrows,positioning'),
            hasNodeStyles: content.includes('node/.style=') || content.includes('.style={'),
            hasProperSpacing: content.includes('node distance='),
            hasColors: content.includes('fill=') && content.includes('draw='),
            hasShadows: content.includes('drop shadow') || content.includes('shadow'),
            hasRoundedCorners: content.includes('rounded corners')
        };

        const issues = [];
        if (!tikzValidation.hasProperLibraries) {
            issues.push('Missing comprehensive TikZ libraries');
        }
        if (!tikzValidation.hasNodeStyles) {
            issues.push('Missing node style definitions');
        }
        if (!tikzValidation.hasProperSpacing) {
            issues.push('Missing proper node spacing settings');
        }
        if (!tikzValidation.hasColors) {
            issues.push('Missing color styling for professional appearance');
        }

        return {
            isValid: issues.length === 0,
            issues: issues,
            validation: tikzValidation
        };
    }
}

module.exports = LaTeXValidator;
