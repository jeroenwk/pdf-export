# Document Fragment Approach Specification

## Executive Summary

This specification outlines a new approach to PDF export that uses document fragments and DOM isolation to solve the UI stability vs. content capture tradeoff. The approach starts from the stable v1.1.3 baseline and systematically builds a solution that allows html2canvas to capture content while maintaining UI stability.

## Table of Contents

1. [Research Findings](#research-findings)
2. [Technical Approach](#technical-approach)
3. [Implementation Plan](#implementation-plan)
4. [Phase 1: Baseline Restoration](#phase-1-baseline-restoration)
5. [Phase 2: HTML Export Feature](#phase-2-html-export-feature)
6. [Phase 3: Document Fragment Implementation](#phase-3-document-fragment-implementation)
7. [Phase 4: Quality Assurance](#phase-4-quality-assurance)
8. [Testing Strategy](#testing-strategy)
9. [Risk Assessment](#risk-assessment)
10. [Success Criteria](#success-criteria)

## Research Findings

### html2canvas Document Fragment Support

**Official Documentation**: html2canvas does not officially document document fragment support or DOM isolation capabilities.

**Community Findings**: Based on GitHub issues and Stack Overflow discussions:
- html2canvas requires elements to be attached to the DOM for proper capture
- Document fragments alone are not sufficient - elements must be in the live DOM
- Off-screen positioning works but has visibility constraints
- Some users report success with "near-invisible" elements (opacity: 0.01)
- CSS transforms may work better than position properties for off-screen elements

### Key Technical Insights

1. **DOM Attachment Required**: Elements must be attached to `document.body` for html2canvas to work
2. **Visibility Spectrum**: There's a sweet spot between "visible to html2canvas" and "invisible to users"
3. **Style Preservation**: Computed styles are only available for DOM-attached elements
4. **Timing Matters**: Elements need time to render before capture
5. **Browser Optimization**: Modern browsers optimize away truly invisible elements

## Technical Approach

### The Hybrid DOM Isolation Strategy

Instead of relying solely on document fragments, we'll use a hybrid approach:

1. **Content Extraction**: Extract content into HTML string
2. **DOM Attachment**: Temporarily attach to DOM for html2canvas
3. **Visibility Control**: Use opacity/transform instead of positioning
4. **Style Preservation**: Ensure all computed styles are available
5. **Immediate Cleanup**: Remove immediately after capture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Obsidian App                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Sidebar   │  │   Editor     │  │      UI Elements    │  │
│  │   (Stable)  │  │   (Stable)   │  │      (Stable)      │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Content Extraction Layer                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              HTML String Builder                        │ │
│  │  markdown → html → styled html → complete document    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Export to file
┌─────────────────────────────────────────────────────────────┐
│                 Document Fragment Layer                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Temporary DOM Attachment                    │ │
│  │  • Create element from HTML string                       │ │
│  │  • Apply computed styles                                 │ │
│  │  • Attach to DOM (briefly)                               │ │
│  │  • Make nearly invisible (opacity: 0.01)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ html2canvas capture
                    ┌───────────────┐
                    │     Canvas     │
                    │   (Complete)   │
                    └───────────────┘
```

## Implementation Plan

### Phase 1: Baseline Restoration

**Objective**: Start from v1.1.3 stable baseline
**Duration**: 1 day
**Success Criteria**: Clean starting point with working basic export

#### 1.1 Version Management
```bash
# Reset to v1.1.3 baseline
git reset --hard <v1.1.3 commit hash>
npm run build
```

#### 1.2 Code Cleanup
- Remove all post-1.1.3 modifications
- Ensure clean compilation
- Verify basic functionality still works

### Phase 2: HTML Export Feature

**Objective**: Add HTML export capability for debugging and comparison
**Duration**: 2-3 days
**Success Criteria**: Can export complete HTML with all styles

#### 2.1 HTML Export Implementation
```typescript
// Add to main.ts
async exportToHTML(filePath: string): Promise<string> {
    try {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file) throw new Error('File not found');

        const content = await this.app.vault.read(file);

        // Process markdown similar to PDF export
        const processedContent = this.preprocessMarkdown(content);
        const htmlContent = await this.markdownToHTML(processedContent);

        // Generate complete HTML document
        const completeHTML = this.generateCompleteHTML(htmlContent);

        // Save to export directory
        await this.saveHTMLFile(filePath, completeHTML);

        return completeHTML;
    } catch (error) {
        console.error('HTML export failed:', error);
        throw error;
    }
}
```

#### 2.2 Complete HTML Generation
```typescript
generateCompleteHTML(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Export Debug</title>
    <style>
        /* Include all Obsidian styles needed for proper rendering */
        ${this.getRequiredStyles()}

        /* PDF export specific styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #000;
            background: #fff;
            max-width: 718px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Add computed styles from current Obsidian theme */
        ${this.extractComputedStyles()}
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
}
```

#### 2.3 Style Extraction
```typescript
extractComputedStyles(): string {
    const styles: string[] = [];

    // Extract styles from current document
    const styleSheets = Array.from(document.styleSheets);

    styleSheets.forEach(sheet => {
        try {
            const rules = Array.from(sheet.cssRules);
            rules.forEach(rule => {
                if (rule.cssText) {
                    styles.push(rule.cssText);
                }
            });
        } catch (e) {
            console.warn('Could not access stylesheet:', e);
        }
    });

    return styles.join('\n');
}
```

#### 2.4 Save HTML Feature
```typescript
async saveHTMLFile(originalPath: string, content: string): Promise<void> {
    const fileName = originalPath.replace(/\.md$/, '_debug.html');
    const exportPath = path.join(this.getExportDirectory(), fileName);

    await this.app.vault.adapter.write(exportPath, content);
    console.log(`HTML exported to: ${exportPath}`);
}
```

### Phase 3: Document Fragment Implementation

**Objective**: Implement DOM isolation using temporary DOM attachment
**Duration**: 5-7 days
**Success Criteria**: PDF export works without UI disruption

#### 3.1 DOM Isolation Class
```typescript
class DOMIsolationRenderer {
    private tempContainer: HTMLElement | null = null;
    private originalHTML: string = '';

    async createIsolatedContainer(htmlContent: string): Promise<HTMLElement> {
        // Create container
        this.tempContainer = document.createElement('div');
        this.tempContainer.id = 'pdf-export-temp-container';

        // Apply isolation styles
        this.tempContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            opacity: 0.01;
            pointer-events: none;
            z-index: 9999;
            background: white;
            color: black;
            width: 718px;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
        `;

        // Set content
        this.tempContainer.innerHTML = htmlContent;
        this.originalHTML = htmlContent;

        return this.tempContainer;
    }

    async attachToDOM(): Promise<void> {
        if (!this.tempContainer) return;

        document.body.appendChild(this.tempContainer);

        // Force style calculation
        this.tempContainer.offsetHeight;

        // Wait for any dynamic content to load
        await this.waitForContentReady();
    }

    async waitForContentReady(): Promise<void> {
        // Wait for images
        await this.waitForImages();

        // Wait for fonts
        await this.waitForFonts();

        // Force layout
        await this.forceLayout();
    }

    async waitForImages(): Promise<void> {
        const images = this.tempContainer?.querySelectorAll('img') || [];
        const imagePromises = Array.from(images).map(img => {
            return new Promise<void>((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    setTimeout(resolve, 3000); // Timeout after 3 seconds
                }
            });
        });

        await Promise.all(imagePromises);
    }

    async waitForFonts(): Promise<void> {
        // Use document.fonts if available
        if ('fonts' in document) {
            await (document as any).fonts.ready;
        }
    }

    async forceLayout(): Promise<void> {
        if (!this.tempContainer) return;

        // Multiple reflows to ensure stable layout
        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.tempContainer!.offsetHeight;
                    resolve(undefined);
                });
            });
        }
    }

    async captureWithHTML2Canvas(): Promise<HTMLCanvasElement> {
        if (!this.tempContainer) {
            throw new Error('No container available for capture');
        }

        return await html2canvas(this.tempContainer, {
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            scale: 2,
            width: this.tempContainer.scrollWidth,
            height: this.tempContainer.scrollHeight,
            logging: false,
            onclone: (clonedDoc, element) => {
                // Ensure cloned element has proper styles
                element.style.opacity = '1';
                element.style.visibility = 'visible';

                console.log('HTML2Canvas onClone:', {
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    scrollWidth: element.scrollWidth,
                    scrollHeight: element.scrollHeight
                });
            }
        });
    }

    cleanup(): void {
        if (this.tempContainer && this.tempContainer.parentNode) {
            this.tempContainer.parentNode.removeChild(this.tempContainer);
        }
        this.tempContainer = null;
        this.originalHTML = '';
    }
}
```

#### 3.2 Integration with Main Export
```typescript
async createPDFFromHTML_V2(container: HTMLElement): Promise<jsPDF> {
    const isolation = new DOMIsolationRenderer();

    try {
        // Step 1: Extract HTML content
        const htmlContent = this.extractHTMLContent(container);
        console.log('[DEBUG] Extracted HTML length:', htmlContent.length);

        // Step 2: Create isolated container
        const isolatedContainer = await isolation.createIsolatedContainer(htmlContent);
        console.log('[DEBUG] Isolated container created');

        // Step 3: Attach to DOM
        await isolation.attachToDOM();
        console.log('[DEBUG] Container attached to DOM');

        // Step 4: Capture with html2canvas
        const canvas = await isolation.captureWithHTML2Canvas();
        console.log('[DEBUG] Canvas captured:', canvas.width, 'x', canvas.height);

        // Step 5: Create PDF from canvas
        const pdf = this.createPDFFromCanvas(canvas);
        console.log('[DEBUG] PDF created successfully');

        return pdf;

    } catch (error) {
        console.error('Document fragment export failed:', error);
        throw error;
    } finally {
        // Step 6: Always cleanup
        isolation.cleanup();
        console.log('[DEBUG] Cleanup completed');
    }
}
```

#### 3.3 HTML Content Extraction
```typescript
extractHTMLContent(container: HTMLElement): string {
    let htmlContent = '';

    // Process each child element
    for (let i = 0; i < container.children.length; i++) {
        const child = container.children[i] as HTMLElement;
        htmlContent += this.processElement(child);
    }

    return htmlContent;
}

processElement(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
        case 'h1':
            return `<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">${element.textContent}</h1>`;

        case 'h2':
            return `<h2 style="font-size: 20px; font-weight: bold; margin: 20px 0 10px 0;">${element.textContent}</h2>`;

        case 'h3':
            return `<h3 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px 0;">${element.textContent}</h3>`;

        case 'p':
            return `<p style="margin: 10px 0; line-height: 1.6;">${element.innerHTML}</p>`;

        case 'div':
            if (element.classList.contains('pdf-page-break-marker')) {
                return '<div style="page-break-after: always; height: 20px; border-top: 2px dashed #ccc; margin: 20px 0;"></div>';
            }
            // Handle other divs
            return `<div style="margin: 10px 0;">${element.innerHTML}</div>`;

        case 'img':
            const src = element.getAttribute('src');
            const alt = element.getAttribute('alt') || '';
            return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;

        default:
            return element.outerHTML;
    }
}
```

### Phase 4: Quality Assurance

**Objective**: Ensure the new approach works correctly
**Duration**: 2-3 days
**Success Criteria**: All test cases pass

#### 4.1 Comparison Testing
```typescript
async compareOutputs(originalPath: string): Promise<void> {
    // Export HTML
    const htmlContent = await this.exportToHTML(originalPath);

    // Export PDF using new method
    const pdfContent = await this.exportToPDF(originalPath);

    // Compare results
    const comparison = await this.compareHTMLvsPDF(htmlContent, pdfContent);

    console.log('Comparison results:', comparison);
}
```

#### 4.2 Quality Metrics
```typescript
interface QualityMetrics {
    textClarity: number;      // 0-100
    imageCompleteness: number;  // 0-100
    layoutAccuracy: number;     // 0-100
    overallScore: number;       // 0-100
}

async calculateQuality(canvas: HTMLCanvasElement): Promise<QualityMetrics> {
    // Analyze canvas content
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate metrics
    const textClarity = this.analyzeTextClarity(data, canvas.width, canvas.height);
    const imageCompleteness = this.analyzeImageCompleteness(data, canvas.width, canvas.height);
    const layoutAccuracy = this.analyzeLayoutAccuracy(data, canvas.width, canvas.height);

    const overallScore = (textClarity + imageCompleteness + layoutAccuracy) / 3;

    return {
        textClarity,
        imageCompleteness,
        layoutAccuracy,
        overallScore
    };
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('Document Fragment Approach', () => {
    describe('DOMIsolationRenderer', () => {
        it('should create isolated container with correct styles', () => {
            const renderer = new DOMIsolationRenderer();
            const container = await renderer.createIsolatedContainer('<p>Test</p>');

            expect(container.id).toBe('pdf-export-temp-container');
            expect(container.style.opacity).toBe('0.01');
            expect(container.style.pointerEvents).toBe('none');
        });

        it('should attach and detach from DOM without side effects', async () => {
            const renderer = new DOMIsolationRenderer();
            const container = await renderer.createIsolatedContainer('<p>Test</p>');

            await renderer.attachToDOM();
            expect(document.body.contains(container)).toBe(true);

            renderer.cleanup();
            expect(document.body.contains(container)).toBe(false);
        });

        it('should capture content with html2canvas', async () => {
            const renderer = new DOMIsolationRenderer();
            const content = '<h1>Test</h1><p>Content</p>';

            const container = await renderer.createIsolatedContainer(content);
            await renderer.attachToDOM();

            const canvas = await renderer.captureWithHTML2Canvas();

            expect(canvas.width).toBeGreaterThan(0);
            expect(canvas.height).toBeGreaterThan(0);

            renderer.cleanup();
        });
    });
});
```

### Integration Tests
```typescript
describe('PDF Export Integration', () => {
    it('should export PDF without UI disruption', async () => {
        const plugin = new PDFExportPlugin(app, settings);

        // Check UI state before export
        const sidebarBefore = document.querySelector('.workspace-split');
        expect(sidebarBefore).toBeTruthy();

        // Export PDF
        await plugin.exportToPDF('test.md');

        // Check UI state after export
        const sidebarAfter = document.querySelector('.workspace-split');
        expect(sidebarAfter).toBeTruthy();
        expect(sidebarBefore).toBe(sidebarAfter);
    });

    it('should export HTML for debugging', async () => {
        const plugin = new PDFExportPlugin(app, settings);
        const htmlContent = await plugin.exportToHTML('test.md');

        expect(htmlContent).toContain('<!DOCTYPE html>');
        expect(htmlContent).toContain('<body>');
        expect(htmlContent).toContain('</html>');
    });
});
```

### Performance Tests
```typescript
describe('Performance Tests', () => {
    it('should complete export within acceptable time', async () => {
        const startTime = Date.now();

        const plugin = new PDFExportPlugin(app, settings);
        await plugin.exportToPDF('large-document.md');

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should not cause memory leaks', async () => {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        // Run multiple exports
        const plugin = new PDFExportPlugin(app, settings);
        for (let i = 0; i < 10; i++) {
            await plugin.exportToPDF('test.md');
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = finalMemory - initialMemory;

        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
    });
});
```

## Risk Assessment

### High Risks
1. **html2canvas Compatibility**: The approach may still face html2canvas limitations
2. **Performance Impact**: Temporary DOM attachment may affect performance
3. **Style Isolation**: Extracting and applying styles correctly may be complex

### Medium Risks
1. **Browser Compatibility**: Different browsers may behave differently
2. **Memory Usage**: Temporary DOM elements may increase memory usage
3. **Timing Issues**: Race conditions between DOM attachment and capture

### Low Risks
1. **UI Disruption**: Near-invisible elements should not affect UX
2. **Cleanup Issues**: Proper cleanup should prevent side effects
3. **Debugging**: HTML export feature provides good debugging capabilities

### Mitigation Strategies
1. **Fallback Mechanisms**: Implement multiple capture methods
2. **Performance Monitoring**: Add performance metrics and monitoring
3. **Comprehensive Testing**: Test across different browsers and document types
4. **Resource Management**: Implement proper cleanup and memory management

## Success Criteria

### Functional Requirements
- ✅ UI remains stable during export (no sidebar disappearing)
- ✅ PDF export works with high quality content capture
- ✅ HTML export provides debugging capabilities
- ✅ All existing features continue to work

### Performance Requirements
- ✅ Export completes within 10 seconds for typical documents
- ✅ Memory usage increase is less than 50MB during export
- ✅ No performance impact on Obsidian during export

### Quality Requirements
- ✅ Text clarity score > 80%
- ✅ Image completeness score > 70%
- ✅ Layout accuracy score > 75%
- ✅ Overall quality score > 75%

### User Experience Requirements
- ✅ No visual flash or disruption during export
- ✅ Sidebar and other UI elements remain visible
- ✅ Export process is smooth and professional
- ✅ Error handling provides clear feedback

## Implementation Timeline

| Phase | Duration | Start Date | End Date | Deliverables |
|-------|----------|------------|----------|--------------|
| Phase 1 | 1 day | Day 1 | Clean v1.1.3 baseline |
| Phase 2 | 3 days | Day 2-4 | HTML export feature |
| Phase 3 | 7 days | Day 5-11 | Document fragment implementation |
| Phase 4 | 3 days | Day 12-14 | Quality assurance and testing |
| **Total** | **14 days** | | **Complete solution** |

## Conclusion

The document fragment approach represents a significant improvement over the current sandbox isolation method. By starting from the stable v1.1.3 baseline and systematically building the solution, we can achieve:

1. **UI Stability**: No disruption to Obsidian's interface
2. **Content Quality**: Better capture through proper DOM attachment
3. **Debug Capability**: HTML export for troubleshooting
4. **Maintainability**: Cleaner architecture with better separation of concerns

The key innovation is the hybrid approach that combines the benefits of DOM attachment (required by html2canvas) with visibility control (opacity-based) to achieve both UI stability and content quality.

---

*Last Updated: 2025-01-04*
*Version: 1.0*
*Status: Specification Complete*