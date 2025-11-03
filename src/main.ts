import { Plugin, Notice, MarkdownRenderer, MarkdownView, Component, App, PluginSettingTab, Setting, Platform } from 'obsidian';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PageManager, ContentSegment } from './utils/PageManager';
// @ts-ignore
import manifest from '../manifest.json';

interface PDFExportSettings {
	exportFolder: string;
	pageSize: 'a4' | 'letter';
	includeImages: boolean;
	showTitle: boolean;
	pdfMargin: number;
	canvasScale: number;
	treatHorizontalRuleAsPageBreak: boolean;
}

const DEFAULT_SETTINGS: PDFExportSettings = {
	exportFolder: 'PDF Exports',
	pageSize: 'a4',
	includeImages: true,
	showTitle: true,
	pdfMargin: 10,
	canvasScale: 1,
	treatHorizontalRuleAsPageBreak: false
};

// Calculate optimal container/image width based on page size and margins
function calculateContentWidth(pageSize: 'a4' | 'letter', margin: number): number {
	const PIXELS_PER_MM = 3.7795275591;
	const formats = {
		a4: { width: 210, height: 297 },      // mm
		letter: { width: 216, height: 279 }   // mm (8.5×11 inches)
	};

	const format = formats[pageSize];
	const contentWidthMM = format.width - (2 * margin);
	return Math.round(contentWidthMM * PIXELS_PER_MM);
}

export default class PDFExportPlugin extends Plugin {
	settings: PDFExportSettings;
	lastExportedPDF: { buffer: ArrayBuffer; fileName: string } | null = null;

