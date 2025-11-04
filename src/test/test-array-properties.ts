import { parseFrontmatter, generatePropertiesTable } from '../utils/FrontmatterParser';

// Test content with multiline array (like your example)
const sampleContentWithArray = `---
created: 2025-10-16 10:57
modified: 2025-10-16 11:00
meeting_date: 2025-10-16
total_pages: 1
tags:
  - meeting
  - 2025-10-16
---

# Meeting Notes

Today's meeting discussion points...

## Agenda
- Project review
- Next steps
- Timeline discussion

## Action Items
- [ ] Follow up with team
- [ ] Schedule next meeting
`;

console.log('='.repeat(60));
console.log('TESTING ARRAY PROPERTIES PARSING');
console.log('='.repeat(60));

// Test: Parse frontmatter with array
console.log('\n1. Testing frontmatter parsing with multiline arrays...');
const { properties, content } = parseFrontmatter(sampleContentWithArray);
console.log('Parsed properties:', JSON.stringify(properties, null, 2));
console.log('Content length without frontmatter:', content.length);

// Test: Generate properties table
console.log('\n2. Testing properties table generation with arrays...');
const tableHTML = generatePropertiesTable(properties);
console.log('Generated HTML:');
console.log(tableHTML);

// Test: Verify properties display and types
console.log('\n3. Property analysis with type checking:');
Object.entries(properties).forEach(([key, value]) => {
    const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`  ${displayKey}: ${value} (${typeof value})`);

    if (Array.isArray(value)) {
        console.log(`    → Array items: ${value.length}`);
        value.forEach((item, index) => {
            console.log(`      [${index}]: ${item}`);
        });
    }
});

console.log('\n='.repeat(60));
console.log('ARRAY PROPERTIES TEST COMPLETED');
console.log('='.repeat(60));