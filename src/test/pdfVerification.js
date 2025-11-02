import { pdf } from 'pdf-to-img';
import { normalizePath } from 'obsidian';
import path from 'path';
import fs from 'fs/promises';
export class PDFVerifier {
    app;
    verificationFolder;
    vaultPath;
    constructor(options) {
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
    async verifyPDF(pdfBuffer, baseName) {
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
            }
            else {
                // CLI mode
                await fs.mkdir(verificationDir, { recursive: true });
            }
            // Convert PDF to PNG images using pdf-to-img
            const document = await pdf(Buffer.from(pdfBuffer), { scale: 2.0 });
            const imagePaths = [];
            let pageNumber = 0;
            // Iterate through pages
            for await (const image of document) {
                pageNumber++;
                const imageName = `${baseName}_page_${pageNumber}.png`;
                const imagePath = path.join(verificationDir, imageName);
                if (this.app) {
                    // Obsidian plugin mode
                    const normalizedPath = normalizePath(`${this.verificationFolder}/${imageName}`);
                    const imageBuffer = image.buffer.slice(0);
                    await this.app.vault.adapter.writeBinary(normalizedPath, imageBuffer);
                    imagePaths.push(normalizedPath);
                }
                else {
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
        }
        catch (error) {
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
    async verifyFirstPage(pdfBuffer, baseName) {
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
            }
            else {
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
                const imageBuffer = firstPage.value.buffer.slice(0);
                await this.app.vault.adapter.writeBinary(imagePath, imageBuffer);
                return {
                    success: true,
                    imageCount: 1,
                    imagePaths: [imagePath]
                };
            }
            else {
                const imagePath = path.join(verificationDir, imageName);
                await fs.writeFile(imagePath, firstPage.value);
                return {
                    success: true,
                    imageCount: 1,
                    imagePaths: [imagePath]
                };
            }
        }
        catch (error) {
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
    async cleanupVerificationImages(baseName) {
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
            }
            else {
                const verificationDir = path.join(this.vaultPath || process.cwd(), this.verificationFolder);
                try {
                    const files = await fs.readdir(verificationDir);
                    for (const file of files) {
                        if (file.startsWith(`${baseName}_page_`)) {
                            await fs.unlink(path.join(verificationDir, file));
                        }
                    }
                }
                catch (error) {
                    // Directory doesn't exist, nothing to clean up
                }
            }
        }
        catch (error) {
            console.error('Failed to cleanup verification images:', error);
        }
    }
    /**
     * Cleans up all verification images
     */
    async cleanupAllVerificationImages() {
        try {
            if (this.app) {
                const normalizedFolder = normalizePath(this.verificationFolder);
                if (await this.app.vault.adapter.exists(normalizedFolder)) {
                    await this.app.vault.adapter.rmdir(normalizedFolder, true);
                }
            }
            else {
                const verificationDir = path.join(this.vaultPath || process.cwd(), this.verificationFolder);
                try {
                    await fs.rm(verificationDir, { recursive: true, force: true });
                }
                catch (error) {
                    // Directory doesn't exist, nothing to clean up
                }
            }
        }
        catch (error) {
            console.error('Failed to cleanup all verification images:', error);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmVmVyaWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGRmVmVyaWZpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDakMsT0FBTyxFQUFPLGFBQWEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxNQUFNLENBQUM7QUFDeEIsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBZTdCLE1BQU0sT0FBTyxXQUFXO0lBQ2YsR0FBRyxDQUFPO0lBQ1Ysa0JBQWtCLENBQVM7SUFDM0IsU0FBUyxDQUFVO0lBRTNCLFlBQVksT0FBMkI7UUFDdEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixJQUFJLDBCQUEwQixDQUFDO0lBQ3BGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBc0IsRUFBRSxRQUFnQjtRQUN2RCxJQUFJLENBQUM7WUFDSixpQ0FBaUM7WUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFckUsb0NBQW9DO1lBQ3BDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNkLHVCQUF1QjtnQkFDdkIsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMs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LXRvLWltZyc7XG5pbXBvcnQgeyBBcHAsIG5vcm1hbGl6ZVBhdGggfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy9wcm9taXNlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUERGVmVyaWZpY2F0aW9uUmVzdWx0IHtcblx0c3VjY2VzczogYm9vbGVhbjtcblx0aW1hZ2VDb3VudDogbnVtYmVyO1xuXHRpbWFnZVBhdGhzOiBzdHJpbmdbXTtcblx0ZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUERGVmVyaWZpZXJPcHRpb25zIHtcblx0YXBwPzogQXBwO1xuXHR2YXVsdFBhdGg/OiBzdHJpbmc7XG5cdHZlcmlmaWNhdGlvbkZvbGRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFBERlZlcmlmaWVyIHtcblx0cHJpdmF0ZSBhcHA/OiBBcHA7XG5cdHByaXZhdGUgdmVyaWZpY2F0aW9uRm9sZGVyOiBzdHJpbmc7XG5cdHByaXZhdGUgdmF1bHRQYXRoPzogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBERlZlcmlmaWVyT3B0aW9ucykge1xuXHRcdHRoaXMuYXBwID0gb3B0aW9ucy5hcHA7XG5cdFx0dGhpcy52YXVsdFBhdGggPSBvcHRpb25zLnZhdWx0UGF0aDtcblx0XHR0aGlzLnZlcmlmaWNhdGlvbkZvbGRlciA9IG9wdGlvbnMudmVyaWZpY2F0aW9uRm9sZGVyIHx8ICdQREYgRXhwb3J0cy92ZXJpZmljYXRpb24nO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUERGIGJ1ZmZlciB0byBQTkcgaW1hZ2VzIGFuZCBzYXZlcyB0aGVtIGZvciBpbnNwZWN0aW9uXG5cdCAqIEBwYXJhbSBwZGZCdWZmZXIgLSBUaGUgUERGIGZpbGUgYXMgYW4gQXJyYXlCdWZmZXJcblx0ICogQHBhcmFtIGJhc2VOYW1lIC0gQmFzZSBuYW1lIGZvciB0aGUgb3V0cHV0IGltYWdlc1xuXHQgKiBAcmV0dXJucyBWZXJpZmljYXRpb24gcmVzdWx0IHdpdGggcGF0aHMgdG8gZ2VuZXJhdGVkIGltYWdlc1xuXHQgKi9cblx0YXN5bmMgdmVyaWZ5UERGKHBkZkJ1ZmZlcjogQXJyYXlCdWZmZXIsIGJhc2VOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFBERlZlcmlmaWNhdGlvblJlc3VsdD4ge1xuXHRcdHRyeSB7XG5cdFx0XHQvLyBEZXRlcm1pbmUgYmFzZSBwYXRoIGZvciBzYXZpbmdcblx0XHRcdGNvbnN0IGJhc2VQYXRoID0gdGhpcy52YXVsdFBhdGggfHwgcHJvY2Vzcy5jd2QoKTtcblx0XHRcdGNvbnN0IHZlcmlmaWNhdGlvbkRpciA9IHBhdGguam9pbihiYXNlUGF0aCwgdGhpcy52ZXJpZmljYXRpb25Gb2xkZXIpO1xuXG5cdFx0XHQvLyBFbnN1cmUgdmVyaWZpY2F0aW9uIGZvbGRlciBleGlzdHNcblx0XHRcdGlmICh0aGlzLmFwcCkge1xuXHRcdFx0XHQvLyBPYnNpZGlhbiBwbHVnaW4gbW9kZVxuXHRcdFx0XHRjb25zdCBub3JtYWxpemVkRm9sZGVyID0gbm9ybWFsaXplUGF0aCh0aGlzLnZlcmlmaWNhdGlvbkZvbGRlcik7XG5cdFx0XHRcdGlmICghYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMobm9ybWFsaXplZEZvbGRlcikpIHtcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLm1rZGlyKG5vcm1hbGl6ZWRGb2xkZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBDTEkgbW9kZVxuXHRcdFx0XHRhd2FpdCBmcy5ta2Rpcih2ZXJpZmljYXRpb25EaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDb252ZXJ0IFBERiB0byBQTkcgaW1hZ2VzIHVzaW5nIHBkZi10by1pbWdcblx0XHRcdGNvbnN0IGRvY3VtZW50ID0gYXdhaXQgcGRmKEJ1ZmZlci5mcm9tKHBkZkJ1ZmZlciksIHsgc2NhbGU6IDIuMCB9KTtcblxuXHRcdFx0Y29uc3QgaW1hZ2VQYXRoczogc3RyaW5nW10gPSBbXTtcblx0XHRcdGxldCBwYWdlTnVtYmVyID0gMDtcblxuXHRcdFx0Ly8gSXRlcmF0ZSB0aHJvdWdoIHBhZ2VzXG5cdFx0XHRmb3IgYXdhaXQgKGNvbnN0IGltYWdlIG9mIGRvY3VtZW50KSB7XG5cdFx0XHRcdHBhZ2VOdW1iZXIrKztcblx0XHRcdFx0Y29uc3QgaW1hZ2VOYW1lID0gYCR7YmFzZU5hbWV9X3BhZ2VfJHtwYWdlTnVtYmVyfS5wbmdgO1xuXHRcdFx0XHRjb25zdCBpbWFnZVBhdGggPSBwYXRoLmpvaW4odmVyaWZpY2F0aW9uRGlyLCBpbWFnZU5hbWUpO1xuXG5cdFx0XHRcdGlmICh0aGlzLmFwcCkge1xuXHRcdFx0XHRcdC8vIE9ic2lkaWFuIHBsdWdpbiBtb2RlXG5cdFx0XHRcdFx0Y29uc3Qgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVQYXRoKGAke3RoaXMudmVyaWZpY2F0aW9uRm9sZGVyfS8ke2ltYWdlTmFtZX1gKTtcblx0XHRcdFx0XHRjb25zdCBpbWFnZUJ1ZmZlciA9IGltYWdlLmJ1ZmZlci5zbGljZSgwKSBhcyBBcnJheUJ1ZmZlcjtcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlQmluYXJ5KG5vcm1hbGl6ZWRQYXRoLCBpbWFnZUJ1ZmZlcik7XG5cdFx0XHRcdFx0aW1hZ2VQYXRocy5wdXNoKG5vcm1hbGl6ZWRQYXRoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBDTEkgbW9kZVxuXHRcdFx0XHRcdGF3YWl0IGZzLndyaXRlRmlsZShpbWFnZVBhdGgsIGltYWdlKTtcblx0XHRcdFx0XHRpbWFnZVBhdGhzLnB1c2goaW1hZ2VQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxuXHRcdFx0XHRpbWFnZUNvdW50OiBwYWdlTnVtYmVyLFxuXHRcdFx0XHRpbWFnZVBhdGhzOiBpbWFnZVBhdGhzXG5cdFx0XHR9O1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdQREYgdmVyaWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0aW1hZ2VDb3VudDogMCxcblx0XHRcdFx0aW1hZ2VQYXRoczogW10sXG5cdFx0XHRcdGVycm9yOiBlcnJvci5tZXNzYWdlXG5cdFx0XHR9O1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBRdWljayB2ZXJpZmljYXRpb24gLSBvbmx5IGNvbnZlcnRzIHRoZSBmaXJzdCBwYWdlXG5cdCAqIFVzZWZ1bCBmb3IgZmFzdCBjaGVja3MgZHVyaW5nIGRldmVsb3BtZW50XG5cdCAqL1xuXHRhc3luYyB2ZXJpZnlGaXJzdFBhZ2UocGRmQnVmZmVyOiBBcnJheUJ1ZmZlciwgYmFzZU5hbWU6IHN0cmluZyk6IFByb21pc2U8UERGVmVyaWZpY2F0aW9uUmVzdWx0PiB7XG5cdFx0dHJ5IHtcblx0XHRcdC8vIERldGVybWluZSBiYXNlIHBhdGggZm9yIHNhdmluZ1xuXHRcdFx0Y29uc3QgYmFzZVBhdGggPSB0aGlzLnZhdWx0UGF0aCB8fCBwcm9jZXNzLmN3ZCgpO1xuXHRcdFx0Y29uc3QgdmVyaWZpY2F0aW9uRGlyID0gcGF0aC5qb2luKGJhc2VQYXRoLCB0aGlzLnZlcmlmaWNhdGlvbkZvbGRlcik7XG5cblx0XHRcdC8vIEVuc3VyZSB2ZXJpZmljYXRpb24gZm9sZGVyIGV4aXN0c1xuXHRcdFx0aWYgKHRoaXMuYXBwKSB7XG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRGb2xkZXIgPSBub3JtYWxpemVQYXRoKHRoaXMudmVyaWZpY2F0aW9uRm9sZGVyKTtcblx0XHRcdFx0aWYgKCFhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhub3JtYWxpemVkRm9sZGVyKSkge1xuXHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubWtkaXIobm9ybWFsaXplZEZvbGRlcik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF3YWl0IGZzLm1rZGlyKHZlcmlmaWNhdGlvbkRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbnZlcnQgUERGICh3ZSdsbCBvbmx5IHNhdmUgdGhlIGZpcnN0IHBhZ2UpXG5cdFx0XHRjb25zdCBkb2N1bWVudCA9IGF3YWl0IHBkZihCdWZmZXIuZnJvbShwZGZCdWZmZXIpLCB7IHNjYWxlOiAyLjAgfSk7XG5cblx0XHRcdC8vIEdldCBvbmx5IHRoZSBmaXJzdCBwYWdlXG5cdFx0XHRjb25zdCBpdGVyYXRvciA9IGRvY3VtZW50W1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xuXHRcdFx0Y29uc3QgZmlyc3RQYWdlID0gYXdhaXQgaXRlcmF0b3IubmV4dCgpO1xuXG5cdFx0XHRpZiAoZmlyc3RQYWdlLmRvbmUgfHwgIWZpcnN0UGFnZS52YWx1ZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIGltYWdlcyBnZW5lcmF0ZWQgZnJvbSBQREYnKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgaW1hZ2VOYW1lID0gYCR7YmFzZU5hbWV9X3BhZ2VfMS5wbmdgO1xuXG5cdFx0XHRpZiAodGhpcy5hcHApIHtcblx0XHRcdFx0Y29uc3QgaW1hZ2VQYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLnZlcmlmaWNhdGlvbkZvbGRlcn0vJHtpbWFnZU5hbWV9YCk7XG5cdFx0XHRcdGNvbnN0IGltYWdlQnVmZmVyID0gZmlyc3RQYWdlLnZhbHVlLmJ1ZmZlci5zbGljZSgwKSBhcyBBcnJheUJ1ZmZlcjtcblx0XHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZUJpbmFyeShpbWFnZVBhdGgsIGltYWdlQnVmZmVyKTtcblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXG5cdFx0XHRcdFx0aW1hZ2VDb3VudDogMSxcblx0XHRcdFx0XHRpbWFnZVBhdGhzOiBbaW1hZ2VQYXRoXVxuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgaW1hZ2VQYXRoID0gcGF0aC5qb2luKHZlcmlmaWNhdGlvbkRpciwgaW1hZ2VOYW1lKTtcblx0XHRcdFx0YXdhaXQgZnMud3JpdGVGaWxlKGltYWdlUGF0aCwgZmlyc3RQYWdlLnZhbHVlKTtcblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXG5cdFx0XHRcdFx0aW1hZ2VDb3VudDogMSxcblx0XHRcdFx0XHRpbWFnZVBhdGhzOiBbaW1hZ2VQYXRoXVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdQREYgdmVyaWZpY2F0aW9uIChmaXJzdCBwYWdlKSBmYWlsZWQ6JywgZXJyb3IpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdGltYWdlQ291bnQ6IDAsXG5cdFx0XHRcdGltYWdlUGF0aHM6IFtdLFxuXHRcdFx0XHRlcnJvcjogZXJyb3IubWVzc2FnZVxuXHRcdFx0fTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQ2xlYW5zIHVwIHZlcmlmaWNhdGlvbiBpbWFnZXMgZm9yIGEgc3BlY2lmaWMgUERGXG5cdCAqL1xuXHRhc3luYyBjbGVhbnVwVmVyaWZpY2F0aW9uSW1hZ2VzKGJhc2VOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHR0cnkge1xuXHRcdFx0aWYgKHRoaXMuYXBwKSB7XG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRGb2xkZXIgPSBub3JtYWxpemVQYXRoKHRoaXMudmVyaWZpY2F0aW9uRm9sZGVyKTtcblx0XHRcdFx0aWYgKCFhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhub3JtYWxpemVkRm9sZGVyKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5saXN0KG5vcm1hbGl6ZWRGb2xkZXIpO1xuXHRcdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMuZmlsZXMpIHtcblx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9IGZpbGUuc3BsaXQoJy8nKS5wb3AoKTtcblx0XHRcdFx0XHRpZiAoZmlsZU5hbWUgJiYgZmlsZU5hbWUuc3RhcnRzV2l0aChgJHtiYXNlTmFtZX1fcGFnZV9gKSkge1xuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZW1vdmUoZmlsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCB2ZXJpZmljYXRpb25EaXIgPSBwYXRoLmpvaW4odGhpcy52YXVsdFBhdGggfHwgcHJvY2Vzcy5jd2QoKSwgdGhpcy52ZXJpZmljYXRpb25Gb2xkZXIpO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucmVhZGRpcih2ZXJpZmljYXRpb25EaXIpO1xuXHRcdFx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0XHRcdFx0aWYgKGZpbGUuc3RhcnRzV2l0aChgJHtiYXNlTmFtZX1fcGFnZV9gKSkge1xuXHRcdFx0XHRcdFx0XHRhd2FpdCBmcy51bmxpbmsocGF0aC5qb2luKHZlcmlmaWNhdGlvbkRpciwgZmlsZSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHQvLyBEaXJlY3RvcnkgZG9lc24ndCBleGlzdCwgbm90aGluZyB0byBjbGVhbiB1cFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjbGVhbnVwIHZlcmlmaWNhdGlvbiBpbWFnZXM6JywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBDbGVhbnMgdXAgYWxsIHZlcmlmaWNhdGlvbiBpbWFnZXNcblx0ICovXG5cdGFzeW5jIGNsZWFudXBBbGxWZXJpZmljYXRpb25JbWFnZXMoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmICh0aGlzLmFwcCkge1xuXHRcdFx0XHRjb25zdCBub3JtYWxpemVkRm9sZGVyID0gbm9ybWFsaXplUGF0aCh0aGlzLnZlcmlmaWNhdGlvbkZvbGRlcik7XG5cdFx0XHRcdGlmIChhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhub3JtYWxpemVkRm9sZGVyKSkge1xuXHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucm1kaXIobm9ybWFsaXplZEZvbGRlciwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHZlcmlmaWNhdGlvbkRpciA9IHBhdGguam9pbih0aGlzLnZhdWx0UGF0aCB8fCBwcm9jZXNzLmN3ZCgpLCB0aGlzLnZlcmlmaWNhdGlvbkZvbGRlcik7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0YXdhaXQgZnMucm0odmVyaWZpY2F0aW9uRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0Ly8gRGlyZWN0b3J5IGRvZXNuJ3QgZXhpc3QsIG5vdGhpbmcgdG8gY2xlYW4gdXBcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2xlYW51cCBhbGwgdmVyaWZpY2F0aW9uIGltYWdlczonLCBlcnJvcik7XG5cdFx0fVxuXHR9XG59XG4iXX0=