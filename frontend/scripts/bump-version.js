const fs = require('fs');
const path = require('path');

// Get bump type from command line (patch, minor, major)
const bumpType = process.argv[2] || 'patch';

// Read current version from appVersion.ts
const appVersionPath = path.join(__dirname, '../src/constants/appVersion.ts');
let content = fs.readFileSync(appVersionPath, 'utf8');

// Extract current version
const versionMatch = content.match(/APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);
if (!versionMatch) {
  console.error('Could not find APP_VERSION in appVersion.ts');
  process.exit(1);
}

let [, major, minor, patch] = versionMatch.map(Number);

// Increment version
switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
  default:
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
const today = new Date().toISOString().split('T')[0];

// Update APP_VERSION
content = content.replace(/APP_VERSION = '[^']+'/,  `APP_VERSION = '${newVersion}'`);

// Update APP_BUILD_DATE
content = content.replace(/APP_BUILD_DATE = '[^']+'/,  `APP_BUILD_DATE = '${today}'`);

// Write back
fs.writeFileSync(appVersionPath, content);

// Also update package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped to ${newVersion} (${bumpType})`);
console.log(`Build date: ${today}`);
console.log('');
console.log('Next steps:');
console.log('1. Add new entry to VERSION_HISTORY in appVersion.ts');
console.log('2. git add -A && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('3. git push origin main');

