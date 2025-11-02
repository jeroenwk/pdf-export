import { Plugin, Notice, MarkdownRenderer, MarkdownView, Component, App, PluginSettingTab, Setting, Platform } from 'obsidian';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
// import { PDFVerifier } from './test/pdfVerification';

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
	imageMaxWidth: 1120,
	showTitle: true,
	pdfMargin: 10,
	canvasScale: 2,
	autoVerifyPDF: false
};

export default class PDFExportPlugin extends Plugin {
	settings: PDFExportSettings;
	// pdfVerifier: PDFVerifier;
	lastExportedPDF: { buffer: ArrayBuffer; fileName: string } | null = null;

	async onload() {
		console.log('Loading PDF Export plugin');

		await this.loadSettings();

		// Initialize PDF verifier (temporarily disabled for testing)
		// this.pdfVerifier = new PDFVerifier({ app: this.app });

		// Add command to export PDF
		this.addCommand({
			id: 'export-to-pdf',
			name: 'Export to PDF',
			callback: () => this.exportToPDF()
		});

		// Add command to verify last PDF export (temporarily disabled)
		// this.addCommand({
		// 	id: 'verify-last-pdf',
		// 	name: 'Verify Last PDF Export',
		// 	callback: () => this.verifyLastPDF()
		// });

		// Add ribbon icon
		this.addRibbonIcon('file-down', 'Export to PDF', () => {
			this.exportToPDF();
		});

		// Add settings tab
		this.addSettingTab(new PDFExportSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async exportToPDF() {
		try {
			// Get the active file
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('No active file to export');
				return;
			}

			// Check if it's a markdown file
			if (activeFile.extension !== 'md') {
				new Notice('Active file is not a markdown file');
				return;
			}

			new Notice('Generating PDF...');

			// Read the note content
			const content = await this.app.vault.read(activeFile);

			// Render markdown to HTML
			const containerEl = await this.renderMarkdownToHTML(content, activeFile.path, activeFile.basename);

			// Apply PDF-friendly styles
			this.applyPDFStyles(containerEl);

			// Process and embed images from vault (if enabled)
			if (this.settings.includeImages) {
				await this.processImages(containerEl, activeFile.path);
			} else {
				// Remove all images if includeImages is false
				const images = containerEl.querySelectorAll('img');
				images.forEach(img => img.remove());
			}

			// Create PDF from HTML
			const pdf = await this.createPDFFromHTML(containerEl, activeFile.basename);

			// Get PDF as blob
			const pdfBlob = pdf.output('blob');
			const arrayBuffer = await pdfBlob.arrayBuffer();

			// Ensure export folder exists
			const exportFolder = this.settings.exportFolder;
			if (!await this.app.vault.adapter.exists(exportFolder)) {
				await this.app.vault.adapter.mkdir(exportFolder);
			}

			// Save to configured export folder
			const filename = `${exportFolder}/${activeFile.basename}.pdf`;
			await this.app.vault.adapter.writeBinary(
				filename,
				arrayBuffer
			);

			// Store reference to last exported PDF for verification
			this.lastExportedPDF = {
				buffer: arrayBuffer,
				fileName: activeFile.basename
			};

			// Auto-verify if enabled (temporarily disabled)
			// if (this.settings.autoVerifyPDF) {
			// 	new Notice('PDF saved. Generating verification images...');
			// 	await this.verifyPDFBuffer(arrayBuffer, activeFile.basename);
			// }

			// Clean up
			containerEl.remove();

			new Notice(`PDF saved as ${filename}`);
		} catch (error) {
			console.error('PDF export failed:', error);
			new Notice(`Export failed: ${error.message}`);
		}
	}

	async renderMarkdownToHTML(content: string, sourcePath: string, title: string): Promise<HTMLElement> {
		// Create container for rendered HTML
		const containerEl = document.createElement('div');
		containerEl.addClass('markdown-preview-view');
		containerEl.style.width = '1200px';
		containerEl.style.padding = '40px';
		containerEl.style.backgroundColor = '#ffffff';
		containerEl.style.color = '#000000';

		// Add to document temporarily (required for rendering)
		containerEl.style.position = 'absolute';
		containerEl.style.left = '-9999px';
		document.body.appendChild(containerEl);

		// Add title as H1 (if enabled in settings)
		if (this.settings.showTitle) {
			const titleEl = document.createElement('h1');
			titleEl.textContent = title;
			titleEl.style.marginBottom = '20px';
			titleEl.style.borderBottom = '2px solid #ddd';
			titleEl.style.paddingBottom = '10px';
			containerEl.appendChild(titleEl);
		}

		// Use Obsidian's markdown renderer
		const component = new Component();
		await MarkdownRenderer.render(
			this.app,
			content,
			containerEl,
			sourcePath,
			component
		);

		return containerEl;
	}

	async processImages(containerEl: HTMLElement, sourcePath: string) {
		const images = containerEl.querySelectorAll('img');

		for (const img of Array.from(images)) {
			try {
				const src = img.getAttribute('src');
				if (!src) continue;

				// Skip external URLs (http/https)
				if (src.startsWith('http://') || src.startsWith('https://')) {
					console.log('Skipping external image:', src);
					continue;
				}

				let imagePath = null;

				// Handle Obsidian's app:// protocol
				if (src.startsWith('app://')) {
					// Extract the filename from app://local/... URL
					const urlPath = decodeURIComponent(src);
					// app://local/path/to/vault/filename.png
					const parts = urlPath.split('/');
					const filename = parts[parts.length - 1];

					// Try to find the file in the vault
					imagePath = this.app.metadataCache.getFirstLinkpathDest(filename, sourcePath);
				}
				// Handle relative paths and wiki-style embeds
				else {
					imagePath = this.app.metadataCache.getFirstLinkpathDest(src, sourcePath);
				}

				if (imagePath) {
					console.log('Processing image:', imagePath.path);

					// Read image as binary
					const imageData = await this.app.vault.readBinary(imagePath);

					// Convert to base64
					const base64 = this.arrayBufferToBase64(imageData);

					// Determine MIME type
					const ext = imagePath.extension.toLowerCase();
					const mimeType = this.getMimeType(ext);

					// Create data URL
					const dataUrl = `data:${mimeType};base64,${base64}`;

					// Replace src with data URL
					img.setAttribute('src', dataUrl);

					// Apply CSS to ensure proper aspect ratio and prevent overflow
					img.style.maxWidth = '100%';
					img.style.height = 'auto';
					img.style.display = 'block';
					img.style.margin = '12pt auto';
					img.style.overflow = 'visible';
					img.style.pageBreakInside = 'avoid';

					console.log(`Image embedded: ${imagePath.name} (${(imageData.byteLength / 1024).toFixed(2)} KB)`);
				} else {
					console.warn('Could not find image file:', src);
				}
			} catch (error) {
				console.error('Error processing image:', img.getAttribute('src'), error);
			}
		}
	}

	arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	getMimeType(ext: string): string {
		const types: Record<string, string> = {
			'png': 'image/png',
			'jpg': 'image/jpeg',
			'jpeg': 'image/jpeg',
			'gif': 'image/gif',
			'webp': 'image/webp',
			'svg': 'image/svg+xml',
			'bmp': 'image/bmp'
		};
		return types[ext] || 'image/png';
	}

	applyPDFStyles(container: HTMLElement) {
		// Inject PDF-friendly CSS
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
			.markdown-preview-view h4 {
				font-size: 14pt;
				margin-top: 14pt;
				margin-bottom: 7pt;
				font-weight: bold;
				color: #000 !important;
			}
			.markdown-preview-view p {
				margin-bottom: 10pt;
				color: #000 !important;
			}
			.markdown-preview-view strong {
				font-weight: bold;
				color: #000 !important;
			}
			.markdown-preview-view em {
				font-style: italic;
				color: #000 !important;
			}
			.markdown-preview-view code {
				font-family: 'Courier New', monospace;
				background: #f5f5f5;
				padding: 2pt 4pt;
				border-radius: 2pt;
				font-size: 10pt;
				color: #000 !important;
			}
			.markdown-preview-view pre {
				background: #f5f5f5;
				padding: 12pt;
				border-radius: 4pt;
				overflow-x: auto;
				font-size: 9pt;
				color: #000 !important;
			}
			.markdown-preview-view ul, .markdown-preview-view ol {
				margin-bottom: 10pt;
				padding-left: 24pt;
			}
			.markdown-preview-view li {
				margin-bottom: 4pt;
				color: #000 !important;
			}
			.markdown-preview-view img {
				max-width: 100%;
				height: auto;
				display: block;
				margin: 12pt auto;
				overflow: visible;
				page-break-inside: avoid;
				break-inside: avoid;
			}
			.markdown-preview-view table {
				border-collapse: collapse;
				width: 100%;
				margin-bottom: 12pt;
			}
			.markdown-preview-view th, .markdown-preview-view td {
				border: 1pt solid #ddd;
				padding: 6pt;
				text-align: left;
				color: #000 !important;
			}
			.markdown-preview-view th {
				background: #f5f5f5;
				font-weight: bold;
			}
			.markdown-preview-view hr {
				border: none;
				border-top: 1px solid #ddd;
				margin: 16pt 0;
			}
			/* Make sure all text is visible */
			.markdown-preview-view * {
				color: #000 !important;
			}
			/* Hide Obsidian-specific UI elements */
			.edit-block-button,
			.collapse-indicator,
			.embed-title {
				display: none !important;
			}
		`;
		container.appendChild(style);
	}

	async createPDFFromHTML(containerEl: HTMLElement, title: string): Promise<jsPDF> {
		// Convert HTML to canvas using html2canvas
		// Ensure container is fully rendered and visible for accurate height calculation
		containerEl.style.position = 'absolute';
		containerEl.style.left = '0px';
		containerEl.style.top = '0px';
		containerEl.style.visibility = 'visible';

		// Wait for images to load
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Force a reflow to ensure accurate dimensions
		containerEl.offsetHeight;

		const canvas = await html2canvas(containerEl, {
			scale: this.settings.canvasScale,
			useCORS: true, // For external images
			logging: false,
			backgroundColor: '#ffffff',
			width: containerEl.scrollWidth,
			height: containerEl.scrollHeight,
			allowTaint: false,
			scrollX: 0,
			scrollY: 0,
			windowWidth: containerEl.scrollWidth,
			windowHeight: containerEl.scrollHeight
		});

		// Get canvas dimensions directly
		const canvasWidth = canvas.width;
		const canvasHeight = canvas.height;

		// Debug logging
		console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight} pixels`);
		console.log(`Container scrollHeight: ${containerEl.scrollHeight}px`);
		console.log(`Container scrollWidth: ${containerEl.scrollWidth}px`);

		// Convert pixels to mm (96 DPI ≈ 3.78 pixels per mm)
		const imageWidthMM = canvasWidth / 3.78;
		const imageHeightMM = canvasHeight / 3.78;

		console.log(`PDF dimensions: ${imageWidthMM.toFixed(1)}x${imageHeightMM.toFixed(1)}mm`);

		// Create PDF with custom dimensions based on canvas (single page)
		const pdf = new jsPDF({
			orientation: imageHeightMM > imageWidthMM ? 'portrait' : 'landscape',
			unit: 'mm',
			format: [imageWidthMM + (this.settings.pdfMargin * 2), imageHeightMM + (this.settings.pdfMargin * 2)]
		});

		// Convert canvas to data URL
		const canvasDataUrl = canvas.toDataURL('image/png');

		// Add the image to cover the full page (single page)
		pdf.addImage(
			canvasDataUrl,
			'PNG',
			this.settings.pdfMargin,
			this.settings.pdfMargin,
			imageWidthMM,
			imageHeightMM
		);

		return pdf;
	}

