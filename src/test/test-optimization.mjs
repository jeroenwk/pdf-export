#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('=== PDF Size Optimization Verification ===');
console.log('');

const vaultPath = '/Users/jeroendezwart/2th Brain';
const testFile = 'Viwoods/Paper/le corbeau et le renard.md';
const pdfExportPath = path.join(vaultPath, 'PDF Exports');

console.log('Checking file sizes before and after optimization:');
console.log('');

try {
  // Check if source file exists
  const sourcePath = path.join(vaultPath, testFile);
  if (fs.existsSync(sourcePath)) {
    const sourceStats = fs.statSync(sourcePath);
    console.log(`Source markdown file: ${testFile}`);
    console.log(`Size: ${(sourceStats.size / 1024).toFixed(2)} KB`);
  }

  // Check for reference PDF
  const refPath = path.join(vaultPath, 'reference', 'le corbeau et le renard.pdf');
  if (fs.existsSync(refPath)) {
    const refStats = fs.statSync(refPath);
    console.log(`Reference PDF (before optimization): ${(refStats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Check for current PDF
  const currentPath = path.join(pdfExportPath, 'le corbeau et le renard.pdf');
  if (fs.existsSync(currentPath)) {
    const currentStats = fs.statSync(currentPath);
    console.log(`Current PDF (unoptimized): ${(currentStats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Check for backup PDF
  const backupPath = path.join(pdfExportPath, 'le corbeau et le renard_old_20MB.pdf');
  if (fs.existsSync(backupPath)) {
    const backupStats = fs.statSync(backupPath);
    console.log(`Backup PDF (unoptimized): ${(backupStats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log('');
  console.log('Optimization settings applied:');
  console.log('✓ Canvas scale: 2 → 1 (75% smaller pixel count)');
  console.log('✓ Image format: PNG → JPEG (85% quality)');
  console.log('✓ PDF compression: enabled');
  console.log('');
  console.log('Expected improvement: 95% size reduction (20MB → <1MB)');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart Obsidian to load optimized plugin');
  console.log('2. Export the test file again');
  console.log('3. Compare file sizes');

} catch (error) {
  console.error('Error checking files:', error.message);
}