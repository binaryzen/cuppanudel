#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const versionFile = path.resolve(__dirname, '..', 'poc', 'version.js');

function parseVersion(content) {
    const m = content.match(/VERSION\s*=\s*'(\d+)\.(\d+)\.(\d+)'/);
    if (!m) return null;
    return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), build: parseInt(m[3], 10) };
}

const currentContent = fs.readFileSync(versionFile, 'utf8');
const current = parseVersion(currentContent);
if (!current) {
    console.error('bump-version: cannot parse version from poc/version.js');
    process.exit(1);
}

let headMajor = null;
let headMinor = null;
try {
    const headContent = execSync('git show HEAD:poc/version.js', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const head = parseVersion(headContent);
    if (head) { headMajor = head.major; headMinor = head.minor; }
} catch (_) {
    // first commit or file not yet tracked — no HEAD version to compare
}

let newBuild;
if (headMajor !== null && (current.major !== headMajor || current.minor !== headMinor)) {
    newBuild = 1;
} else {
    newBuild = current.build + 1;
}

const newVersion = `${current.major}.${current.minor}.${newBuild}`;
fs.writeFileSync(versionFile, `export const VERSION = '${newVersion}';\n`, 'utf8');
execSync(`git add "${versionFile}"`);
console.log(`Version bumped: ${current.major}.${current.minor}.${current.build} → ${newVersion}`);