	// async verifyLastPDF() {
	// 	if (!this.lastExportedPDF) {
	// 		new Notice('No PDF has been exported yet in this session');
	// 		return;
	// 	}

	// 	new Notice('Generating verification images...');
	// 	await this.verifyPDFBuffer(this.lastExportedPDF.buffer, this.lastExportedPDF.fileName);
	// }

	// async verifyPDFBuffer(pdfBuffer: ArrayBuffer, baseName: string) {
	// 	try {
	// 		const result = await this.pdfVerifier.verifyPDF(pdfBuffer, baseName);

	// 		if (result.success) {
	// 			const imageList = result.imagePaths.join('\n');
	// 			new Notice(
	// 				`Verification complete! Generated ${result.imageCount} image(s):\n${imageList}`,
	// 				10000
	// 			);
	// 			console.log('PDF verification successful:', result);
	// 		} else {
	// 			new Notice(`Verification failed: ${result.error}`);
	// 			console.error('PDF verification failed:', result.error);
	// 		}
	// 	} catch (error) {
	// 		console.error('Error during PDF verification:', error);
	// 		new Notice(`Verification error: ${error.message}`);
	// 	}
	// }

	onunload() {
		console.log('Unloading PDF Export plugin');
	}
}

class PDFExportSettingTab extends PluginSettingTab {
	plugin: PDFExportPlugin;

