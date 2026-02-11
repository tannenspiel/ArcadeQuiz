/**
 * Generate Cache Version Script
 *
 * Generates a unique version hash based on level config files.
 * This ensures Service Worker cache is invalidated when configs change.
 *
 * Usage: node scripts/generate-cache-version.js
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Config files to track for cache invalidation
const CONFIG_FILES = [
  'src/config/levelConfigs/level1.config.json',
  'src/config/levelConfigs/level2.config.json',
];

// Output files to update
const SW_FILE = join(projectRoot, 'public', 'sw.js');
const VERSION_FILE = join(projectRoot, '.cache-version.json');

/**
 * Calculate SHA256 hash of a file
 */
function getFileHash(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return createHash('sha256').update(content).digest('hex').substring(0, 12);
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}, using fallback`);
    return '000000000000';
  }
}

/**
 * Generate combined hash from all config files
 */
function generateVersionHash() {
  const hashes = CONFIG_FILES.map(file => {
    const fullPath = join(projectRoot, file);
    const hash = getFileHash(fullPath);
    console.log(`  ${file}: ${hash}`);
    return hash;
  });

  // Combine all hashes and create final version
  const combined = hashes.join('');
  const finalHash = createHash('sha256').update(combined).digest('hex').substring(0, 8);
  return finalHash;
}

/**
 * Get current timestamp for build identifier
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // YYYY-MM-DD
}

/**
 * Update Service Worker version
 */
function updateServiceWorker(version) {
  try {
    let swContent = readFileSync(SW_FILE, 'utf8');

    // Replace version string using regex
    swContent = swContent.replace(
      /const CACHE_VERSION = ['"][^'"]+['"];/,
      `const CACHE_VERSION = '${version}';`
    );

    writeFileSync(SW_FILE, swContent, 'utf8');
    console.log(`✅ Updated Service Worker version to: ${version}`);
  } catch (error) {
    console.error(`❌ Failed to update Service Worker: ${error.message}`);
    throw error;
  }
}

/**
 * Save version info for reference
 */
function saveVersionInfo(version, hash) {
  const info = {
    version,
    hash,
    timestamp: new Date().toISOString(),
    configFiles: CONFIG_FILES
  };

  writeFileSync(VERSION_FILE, JSON.stringify(info, null, 2));
  console.log(`💾 Saved version info to ${VERSION_FILE}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Generating cache version from config files...\n');

  const hash = generateVersionHash();
  const timestamp = getTimestamp();
  const version = `${timestamp}-${hash}`;

  console.log(`\n📦 Generated version: ${version}`);
  console.log(`   Hash: ${hash}`);
  console.log(`   Timestamp: ${timestamp}\n`);

  updateServiceWorker(version);
  saveVersionInfo(version, hash);

  console.log('✨ Cache version generation complete!\n');
  console.log('💡 Tip: Run this script before building to ensure cache is invalidated.');
}

main();
