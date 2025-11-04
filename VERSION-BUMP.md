# Quick Version Bump Guide

## ⚡ Quick Reference (NEW AUTOMATED METHOD)

### One-Command Bump & Deploy:

```bash
# Commit your changes first, then run ONE command:

npm run bump:patch  # Bug fixes:       1.2.1 → 1.2.2
npm run bump:minor  # New features:    1.2.1 → 1.3.0
npm run bump:major  # Breaking changes: 1.2.1 → 2.0.0

# That's it! Everything is done automatically:
# ✅ Git status checked
# ✅ ESLint validation
# ✅ TypeScript compilation check
# ✅ Version bumped (only if checks pass)
# ✅ Production build
# ✅ Deployed to Obsidian
# ✅ Git commit and tag created
# ✅ All versions verified
```

## 📋 Old Method (Manual - Still Works)

```bash
# 1. Commit your changes first
git add -A
git commit -m "Your changes description"

# 2. Bump the version (choose one):
npm version patch   # 1.2.1 → 1.2.2 (bug fixes)
npm version minor   # 1.2.1 → 1.3.0 (new features)
npm version major   # 1.2.1 → 2.0.0 (breaking changes)

# 3. Build and deploy
npm run build

# Done! Version is now deployed and ready to use.
```

## 📋 What the Bump Script Does (Step by Step)

1. **Validates git status** - Ensures working directory is clean
2. **Runs ESLint** - Checks code quality (fails if errors found)
3. **Runs TypeScript** - Validates types (fails if errors found)
4. **Bumps version** - Only if all checks pass
5. **Builds production bundle** - Compiles optimized code
6. **Deploys to Obsidian** - Copies files to plugin folder
7. **Verifies versions** - Confirms all versions match
8. **Checks git state** - Validates tag and commit
9. **Shows summary** - Color-coded report

**Important:** Version bump only happens AFTER lint and TypeScript checks pass!

## 📋 What Happens Automatically (Old Manual Method)

### When you run `npm version`:
- ✅ Updates `package.json` version
- ✅ Runs `version-bump.mjs` which syncs `manifest.json`
- ✅ Updates `versions.json`
- ✅ Stages files with `git add`
- ✅ Creates git commit
- ✅ Creates git tag (e.g., `v1.2.1`)

### When you run `npm run build`:
- ✅ Runs ESLint
- ✅ Runs TypeScript compilation
- ✅ Builds production bundle
- ✅ Copies `main.js` and `manifest.json` to Obsidian plugins folder
- ✅ Plugin is immediately available in Obsidian

## ✓ Version Alignment Guarantee

All three locations will have the **same version**:
1. `package.json`
2. `manifest.json` (source)
3. `manifest.json` (deployed)

## 🚫 Don't Do This

- ❌ Don't manually edit version numbers
- ❌ Don't run `npm run build` before bumping version
- ❌ Don't commit without testing

## 📚 Full Documentation

See [docs/version-workflow.md](docs/version-workflow.md) for complete details.