	async onload() {
		console.log('Loading PDF Export plugin');

		await this.loadSettings();

		
		// Add command to export PDF
		this.addCommand({
			id: 'export-to-pdf',
			name: 'Export to PDF',
			callback: () => this.exportToPDF()
		});

		
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
		console.log(`========================================`);
		console.log(`PDF EXPORT PLUGIN v${manifest.version}`);
		console.log(`========================================`);
		console.log(`[PAGE BREAK DEBUG] Starting exportToPDF`);
		console.log(`[PAGE BREAK DEBUG] Current settings: treatHorizontalRuleAsPageBreak = ${this.settings.treatHorizontalRuleAsPageBreak}`);

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

			console.log(`[PAGE BREAK DEBUG] Exporting file: ${activeFile.path}`);
			new Notice('Generating PDF...');

			// Read the note content
			const content = await this.app.vault.read(activeFile);

			// Render markdown to HTML
			const containerEl = await this.renderMarkdownToHTML(content, activeFile.path, activeFile.basename);

			// Apply PDF-friendly styles
			this.applyPDFStyles(containerEl);

			console.log(`[PAGE BREAK DEBUG] HTML structure after PDF styles applied:`);
			console.log(`[PAGE BREAK DEBUG] Container has ${containerEl.children.length} direct children`);
			for (let i = 0; i < containerEl.children.length; i++) {
				const child = containerEl.children[i] as HTMLElement;
				console.log(`[PAGE BREAK DEBUG]   Child ${i}: ${child.tagName} (classes: ${child.className}, id: ${child.id})`);
				if (child.style.pageBreakAfter) {
					console.log(`[PAGE BREAK DEBUG]     → Has pageBreakAfter: ${child.style.pageBreakAfter}`);
				}
				if (child.style.breakAfter) {
					console.log(`[PAGE BREAK DEBUG]     → Has breakAfter: ${child.style.breakAfter}`);
				}
			}

			// Process and embed images from vault (if enabled)
			if (this.settings.includeImages) {
				await this.processImages(containerEl, activeFile.path);
			} else {
				// Remove all images if includeImages is false
				const images = containerEl.querySelectorAll('img');
				images.forEach(img => img.remove());
			}

			console.log(`[PAGE BREAK DEBUG] About to create PDF from HTML`);
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

			
			// Clean up
			containerEl.remove();

			new Notice(`PDF saved as ${filename}`);
		} catch (error) {
			console.error('PDF export failed:', error);
			new Notice(`Export failed: ${error.message}`);
		}
	}

	// Preprocess markdown to handle horizontal rules as page breaks
	preprocessMarkdownForPageBreaks(content: string): string {
		console.log(`[PAGE BREAK DEBUG] preprocessMarkdownForPageBreaks called. treatHorizontalRuleAsPageBreak: ${this.settings.treatHorizontalRuleAsPageBreak}`);

		if (!this.settings.treatHorizontalRuleAsPageBreak) {
			console.log(`[PAGE BREAK DEBUG] Feature disabled, returning original content`);
			return content;
		}

		console.log(`[PAGE BREAK DEBUG] Original content length: ${content.length} characters`);

		// Split into lines to process
		const lines = content.split('\n');
		const processedLines: string[] = [];
		let inCodeBlock = false;
		let inQuoteBlock = false;
		let horizontalRuleCount = 0;
		let pageBreakCount = 0;

		console.log(`[PAGE BREAK DEBUG] Processing ${lines.length} lines`);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Track code blocks
			if (trimmed.startsWith('```')) {
				inCodeBlock = !inCodeBlock;
				console.log(`[PAGE BREAK DEBUG] Line ${i+1}: Code block ${inCodeBlock ? 'opened' : 'closed'}`);
				processedLines.push(line);
				continue;
			}

			// Track quote blocks
			if (trimmed.startsWith('>')) {
				inQuoteBlock = true;
				console.log(`[PAGE BREAK DEBUG] Line ${i+1}: Quote block started`);
			} else if (inQuoteBlock && trimmed === '') {
				// Empty line after quote block - could be end
				// Check if next line is not a quote
				if (i === lines.length - 1 || !lines[i + 1].trim().startsWith('>')) {
					inQuoteBlock = false;
					console.log(`[PAGE BREAK DEBUG] Line ${i+1}: Quote block ended`);
				}
			} else if (inQuoteBlock && !trimmed.startsWith('>')) {
				inQuoteBlock = false;
				console.log(`[PAGE BREAK DEBUG] Line ${i+1}: Quote block ended`);
			}

			// Check for horizontal rule (only exact triple dashes, not in code or quote blocks)
			if (!inCodeBlock && !inQuoteBlock && trimmed === '---') {
				horizontalRuleCount++;
				pageBreakCount++;
				console.log(`[PAGE BREAK DEBUG] Line ${i+1}: Found horizontal rule #${horizontalRuleCount}, replacing with page break marker`);
				// Replace with page break marker using a special div that will survive markdown rendering
				processedLines.push('<div class="pdf-page-break" data-page-break="true"></div>');
			} else {
				processedLines.push(line);
			}
		}

		const result = processedLines.join('\n');
		console.log(`[PAGE BREAK DEBUG] Processing complete. Found ${horizontalRuleCount} horizontal rules, inserted ${pageBreakCount} page breaks`);
		console.log(`[PAGE BREAK DEBUG] Processed content length: ${result.length} characters`);

		return result;
	}

	async renderMarkdownToHTML(content: string, sourcePath: string, title: string): Promise<HTMLElement> {
		// Create container for rendered HTML
		// Width is calculated dynamically based on page size and margins
		const contentWidth = calculateContentWidth(this.settings.pageSize, this.settings.pdfMargin);

		const containerEl = document.createElement('div');
		containerEl.addClass('markdown-preview-view');
		containerEl.style.width = `${contentWidth}px`; // Dynamic width based on page format
		containerEl.style.padding = '0px'; // No padding - will be handled by PDF margins
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

		// Preprocess markdown for page breaks if enabled
		let processedContent = content;
		if (this.settings.treatHorizontalRuleAsPageBreak) {
			console.log(`[PAGE BREAK DEBUG] About to preprocess markdown for page breaks`);
			processedContent = this.preprocessMarkdownForPageBreaks(content);
			console.log(`[PAGE BREAK DEBUG] Markdown preprocessing complete`);
		} else {
			console.log(`[PAGE BREAK DEBUG] Page break preprocessing disabled`);
		}

		console.log(`[PAGE BREAK DEBUG] About to render markdown to HTML`);
		console.log(`[PAGE BREAK DEBUG] Content length being rendered: ${processedContent.length}`);

		// Use Obsidian's markdown renderer
		const component = new Component();
		await MarkdownRenderer.render(
			this.app,
			processedContent,
			containerEl,
			sourcePath,
			component
		);

		console.log(`[PAGE BREAK DEBUG] Markdown rendering complete. Container has ${containerEl.children.length} child elements`);

		// Post-process HTML to handle page breaks
		this.postprocessHTMLForPageBreaks(containerEl);

		return containerEl;
	}

	// Post-process HTML to handle page breaks
	postprocessHTMLForPageBreaks(containerEl: HTMLElement): void {
		console.log(`[PAGE BREAK DEBUG] postprocessHTMLForPageBreaks called. treatHorizontalRuleAsPageBreak: ${this.settings.treatHorizontalRuleAsPageBreak}`);

		if (!this.settings.treatHorizontalRuleAsPageBreak) {
			console.log(`[PAGE BREAK DEBUG] Feature disabled, skipping HTML post-processing`);
			return;
		}

		console.log(`[PAGE BREAK DEBUG] Starting HTML post-processing for page breaks`);
		console.log(`[PAGE BREAK DEBUG] Container element: ${containerEl.tagName}, classes: ${containerEl.className}`);

		// Find all page break divs and convert them to page break styling
		const pageBreakDivs = containerEl.querySelectorAll('.pdf-page-break[data-page-break="true"]');
		console.log(`[PAGE BREAK DEBUG] Found ${pageBreakDivs.length} page break divs`);

		const divsToRemove: HTMLElement[] = [];
		let pageBreakCount = 0;

		pageBreakDivs.forEach((div, index) => {
			const htmlDiv = div as HTMLElement;
			pageBreakCount++;
			console.log(`[PAGE BREAK DEBUG] Processing page break div #${pageBreakCount}`);

			// Convert this div to a visual page break indicator that will be handled by PageManager
			htmlDiv.className = 'pdf-page-break-marker';
			htmlDiv.setAttribute('data-page-break-marker', 'true');
			htmlDiv.style.cssText = `
				height: 20px;
				width: 100%;
				background: transparent;
				margin: 10px 0;
				page-break-after: always;
				break-after: page;
				border-top: 1px dashed #ccc;
				display: block;
			`;

			console.log(`[PAGE BREAK DEBUG] Converted div to page break marker`);
		});

		console.log(`[PAGE BREAK DEBUG] Processed ${pageBreakCount} page break divs`);

		// Instead of removing the divs, keep them as markers for the PageManager
		console.log(`[PAGE BREAK DEBUG] Keeping ${pageBreakCount} page break markers for PageManager processing`);

		console.log(`[PAGE BREAK DEBUG] HTML post-processing complete`);
	}

	async processImages(containerEl: HTMLElement, sourcePath: string) {
		const contentWidth = calculateContentWidth(this.settings.pageSize, this.settings.pdfMargin);
		console.log(`[v${manifest.version}] Processing ${containerEl.querySelectorAll('img').length} images with maxWidth: ${contentWidth}px (${this.settings.pageSize.toUpperCase()})`);
		const images = containerEl.querySelectorAll('img');

		for (const img of Array.from(images)) {
			try {
				const src = img.getAttribute('src');
				console.log(`[DEBUG] Processing img src: ${src}`);

				if (!src) {
					console.log('[DEBUG] No src, skipping');
					continue;
				}

				// Skip external URLs (http/https)
				if (src.startsWith('http://') || src.startsWith('https://')) {
					console.log('[DEBUG] Skipping external image');
					continue;
				}

				let imagePath = null;

				// Handle Obsidian's app:// protocol
				if (src.startsWith('app://')) {
					console.log('[DEBUG] Detected app:// URL, parsing...');

					// Extract path from app://hash/full/path/to/file.png?timestamp
					let urlPath = decodeURIComponent(src);
					console.log('[DEBUG] Decoded URL:', urlPath);

					// Remove query string first
					const queryIndex = urlPath.indexOf('?');
					if (queryIndex !== -1) {
						urlPath = urlPath.substring(0, queryIndex);
						console.log('[DEBUG] After removing query string:', urlPath);
					}

					// Remove app://hash/ prefix to get the full file path
					// Format: app://hash/Users/user/vault/path/to/file.png
					const pathMatch = urlPath.match(/^app:\/\/[^\/]+\/(.+)$/);
					if (pathMatch) {
						const fullPath = pathMatch[1]; // /Users/jeroendezwart/2th Brain/...
						console.log('[DEBUG] Extracted full path:', fullPath);

						// Get vault base path
						const vaultPath = (this.app.vault.adapter as any).getBasePath();
						console.log('[DEBUG] Vault base path:', vaultPath);

						// If the full path starts with the vault path, get the relative path
						if (fullPath.startsWith(vaultPath)) {
							const relativePath = fullPath.substring(vaultPath.length + 1); // +1 for the /
							console.log('[DEBUG] Relative path from vault:', relativePath);

							const abstractFile = this.app.vault.getAbstractFileByPath(relativePath);
							console.log('[DEBUG] getAbstractFileByPath result:', abstractFile ? abstractFile.path : 'null');

							if (abstractFile && 'extension' in abstractFile) {
								imagePath = abstractFile as any;
								console.log('[DEBUG] Found image via relative path!');
							}
						} else {
							console.log('[DEBUG] Full path does not start with vault path, trying filename fallback');
							// Fallback: try just the filename
							const parts = fullPath.split('/');
							const filename = parts[parts.length - 1];
							console.log('[DEBUG] Trying to find filename:', filename);
							imagePath = this.app.metadataCache.getFirstLinkpathDest(filename, sourcePath);
							console.log('[DEBUG] getFirstLinkpathDest result:', imagePath ? imagePath.path : 'null');
						}
					} else {
						console.log('[DEBUG] Failed to match app:// URL pattern');
					}
				}
				// Handle relative paths and wiki-style embeds
				else {
					console.log('[DEBUG] Non-app URL, using getFirstLinkpathDest');
					imagePath = this.app.metadataCache.getFirstLinkpathDest(src, sourcePath);
					console.log('[DEBUG] getFirstLinkpathDest result:', imagePath ? imagePath.path : 'null');
				}

				if (imagePath) {
					console.log('[DEBUG] SUCCESS! Processing image:', imagePath.path);

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

					// Remove any existing width/height attributes that might override CSS
					img.removeAttribute('width');
					img.removeAttribute('height');

					// Apply CSS to ensure proper aspect ratio and prevent overflow
					// Force the image to the calculated content width (based on page size)
					img.style.width = `${contentWidth}px`;
					img.style.maxWidth = `${contentWidth}px`;
					img.style.height = 'auto';
					img.style.display = 'block';
					img.style.margin = '12pt auto';
					img.style.overflow = 'visible';
					img.style.pageBreakInside = 'avoid';

					console.log(`Image embedded: ${imagePath.name} (${(imageData.byteLength / 1024).toFixed(2)} KB)`);
					console.log(`Image styled with width: ${contentWidth}px, actual rendered width will be checked...`);
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
		const contentWidth = calculateContentWidth(this.settings.pageSize, this.settings.pdfMargin);
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
				max-width: ${contentWidth}px;
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

	// Create smart page segments based on page break markers
	createSmartPageSegments(canvasWidth: number, canvasHeight: number, markerPositions: number[], markers: NodeListOf<Element>): ContentSegment[] {
		console.log(`[PAGE BREAK DEBUG] Creating smart page segments. Canvas: ${canvasWidth}x${canvasHeight}, Markers: ${markerPositions.length}`);

		const pageManager = new PageManager(
			canvasWidth,
			canvasHeight,
			this.settings.pageSize,
			this.settings.pdfMargin,
			this.settings.canvasScale
		);

		const pageInfo = pageManager.getPageInfo();
		const pageHeight = pageInfo.contentHeight;
		console.log(`[PAGE BREAK DEBUG] Page content height: ${pageHeight}px`);

		const segments: ContentSegment[] = [];
		let currentY = 0;
		let markerIndex = 0;

		// Hide page break markers before canvas creation (they're invisible but we want to be sure)
		markers.forEach((marker, index) => {
			(marker as HTMLElement).style.display = 'none';
			console.log(`[PAGE BREAK DEBUG] Hidden marker ${index + 1}`);
		});

		while (currentY < canvasHeight) {
			let segmentHeight: number;
			let pageBreakUsed = false;

			// Check if there's a page break marker within the current page range
			if (markerIndex < markerPositions.length) {
				const nextMarkerPos = markerPositions[markerIndex];
				const distanceToMarker = nextMarkerPos - currentY;

				console.log(`[PAGE BREAK DEBUG] Next marker at ${nextMarkerPos}px, current at ${currentY}px, distance: ${distanceToMarker}px`);

				if (distanceToMarker > 0 && distanceToMarker < pageHeight) {
					// Marker is within current page - break at the marker
					segmentHeight = distanceToMarker;
					markerIndex++;
					pageBreakUsed = true;
					console.log(`[PAGE BREAK DEBUG] Breaking at marker, segment height: ${segmentHeight}px`);
				} else if (distanceToMarker <= 0) {
					// We've passed a marker (shouldn't happen), skip it
					markerIndex++;
					continue;
				} else {
					// Marker is beyond current page, use full page height
					segmentHeight = Math.min(pageHeight, canvasHeight - currentY);
					console.log(`[PAGE BREAK DEBUG] Using full page height: ${segmentHeight}px`);
				}
			} else {
				// No more markers, use remaining content
				segmentHeight = Math.min(pageHeight, canvasHeight - currentY);
				console.log(`[PAGE BREAK DEBUG] No more markers, using remaining height: ${segmentHeight}px`);
			}

			if (segmentHeight <= 0) break;

			segments.push({
				y: currentY,
				height: segmentHeight,
				pageNumber: segments.length
			});

			console.log(`[PAGE BREAK DEBUG] Created segment ${segments.length}: y=${currentY}, height=${segmentHeight}, pageBreak=${pageBreakUsed}`);

			currentY += segmentHeight;
		}

		console.log(`[PAGE BREAK DEBUG] Smart page breaking complete. Created ${segments.length} segments`);
		return segments;
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

		// Check if we have page break markers to handle
		const pageBreakMarkers = containerEl.querySelectorAll('.pdf-page-break-marker[data-page-break-marker="true"]');
		console.log(`[PAGE BREAK DEBUG] Found ${pageBreakMarkers.length} page break markers in rendered HTML`);

		let segments;
		let pageCount;

		if (this.settings.treatHorizontalRuleAsPageBreak && pageBreakMarkers.length > 0) {
			// Use smart page breaking with markers
			console.log(`[PAGE BREAK DEBUG] Using smart page breaking with ${pageBreakMarkers.length} markers`);

			// Get the positions of page break markers in the canvas
			const markerPositions: number[] = [];
			pageBreakMarkers.forEach((marker, index) => {
				const rect = marker.getBoundingClientRect();
				const containerRect = containerEl.getBoundingClientRect();
				const position = (rect.top - containerRect.top) * this.settings.canvasScale;
				markerPositions.push(position);
				console.log(`[PAGE BREAK DEBUG] Page break marker ${index + 1} at position: ${position}px`);
			});

			segments = this.createSmartPageSegments(canvasWidth, canvasHeight, markerPositions, pageBreakMarkers);
			pageCount = segments.length;

			console.log(`[PAGE BREAK DEBUG] Smart page breaking created ${pageCount} segments`);
		} else {
			// Use regular PageManager splitting
			console.log(`[PAGE BREAK DEBUG] Using regular page breaking (no markers or feature disabled)`);

			const pageManager = new PageManager(
				canvasWidth,
				canvasHeight,
				this.settings.pageSize,
				this.settings.pdfMargin,
				this.settings.canvasScale
			);

			const pageInfo = pageManager.getPageInfo();
			segments = pageManager.splitContent(canvasHeight);
			pageCount = segments.length;

			console.log(`[DEBUG] PageInfo - contentWidth: ${pageInfo.contentWidth}px, contentHeight: ${pageInfo.contentHeight}px, scale: ${pageInfo.scale}`);
		}

		console.log(`[DEBUG] Actual canvas scale: ${canvasWidth / containerEl.scrollWidth}`);
		console.log(`Creating ${pageCount} pages with ${segments.length} segments`);

		// Create a PageManager just to get PDF dimensions and orientation
		const pageManager = new PageManager(
			canvasWidth,
			canvasHeight,
			this.settings.pageSize,
			this.settings.pdfMargin,
			this.settings.canvasScale
		);

		// Get PDF dimensions from PageManager
		const pdfDimensions = pageManager.getJSPDFDimensions();
		const isLandscape = pageManager.getIsLandscape();

		// Create PDF with proper page dimensions and compression
		const pdf = new jsPDF({
			orientation: isLandscape ? 'landscape' : 'portrait',
			unit: 'mm',
			format: pdfDimensions,
			compress: true
		});

		// Convert canvas to data URL once with JPEG compression for better size
		const canvasDataUrl = canvas.toDataURL('image/jpeg', 0.85);

		// Add each page segment as a separate page
		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];

			// Add new page for each segment except the first one
			if (i > 0) {
				pdf.addPage();
			}

			// Create a temporary canvas for this segment
			const segmentCanvas = document.createElement('canvas');
			segmentCanvas.width = canvasWidth;
			segmentCanvas.height = segment.height;

			const ctx = segmentCanvas.getContext('2d');
			if (!ctx) {
				throw new Error('Could not get 2D context from segment canvas');
			}

			// Copy the relevant portion from the original canvas
			ctx.drawImage(
				canvas,
				0, segment.y, canvasWidth, segment.height, // Source rectangle
				0, 0, canvasWidth, segment.height  // Destination rectangle
			);

			// Convert segment to data URL with JPEG compression
			const segmentDataUrl = segmentCanvas.toDataURL('image/jpeg', 0.85);

			// Calculate dimensions for this segment in mm
			// Strategy: Use full page height, scale width proportionally

			const pageFormat = pageManager.getFormat();
			const contentAreaWidthMM = pageFormat.width - (2 * this.settings.pdfMargin);
			const contentAreaHeightMM = pageFormat.height - (2 * this.settings.pdfMargin);

			// Calculate aspect ratio of the canvas segment
			const canvasAspectRatio = canvasWidth / segment.height;
			console.log(`[DEBUG] Segment ${i}: canvasWidth=${canvasWidth}, segmentHeight=${segment.height}, aspectRatio=${canvasAspectRatio.toFixed(3)}`);

			// Always use full height, calculate width from aspect ratio
			let segmentHeightMM = contentAreaHeightMM;
			let segmentWidthMM = contentAreaHeightMM * canvasAspectRatio;

			console.log(`[DEBUG] Fit by height: ${segmentWidthMM.toFixed(1)}mm x ${segmentHeightMM.toFixed(1)}mm`);

			// If width exceeds content area, scale down to fit width
			if (segmentWidthMM > contentAreaWidthMM) {
				segmentWidthMM = contentAreaWidthMM;
				segmentHeightMM = contentAreaWidthMM / canvasAspectRatio;
				console.log(`[DEBUG] Too wide! Fit by width instead: ${segmentWidthMM.toFixed(1)}mm x ${segmentHeightMM.toFixed(1)}mm`);
			}

			// Center content horizontally if it's narrower than the page
			const xOffset = this.settings.pdfMargin + (contentAreaWidthMM - segmentWidthMM) / 2;

			console.log(`[DEBUG] Final segment size: ${segmentWidthMM.toFixed(1)}mm x ${segmentHeightMM.toFixed(1)}mm at x=${xOffset.toFixed(1)}mm`);

			// Add the segment image to the current page
			pdf.addImage(
				segmentDataUrl,
				'JPEG',
				xOffset,
				this.settings.pdfMargin,
				segmentWidthMM,
				segmentHeightMM
			);

			console.log(`Added page ${i + 1}/${segments.length}: ${segmentWidthMM.toFixed(1)}x${segmentHeightMM.toFixed(1)}mm at position (${segment.y}, ${segment.height})`);
		}

		console.log(`Multi-page PDF created with ${segments.length} pages`);
		return pdf;
	}

	
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

		// PDF margin (image width is calculated automatically from this and page size)
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

		// Treat horizontal rule as page break
		new Setting(containerEl)
			.setName('Treat --- as page breaks')
			.setDesc('Convert horizontal rules (---) to page breaks. Rules will be hidden and content will break to next page.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.treatHorizontalRuleAsPageBreak)
				.onChange(async (value) => {
					this.plugin.settings.treatHorizontalRuleAsPageBreak = value;
					await this.plugin.saveSettings();
				}));
	}
}
