#!/usr/bin/env node

// Simple test to compare optimized PDF settings
console.log('=== Optimized PDF Generation Test ===');
console.log('');
console.log('Changes made to reduce PDF size:');
console.log('1. Canvas scale: 2 → 1 (75% size reduction)');
console.log('2. Image format: PNG → JPEG with 85% quality');
console.log('3. PDF compression: enabled');
console.log('4. Expected result: ~20MB → ~1MB or less');
console.log('');
console.log('To test in Obsidian:');
console.log('1. Build the plugin (npm run build)');
console.log('2. Test export of "Viwoods/Paper/le corbeau et le renard.md"');
console.log('3. Compare new PDF size with previous 20MB file');
console.log('4. Check visual quality for readability');
console.log('');
console.log('Expected size comparison:');
console.log('- Before optimization: ~20MB');
console.log('- After optimization: ~1MB (95% reduction)');
console.log('- Reference PDF: 411KB');