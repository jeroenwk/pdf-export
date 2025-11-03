# PDF Export Plugin

A comprehensive PDF export solution for Obsidian with advanced image processing capabilities.

## Features

### Obsidian Plugin
- Export markdown notes to PDF directly from Obsidian
- Automatic image embedding from vault
- Customizable page sizes (A4/Letter)
- Adjustable quality settings
- Support for images, tables, code blocks, and formatting

### Advanced Features
- Image aspect ratio preservation
- Dynamic page sizing
- High-quality rendering
- Markdown-to-PDF conversion
- Obsidian wiki-link processing

## Installation

### Obsidian Plugin
1. Copy `main.js` and `manifest.json` to your Obsidian vault's `.obsidian/plugins/pdf-export/` directory
2. Enable the plugin in Obsidian settings
3. Use the ribbon icon or command palette to export active note
``````

### Options
- `--output <path>`: Custom output PDF path
- `--vault <path>`: Obsidian vault path (default: current working directory)
- `--format <format>`: Page format (a4|letter, default: a4)
- `--margin <number>`: Page margin in mm (default: 10)
- `--width <number>`: Content width in pixels (default: 1200)
- `--scale <number>`: Scale factor for quality (default: 2)
- `--no-images`: Disable image embedding
- `--verify`: Generate verification images after PDF creation
- `--debug`: Enable debug logging

## Plugin Settings

- **Export folder**: Folder where PDFs will be saved
- **Page size**: PDF page size (A4 or Letter)
- **Show title**: Display note title at the top of PDF
- **Include images**: Embed images from vault in PDF
- **Image max width**: Maximum width for images in pixels
- **PDF margin**: Page margins in millimeters
- **Quality (scale)**: Higher values = better quality but larger file size

## Development

### Project Structure
```
pdf-export/
├── src/
│   ├── main.ts              # Obsidian plugin
│   ├── PDFExporter.ts       # Core PDF export logic
│   └── test/                # Test and verification utilities
├── manifest.json            # Obsidian plugin manifest
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

### Building
```bash
# Build both plugin and CLI
npm run build

# Build only plugin
npm run build-plugin
```

## Troubleshooting

### Plugin Issues
- Ensure the plugin is enabled in Obsidian settings
- Check the developer console for error messages
- Verify that the plugin files are correctly placed in the plugins folder

### CLI Issues
- Make sure Node.js is installed (version 16+ recommended)
- Run `npm install` to install dependencies
- Use `--debug` flag for detailed error information

### Image Issues
- Verify that image paths are correct relative to the markdown file
- Check that images exist in the specified vault location
- Use `--debug` to see image processing logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Changelog

### v1.0.0
- Initial release
- Obsidian plugin integration
- Image processing and embedding
- PDF verification tools
- Dynamic page sizing
- High-quality rendering