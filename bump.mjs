#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { exit } from 'process';

const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
	log(`❌ ${message}`, colors.red);
}

function success(message) {
	log(`✅ ${message}`, colors.green);
}

function info(message) {
	log(`ℹ️  ${message}`, colors.cyan);
}

function header(message) {
	log(`\n${'='.repeat(60)}`, colors.blue);
	log(`  ${message}`, colors.bright + colors.blue);
	log(`${'='.repeat(60)}`, colors.blue);
}

function exec(command, silent = false) {
	try {
		const output = execSync(command, { encoding: 'utf8' });
		if (!silent) {
			console.log(output);
		}
		return output.trim();
	} catch (e) {
		error(`Command failed: ${command}`);
		error(e.message);
		exit(1);
	}
}

function getVersion(file, key = 'version') {
	try {
		const content = readFileSync(file, 'utf8');
		const json = JSON.parse(content);
		return json[key];
	} catch (e) {
		error(`Failed to read version from ${file}`);
		return null;
	}
}

// Get bump type from command line argument
const bumpType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(bumpType)) {
	error(`Invalid bump type: ${bumpType}`);
	log('Usage: npm run bump [patch|minor|major]');
	exit(1);
}

header('PDF Export Plugin - Version Bump & Deploy');

// Step 1: Check git status
info('Step 1: Checking git status...');
const gitStatus = exec('git status --porcelain', true);
if (gitStatus) {
	log('\n' + gitStatus);
	error('Working directory is not clean. Commit or stash changes first.');
	exit(1);
}
success('Working directory is clean');

// Step 2: Get current version
info('\nStep 2: Reading current version...');
const oldVersion = getVersion('package.json');
log(`  Current version: ${oldVersion}`);

// Step 3: Run ESLint
info('\nStep 3: Running ESLint...');
try {
	exec('npm run lint');
	success('ESLint passed');
} catch (e) {
	error('ESLint failed! Fix linting errors before bumping version.');
	exit(1);
}

// Step 4: Run TypeScript compilation
info('\nStep 4: Running TypeScript compilation...');
try {
	exec('tsc -noEmit -skipLibCheck', true);
	success('TypeScript compilation passed');
} catch (e) {
	error('TypeScript compilation failed! Fix type errors before bumping version.');
	exit(1);
}

// Step 5: Bump version (only after lint and tsc pass)
info(`\nStep 5: Bumping ${bumpType} version...`);
const versionOutput = exec(`npm version ${bumpType}`, true);
// Extract just the version number (last line should be vX.Y.Z)
const newVersion = versionOutput.split('\n').pop().trim();
success(`Version bumped: ${oldVersion} → ${newVersion}`);

// Step 6: Build and deploy
info('\nStep 6: Building production bundle and deploying...');
try {
	exec('node esbuild.config.mjs production');
	success('Build and deployment complete');
} catch (e) {
	error('Build failed!');
	exit(1);
}

// Step 7: Verify all versions
header('Version Verification');

const pkgVersion = getVersion('package.json');
const manifestVersion = getVersion('manifest.json');
const deployedManifestVersion = getVersion('/Users/jeroendezwart/2th Brain/.obsidian/plugins/pdf-export/manifest.json');

log(`\n📦 package.json:           ${pkgVersion}`);
log(`📄 manifest.json (source): ${manifestVersion}`);
log(`🚀 manifest.json (deployed): ${deployedManifestVersion}`);

// Check if all versions match
const allMatch = pkgVersion === manifestVersion && manifestVersion === deployedManifestVersion;

if (!allMatch) {
	error('\nVersion mismatch detected!');
	exit(1);
}

success('\n✓ All versions match!');

// Step 8: Git verification
info('\nStep 8: Verifying git state...');
const latestTag = exec('git describe --tags --abbrev=0', true);
const latestCommit = exec('git log -1 --oneline', true);

log(`\n🏷️  Latest tag:    ${latestTag}`);
log(`📝 Latest commit: ${latestCommit}`);

if (latestTag !== newVersion) {
	error(`\nTag mismatch! Expected ${newVersion}, got ${latestTag}`);
	exit(1);
}

success('✓ Git tag matches version');

// Step 9: Check deployed files
info('\nStep 9: Checking deployed files...');
try {
	const deployedFiles = exec('ls -lh "/Users/jeroendezwart/2th Brain/.obsidian/plugins/pdf-export/" | grep -E "(main.js|manifest.json)"', true);
	log('\n' + deployedFiles);
	success('✓ Deployed files exist');
} catch (e) {
	error('Failed to verify deployed files');
	exit(1);
}

// Final summary
header('Deployment Summary');

log(`
✅ Version:  ${oldVersion} → ${newVersion}
✅ Build:    Successful
✅ Deploy:   Successful
✅ Git tag:  ${latestTag}
✅ Verified: All versions aligned

🎉 Plugin version ${newVersion} is ready to use!
`);

log('Next steps (optional):', colors.yellow);
log('  - Test the plugin in Obsidian');
log('  - Push to remote: git push && git push --tags');
log('  - Create GitHub release');