	constructor(app: App, plugin: PDFExportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'PDF Export Settings' });

		// Export folder
		new Setting(containerEl)
			.setName('Export folder')
			.setDesc('Folder where PDFs will be saved')
			.addText(text => text
				.setPlaceholder('PDF Exports')
				.setValue(this.plugin.settings.exportFolder)
				.onChange(async (value) => {
					this.plugin.settings.exportFolder = value;
					await this.plugin.saveSettings();
				}));

		// Page size
		new Setting(containerEl)
			.setName('Page size')
			.setDesc('PDF page size (A4 or Letter)')
			.addDropdown(dropdown => dropdown
				.addOption('a4', 'A4 (210 × 297 mm)')
				.addOption('letter', 'Letter (8.5 × 11 in)')
				.setValue(this.plugin.settings.pageSize)
				.onChange(async (value) => {
					this.plugin.settings.pageSize = value as 'a4' | 'letter';
					await this.plugin.saveSettings();
				}));

		// Show title
		new Setting(containerEl)
			.setName('Show title')
			.setDesc('Display note title at the top of PDF')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showTitle)
				.onChange(async (value) => {
					this.plugin.settings.showTitle = value;
					await this.plugin.saveSettings();
				}));

		// Include images
		new Setting(containerEl)
			.setName('Include images')
			.setDesc('Embed images from vault in PDF')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeImages)
				.onChange(async (value) => {
					this.plugin.settings.includeImages = value;
					await this.plugin.saveSettings();
				}));

		// Image max width
		new Setting(containerEl)
			.setName('Image max width')
			.setDesc('Maximum width for images in pixels (for optimization)')
			.addText(text => text
				.setPlaceholder('1600')
				.setValue(String(this.plugin.settings.imageMaxWidth))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.imageMaxWidth = num;
						await this.plugin.saveSettings();
					}
				}));

		// PDF margin
		new Setting(containerEl)
			.setName('PDF margin')
			.setDesc('Page margins in millimeters')
			.addText(text => text
				.setPlaceholder('10')
				.setValue(String(this.plugin.settings.pdfMargin))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num >= 0) {
						this.plugin.settings.pdfMargin = num;
						await this.plugin.saveSettings();
					}
				}));

		// Canvas scale
		new Setting(containerEl)
			.setName('Quality (scale)')
			.setDesc('Higher values = better quality but larger file size (1-3 recommended)')
			.addText(text => text
				.setPlaceholder('2')
				.setValue(String(this.plugin.settings.canvasScale))
				.onChange(async (value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num > 0 && num <= 4) {
						this.plugin.settings.canvasScale = num;
						await this.plugin.saveSettings();
					}
				}));

		// Auto-verify PDF
		new Setting(containerEl)
			.setName('Auto-verify PDFs')
			.setDesc('Automatically generate PNG images of PDF pages for verification after export')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoVerifyPDF)
				.onChange(async (value) => {
					this.plugin.settings.autoVerifyPDF = value;
					await this.plugin.saveSettings();
				}));
	}
}
