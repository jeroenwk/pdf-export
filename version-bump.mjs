import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

console.log(`[version-bump] Syncing version to ${targetVersion}`);

// Read minAppVersion from manifest.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
const oldVersion = manifest.version;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

console.log(`[version-bump] Updated manifest.json: ${oldVersion} → ${targetVersion}`);

// Update versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`[version-bump] Updated versions.json`);
console.log(`[version-bump] ✓ All versions synced to ${targetVersion}`);
