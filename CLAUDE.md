- it is not allowed to use obsidian in the plugin name
- my vault exists in '/Users/jeroendezwart/2th Brain'
- each single implementation step must be validated by me before to proceed
- before to ask me to test it make sure that you have tested the export yourself and have confirmed by analysing the pdf yourself that everything works as expected
- you can test converting to pdf yourself before to ask me. You can use the file 'Viwoods/Paper/le corbeau et le renard.md' as test input file. A good PDF representation of it exists in /reference (exept that line breaks are converted as page breaks instead of a horizontal line).


### Expected Output Locations:
- **PDF**: `/Users/jeroendezwart/2th Brain/PDF Exports/verification/<filename>.pdf`
- **Verification PNGs**: `/Users/jeroendezwart/2th Brain/PDF Exports/verification/<filename>_page_<n>.png`

## Testing Workflow (Claude + User)

Test file location: `/Users/jeroendezwart/2th Brain/Viwoods/Paper/le corbeau et le renard.md`
Reference PDF exists in `/reference` (note: line breaks convert to page breaks instead of horizontal lines)
4. **User confirms**: User checks the files in their vault and confirms
5. **Proceed**: Only after user confirmation, move to next implementation phase

Test scripts location: `/Users/jeroendezwart/perso/pdf-export/test-*.js`
Output location: `/Users/jeroendezwart/2th Brain/PDF Exports/`
- test scripts are ts files and should go in src/test