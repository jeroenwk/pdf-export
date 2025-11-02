import { PDFVerifierCLI } from './pdfVerificationCLI.js';
import path from 'path';
import fs from 'fs/promises';

async function convertPdfToPng(pdfPath: string, outputPath: string) {
  console.log(`🖼️ Converting PDF to PNG using existing verification: ${pdfPath}`);

  // Use the same verification functionality as the CLI
  const verifier = new PDFVerifierCLI({
    vaultPath: '/Users/jeroendezwart/2th Brain'
  });

  // Read PDF file as ArrayBuffer
  const pdfData = await fs.readFile(pdfPath);
  const pdfBuffer = pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength);
  const baseName = path.basename(pdfPath, '.pdf');

  // Generate verification image
  await verifier.verifyPDF(pdfBuffer, baseName);

  // The verification will create PNGs in the verification folder
  const verificationPath = path.join(path.dirname(pdfPath), 'verification', `${baseName}_page_1.png`);

  // Move the generated PNG to the desired output location
  await fs.rename(verificationPath, outputPath);

  console.log(`✅ PDF converted to PNG: ${outputPath}`);
}

// Run if this file is executed directly
if (require.main === module) {
  const pdfPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!pdfPath || !outputPath) {
    console.error('Usage: node convert-pdf-to-png.js <pdf-path> <output-png-path>');
    process.exit(1);
  }

  convertPdfToPng(pdfPath, outputPath).catch(console.error);
}

export { convertPdfToPng };