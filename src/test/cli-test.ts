/**
 * CLI Test for PDF Export Plugin
 *
 * This script simulates a browser environment using JSDOM to test the PDF export
 * functionality from the command line. It uses the plugin's actual conversion logic.
 */

import { JSDOM } from 'jsdom';
import { Canvas, Image } from 'canvas';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { pdf } from 'pdf-to-img';

// Setup JSDOM with canvas support
function setupDOM() {
	const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
		pretendToBeVisual: true,
		resources: 'usable',
		url: 'http://localhost'
	});

	// Set up global variables that html2canvas expects
	global.window = dom.window as any;
	global.document = dom.window.document;
	global.navigator = dom.window.navigator;
	global.HTMLElement = dom.window.HTMLElement;
	global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
	global.Image = Image as any;

	// Patch canvas creation for html2canvas
	const originalCreateElement = dom.window.document.createElement.bind(dom.window.document);
	dom.window.document.createElement = function(tagName: string) {
		if (tagName === 'canvas') {
			const canvas = new Canvas(800, 600);
			return canvas as any;
		}
		return originalCreateElement(tagName);
	} as any;

	return dom;
}

// Settings interface matching the plugin
interface PDFExportSettings {
	exportFolder: string;
	pageSize: 'a4' | 'letter';
	includeImages: boolean;
	imageMaxWidth: number;
	showTitle: boolean;
	pdfMargin: number;
	canvasScale: number;
	autoVerifyPDF: boolean;
}

const DEFAULT_SETTINGS: PDFExportSettings = {
	exportFolder: 'PDF Exports',
	pageSize: 'a4',
	includeImages: true,
	imageMaxWidth: 1600,
	showTitle: true,
	pdfMargin: 10,
	canvasScale: 2,
	autoVerifyPDF: false
};

/**
 * Apply PDF-friendly styles to the container
 */
function applyPDFStyles(container: HTMLElement) {
	const style = document.createElement('style');
	style.textContent = `
		.markdown-preview-view {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			font-size: 12pt;
			line-height: 1.6;
			color: #000 !important;
			background: #fff !important;
		}
		.markdown-preview-view h1 {
			font-size: 24pt;
			margin-top: 24pt;
			margin-bottom: 12pt;
			font-weight: bold;
			color: #000 !important;
		}
		.markdown-preview-view h2 {
			font-size: 20pt;
			margin-top: 20pt;
			margin-bottom: 10pt;
			font-weight: bold;
			color: #000 !important;
		}
		.markdown-preview-view h3 {
			font-size: 16pt;
			margin-top: 16pt;
			margin-bottom: 8pt;
			font-weight: bold;
			color: #000 !important;
		}
		.markdown-preview-view p {
			margin-bottom: 10pt;
			color: #000 !important;
		}
		.markdown-preview-view img {
			max-width: 100%;
			height: auto;
			display: block;
			margin: 12pt auto;
		}
		.markdown-preview-view * {
			color: #000 !important;
		}
	`;
	container.appendChild(style);
}

/**
 * Create a simple HTML container with rendered markdown
 * Note: This is a simplified version. In the real plugin, Obsidian's MarkdownRenderer is used.
 */
function renderMarkdownToHTML(content: string, title: string, showTitle: boolean): HTMLElement {
	const containerEl = document.createElement('div');
	containerEl.className = 'markdown-preview-view';
	(containerEl as any).style.width = '800px';
	(containerEl as any).style.padding = '40px';
	(containerEl as any).style.backgroundColor = '#ffffff';
	(containerEl as any).style.color = '#000000';

	document.body.appendChild(containerEl);

	if (showTitle) {
		const titleEl = document.createElement('h1');
		titleEl.textContent = title;
		(titleEl as any).style.marginBottom = '20px';
		(titleEl as any).style.borderBottom = '2px solid #ddd';
		(titleEl as any).style.paddingBottom = '10px';
		containerEl.appendChild(titleEl);
	}

	// Simple markdown to HTML conversion (basic implementation)
	const contentEl = document.createElement('div');
	contentEl.innerHTML = content
		.replace(/^# (.*$)/gim, '<h1>$1</h1>')
		.replace(/^## (.*$)/gim, '<h2>$1</h2>')
		.replace(/^### (.*$)/gim, '<h3>$1</h3>')
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.*?)\*/g, '<em>$1</em>')
		.replace(/\n\n/g, '</p><p>')
		.replace(/^(.+)$/gm, '<p>$1</p>')
		.replace(/<p><h/g, '<h')
		.replace(/<\/h([1-6])><\/p>/g, '</h$1>');

	containerEl.appendChild(contentEl);
	applyPDFStyles(containerEl);

	return containerEl;
}

/**
 * Create PDF from HTML container (matching plugin logic)
 */
async function createPDFFromHTML(
	containerEl: HTMLElement,
	title: string,
	settings: PDFExportSettings
): Promise<jsPDF> {
	// Convert HTML to canvas using html2canvas
	const canvas = await html2canvas(containerEl, {
		scale: settings.canvasScale,
		useCORS: true,
		logging: false,
		backgroundColor: '#ffffff',
		width: (containerEl as any).scrollWidth,
		height: (containerEl as any).scrollHeight
	});

	// PDF dimensions
	const pdf = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: settings.pageSize
	});

	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = settings.pdfMargin;

	// Calculate scaling to fit width
	const imgWidth = pageWidth - (margin * 2);
	const imgHeight = ((canvas as any).height * imgWidth) / (canvas as any).width;

	// Convert canvas to image data
	const imgData = (canvas as any).toDataURL('image/png');

	// Calculate content height per page (in mm)
	const pageContentHeight = pageHeight - (margin * 2);

	// If content fits on one page, just add it
	if (imgHeight <= pageContentHeight) {
		pdf.addImage(
			imgData,
			'PNG',
			margin,
			margin,
			imgWidth,
			imgHeight
		);
	} else {
		// Multi-page: slice the image
		let heightLeft = imgHeight;
		let position = 0;

		// Add first page
		pdf.addImage(
			imgData,
			'PNG',
			margin,
			position,
			imgWidth,
			imgHeight
		);
		heightLeft -= pageContentHeight;

		// Add additional pages
		while (heightLeft > 0) {
			position -= pageContentHeight;
			pdf.addPage();
			pdf.addImage(
				imgData,
				'PNG',
				margin,
				position,
				imgWidth,
				imgHeight
			);
			heightLeft -= pageContentHeight;
		}
	}

	return pdf;
}

