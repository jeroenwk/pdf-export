import puppeteer from 'puppeteer';
import { marked } from 'marked';
import path from 'path';
import fs from 'fs/promises';
import { jsPDF } from 'jspdf';
import { PDFVerifierCLI } from './test/pdfVerificationCLI.js';
import sharp from 'sharp';

export interface ExportOptions {
  vaultPath: string;
  pageSize: 'a4' | 'letter';
  margin: number;
  contentWidth: number;
  scale: number;
  includeImages: boolean;
  debug: boolean;
}

export class PDFExporter {
  private options: ExportOptions;
  private verifier: PDFVerifierCLI;

  constructor(options: ExportOptions) {
    this.options = options;
    this.verifier = new PDFVerifierCLI({
      vaultPath: options.vaultPath
    });
  }

  async exportMarkdownToPDF(inputPath: string, outputPath: string): Promise<void> {
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

  private async convertMarkdownToHTML(markdown: string, sourcePath: string, title: string): Promise<string> {
    if (this.options.debug) {
      console.log('📝 Converting markdown to HTML...');
    }

    // Configure marked for Obsidian-like rendering
    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Convert Obsidian wiki-links to standard markdown before processing
    const processedMarkdown = this.processObsidianWikiLinks(markdown, sourcePath);

    // Convert markdown to HTML
    let html = marked(processedMarkdown);

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
    } else {
      // Remove images
      return fullHTML.replace(/<img[^>]*>/g, '');
    }
  }

  private async processImages(html: string, sourcePath: string): Promise<string> {
    if (this.options.debug) {
      console.log('🖼️ Processing images...');
    }

    // Simple regex to find img tags (for CLI, we'll use basic processing)
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;

    const processImage = async (match: string, src: string): Promise<string> => {
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

            // Get image dimensions to preserve aspect ratio
            const metadata = await sharp(imageBuffer).metadata();
            if (metadata.width && metadata.height) {
              const aspectRatio = metadata.height / metadata.width;
              const maxWidth = this.options.contentWidth - 80; // Account for padding
              const calculatedWidth = Math.min(metadata.width, maxWidth);
              const calculatedHeight = calculatedWidth * aspectRatio;

              // Add width and height attributes to preserve aspect ratio
              const newImgTag = match
                .replace(src, dataUrl)
                .replace(/<img/, `<img width="${Math.round(calculatedWidth)}" height="${Math.round(calculatedHeight)}"`);

              if (this.options.debug) {
                console.log(`Embedded image: ${vaultImagePath} (${(imageBuffer.length / 1024).toFixed(2)} KB) - ${metadata.width}x${metadata.height} → ${Math.round(calculatedWidth)}x${Math.round(calculatedHeight)}`);
              }

              return newImgTag;
            }

            if (this.options.debug) {
              console.log(`Embedded image: ${vaultImagePath} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
            }

            return match.replace(src, dataUrl);
          }
        } catch (error) {
          console.warn(`Could not find image: ${vaultImagePath}`);
        }

        return match;
      } catch (error) {
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

  private getMimeType(ext: string): string {
    const types: Record<string, string> = {
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

  private processObsidianWikiLinks(markdown: string, sourcePath: string): string {
    if (this.options.debug) {
      console.log('🔗 Processing Obsidian wiki-links...');
    }

    // Process image wiki-links: ![[image.png]] -> ![alt](image.png)
    const imageWikiLinkRegex = /!\[\[([^\]]+)\]\]/g;
    let processedMarkdown = markdown.replace(imageWikiLinkRegex, (match, imagePath) => {
      // Handle potential pipe syntax: ![[image.png|alt text]]
      const parts = imagePath.split('|');
      const filename = parts[0].trim();
      const altText = parts.length > 1 ? parts[1].trim() : filename;

      if (this.options.debug) {
        console.log(`  Converting wiki-link: ${match} -> ![${altText}](${filename})`);
      }

      return `![${altText}](${filename})`;
    });

    return processedMarkdown;
  }

  private getPDFStyles(): string {
    return `
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #ffffff;
        color: #000000;
      }

      .container {
        max-width: ${this.options.contentWidth}px;
        width: 100%;
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

  private async convertHTMLToImage(html: string): Promise<Buffer> {
    if (this.options.debug) {
      console.log('🖼️ Converting HTML to image using Puppeteer...');
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      // Set viewport with proper dimensions
      await page.setViewport({
        width: this.options.contentWidth + 80, // Add padding
        height: 3000, // Increased initial height for better rendering
        deviceScaleFactor: this.options.scale
      });

      // Set content
      await page.setContent(html, {
        waitUntil: ['networkidle0', 'domcontentloaded']
      });

      // Wait for images to load completely
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve(null);
          } else {
            window.addEventListener('load', resolve);
          }
        });
      });

      // Give images time to render properly
      await new Promise(resolve => setTimeout(resolve, 1000));

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

      return screenshot as Buffer;

    } finally {
      await browser.close();
    }
  }

  private async createPDF(imageData: Buffer, title: string): Promise<Buffer> {
    if (this.options.debug) {
      console.log('📄 Creating PDF from image...');
    }

    // Get image dimensions
    const imageSize = await this.getImageDimensions(imageData);
    const imageWidthMM = imageSize.width / 3.78; // Convert pixels to mm (96 DPI ≈ 3.78 pixels per mm)
    const imageHeightMM = imageSize.height / 3.78;

    // Create PDF with custom dimensions based on image
    const pdf = new jsPDF({
      orientation: imageHeightMM > imageWidthMM ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [imageWidthMM + (this.options.margin * 2), imageHeightMM + (this.options.margin * 2)]
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Convert image to data URL
    const dataUrl = `data:image/png;base64,${imageData.toString('base64')}`;

    // Add the image to cover the full page
    pdf.addImage(dataUrl, 'PNG', this.options.margin, this.options.margin, imageWidthMM, imageHeightMM);

    return Buffer.from(pdf.output('arraybuffer'));
  }

  private async getImageDimensions(imageData: Buffer): Promise<{width: number, height: number}> {
    const metadata = await sharp(imageData).metadata();
    return {
      width: metadata.width || 800,
      height: metadata.height || 600
    };
  }

  async verifyPDF(pdfPath: string): Promise<void> {
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const baseName = path.basename(pdfPath, '.pdf');

      const result = await this.verifier.verifyPDF(pdfBuffer.buffer as ArrayBuffer, baseName);

      if (result.success) {
        console.log(`✅ Verification complete! Generated ${result.imageCount} image(s):`);
        result.imagePaths.forEach((imgPath, index) => {
          console.log(`   ${index + 1}. ${imgPath}`);
        });
      } else {
        console.error(`❌ Verification failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Verification error: ${error.message}`);
    }
  }
}