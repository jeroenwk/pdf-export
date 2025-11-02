#!/usr/bin/env node

import { PDFVerifierCLI } from './build/test/pdfVerificationCLI.js';
import path from 'path';

async function convertPdfToPng() {
  const pdfPath = process.argv[2];

  if (!pdfPath) {
    console.error('Usage: node test-pdf-verification.js <pdf-path>');
    process.exit(1);
  }

  console.log(`🖼️ Converting PDF to PNG using verification: ${pdfPath}`);

  // Use the same verification functionality as the CLI
  const verifier = new PDFVerifierCLI({
    vaultPath: '/Users/jeroendezwart/2th Brain'
  });

  // Read PDF file as ArrayBuffer
  const fs = await import('fs/promises');
  const pdfBuffer = await fs.readFile(pdfPath);
  const baseName = path.basename(pdfPath, '.pdf');

  // Generate verification image
  await verifier.verifyPDF(pdfBuffer, baseName);

  console.log(`✅ PDF converted to PNG, check verification folder for output`);
}

convertPdfToPng().catch(console.error);