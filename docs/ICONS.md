# Icon Guide for PDF Export Plugin

## Overview

The PDF Export plugin uses icons from the **Lucide** icon library, which is built into Obsidian. You can also create custom icons using SVG graphics.

## Where Icons Come From

- **Built-in Icons**: Obsidian includes the complete [Lucide icon library](https://lucide.dev/)
- **Icon Type**: They are SVG graphics (scalable vector graphics)
- **Not Unicode**: These are not Unicode emoji or font icons, but actual SVG drawings
- **Custom Icons**: You can add your own SVG icons using the `addIcon()` API

## Available Built-in Icons for PDF Export

Browse all available icons at: https://lucide.dev/icons/

### Recommended Icons for PDF Export

**Current Choice:**
- `file-text` ✓ (currently used) - Document icon

**Other Good Options:**
- `file-down` - Download/export file
- `download` - Generic download
- `file-output` - Output file
- `file` - Simple file
- `file-check` - File with checkmark
- `printer` - Printer icon (currently used for print button)
- `save` - Save icon

**Specific File Type Icons:**
- `file-pdf` - Check if available (may exist in newer Lucide versions)
- `file-type` - File type indicator

## How to Change the Icon

In `src/main.ts`, find the `addRibbonIcon` calls and change the icon name:

```typescript
// Change from:
this.addRibbonIcon('file-text', 'Export to PDF', () => {
    this.exportToPDF();
});

// To any Lucide icon:
this.addRibbonIcon('download', 'Export to PDF', () => {
    this.exportToPDF();
});
```

## Custom Icons (SVG)

You can create your own custom icon using SVG graphics.

### How to Add a Custom Icon

1. **Register the icon** using `addIcon()` in your `onload()` method
2. **Use the icon** with `addRibbonIcon()` using your custom ID

### Example: Custom PDF Icon

```typescript
import { addIcon, Plugin } from 'obsidian';

export default class PDFExportPlugin extends Plugin {
    async onload() {
        // Register custom PDF icon
        addIcon('custom-pdf', `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  fill="none" stroke="currentColor" stroke-width="2"/>
            <polyline points="14 2 14 8 20 8"
                      fill="none" stroke="currentColor" stroke-width="2"/>
            <text x="50" y="60"
                  font-size="20"
                  font-weight="bold"
                  fill="currentColor"
                  text-anchor="middle">PDF</text>
        `);

        // Use the custom icon
        this.addRibbonIcon('custom-pdf', 'Export to PDF', () => {
            this.exportToPDF();
        });
    }
}
```

### SVG Requirements

- **No `<svg>` wrapper**: Only include the inner SVG elements
- **ViewBox**: Icons should fit within a "0 0 100 100" coordinate system
- **Color**: Use `currentColor` to inherit theme colors
- **Simple is better**: Keep icons simple and recognizable at small sizes

### Where to Find SVG Graphics

1. **Lucide Library**: Copy and modify existing Lucide SVGs from https://lucide.dev/
2. **Design Tools**: Create in Figma, Sketch, Illustrator, or Inkscape
3. **SVG Editors**: Use online tools like https://svg-path-editor.netlify.app/
4. **Icon Libraries**: Download from IconMonstr, Heroicons, or Font Awesome (check licenses!)

### Example: Creating a PDF Document Icon

```typescript
// Simple PDF document with folded corner
addIcon('pdf-export', `
    <rect x="25" y="15" width="50" height="70" rx="3"
          fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path d="M25 25 L75 25" stroke="currentColor" stroke-width="2"/>
    <path d="M25 35 L75 35" stroke="currentColor" stroke-width="2"/>
    <path d="M25 45 L65 45" stroke="currentColor" stroke-width="2"/>
    <circle cx="70" cy="70" r="8" fill="currentColor"/>
`);
```

## Getting Icon IDs Programmatically

You can list all registered icons in the console:

```typescript
import { getIconIds } from 'obsidian';

// In your plugin
console.log('Available icons:', getIconIds());
```

## Best Practices

1. **Clarity**: Choose icons that clearly communicate "export" or "PDF"
2. **Consistency**: Match Obsidian's visual style
3. **Testing**: Test icons in both light and dark themes
4. **Size**: Ensure icons are recognizable at 16-24px sizes
5. **Simplicity**: Avoid overly complex designs

## Current Implementation

**Export Button**: `pdf-export` (custom PDF icon with "PDF" text)
**Print Button**: `printer` (printer icon)

The custom `pdf-export` icon is registered in `src/main.ts` at line 57 and used at lines 80, 122 (export).
The print button uses the built-in `printer` icon at lines 88, 136.

### Custom PDF Icon Code

```typescript
addIcon('pdf-export', `
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
    <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
    <text x="12" y="14" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="5"
        fill="currentColor" stroke="currentColor" stroke-width="0.5" paint-order="stroke fill"
        style="pointer-events:none;">PDF</text>
`);
```

This icon combines:
- A document outline with folded corner (from Lucide's `file` icon)
- The text "PDF" in the center
- Theme-aware coloring using `currentColor`
