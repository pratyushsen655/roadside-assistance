const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\praty\\.gemini\\antigravity-ide\\brain\\5509f8d6-656a-4c0a-9638-b096aff6e326\\mechanic_app_icon_1785920934636.png';
const dest1 = path.join(__dirname, '..', 'assets', 'icon.png');
const dest2 = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');

try {
  fs.copyFileSync(src, dest1);
  fs.copyFileSync(src, dest2);
  console.log('Successfully copied square icon to assets/icon.png and assets/adaptive-icon.png');
} catch (err) {
  console.error('Error copying icon:', err);
}
