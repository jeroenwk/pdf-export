import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Test with the actual sample file
const sampleFilePath = '/Users/jeroendezwart/2th Brain/Viwoods/Paper/le corbeau et le renard.md';

try {
    console.log('='.repeat(60));
    console.log('TESTING PROPERTIES TABLE WITH SAMPLE FILE');
    console.log('='.repeat(60));

    // Read the actual sample file
    const content = readFileSync(sampleFilePath, 'utf8');
    console.log(`✓ Read sample file: ${sampleFilePath}`);
    console.log(`✓ File size: ${content.length} characters`);

    // Display the first 300 characters to verify content
    console.log('\nFirst 300 characters of file:');
    console.log(content.substring(0, 300) + '...');

    // Count frontmatter lines
    const lines = content.split('\n');
    const frontmatterStart = lines.findIndex(line => line.trim() === '---');
    const frontmatterEnd = lines.findIndex((line, index) => index > frontmatterStart && line.trim() === '---');

    if (frontmatterStart >= 0 && frontmatterEnd > frontmatterStart) {
        const frontmatterLines = frontmatterEnd - frontmatterStart + 1;
        console.log(`\n✓ Frontmatter detected: ${frontmatterLines} lines (lines ${frontmatterStart + 1}-${frontmatterEnd + 1})`);

        // Show frontmatter content
        const frontmatterContent = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
        console.log('\nFrontmatter content:');
        console.log(frontmatterContent);
    } else {
        console.log('\n✗ No frontmatter detected');
    }

    console.log('\n✓ Sample file analysis completed');
    console.log('='.repeat(60));

} catch (error) {
    console.error('Error reading sample file:', error);
    console.log('\nPlease ensure the sample file exists at the expected location:');
    console.log(sampleFilePath);
}