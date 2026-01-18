/**
 * Build script for LeadingLeads Chrome Extension.
 * Creates a zip file for Chrome Web Store distribution.
 * Excludes test files, development files, and other non-extension assets.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ZIP_NAME = 'leadingleads.zip';

// Files and directories to include in the extension zip
const INCLUDE = [
  'manifest.json',
  'background.js',
  'contentScript.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'options.html',
  'options.js',
  'options.css',
  'leads.html',
  'leads.js',
  'leads.css',
  'assets',
];

/**
 * Recursively copy a file or directory.
 */
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Create a zip file using PowerShell on Windows or zip on Unix.
 */
function createZip(sourceDir, zipPath) {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Use PowerShell's Compress-Archive
    const command = `powershell -NoProfile -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(command, { stdio: 'inherit' });
  } else {
    // Use zip command on Unix
    execSync(`cd "${sourceDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }
}

// Main build process
console.log('Building LeadingLeads extension...\n');

// Ensure dist directory exists
if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true });
}

// Clean previous build
const zipPath = path.join(DIST, ZIP_NAME);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log('Removed previous build.');
}

// Create temp directory for staging
const tempDir = path.join(DIST, 'staging');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// Copy included files
console.log('Copying extension files...');
for (const item of INCLUDE) {
  const src = path.join(ROOT, item);
  const dest = path.join(tempDir, item);
  
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`  ✓ ${item}`);
  } else {
    console.log(`  ✗ ${item} (not found)`);
  }
}

// Create zip
console.log('\nCreating zip archive...');
createZip(tempDir, zipPath);

// Cleanup staging
fs.rmSync(tempDir, { recursive: true });

// Report success
const stats = fs.statSync(zipPath);
console.log(`\n✅ Build complete!`);
console.log(`   Output: ${zipPath}`);
console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
