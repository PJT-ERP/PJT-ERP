const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let newCode = code;
  // Primary color
  newCode = newCode.replace(/\[#C9191E\]/g, 'slate-900');
  // Hover color
  newCode = newCode.replace(/\[#a01419\]/g, 'slate-800');
  
  if (code !== newCode) {
    fs.writeFileSync(filePath, newCode, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src', 'app', 'pages'));
console.log('Done!');
