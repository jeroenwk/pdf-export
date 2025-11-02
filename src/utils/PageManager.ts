/**
 * PageManager - Utility for managing A4 page creation and content splitting
 */

export interface PageFormat {
	width: number; // mm
	height: number; // mm
}

export interface PageInfo {
	width: number; // pixels
	height: number; // pixels
	contentWidth: number; // pixels
	contentHeight: number; // pixels
	margin: number; // pixels
	scale: number;
}

export interface ContentSegment {
	y: number; // Starting Y position in original content
	height: number; // Height of this segment
	pageNumber: number; // Which page this segment belongs to
}

export class PageManager {
	private readonly A4_PORTRAIT: PageFormat = { width: 210, height: 297 };
	private readonly A4_LANDSCAPE: PageFormat = { width: 297, height: 210 };
	private readonly LETTER_PORTRAIT: PageFormat = { width: 216, height: 279 }; // 8.5×11in = 216×279mm
	private readonly LETTER_LANDSCAPE: PageFormat = { width: 279, height: 216 };
	private readonly PIXELS_PER_MM = 3.7795275591; // Standard DPI conversion

	private format: PageFormat;
	private pageInfo: PageInfo;
	private isLandscape: boolean;

	constructor(
		contentWidth: number,
		contentHeight: number,
		pageSize: 'a4' | 'letter' = 'a4',
		margin: number = 10, // mm
		scale: number = 2,
		forceLandscape: boolean = false
	) {
		this.isLandscape = this.detectOrientation(contentWidth, contentHeight, forceLandscape);

		// Select page format based on page size and orientation
		if (pageSize === 'letter') {
			this.format = this.isLandscape ? this.LETTER_LANDSCAPE : this.LETTER_PORTRAIT;
		} else {
			this.format = this.isLandscape ? this.A4_LANDSCAPE : this.A4_PORTRAIT;
		}

		// Convert mm to pixels for calculations
		const marginPx = margin * this.PIXELS_PER_MM;

		this.pageInfo = {
			width: this.format.width * this.PIXELS_PER_MM * scale,
			height: this.format.height * this.PIXELS_PER_MM * scale,
			contentWidth: (this.format.width - 2 * margin) * this.PIXELS_PER_MM * scale,
			contentHeight: (this.format.height - 2 * margin) * this.PIXELS_PER_MM * scale,
			margin: marginPx,
			scale
		};
	}

	/**
	 * Detect optimal orientation based on content dimensions
	 */
	private detectOrientation(contentWidth: number, contentHeight: number, forceLandscape: boolean): boolean {
		if (forceLandscape) return true;

		const aspectRatio = contentWidth / contentHeight;
		const portraitRatio = this.A4_PORTRAIT.width / this.A4_PORTRAIT.height;
		const landscapeRatio = this.A4_LANDSCAPE.width / this.A4_LANDSCAPE.height;

		// Choose orientation that minimizes wasted space
		const portraitDiff = Math.abs(aspectRatio - portraitRatio);
		const landscapeDiff = Math.abs(aspectRatio - landscapeRatio);

		return landscapeDiff < portraitDiff;
	}

	/**
	 * Get page format information
	 */
	public getFormat(): PageFormat {
		return { ...this.format };
	}

	/**
	 * Get page information in pixels
	 */
	public getPageInfo(): PageInfo {
		return { ...this.pageInfo };
	}

	/**
	 * Check if using landscape orientation
	 */
	public getIsLandscape(): boolean {
		return this.isLandscape;
	}

	/**
	 * Calculate how many pages are needed for the content
	 */
	public calculatePageCount(contentHeight: number): number {
		return Math.ceil(contentHeight / this.pageInfo.contentHeight);
	}

	/**
	 * Split content into page segments using simple height-based splitting
	 */
	public splitContent(contentHeight: number): ContentSegment[] {
		const pageCount = this.calculatePageCount(contentHeight);
		const segments: ContentSegment[] = [];

		for (let i = 0; i < pageCount; i++) {
			const startY = i * this.pageInfo.contentHeight;
			const availableHeight = Math.min(
				this.pageInfo.contentHeight,
				contentHeight - startY
			);

			segments.push({
				y: startY,
				height: availableHeight,
				pageNumber: i
			});
		}

		return segments;
	}

	/**
	 * Get page dimensions for jsPDF
	 */
	public getJSPDFDimensions(): [number, number] {
		if (this.isLandscape) {
			return [this.format.height, this.format.width]; // jsPDF expects [width, height]
		}
		return [this.format.width, this.format.height];
	}

	/**
	 * Calculate content positioning for a specific page segment
	 */
	public calculateContentPosition(segment: ContentSegment): { x: number; y: number; width: number; height: number } {
		return {
			x: this.pageInfo.margin,
			y: this.pageInfo.margin,
			width: this.pageInfo.contentWidth,
			height: segment.height
		};
	}

	/**
	 * Create a canvas for a specific page segment from the original canvas
	 */
	public createSegmentCanvas(originalCanvas: HTMLCanvasElement, segment: ContentSegment): HTMLCanvasElement {
		const segmentCanvas = document.createElement('canvas');
		segmentCanvas.width = this.pageInfo.contentWidth;
		segmentCanvas.height = segment.height;

		const ctx = segmentCanvas.getContext('2d');
		if (!ctx) {
			throw new Error('Could not get 2D context from segment canvas');
		}

		// Copy the relevant portion from the original canvas
		ctx.drawImage(
			originalCanvas,
			0, segment.y, this.pageInfo.contentWidth, segment.height, // Source rectangle
			0, 0, this.pageInfo.contentWidth, segment.height  // Destination rectangle
		);

		return segmentCanvas;
	}
}