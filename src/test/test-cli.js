#!/usr/bin/env node
import { PDFExporter } from '../PDFExporter';
import path from 'path';
import fs from 'fs/promises';
async function testCLI() {
    console.log('🧪 Testing CLI PDF Export functionality...');
    try {
        // Test file path - use a markdown file from the vault
        const vaultPath = '/Users/jeroendezwart/2th Brain';
        const testFiles = [
            'Daily Notes/2025-11-02.md',
            'Projects/Test Document.md',
            'README.md' // fallback
        ];
        let testFile = null;
        for (const file of testFiles) {
            try {
                const filePath = path.join(vaultPath, file);
                await fs.access(filePath);
                testFile = filePath;
                console.log(`✅ Found test file: ${testFile}`);
                break;
            }
            catch (error) {
                console.log(`⚠️ File not found: ${file}`);
            }
        }
        if (!testFile) {
            // Create a test file with content and images
            const testContent = `# CLI PDF Export Test

This is a test document for the CLI PDF export functionality.

## Features Tested

1. **Markdown Parsing**: Headers, bold text, *italic text*

2. **Code Blocks**: Inline \`code\` and code blocks

\`\`\`javascript
function hello() {
  console.log("Hello, CLI PDF Export!");
}
\`\`\`

3. **Lists**:
   - Item 1
   - Item 2
   - Item 3

4. **Blockquotes**:
> This is a blockquote to test styling.

5. **Tables**:
| Feature | Status |
|---------|--------|
| HTML to Image | ✅ |
| PDF Generation | ✅ |
| Image Embedding | ✅ |

## Testing Complete

This document should be converted to PDF with proper formatting and any embedded images.
`;
            testFile = path.join(vaultPath, 'CLI Test.md');
            await fs.writeFile(testFile, testContent);
            console.log(`✅ Created test file: ${testFile}`);
        }
        // Initialize exporter
        const exporter = new PDFExporter({
            vaultPath: vaultPath,
            pageSize: 'a4',
            margin: 10,
            contentWidth: 800,
            scale: 2,
            includeImages: true,
            debug: true
        });
        // Export to PDF
        const outputPath = path.join(vaultPath, 'PDF Exports', 'CLI Test.pdf');
        await exporter.exportMarkdownToPDF(testFile, outputPath);
        console.log(`✅ PDF exported to: ${outputPath}`);
        // Verify PDF
        console.log('\n🔍 Verifying PDF...');
        await exporter.verifyPDF(outputPath);
        console.log('\n🎉 CLI test completed successfully!');
        console.log('📁 Check the output in your vault:');
        console.log(`   - PDF: ${outputPath}`);
        console.log(`   - Verification images: ${path.join(vaultPath, 'PDF Exports', 'verification')}`);
    }
    catch (error) {
        console.error('❌ CLI test failed:', error);
        console.error(error.stack);
    }
}
testCLI();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1jbGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LWNsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzdDLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUN4QixPQUFPLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFN0IsS0FBSyxVQUFVLE9BQU87SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRTFELElBQUksQ0FBQztRQUNILHNEQUFzRDtRQUN0RCxNQUFNLFNBQVMsR0FBRyxnQ0FBZ0MsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRztZQUNoQiwyQkFBMkI7WUFDM0IsMkJBQTJCO1lBQzNCLFdBQVcsQ0FBRSxXQUFXO1NBQ3pCLENBQUM7UUFFRixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUM7Z0JBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUIsUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDOUMsTUFBTTtZQUNSLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZCw2Q0FBNkM7WUFDN0MsTUFBTSxXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQ3pCLENBQUM7WUFFSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDL0MsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxXQUFXLENBQUM7WUFDL0IsU0FBUyxFQUFFLFNBQVM7WUFDcEIsUUFBUSxFQUFFLElBQUk7WUFDZCxNQUFNLEVBQUUsRUFBRTtZQUNWLFlBQVksRUFBRSxHQUFHO1lBQ2pCLEtBQUssRUFBRSxDQUFDO1lBQ1IsYUFBYSxFQUFFLElBQUk7WUFDbkIsS0FBSyxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFFSCxnQkFBZ0I7UUFDaEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sUUFBUSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUV6RCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRWhELGFBQWE7UUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDckMsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVsRyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsQ0FBQztBQUNILENBQUM7QUFFRCxPQUFPLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcblxuaW1wb3J0IHsgUERGRXhwb3J0ZXIgfSBmcm9tICcuLi9QREZFeHBvcnRlcic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy9wcm9taXNlcyc7XG5cbmFzeW5jIGZ1bmN0aW9uIHRlc3RDTEkoKSB7XG4gIGNvbnNvbGUubG9nKCfwn6eqIFRlc3RpbmcgQ0xJIFBERiBFeHBvcnQgZnVuY3Rpb25hbGl0eS4uLicpO1xuXG4gIHRyeSB7XG4gICAgLy8gVGVzdCBmaWxlIHBhdGggLSB1c2UgYSBtYXJrZG93biBmaWxlIGZyb20gdGhlIHZhdWx0XG4gICAgY29uc3QgdmF1bHRQYXRoID0gJy9Vc2Vycy9qZXJvZW5kZXp3YXJ0LzJ0aCBCcmFpbic7XG4gICAgY29uc3QgdGVzdEZpbGVzID0gW1xuICAgICAgJ0RhaWx5IE5vdGVzLzIwMjUtMTEtMDIubWQnLFxuICAgICAgJ1Byb2plY3RzL1Rlc3QgRG9jdW1lbnQubWQnLFxuICAgICAgJ1JFQURNRS5tZCcgIC8vIGZhbGxiYWNrXG4gICAgXTtcblxuICAgIGxldCB0ZXN0RmlsZSA9IG51bGw7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHRlc3RGaWxlcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4odmF1bHRQYXRoLCBmaWxlKTtcbiAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZpbGVQYXRoKTtcbiAgICAgICAgdGVzdEZpbGUgPSBmaWxlUGF0aDtcbiAgICAgICAgY29uc29sZS5sb2coYOKchSBGb3VuZCB0ZXN0IGZpbGU6ICR7dGVzdEZpbGV9YCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coYOKaoO+4jyBGaWxlIG5vdCBmb3VuZDogJHtmaWxlfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGVzdEZpbGUpIHtcbiAgICAgIC8vIENyZWF0ZSBhIHRlc3QgZmlsZSB3aXRoIGNvbnRlbnQgYW5kIGltYWdlc1xuICAgICAgY29uc3QgdGVzdENvbnRlbnQgPSBgIyBDTEkgUERGIEV4cG9ydCBUZXN0XG5cblRoaXMgaXMgYSB0ZXN0IGRvY3VtZW50IGZvciB0aGUgQ0xJIFBERiBleHBvcnQgZnVuY3Rpb25hbGl0eS5cblxuIyMgRmVhdHVyZXMgVGVzdGVkXG5cbjEuICoqTWFya2Rvd24gUGFyc2luZyoqOiBIZWFkZXJzLCBib2xkIHRleHQsICppdGFsaWMgdGV4dCpcblxuMi4gKipDb2RlIEJsb2NrcyoqOiBJbmxpbmUgXFxgY29kZVxcYCBhbmQgY29kZSBibG9ja3NcblxuXFxgXFxgXFxgamF2YXNjcmlwdFxuZnVuY3Rpb24gaGVsbG8oKSB7XG4gIGNvbnNvbGUubG9nKFwiSGVsbG8sIENMSSBQREYgRXhwb3J0IVwiKTtcbn1cblxcYFxcYFxcYFxuXG4zLiAqKkxpc3RzKio6XG4gICAtIEl0ZW0gMVxuICAgLSBJdGVtIDJcbiAgIC0gSXRlbSAzXG5cbjQuICoqQmxvY2txdW90ZXMqKjpcbj4gVGhpcyBpcyBhIGJsb2NrcXVvdGUgdG8gdGVzdCBzdHlsaW5nLlxuXG41LiAqKlRhYmxlcyoqOlxufCBGZWF0dXJlIHwgU3RhdHVzIHxcbnwtLS0tLS0tLS18LS0tLS0tLS18XG58IEhUTUwgdG8gSW1hZ2UgfCDinIUgfFxufCBQREYgR2VuZXJhdGlvbiB8IOKchSB8XG58IEltYWdlIEVtYmVkZGluZyB8IOKchSB8XG5cbiMjIFRlc3RpbmcgQ29tcGxldGVcblxuVGhpcyBkb2N1bWVudCBzaG91bGQgYmUgY29udmVydGVkIHRvIFBERiB3aXRoIHByb3BlciBmb3JtYXR0aW5nIGFuZCBhbnkgZW1iZWRkZWQgaW1hZ2VzLlxuYDtcblxuICAgICAgdGVzdEZpbGUgPSBwYXRoLmpvaW4odmF1bHRQYXRoLCAnQ0xJIFRlc3QubWQnKTtcbiAgICAgIGF3YWl0IGZzLndyaXRlRmlsZSh0ZXN0RmlsZSwgdGVzdENvbnRlbnQpO1xuICAgICAgY29uc29sZS5sb2coYOKchSBDcmVhdGVkIHRlc3QgZmlsZTogJHt0ZXN0RmlsZX1gKTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIGV4cG9ydGVyXG4gICAgY29uc3QgZXhwb3J0ZXIgPSBuZXcgUERGRXhwb3J0ZXIoe1xuICAgICAgdmF1bHRQYXRoOiB2YXVsdFBhdGgsXG4gICAgICBwYWdlU2l6ZTogJ2E0JyxcbiAgICAgIG1hcmdpbjogMTAsXG4gICAgICBjb250ZW50V2lkdGg6IDgwMCxcbiAgICAgIHNjYWxlOiAyLFxuICAgICAgaW5jbHVkZUltYWdlczogdHJ1ZSxcbiAgICAgIGRlYnVnOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBFeHBvcnQgdG8gUERGXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHBhdGguam9pbih2YXVsdFBhdGgsICdQREYgRXhwb3J0cycsICdDTEkgVGVzdC5wZGYnKTtcbiAgICBhd2FpdCBleHBvcnRlci5leHBvcnRNYXJrZG93blRvUERGKHRlc3RGaWxlLCBvdXRwdXRQYXRoKTtcblxuICAgIGNvbnNvbGUubG9nKGDinIUgUERGIGV4cG9ydGVkIHRvOiAke291dHB1dFBhdGh9YCk7XG5cbiAgICAvLyBWZXJpZnkgUERGXG4gICAgY29uc29sZS5sb2coJ1xcbvCflI0gVmVyaWZ5aW5nIFBERi4uLicpO1xuICAgIGF3YWl0IGV4cG9ydGVyLnZlcmlmeVBERihvdXRwdXRQYXRoKTtcblxuICAgIGNvbnNvbGUubG9nKCdcXG7wn46JIENMSSB0ZXN0IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJyk7XG4gICAgY29uc29sZS5sb2coJ/Cfk4EgQ2hlY2sgdGhlIG91dHB1dCBpbiB5b3VyIHZhdWx0OicpO1xuICAgIGNvbnNvbGUubG9nKGAgICAtIFBERjogJHtvdXRwdXRQYXRofWApO1xuICAgIGNvbnNvbGUubG9nKGAgICAtIFZlcmlmaWNhdGlvbiBpbWFnZXM6ICR7cGF0aC5qb2luKHZhdWx0UGF0aCwgJ1BERiBFeHBvcnRzJywgJ3ZlcmlmaWNhdGlvbicpfWApO1xuXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcign4p2MIENMSSB0ZXN0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgY29uc29sZS5lcnJvcihlcnJvci5zdGFjayk7XG4gIH1cbn1cblxudGVzdENMSSgpOyJdfQ==