import puppeteer from 'puppeteer';
import { marked } from 'marked';
import path from 'path';
import fs from 'fs/promises';
import { jsPDF } from 'jspdf';
import { PDFVerifier } from './test/pdfVerification';
export class PDFExporter {
    options;
    verifier;
    constructor(options) {
        this.options = options;
        this.verifier = new PDFVerifier({
            app: null, // CLI version doesn't have Obsidian app
            vaultPath: options.vaultPath
        });
    }
    async exportMarkdownToPDF(inputPath, outputPath) {
        // Read markdown content
        const markdown = await fs.readFile(inputPath, 'utf-8');
        const baseName = path.basename(inputPath, '.md');
        // Convert markdown to HTML
        const html = await this.convertMarkdownToHTML(markdown, inputPath, baseName);
        // Convert HTML to image using Puppeteer
        const imageData = await this.convertHTMLToImage(html);
        // Create PDF from image
        const pdf = await this.createPDF(imageData, baseName);
        // Save PDF
        await fs.writeFile(outputPath, Buffer.from(pdf));
    }
    async convertMarkdownToHTML(markdown, sourcePath, title) {
        if (this.options.debug) {
            console.log('📝 Converting markdown to HTML...');
        }
        // Configure marked for Obsidian-like rendering
        marked.setOptions({
            gfm: true,
            breaks: true
        });
        // Convert markdown to HTML
        let html = marked(markdown);
        // Create complete HTML document with styling
        const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          ${this.getPDFStyles()}
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">${title}</h1>
          <div class="content">
            ${html}
          </div>
        </div>
      </body>
      </html>
    `;
        // Process images if enabled
        if (this.options.includeImages) {
            return await this.processImages(fullHTML, sourcePath);
        }
        else {
            // Remove images
            return fullHTML.replace(/<img[^>]*>/g, '');
        }
    }
    async processImages(html, sourcePath) {
        if (this.options.debug) {
            console.log('🖼️ Processing images...');
        }
        // Simple regex to find img tags (for CLI, we'll use basic processing)
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        const processImage = async (match, src) => {
            try {
                // Skip external URLs
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    if (this.options.debug) {
                        console.log(`Skipping external image: ${src}`);
                    }
                    return match;
                }
                // Resolve relative paths
                let imagePath = src;
                if (!path.isAbsolute(src)) {
                    imagePath = path.resolve(path.dirname(sourcePath), src);
                }
                // Check if file exists in vault
                const vaultRelativePath = path.relative(this.options.vaultPath, imagePath);
                const vaultImagePath = path.join(this.options.vaultPath, vaultRelativePath);
                try {
                    const imageStats = await fs.stat(vaultImagePath);
                    if (imageStats.isFile()) {
                        // Read image and convert to base64
                        const imageBuffer = await fs.readFile(vaultImagePath);
                        const base64 = imageBuffer.toString('base64');
                        const mimeType = this.getMimeType(path.extname(vaultImagePath));
                        const dataUrl = `data:${mimeType};base64,${base64}`;
                        if (this.options.debug) {
                            console.log(`Embedded image: ${vaultImagePath} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
                        }
                        return match.replace(src, dataUrl);
                    }
                }
                catch (error) {
                    console.warn(`Could not find image: ${vaultImagePath}`);
                }
                return match;
            }
            catch (error) {
                console.error(`Error processing image ${src}:`, error);
                return match;
            }
        };
        // Process all images
        const imgMatches = html.match(imgRegex) || [];
        for (const match of imgMatches) {
            const srcMatch = match.match(/src="([^"]+)"/);
            if (srcMatch) {
                const processed = await processImage(match, srcMatch[1]);
                html = html.replace(match, processed);
            }
        }
        return html;
    }
    getMimeType(ext) {
        const types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp'
        };
        return types[ext.toLowerCase()] || 'image/png';
    }
    getPDFStyles() {
        return `
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #ffffff;
        color: #000000;
      }

      .container {
        width: ${this.options.contentWidth}px;
        padding: 40px;
        margin: 0 auto;
        background: #ffffff;
        color: #000000;
      }

      .title {
        font-size: 24pt;
        margin-bottom: 20px;
        border-bottom: 2px solid #ddd;
        padding-bottom: 10px;
        color: #000000;
      }

      .content {
        font-size: 12pt;
        line-height: 1.6;
        color: #000000;
      }

      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        color: #000000;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }

      h1 { font-size: 24pt; }
      h2 { font-size: 20pt; }
      h3 { font-size: 16pt; }
      h4 { font-size: 14pt; }

      p {
        margin-bottom: 10pt;
        color: #000000;
      }

      strong {
        font-weight: bold;
        color: #000000;
      }

      em {
        font-style: italic;
        color: #000000;
      }

      code {
        font-family: 'Courier New', monospace;
        background: #f5f5f5;
        padding: 2pt 4pt;
        border-radius: 2pt;
        font-size: 10pt;
        color: #000000;
      }

      pre {
        background: #f5f5f5;
        padding: 12pt;
        border-radius: 4pt;
        overflow-x: auto;
        font-size: 9pt;
        color: #000000;
      }

      ul, ol {
        margin-bottom: 10pt;
        padding-left: 24pt;
        color: #000000;
      }

      li {
        margin-bottom: 4pt;
        color: #000000;
      }

      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 12pt auto;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 12pt;
      }

      th, td {
        border: 1pt solid #ddd;
        padding: 6pt;
        text-align: left;
        color: #000000;
      }

      th {
        background: #f5f5f5;
        font-weight: bold;
      }

      hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 16pt 0;
      }

      a {
        color: #0066cc;
        text-decoration: underline;
      }

      blockquote {
        border-left: 4px solid #ddd;
        padding-left: 16pt;
        margin: 16pt 0;
        font-style: italic;
        color: #555;
      }
    `;
    }
    async convertHTMLToImage(html) {
        if (this.options.debug) {
            console.log('🖼️ Converting HTML to image using Puppeteer...');
        }
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        try {
            const page = await browser.newPage();
            // Set viewport
            await page.setViewport({
                width: this.options.contentWidth + 80, // Add padding
                height: 2000,
                deviceScaleFactor: this.options.scale
            });
            // Set content
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded']
            });
            // Get full page height and set viewport accordingly
            const bodyHandle = await page.$('body');
            if (bodyHandle) {
                const boundingBox = await bodyHandle.boundingBox();
                if (boundingBox) {
                    await page.setViewport({
                        width: this.options.contentWidth + 80,
                        height: Math.ceil(boundingBox.height + 100),
                        deviceScaleFactor: this.options.scale
                    });
                }
            }
            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true,
                omitBackground: false
            });
            return screenshot;
        }
        finally {
            await browser.close();
        }
    }
    async createPDF(imageData, title) {
        if (this.options.debug) {
            console.log('📄 Creating PDF from image...');
        }
        // Create PDF from image data
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: this.options.pageSize
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = this.options.margin;
        // Convert image to data URL
        const dataUrl = `data:image/png;base64,${imageData.toString('base64')}`;
        // Calculate image dimensions to fit page
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        // Add the image to cover the full available area
        pdf.addImage(dataUrl, 'PNG', margin, margin, availableWidth, availableHeight);
        return Buffer.from(pdf.output('arraybuffer'));
    }
    async verifyPDF(pdfPath) {
        try {
            const pdfBuffer = await fs.readFile(pdfPath);
            const baseName = path.basename(pdfPath, '.pdf');
            const result = await this.verifier.verifyPDF(pdfBuffer.buffer, baseName);
            if (result.success) {
                console.log(`✅ Verification complete! Generated ${result.imageCount} image(s):`);
                result.imagePaths.forEach((imgPath, index) => {
                    console.log(`   ${index + 1}. ${imgPath}`);
                });
            }
            else {
                console.error(`❌ Verification failed: ${result.error}`);
            }
        }
        catch (error) {
            console.error(`❌ Verification error: ${error.message}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUERGRXhwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQREZFeHBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFNBQVMsTUFBTSxXQUFXLENBQUM7QUFDbEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoQyxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBWXJELE1BQU0sT0FBTyxXQUFXO0lBQ2QsT0FBTyxDQUFnQjtJQUN2QixRQUFRLENBQWM7SUFFOUIsWUFBWSxPQUFzQjtRQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksV0FBVyxDQUFDO1lBQzlCLEdBQUcsRUFBRSxJQUFXLEVBQUUsd0NBQXdDO1lBQzFELFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztTQUM3QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFNBQWlCLEVBQUUsVUFBa0I7UUFDN0Qsd0JBQXdCO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakQsMkJBQTJCO1FBQzNCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFN0Usd0NBQXdDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtC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LEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHVwcGV0ZWVyIGZyb20gJ3B1cHBldGVlcic7XG5pbXBvcnQgeyBtYXJrZWQgfSBmcm9tICdtYXJrZWQnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsganNQREYgfSBmcm9tICdqc3BkZic7XG5pbXBvcnQgeyBQREZWZXJpZmllciB9IGZyb20gJy4vdGVzdC9wZGZWZXJpZmljYXRpb24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydE9wdGlvbnMge1xuICB2YXVsdFBhdGg6IHN0cmluZztcbiAgcGFnZVNpemU6ICdhNCcgfCAnbGV0dGVyJztcbiAgbWFyZ2luOiBudW1iZXI7XG4gIGNvbnRlbnRXaWR0aDogbnVtYmVyO1xuICBzY2FsZTogbnVtYmVyO1xuICBpbmNsdWRlSW1hZ2VzOiBib29sZWFuO1xuICBkZWJ1ZzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIFBERkV4cG9ydGVyIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBFeHBvcnRPcHRpb25zO1xuICBwcml2YXRlIHZlcmlmaWVyOiBQREZWZXJpZmllcjtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBFeHBvcnRPcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnZlcmlmaWVyID0gbmV3IFBERlZlcmlmaWVyKHtcbiAgICAgIGFwcDogbnVsbCBhcyBhbnksIC8vIENMSSB2ZXJzaW9uIGRvZXNuJ3QgaGF2ZSBPYnNpZGlhbiBhcHBcbiAgICAgIHZhdWx0UGF0aDogb3B0aW9ucy52YXVsdFBhdGhcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGV4cG9ydE1hcmtkb3duVG9QREYoaW5wdXRQYXRoOiBzdHJpbmcsIG91dHB1dFBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIFJlYWQgbWFya2Rvd24gY29udGVudFxuICAgIGNvbnN0IG1hcmtkb3duID0gYXdhaXQgZnMucmVhZEZpbGUoaW5wdXRQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBiYXNlTmFtZSA9IHBhdGguYmFzZW5hbWUoaW5wdXRQYXRoLCAnLm1kJyk7XG5cbiAgICAvLyBDb252ZXJ0IG1hcmtkb3duIHRvIEhUTUxcbiAgICBjb25zdCBodG1sID0gYXdhaXQgdGhpcy5jb252ZXJ0TWFya2Rvd25Ub0hUTUwobWFya2Rvd24sIGlucHV0UGF0aCwgYmFzZU5hbWUpO1xuXG4gICAgLy8gQ29udmVydCBIVE1MIHRvIGltYWdlIHVzaW5nIFB1cHBldGVlclxuICAgIGNvbnN0IGltYWdlRGF0YSA9IGF3YWl0IHRoaXMuY29udmVydEhUTUxUb0ltYWdlKGh0bWwpO1xuXG4gICAgLy8gQ3JlYXRlIFBERiBmcm9tIGltYWdlXG4gICAgY29uc3QgcGRmID0gYXdhaXQgdGhpcy5jcmVhdGVQREYoaW1hZ2VEYXRhLCBiYXNlTmFtZSk7XG5cbiAgICAvLyBTYXZlIFBERlxuICAgIGF3YWl0IGZzLndyaXRlRmlsZShvdXRwdXRQYXRoLCBCdWZmZXIuZnJvbShwZGYpKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29udmVydE1hcmtkb3duVG9IVE1MKG1hcmtkb3duOiBzdHJpbmcsIHNvdXJjZVBhdGg6IHN0cmluZywgdGl0bGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coJ/Cfk50gQ29udmVydGluZyBtYXJrZG93biB0byBIVE1MLi4uJyk7XG4gICAgfVxuXG4gICAgLy8gQ29uZmlndXJlIG1hcmtlZCBmb3IgT2JzaWRpYW4tbGlrZSByZW5kZXJpbmdcbiAgICBtYXJrZWQuc2V0T3B0aW9ucyh7XG4gICAgICBnZm06IHRydWUsXG4gICAgICBicmVha3M6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIENvbnZlcnQgbWFya2Rvd24gdG8gSFRNTFxuICAgIGxldCBodG1sID0gbWFya2VkKG1hcmtkb3duKTtcblxuICAgIC8vIENyZWF0ZSBjb21wbGV0ZSBIVE1MIGRvY3VtZW50IHdpdGggc3R5bGluZ1xuICAgIGNvbnN0IGZ1bGxIVE1MID0gYFxuICAgICAgPCFET0NUWVBFIGh0bWw+XG4gICAgICA8aHRtbD5cbiAgICAgIDxoZWFkPlxuICAgICAgICA8bWV0YSBjaGFyc2V0PVwidXRmLThcIj5cbiAgICAgICAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xXCI+XG4gICAgICAgIDx0aXRsZT4ke3RpdGxlfTwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICAke3RoaXMuZ2V0UERGU3R5bGVzKCl9XG4gICAgICAgIDwvc3R5bGU+XG4gICAgICA8L2hlYWQ+XG4gICAgICA8Ym9keT5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxuICAgICAgICAgIDxoMSBjbGFzcz1cInRpdGxlXCI+JHt0aXRsZX08L2gxPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAke2h0bWx9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9ib2R5PlxuICAgICAgPC9odG1sPlxuICAgIGA7XG5cbiAgICAvLyBQcm9jZXNzIGltYWdlcyBpZiBlbmFibGVkXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbmNsdWRlSW1hZ2VzKSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5wcm9jZXNzSW1hZ2VzKGZ1bGxIVE1MLCBzb3VyY2VQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUmVtb3ZlIGltYWdlc1xuICAgICAgcmV0dXJuIGZ1bGxIVE1MLnJlcGxhY2UoLzxpbWdbXj5dKj4vZywgJycpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJvY2Vzc0ltYWdlcyhodG1sOiBzdHJpbmcsIHNvdXJjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2coJ/CflrzvuI8gUHJvY2Vzc2luZyBpbWFnZXMuLi4nKTtcbiAgICB9XG5cbiAgICAvLyBTaW1wbGUgcmVnZXggdG8gZmluZCBpbWcgdGFncyAoZm9yIENMSSwgd2UnbGwgdXNlIGJhc2ljIHByb2Nlc3NpbmcpXG4gICAgY29uc3QgaW1nUmVnZXggPSAvPGltZ1tePl0rc3JjPVwiKFteXCJdKylcIltePl0qPi9nO1xuXG4gICAgY29uc3QgcHJvY2Vzc0ltYWdlID0gYXN5bmMgKG1hdGNoOiBzdHJpbmcsIHNyYzogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+ID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFNraXAgZXh0ZXJuYWwgVVJMc1xuICAgICAgICBpZiAoc3JjLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSB8fCBzcmMuc3RhcnRzV2l0aCgnaHR0cHM6Ly8nKSkge1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTa2lwcGluZyBleHRlcm5hbCBpbWFnZTogJHtzcmN9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHNcbiAgICAgICAgbGV0IGltYWdlUGF0aCA9IHNyYztcbiAgICAgICAgaWYgKCFwYXRoLmlzQWJzb2x1dGUoc3JjKSkge1xuICAgICAgICAgIGltYWdlUGF0aCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoc291cmNlUGF0aCksIHNyYyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBmaWxlIGV4aXN0cyBpbiB2YXVsdFxuICAgICAgICBjb25zdCB2YXVsdFJlbGF0aXZlUGF0aCA9IHBhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLnZhdWx0UGF0aCwgaW1hZ2VQYXRoKTtcbiAgICAgICAgY29uc3QgdmF1bHRJbWFnZVBhdGggPSBwYXRoLmpvaW4odGhpcy5vcHRpb25zLnZhdWx0UGF0aCwgdmF1bHRSZWxhdGl2ZVBhdGgpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgaW1hZ2VTdGF0cyA9IGF3YWl0IGZzLnN0YXQodmF1bHRJbWFnZVBhdGgpO1xuICAgICAgICAgIGlmIChpbWFnZVN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAvLyBSZWFkIGltYWdlIGFuZCBjb252ZXJ0IHRvIGJhc2U2NFxuICAgICAgICAgICAgY29uc3QgaW1hZ2VCdWZmZXIgPSBhd2FpdCBmcy5yZWFkRmlsZSh2YXVsdEltYWdlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBiYXNlNjQgPSBpbWFnZUJ1ZmZlci50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgICAgICBjb25zdCBtaW1lVHlwZSA9IHRoaXMuZ2V0TWltZVR5cGUocGF0aC5leHRuYW1lKHZhdWx0SW1hZ2VQYXRoKSk7XG4gICAgICAgICAgICBjb25zdCBkYXRhVXJsID0gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYEVtYmVkZGVkIGltYWdlOiAke3ZhdWx0SW1hZ2VQYXRofSAoJHsoaW1hZ2VCdWZmZXIubGVuZ3RoIC8gMTAyNCkudG9GaXhlZCgyKX0gS0IpYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtYXRjaC5yZXBsYWNlKHNyYywgZGF0YVVybCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUud2FybihgQ291bGQgbm90IGZpbmQgaW1hZ2U6ICR7dmF1bHRJbWFnZVBhdGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIGltYWdlICR7c3JjfTpgLCBlcnJvcik7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gUHJvY2VzcyBhbGwgaW1hZ2VzXG4gICAgY29uc3QgaW1nTWF0Y2hlcyA9IGh0bWwubWF0Y2goaW1nUmVnZXgpIHx8IFtdO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaW1nTWF0Y2hlcykge1xuICAgICAgY29uc3Qgc3JjTWF0Y2ggPSBtYXRjaC5tYXRjaCgvc3JjPVwiKFteXCJdKylcIi8pO1xuICAgICAgaWYgKHNyY01hdGNoKSB7XG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IGF3YWl0IHByb2Nlc3NJbWFnZShtYXRjaCwgc3JjTWF0Y2hbMV0pO1xuICAgICAgICBodG1sID0gaHRtbC5yZXBsYWNlKG1hdGNoLCBwcm9jZXNzZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBodG1sO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNaW1lVHlwZShleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgdHlwZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnLnBuZyc6ICdpbWFnZS9wbmcnLFxuICAgICAgJy5qcGcnOiAnaW1hZ2UvanBlZycsXG4gICAgICAnLmpwZWcnOiAnaW1hZ2UvanBlZycsXG4gICAgICAnLmdpZic6ICdpbWFnZS9naWYnLFxuICAgICAgJy53ZWJwJzogJ2ltYWdlL3dlYnAnLFxuICAgICAgJy5zdmcnOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAnLmJtcCc6ICdpbWFnZS9ibXAnXG4gICAgfTtcbiAgICByZXR1cm4gdHlwZXNbZXh0LnRvTG93ZXJDYXNlKCldIHx8ICdpbWFnZS9wbmcnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRQREZTdHlsZXMoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFxuICAgICAgYm9keSB7XG4gICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgXCJTZWdvZSBVSVwiLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgICAgIGJhY2tncm91bmQ6ICNmZmZmZmY7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICAuY29udGFpbmVyIHtcbiAgICAgICAgd2lkdGg6ICR7dGhpcy5vcHRpb25zLmNvbnRlbnRXaWR0aH1weDtcbiAgICAgICAgcGFkZGluZzogNDBweDtcbiAgICAgICAgbWFyZ2luOiAwIGF1dG87XG4gICAgICAgIGJhY2tncm91bmQ6ICNmZmZmZmY7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICAudGl0bGUge1xuICAgICAgICBmb250LXNpemU6IDI0cHQ7XG4gICAgICAgIG1hcmdpbi1ib3R0b206IDIwcHg7XG4gICAgICAgIGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjZGRkO1xuICAgICAgICBwYWRkaW5nLWJvdHRvbTogMTBweDtcbiAgICAgICAgY29sb3I6ICMwMDAwMDA7XG4gICAgICB9XG5cbiAgICAgIC5jb250ZW50IHtcbiAgICAgICAgZm9udC1zaXplOiAxMnB0O1xuICAgICAgICBsaW5lLWhlaWdodDogMS42O1xuICAgICAgICBjb2xvcjogIzAwMDAwMDtcbiAgICAgIH1cblxuICAgICAgaDEsIGgyLCBoMywgaDQsIGg1LCBoNiB7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgICBjb2xvcjogIzAwMDAwMDtcbiAgICAgICAgbWFyZ2luLXRvcDogMS41ZW07XG4gICAgICAgIG1hcmdpbi1ib3R0b206IDAuNWVtO1xuICAgICAgfVxuXG4gICAgICBoMSB7IGZvbnQtc2l6ZTogMjRwdDsgfVxuICAgICAgaDIgeyBmb250LXNpemU6IDIwcHQ7IH1cbiAgICAgIGgzIHsgZm9udC1zaXplOiAxNnB0OyB9XG4gICAgICBoNCB7IGZvbnQtc2l6ZTogMTRwdDsgfVxuXG4gICAgICBwIHtcbiAgICAgICAgbWFyZ2luLWJvdHRvbTogMTBwdDtcbiAgICAgICAgY29sb3I6ICMwMDAwMDA7XG4gICAgICB9XG5cbiAgICAgIHN0cm9uZyB7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgICBjb2xvcjogIzAwMDAwMDtcbiAgICAgIH1cblxuICAgICAgZW0ge1xuICAgICAgICBmb250LXN0eWxlOiBpdGFsaWM7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICBjb2RlIHtcbiAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcbiAgICAgICAgYmFja2dyb3VuZDogI2Y1ZjVmNTtcbiAgICAgICAgcGFkZGluZzogMnB0IDRwdDtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMnB0O1xuICAgICAgICBmb250LXNpemU6IDEwcHQ7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICBwcmUge1xuICAgICAgICBiYWNrZ3JvdW5kOiAjZjVmNWY1O1xuICAgICAgICBwYWRkaW5nOiAxMnB0O1xuICAgICAgICBib3JkZXItcmFkaXVzOiA0cHQ7XG4gICAgICAgIG92ZXJmbG93LXg6IGF1dG87XG4gICAgICAgIGZvbnQtc2l6ZTogOXB0O1xuICAgICAgICBjb2xvcjogIzAwMDAwMDtcbiAgICAgIH1cblxuICAgICAgdWwsIG9sIHtcbiAgICAgICAgbWFyZ2luLWJvdHRvbTogMTBwdDtcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAyNHB0O1xuICAgICAgICBjb2xvcjogIzAwMDAwMDtcbiAgICAgIH1cblxuICAgICAgbGkge1xuICAgICAgICBtYXJnaW4tYm90dG9tOiA0cHQ7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICBpbWcge1xuICAgICAgICBtYXgtd2lkdGg6IDEwMCU7XG4gICAgICAgIGhlaWdodDogYXV0bztcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XG4gICAgICAgIG1hcmdpbjogMTJwdCBhdXRvO1xuICAgICAgfVxuXG4gICAgICB0YWJsZSB7XG4gICAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XG4gICAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgICBtYXJnaW4tYm90dG9tOiAxMnB0O1xuICAgICAgfVxuXG4gICAgICB0aCwgdGQge1xuICAgICAgICBib3JkZXI6IDFwdCBzb2xpZCAjZGRkO1xuICAgICAgICBwYWRkaW5nOiA2cHQ7XG4gICAgICAgIHRleHQtYWxpZ246IGxlZnQ7XG4gICAgICAgIGNvbG9yOiAjMDAwMDAwO1xuICAgICAgfVxuXG4gICAgICB0aCB7XG4gICAgICAgIGJhY2tncm91bmQ6ICNmNWY1ZjU7XG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgfVxuXG4gICAgICBociB7XG4gICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNkZGQ7XG4gICAgICAgIG1hcmdpbjogMTZwdCAwO1xuICAgICAgfVxuXG4gICAgICBhIHtcbiAgICAgICAgY29sb3I6ICMwMDY2Y2M7XG4gICAgICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xuICAgICAgfVxuXG4gICAgICBibG9ja3F1b3RlIHtcbiAgICAgICAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjZGRkO1xuICAgICAgICBwYWRkaW5nLWxlZnQ6IDE2cHQ7XG4gICAgICAgIG1hcmdpbjogMTZwdCAwO1xuICAgICAgICBmb250LXN0eWxlOiBpdGFsaWM7XG4gICAgICAgIGNvbG9yOiAjNTU1O1xuICAgICAgfVxuICAgIGA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbnZlcnRIVE1MVG9JbWFnZShodG1sOiBzdHJpbmcpOiBQcm9taXNlPEJ1ZmZlcj4ge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCfwn5a877iPIENvbnZlcnRpbmcgSFRNTCB0byBpbWFnZSB1c2luZyBQdXBwZXRlZXIuLi4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBicm93c2VyID0gYXdhaXQgcHVwcGV0ZWVyLmxhdW5jaCh7XG4gICAgICBoZWFkbGVzczogdHJ1ZSxcbiAgICAgIGFyZ3M6IFsnLS1uby1zYW5kYm94JywgJy0tZGlzYWJsZS1zZXR1aWQtc2FuZGJveCddXG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpO1xuXG4gICAgICAvLyBTZXQgdmlld3BvcnRcbiAgICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnQoe1xuICAgICAgICB3aWR0aDogdGhpcy5vcHRpb25zLmNvbnRlbnRXaWR0aCArIDgwLCAvLyBBZGQgcGFkZGluZ1xuICAgICAgICBoZWlnaHQ6IDIwMDAsXG4gICAgICAgIGRldmljZVNjYWxlRmFjdG9yOiB0aGlzLm9wdGlvbnMuc2NhbGVcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgY29udGVudFxuICAgICAgYXdhaXQgcGFnZS5zZXRDb250ZW50KGh0bWwsIHtcbiAgICAgICAgd2FpdFVudGlsOiBbJ25ldHdvcmtpZGxlMCcsICdkb21jb250ZW50bG9hZGVkJ11cbiAgICAgIH0pO1xuXG4gICAgICAvLyBHZXQgZnVsbCBwYWdlIGhlaWdodCBhbmQgc2V0IHZpZXdwb3J0IGFjY29yZGluZ2x5XG4gICAgICBjb25zdCBib2R5SGFuZGxlID0gYXdhaXQgcGFnZS4kKCdib2R5Jyk7XG4gICAgICBpZiAoYm9keUhhbmRsZSkge1xuICAgICAgICBjb25zdCBib3VuZGluZ0JveCA9IGF3YWl0IGJvZHlIYW5kbGUuYm91bmRpbmdCb3goKTtcbiAgICAgICAgaWYgKGJvdW5kaW5nQm94KSB7XG4gICAgICAgICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydCh7XG4gICAgICAgICAgICB3aWR0aDogdGhpcy5vcHRpb25zLmNvbnRlbnRXaWR0aCArIDgwLFxuICAgICAgICAgICAgaGVpZ2h0OiBNYXRoLmNlaWwoYm91bmRpbmdCb3guaGVpZ2h0ICsgMTAwKSxcbiAgICAgICAgICAgIGRldmljZVNjYWxlRmFjdG9yOiB0aGlzLm9wdGlvbnMuc2NhbGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBUYWtlIHNjcmVlbnNob3RcbiAgICAgIGNvbnN0IHNjcmVlbnNob3QgPSBhd2FpdCBwYWdlLnNjcmVlbnNob3Qoe1xuICAgICAgICB0eXBlOiAncG5nJyxcbiAgICAgICAgZnVsbFBhZ2U6IHRydWUsXG4gICAgICAgIG9taXRCYWNrZ3JvdW5kOiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBzY3JlZW5zaG90IGFzIEJ1ZmZlcjtcblxuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVQREYoaW1hZ2VEYXRhOiBCdWZmZXIsIHRpdGxlOiBzdHJpbmcpOiBQcm9taXNlPEJ1ZmZlcj4ge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCfwn5OEIENyZWF0aW5nIFBERiBmcm9tIGltYWdlLi4uJyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIFBERiBmcm9tIGltYWdlIGRhdGFcbiAgICBjb25zdCBwZGYgPSBuZXcganNQREYoe1xuICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXG4gICAgICB1bml0OiAnbW0nLFxuICAgICAgZm9ybWF0OiB0aGlzLm9wdGlvbnMucGFnZVNpemVcbiAgICB9KTtcblxuICAgIGNvbnN0IHBhZ2VXaWR0aCA9IHBkZi5pbnRlcm5hbC5wYWdlU2l6ZS5nZXRXaWR0aCgpO1xuICAgIGNvbnN0IHBhZ2VIZWlnaHQgPSBwZGYuaW50ZXJuYWwucGFnZVNpemUuZ2V0SGVpZ2h0KCk7XG4gICAgY29uc3QgbWFyZ2luID0gdGhpcy5vcHRpb25zLm1hcmdpbjtcblxuICAgIC8vIENvbnZlcnQgaW1hZ2UgdG8gZGF0YSBVUkxcbiAgICBjb25zdCBkYXRhVXJsID0gYGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCwke2ltYWdlRGF0YS50b1N0cmluZygnYmFzZTY0Jyl9YDtcblxuICAgIC8vIENhbGN1bGF0ZSBpbWFnZSBkaW1lbnNpb25zIHRvIGZpdCBwYWdlXG4gICAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSBwYWdlV2lkdGggLSAobWFyZ2luICogMik7XG4gICAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gcGFnZUhlaWdodCAtIChtYXJnaW4gKiAyKTtcblxuICAgIC8vIEFkZCB0aGUgaW1hZ2UgdG8gY292ZXIgdGhlIGZ1bGwgYXZhaWxhYmxlIGFyZWFcbiAgICBwZGYuYWRkSW1hZ2UoZGF0YVVybCwgJ1BORycsIG1hcmdpbiwgbWFyZ2luLCBhdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0KTtcblxuICAgIHJldHVybiBCdWZmZXIuZnJvbShwZGYub3V0cHV0KCdhcnJheWJ1ZmZlcicpKTtcbiAgfVxuXG4gIGFzeW5jIHZlcmlmeVBERihwZGZQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGRmQnVmZmVyID0gYXdhaXQgZnMucmVhZEZpbGUocGRmUGF0aCk7XG4gICAgICBjb25zdCBiYXNlTmFtZSA9IHBhdGguYmFzZW5hbWUocGRmUGF0aCwgJy5wZGYnKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy52ZXJpZmllci52ZXJpZnlQREYocGRmQnVmZmVyLmJ1ZmZlciBhcyBBcnJheUJ1ZmZlciwgYmFzZU5hbWUpO1xuXG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coYOKchSBWZXJpZmljYXRpb24gY29tcGxldGUhIEdlbmVyYXRlZCAke3Jlc3VsdC5pbWFnZUNvdW50fSBpbWFnZShzKTpgKTtcbiAgICAgICAgcmVzdWx0LmltYWdlUGF0aHMuZm9yRWFjaCgoaW1nUGF0aCwgaW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAgJHtpbmRleCArIDF9LiAke2ltZ1BhdGh9YCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIFZlcmlmaWNhdGlvbiBmYWlsZWQ6ICR7cmVzdWx0LmVycm9yfWApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGDinYwgVmVyaWZpY2F0aW9uIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG59Il19