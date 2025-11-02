- it is not allowed to use obsidian in the plugin name
- my vault exists in '/Users/jeroendezwart/2th Brain'
- each single implementation step must be validated by me before to proceed
- before to ask me to test it make sure that you have tested the export yourself and have confirmed by analysing the pdf yourself that everything works as expected
- you can test converting to pdf yourself before to ask me. You can use the file 'Viwoods/Paper/le corbeau et le renard.md' as test input file. A good PDF representation of it exists in /reference (exept that line breaks are converted as page breaks instead of a horizontal line).
- when generating pdf from cli than the output pdf should be put in the configured export folders verification folder.

## CLI Usage

Use the command-line tool to test PDF generation:

```bash
# Basic conversion
npm run cli -- "/Users/jeroendezwart/2th Brain/Viwoods/Paper/le corbeau et le renard.md"

# Conversion with verification
npm run cli -- "/Users/jeroendezwart/2th Brain/Viwoods/Paper/le corbeau et le renard.md" --debug --verify

# Available options
npm run cli -- --help
```

### CLI Options:
- `--output <path>`: Custom output PDF path
- `--vault <path>`: Obsidian vault path (default: '/Users/jeroendezwart/2th Brain')
- `--format <format>`: Page format (a4|letter, default: a4)
- `--margin <number>`: Page margin in mm (default: 10)
- `--width <number>`: Content width in pixels (default: 800)
- `--scale <number>`: Scale factor for quality (default: 2)
- `--no-images`: Disable image embedding
- `--verify`: Generate verification PNG images after PDF creation
- `--debug`: Enable debug logging

### Expected Output Locations:
- **PDF**: `/Users/jeroendezwart/2th Brain/PDF Exports/verification/<filename>.pdf`
- **Verification PNGs**: `/Users/jeroendezwart/2th Brain/PDF Exports/verification/<filename>_page_<n>.png`

## Testing Workflow (Claude + User)

When implementing features, follow this workflow:

1. **Claude tests first**: Use CLI to generate PDFs and verification images
2. **Claude verifies**: Inspect the generated PDF and PNG images to verify correctness
3. **Claude asks user**: Present findings and ask user to verify the same files

Test file location: `/Users/jeroendezwart/2th Brain/Viwoods/Paper/le corbeau et le renard.md`
Reference PDF exists in `/reference` (note: line breaks convert to page breaks instead of horizontal lines)
4. **User confirms**: User checks the files in their vault and confirms
5. **Proceed**: Only after user confirmation, move to next implementation phase

Test scripts location: `/Users/jeroendezwart/perso/pdf-export/test-*.js`
Output location: `/Users/jeroendezwart/2th Brain/PDF Exports/`
- test scripts are ts files and should go in src/test