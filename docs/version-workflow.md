# Version Management Workflow

## Overview

The version workflow ensures that `package.json`, `manifest.json`, and the deployed plugin always have matching versions.

## Version Bumping Process

### Method 1: Using npm version (Recommended)

Use npm's built-in version commands to bump versions:

```bash
# Patch version (1.2.0 → 1.2.1) - for bug fixes
npm version patch

# Minor version (1.2.0 → 1.3.0) - for new features
npm version minor

# Major version (1.2.0 → 2.0.0) - for breaking changes
npm version major
```

**What happens:**
1. `package.json` version is updated
2. `version-bump.mjs` script runs automatically (via npm "version" hook)
3. `manifest.json` is synced to match `package.json`
4. `versions.json` is updated
5. Changes are staged with `git add`
6. Git tag is created (e.g., `v1.2.1`)
7. Git commit is created with version number

### Method 2: Build and Deploy

After bumping the version, build and deploy:

```bash
npm run build
```

**What happens:**
1. ESLint runs
2. TypeScript compilation runs
3. `esbuild.config.mjs` reads the current version from `manifest.json`
4. Production build is created
5. `main.js` and `manifest.json` are copied to Obsidian plugins folder
6. Plugin is immediately available in Obsidian

## Complete Workflow Example

```bash
# 1. Make your changes to the code
# ... edit files ...

# 2. Build and test locally
npm run build

# 3. Commit your changes
git add -A
git commit -m "Add new feature"

# 4. Bump version (this also commits and tags)
npm version minor  # or patch, or major

# 5. Build and deploy the new version
npm run build

# 6. Push to remote (optional)
git push
git push --tags
```

## Version Synchronization

### Files Involved

1. **package.json**
   - Source of truth for version
   - Updated by `npm version`

2. **manifest.json**
   - Synced from `package.json` by `version-bump.mjs`
   - Used by Obsidian to display plugin version

3. **versions.json**
   - Maps version to minimum Obsidian version
   - Updated by `version-bump.mjs`

4. **Deployed manifest.json**
   - Located at: `~/.obsidian/plugins/pdf-export/manifest.json`
   - Copied during build process
   - What users see in Obsidian

### Scripts

#### version-bump.mjs
- Triggered by: `npm version` (via package.json "version" hook)
- Purpose: Sync `manifest.json` and `versions.json` to match `package.json`
- Logging: Shows old → new version

#### esbuild.config.mjs (production mode)
- Triggered by: `npm run build`
- Purpose: Build and deploy the plugin
- **Does NOT modify versions** - only reads current version
- Copies files to Obsidian plugins folder

## Troubleshooting

### Versions are mismatched

If versions get out of sync:

```bash
# Check current versions
cat package.json | grep version
cat manifest.json | grep version
cat ~/.obsidian/plugins/pdf-export/manifest.json | grep version

# Fix by running version-bump manually
node version-bump.mjs

# Then rebuild
npm run build
```

### Build didn't deploy

Check that the plugin folder exists:

```bash
ls -la "/Users/jeroendezwart/2th Brain/.obsidian/plugins/pdf-export/"
```

If not, create it:

```bash
mkdir -p "/Users/jeroendezwart/2th Brain/.obsidian/plugins/pdf-export"
npm run build
```

## Best Practices

1. ✅ **Always use `npm version`** to bump versions
2. ✅ **Always run `npm run build`** after bumping
3. ✅ **Commit changes before bumping** version
4. ✅ **Push tags** to remote: `git push --tags`
5. ❌ **Don't manually edit** `manifest.json` version
6. ❌ **Don't edit versions** in multiple places

## Version Types

- **Patch (x.y.Z)**: Bug fixes, small improvements
- **Minor (x.Y.0)**: New features, backward compatible
- **Major (X.0.0)**: Breaking changes, major rewrites
