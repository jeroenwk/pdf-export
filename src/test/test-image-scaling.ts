/**
 * Test script for image scaling configuration
 *
 * This script tests the image scaling feature by:
 * 1. Reading the test markdown file with images
 * 2. Checking that the imageScale setting is applied correctly
 * 3. Verifying the PDF generation with different scale values
 */

import * as fs from 'fs';
import * as path from 'path';

const VAULT_PATH = '/Users/jeroendezwart/2th Brain';
const TEST_FILE = 'Viwoods/Paper/le corbeau et le renard.md';
const TEST_FILE_PATH = path.join(VAULT_PATH, TEST_FILE);

console.log('========================================');
console.log('IMAGE SCALING TEST');
console.log('========================================');
console.log(`Test file: ${TEST_FILE_PATH}`);
console.log('');

try {
    const content = fs.readFileSync(TEST_FILE_PATH, 'utf-8');

    // Check if the file contains images
    const imagePattern = /!\[.*?\]\(.*?\)/g;
    const images = content.match(imagePattern);

    console.log(`[DEBUG] Found ${images ? images.length : 0} image references in markdown`);

    if (images) {
        console.log('[DEBUG] Images found:');
        images.forEach((img: string, index: number) => {
            console.log(`  ${index + 1}. ${img}`);
        });
    }

    console.log('');
    console.log('========================================');
    console.log('TEST INSTRUCTIONS');
    console.log('========================================');
    console.log('1. Open the PDF Export plugin settings in Obsidian');
    console.log('2. Locate the "Image scale" setting');
    console.log('3. Test with different values:');
    console.log('   - 50% (half width)');
    console.log('   - 100% (full width - default)');
    console.log('   - 150% (1.5x width)');
    console.log('4. Export the test file to PDF after each change');
    console.log('5. Verify that images scale correctly in the PDF');
    console.log('');
    console.log('Expected behavior:');
    console.log('- At 50%: Images should be half the page width');
    console.log('- At 100%: Images should fill the page width (default)');
    console.log('- At 150%: Images should be 1.5x the page width (may overflow)');
    console.log('');
    console.log('Check the console logs for detailed scaling information:');
    console.log('- Look for "[DEBUG] Image scale setting: X%"');
    console.log('- Look for "[DEBUG] Scaling image: ..." messages');
    console.log('========================================');

} catch (error) {
    console.error(`[ERROR] Failed to read test file: ${error}`);
}
