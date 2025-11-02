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
      'README.md'  // fallback
    ];

    let testFile = null;
    for (const file of testFiles) {
      try {
        const filePath = path.join(vaultPath, file);
        await fs.access(filePath);
        testFile = filePath;
        console.log(`✅ Found test file: ${testFile}`);
        break;
      } catch (error) {
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

  } catch (error) {
    console.error('❌ CLI test failed:', error);
    console.error(error.stack);
  }
}

testCLI();