/**
 * Convert PDF to PNG images for verification
 */
async function verifyPDF(pdfBuffer: ArrayBuffer, baseName: string, outputFolder: string): Promise<string[]> {
	const verificationFolder = join(outputFolder, 'verification');
	if (!existsSync(verificationFolder)) {
		mkdirSync(verificationFolder, { recursive: true });
	}

	const document = await pdf(Buffer.from(pdfBuffer), { scale: 2.0 });
	const imagePaths: string[] = [];
	let pageNumber = 0;

	for await (const image of document) {
		pageNumber++;
		const imagePath = join(verificationFolder, `${baseName}_page_${pageNumber}.png`);
		writeFileSync(imagePath, image);
		imagePaths.push(imagePath);
		console.log(`  ✓ Generated: ${imagePath}`);
	}

	return imagePaths;
}

/**
 * Main test function
 */
async function testPDFExport(
	markdownPath: string,
	outputFolder: string,
	settings: Partial<PDFExportSettings> = {}
) {
	console.log('=== PDF Export CLI Test ===\n');

	// Setup DOM environment
	console.log('1. Setting up DOM environment...');
	setupDOM();
	console.log('   ✓ DOM ready\n');

	// Merge settings with defaults
	const finalSettings: PDFExportSettings = { ...DEFAULT_SETTINGS, ...settings };

	// Read markdown file
	console.log('2. Reading markdown file...');
	if (!existsSync(markdownPath)) {
		throw new Error(`Markdown file not found: ${markdownPath}`);
	}
	const content = readFileSync(markdownPath, 'utf-8');
	const title = markdownPath.split('/').pop()?.replace('.md', '') || 'Untitled';
	console.log(`   ✓ Loaded: ${title}\n`);

	// Render markdown to HTML
	console.log('3. Rendering markdown to HTML...');
	const containerEl = renderMarkdownToHTML(content, title, finalSettings.showTitle);
	console.log('   ✓ HTML rendered\n');

	// Create PDF
	console.log('4. Generating PDF...');
	const pdfDoc = await createPDFFromHTML(containerEl, title, finalSettings);
	console.log('   ✓ PDF generated\n');

	// Save PDF
	console.log('5. Saving PDF...');
	if (!existsSync(outputFolder)) {
		mkdirSync(outputFolder, { recursive: true });
	}
	const pdfPath = join(outputFolder, `${title}.pdf`);
	const pdfBlob = pdfDoc.output('blob') as any;
	const arrayBuffer = await pdfBlob.arrayBuffer();
	writeFileSync(pdfPath, Buffer.from(arrayBuffer));
	console.log(`   ✓ Saved: ${pdfPath}\n`);

	// Verify PDF (convert to images)
	console.log('6. Verifying PDF (converting to images)...');
	const imagePaths = await verifyPDF(arrayBuffer, title, outputFolder);
	console.log(`   ✓ Generated ${imagePaths.length} verification image(s)\n`);

	console.log('=== Test Complete ===');
	console.log(`\nPDF saved to: ${pdfPath}`);
	console.log(`Verification images: ${imagePaths.length}`);
	imagePaths.forEach(path => console.log(`  - ${path}`));
}

// CLI interface
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error('Usage: ts-node src/test/cli-test.ts <markdown-file> [output-folder]');
		console.error('Example: ts-node src/test/cli-test.ts "/Users/jeroendezwart/2th Brain/My Note.md"');
		process.exit(1);
	}

	const markdownPath = args[0];
	const outputFolder = args[1] || '/Users/jeroendezwart/2th Brain/PDF Exports';

	testPDFExport(markdownPath, outputFolder)
		.then(() => process.exit(0))
		.catch(error => {
			console.error('\n❌ Test failed:', error.message);
			console.error(error.stack);
			process.exit(1);
		});
}

export { testPDFExport, DEFAULT_SETTINGS };
