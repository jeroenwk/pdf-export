#!/usr/bin/env node

import { Command } from 'commander';
import { PDFExporter } from './PDFExporter.js';
import path from 'path';
import fs from 'fs/promises';

const program = new Command();

program
  .name('markdown-pdf-export')
  .description('CLI tool to convert markdown files to PDF with image support')
  .version('1.0.0');

program
  .argument('<input>', 'Input markdown file path')
  .option('-o, --output <path>', 'Output PDF file path')
  .option('-v, --vault <path>', 'Obsidian vault path for resolving images', '/Users/jeroendezwart/2th Brain')
  .option('-f, --format <format>', 'Page format (a4|letter)', 'a4')
  .option('-m, --margin <number>', 'Page margin in mm', '10')
  .option('-w, --width <number>', 'Content width in pixels', '1200')
  .option('-s, --scale <number>', 'Scale factor for quality', '2')
  .option('--no-images', 'Disable image embedding')
  .option('--verify', 'Generate verification images after PDF creation')
  .option('--debug', 'Enable debug logging')
  .action(async (input: string, options) => {
    try {
      // Validate input file
      const inputPath = path.resolve(input);
      const inputStats = await fs.stat(inputPath);
      if (!inputStats.isFile() || !input.endsWith('.md')) {
        console.error('Error: Input must be a markdown file (.md)');
        process.exit(1);
      }

      // Resolve output path - default to verification folder in PDF Exports
      const defaultOutputPath = options.vault ?
        path.join(options.vault, 'PDF Exports', 'verification', `${path.basename(input, '.md')}.pdf`) :
        path.join(path.dirname(inputPath), `${path.basename(input, '.md')}.pdf`);
      const outputPath = options.output || defaultOutputPath;

      console.log('🚀 Starting PDF export...');
      console.log(`📁 Input: ${inputPath}`);
      console.log(`📄 Output: ${outputPath}`);
      console.log(`🗂️  Vault: ${options.vault}`);

      const exporter = new PDFExporter({
        vaultPath: options.vault,
        pageSize: options.format,
        margin: parseInt(options.margin),
        contentWidth: parseInt(options.width),
        scale: parseFloat(options.scale),
        includeImages: options.images !== false,
        debug: options.debug || false
      });

      await exporter.exportMarkdownToPDF(inputPath, outputPath);

      if (options.verify) {
        console.log('\n🔍 Generating verification images...');
        await exporter.verifyPDF(outputPath);
      }

      console.log('✅ PDF export completed successfully!');

    } catch (error) {
      console.error('❌ Export failed:', error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();