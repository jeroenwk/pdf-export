/**
 * Test script to verify page break marker (___) detection
 * Tests that ONLY ___ is treated as page breaks when the feature is enabled
 * --- should remain as horizontal lines
 */

const testContent = `---
created: 2025-10-03 20:19
modified: 2025-10-19 10:17
total_pages: 3
---

#scribbling #2025-10-03

---

![[resources/le-corbeau-et-le-renard-page-1-1762264017834.png]]

### Notes

*Add your notes here*

___

![[resources/le-corbeau-et-le-renard-page-3-1762264017845.png]]

### Notes

*Add your notes here*
`;

// Simulate the preprocessing logic
function preprocessMarkdownForPageBreaks(content: string): string {
	console.log('[TEST] Processing markdown for page breaks');

	const lines = content.split('\n');
	const processedLines: string[] = [];
	let inCodeBlock = false;
	let inQuoteBlock = false;
	let horizontalRuleCount = 0;
	let pageBreakCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// Track code blocks
		if (trimmed.startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			console.log(`[TEST] Line ${i+1}: Code block ${inCodeBlock ? 'opened' : 'closed'}`);
			processedLines.push(line);
			continue;
		}

		// Track quote blocks
		if (trimmed.startsWith('>')) {
			inQuoteBlock = true;
		} else if (inQuoteBlock && trimmed === '') {
			if (i === lines.length - 1 || !lines[i + 1].trim().startsWith('>')) {
				inQuoteBlock = false;
			}
		} else if (inQuoteBlock && !trimmed.startsWith('>')) {
			inQuoteBlock = false;
		}

		// Check for page break marker (triple underscores only, not in code or quote blocks)
		if (!inCodeBlock && !inQuoteBlock && trimmed === '___') {
			horizontalRuleCount++;
			pageBreakCount++;
			console.log(`[TEST] Line ${i+1}: Found page break marker (___) #${horizontalRuleCount}, would replace with page break marker`);
			processedLines.push('<div class="pdf-page-break" data-page-break="true"></div>');
		} else {
			processedLines.push(line);
		}
	}

	const result = processedLines.join('\n');
	console.log(`[TEST] Processing complete. Found ${horizontalRuleCount} horizontal rules, inserted ${pageBreakCount} page breaks`);

	return result;
}

// Run the test
console.log('========================================');
console.log('PAGE BREAK MARKER (___) DETECTION TEST');
console.log('========================================');
console.log('Testing that ONLY ___ is treated as page break\n');
console.log('--- should remain as horizontal lines\n');

const processed = preprocessMarkdownForPageBreaks(testContent);

console.log('\n========================================');
console.log('TEST RESULTS');
console.log('========================================');
console.log('Original content:');
console.log(testContent);
console.log('\n--- PROCESSED RESULT ---\n');
console.log(processed);
console.log('\n========================================');
console.log('Expected: Should detect ONLY 1 page break marker');
console.log('- Line 17: ___ (before second image) - SHOULD be converted');
console.log('- Line 9: --- (after frontmatter and tags) - should REMAIN as horizontal line');
console.log('- Lines 1-5: --- frontmatter delimiters - should REMAIN unchanged');
console.log('========================================');
