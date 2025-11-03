import { PDFExportPlugin } from '../src/main.js';
import { App, TFile, Vault, Workspace } from 'obsidian';

console.log('Testing optimized PDF generation with canvas scale = 1 and compression...');

// The test will be done through the Obsidian plugin interface
console.log('Ready to test in Obsidian with optimized settings:');
console.log('1. Canvas scale: 1 (reduced from 2)');
console.log('2. JPEG compression: 85% quality');
console.log('3. PDF compression: enabled');
console.log('4. Expected size reduction: ~75% smaller than before');