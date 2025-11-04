# Print PDF Feature Documentation

## Overview

The Print PDF feature allows users to quickly generate a PDF and either print it (on desktop) or share it (on mobile/iOS) without saving it to the vault's export folder.

## Version Added
v1.1.6

## How It Works

### Desktop Behavior
On desktop platforms (Windows, macOS, Linux):
1. User clicks the printer icon in the sidebar or runs the "Print PDF" command
2. Plugin generates the PDF in memory
3. PDF is loaded into a hidden iframe
4. Browser's native print dialog is automatically opened
5. User can print or save the PDF using the print dialog
6. Temporary resources are cleaned up automatically

### Mobile/iOS Behavior
On mobile platforms (iOS, Android):
1. User clicks the printer icon in the sidebar or runs the "Print PDF" command
2. Plugin generates the PDF
3. PDF is temporarily saved to `.temp` folder in vault root (hidden folder)
4. Native share sheet is triggered via Capacitor API
5. User can:
   - Print using AirPrint (iOS)
   - Share via any app that accepts PDFs
   - Save to Files app
   - Email the PDF
6. Temporary file is automatically deleted after 30 seconds

## User Interface

### Sidebar Button
- **Icon**: Printer icon
- **Tooltip**: "Print PDF"
- **Location**: Right sidebar, next to the "Export to PDF" button

### Command Palette
- **Command**: "Print PDF"
- **ID**: `print-pdf`

## Technical Implementation

### Key Functions

#### `printPDF()`
Main entry point that:
- Validates active file is markdown
- Generates PDF using existing rendering pipeline
- Detects platform and routes to appropriate handler

#### `printOnDesktop(arrayBuffer, fileName)`
Desktop-specific handler:
- Creates blob URL from PDF ArrayBuffer
- Loads PDF in hidden iframe
- Triggers browser print dialog
- Cleans up resources after 1 second

#### `shareOnMobile(arrayBuffer, fileName)`
Mobile-specific handler:
- Creates `.temp` folder if needed
- Saves PDF to temporary location
- Uses Capacitor Share API for native share sheet
- Fallback to download link if Capacitor unavailable
- Cleans up temp file after 30 seconds

### Platform Detection
Uses Obsidian's `Platform` API:
- `Platform.isMobile` - Detects mobile vs desktop
- `Platform.isIosApp` - Specific iOS detection

### Temp Folder Location
- **Path**: `.temp/` in vault root
- **Hidden**: Yes (starts with dot)
- **Cleanup**: Automatic after 30 seconds
- **Outside user content**: Yes

## Debug Logging

All print operations are logged with `[PRINT DEBUG]` prefix:
- Platform detection
- File paths
- Share/print status
- Cleanup operations
- Error messages

## Advantages Over Regular Export

1. **No vault clutter**: Doesn't save to export folder
2. **Faster workflow**: One-click to print
3. **Platform-optimized**: Uses native dialogs/sheets
4. **Automatic cleanup**: No manual file management needed
5. **Universal sharing**: On mobile, can share to any app

## Known Limitations

### Desktop
- Requires browser support for iframe printing
- Print dialog appearance varies by browser
- Some browsers may block automatic print trigger

### Mobile
- Requires Capacitor plugins (native Obsidian mobile)
- 30-second cleanup delay (file persists temporarily)
- Temp folder visible in vault (though hidden with dot prefix)

### Both Platforms
- Uses same PDF generation as regular export
- Respects all plugin settings (image scale, margins, etc.)
- Requires active markdown file

## Troubleshooting

### Print dialog doesn't open (Desktop)
- Check browser console for errors
- Some browsers block automatic print dialogs
- Try manually using Cmd/Ctrl+P on the generated PDF

### Share sheet doesn't appear (Mobile)
- Check that Obsidian mobile is up to date
- Verify Capacitor plugins are available
- Check debug logs for fallback behavior

### Temp files not cleaned up
- Check `.temp` folder in vault root
- Files auto-delete after 30 seconds
- Manually delete if needed (safe to remove)

## Future Enhancements

Potential improvements:
- [ ] Configurable temp file cleanup delay
- [ ] Option to use system temp directory instead of vault
- [ ] Print preview before printing
- [ ] Batch print multiple files
- [ ] Custom print settings (duplex, color, etc.)
