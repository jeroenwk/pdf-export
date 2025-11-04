import { parseFrontmatter, generatePropertiesTable } from '../utils/FrontmatterParser';

// Test the properties table functionality with the sample file content
const sampleContent = `---
created: 2025-10-03 20:19
modified: 2025-10-19 10:17
total_pages: 3
author: "Jean de La Fontaine"
tags: ["fable", "literature", "children"]
published: true
difficulty: 3
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

console.log('='.repeat(60));
console.log('TESTING PROPERTIES TABLE FUNCTIONALITY');
console.log('='.repeat(60));

// Test 1: Parse frontmatter
console.log('\n1. Testing frontmatter parsing...');
const { properties, content } = parseFrontmatter(sampleContent);
console.log('Parsed properties:', JSON.stringify(properties, null, 2));
console.log('Content length without frontmatter:', content.length);

// Test 2: Generate properties table
console.log('\n2. Testing properties table generation...');
const tableHTML = generatePropertiesTable(properties);
console.log('Generated HTML:');
console.log(tableHTML);

// Test 3: Verify properties display
console.log('\n3. Property analysis:');
Object.entries(properties).forEach(([key, value]) => {
    const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`  ${displayKey}: ${value} (${typeof value})`);
});

console.log('\n='.repeat(60));
console.log('TEST COMPLETED');
console.log('='.repeat(60));