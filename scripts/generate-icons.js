// Run with: node scripts/generate-icons.js
// Or open generate-icons.html in a browser

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple 1x1 purple pixel PNG as base64 (will be stretched)
// For proper icons, open generate-icons.html in a browser instead
const purplePixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

sizes.forEach(size => {
  const filePath = path.join(publicDir, `icon-${size}.png`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, purplePixel);
    console.log(`Created placeholder: icon-${size}.png`);
    console.log('For better icons, open generate-icons.html in a browser');
  }
});

console.log('\\nTo generate proper icons with goat emoji:');
console.log('1. Open generate-icons.html in a browser');
console.log('2. Click both download buttons');
console.log('3. Move downloaded files to public/ folder');
