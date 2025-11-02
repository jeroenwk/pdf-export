import { pdf } from 'pdf-to-img';
import path from 'path';
import fs from 'fs/promises';

// Dynamic import for Obsidian to make it optional
let App: any, normalizePath: any;
try {
  // Use require for optional Obsidian dependency
  const obsidian = require('obsidian');
  App = obsidian.App;
  normalizePath = obsidian.normalizePath;
} catch (error) {
  // Obsidian not available in CLI mode
  App = null;
  normalizePath = null;
}

export interface PDFVerificationResult {
	success: boolean;
	imageCount: number;
	imagePaths: string[];
	error?: string;
}

export interface PDFVerifierOptions {
	app?: any;
	vaultPath?: string;
	verificationFolder?: string;
}

export class PDFVerifier {
	private app?: any;
	private verificationFolder: string;
	private vaultPath?: string;

	constructor(options: PDFVerifierOptions) {
		this.app = options.app;
		this.vaultPath = options.vaultPath;
		this.verificationFolder = options.verificationFolder || 'PDF Exports/verification';
	}

	/**
	 * Converts a PDF buffer to PNG images and saves them for inspection
	 * @param pdfBuffer - The PDF file as an ArrayBuffer
	 * @param baseName - Base name for the output images
	 * @returns Verification result with paths to generated images
	 */
	async verifyPDF(pdfBuffer: ArrayBuffer, baseName: string): Promise<PDFVerificationResult> {
		try {
			// Determine base path for saving
			const basePath = this.vaultPath || process.cwd();
			const verificationDir = path.join(basePath, this.verificationFolder);

			// Ensure verification folder exists
			if (this.app) {
				// Obsidian plugin mode
				const normalizedFolder = normalizePath(this.verificationFolder);
				if (!await this.app.vault.adapter.exists(normalizedFolder)) {
					await this.app.vault.adapter.mkdir(normalizedFolder);
				}
			} else {
				// CLI mode
				await fs.mkdir(verificationDir, { recursive: true });
			}

			// Convert PDF to PNG images using pdf-to-img
			const document = await pdf(Buffer.from(pdfBuffer), { scale: 2.0 });

			const imagePaths: string[] = [];
			let pageNumber = 0;

			// Iterate through pages
			for await (const image of document) {
				pageNumber++;
				const imageName = `${baseName}_page_${pageNumber}.png`;
				const imagePath = path.join(verificationDir, imageName);

				if (this.app) {
					// Obsidian plugin mode
					const normalizedPath = normalizePath(`${this.verificationFolder}/${imageName}`);
					const imageBuffer = image.buffer.slice(0) as ArrayBuffer;
					await this.app.vault.adapter.writeBinary(normalizedPath, imageBuffer);
					imagePaths.push(normalizedPath);
				} else {
					// CLI mode
					await fs.writeFile(imagePath, image);
					imagePaths.push(imagePath);
				}
			}

			return {
				success: true,
				imageCount: pageNumber,
				imagePaths: imagePaths
			};
		} catch (error) {
			console.error('PDF verification failed:', error);
			return {
				success: false,
				imageCount: 0,
				imagePaths: [],
				error: error.message
			};
		}
	}

	/**
	 * Quick verification - only converts the first page
	 * Useful for fast checks during development
	 */
	async verifyFirstPage(pdfBuffer: ArrayBuffer, baseName: string): Promise<PDFVerificationResult> {
		try {
			// Determine base path for saving
			const basePath = this.vaultPath || process.cwd();
			const verificationDir = path.join(basePath, this.verificationFolder);

			// Ensure verification folder exists
			if (this.app) {
				const normalizedFolder = normalizePath(this.verificationFolder);
				if (!await this.app.vault.adapter.exists(normalizedFolder)) {
					await this.app.vault.adapter.mkdir(normalizedFolder);
				}
			} else {
				await fs.mkdir(verificationDir, { recursive: true });
			}

			// Convert PDF (we'll only save the first page)
			const document = await pdf(Buffer.from(pdfBuffer), { scale: 2.0 });

			// Get only the first page
			const iterator = document[Symbol.asyncIterator]();
			const firstPage = await iterator.next();

			if (firstPage.done || !firstPage.value) {
				throw new Error('No images generated from PDF');
			}

			const imageName = `${baseName}_page_1.png`;

			if (this.app) {
				const imagePath = normalizePath(`${this.verificationFolder}/${imageName}`);
				const imageBuffer = firstPage.value.buffer.slice(0) as ArrayBuffer;
				await this.app.vault.adapter.writeBinary(imagePath, imageBuffer);

				return {
					success: true,
					imageCount: 1,
					imagePaths: [imagePath]
				};
			} else {
				const imagePath = path.join(verificationDir, imageName);
				await fs.writeFile(imagePath, firstPage.value);

				return {
					success: true,
					imageCount: 1,
					imagePaths: [imagePath]
				};
			}
		} catch (error) {
			console.error('PDF verification (first page) failed:', error);
			return {
				success: false,
				imageCount: 0,
				imagePaths: [],
				error: error.message
			};
		}
	}

	/**
	 * Cleans up verification images for a specific PDF
	 */
	async cleanupVerificationImages(baseName: string): Promise<void> {
		try {
			if (this.app) {
				const normalizedFolder = normalizePath(this.verificationFolder);
				if (!await this.app.vault.adapter.exists(normalizedFolder)) {
					return;
				}

				const files = await this.app.vault.adapter.list(normalizedFolder);
				for (const file of files.files) {
					const fileName = file.split('/').pop();
					if (fileName && fileName.startsWith(`${baseName}_page_`)) {
						await this.app.vault.adapter.remove(file);
					}
				}
			} else {
				const verificationDir = path.join(this.vaultPath || process.cwd(), this.verificationFolder);
				try {
					const files = await fs.readdir(verificationDir);
					for (const file of files) {
						if (file.startsWith(`${baseName}_page_`)) {
							await fs.unlink(path.join(verificationDir, file));
						}
					}
				} catch (error) {
					// Directory doesn't exist, nothing to clean up
				}
			}
		} catch (error) {
			console.error('Failed to cleanup verification images:', error);
		}
	}

	/**
	 * Cleans up all verification images
	 */
	async cleanupAllVerificationImages(): Promise<void> {
		try {
			if (this.app) {
				const normalizedFolder = normalizePath(this.verificationFolder);
				if (await this.app.vault.adapter.exists(normalizedFolder)) {
					await this.app.vault.adapter.rmdir(normalizedFolder, true);
				}
			} else {
				const verificationDir = path.join(this.vaultPath || process.cwd(), this.verificationFolder);
				try {
					await fs.rm(verificationDir, { recursive: true, force: true });
				} catch (error) {
					// Directory doesn't exist, nothing to clean up
				}
			}
		} catch (error) {
			console.error('Failed to cleanup all verification images:', error);
		}
	}
}
