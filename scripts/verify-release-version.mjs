import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const packageLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
const expectedVersion = packageJson.version

const failures = []

if (packageLock.version !== expectedVersion) {
  failures.push(`package-lock.json version is ${packageLock.version}, expected ${expectedVersion}`)
}

const rootPackage = packageLock.packages?.['']
if (rootPackage?.version !== expectedVersion) {
  failures.push(`package-lock.json root package version is ${rootPackage?.version}, expected ${expectedVersion}`)
}

// The README download table is generated per release (scripts/update-readme-downloads.mjs,
// run from the `version` lifecycle hook). A stale table links to installers that exist
// for the previous tag only, so it counts as a version mismatch.
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const readmeBlock = readme.slice(readme.indexOf('<!-- downloads:start -->'), readme.indexOf('<!-- downloads:end -->'))
const readmeVersions = [...new Set([...readmeBlock.matchAll(/releases\/download\/v([0-9]+\.[0-9]+\.[0-9]+)\//g)].map((m) => m[1]))]
if (readmeVersions.length !== 1 || readmeVersions[0] !== expectedVersion) {
  failures.push(`README.md download links point at ${readmeVersions.join(', ') || 'nothing'}, expected v${expectedVersion} (run: node scripts/update-readme-downloads.mjs)`)
}

const latestPath = join(root, 'dist', 'latest.yml')
if (existsSync(latestPath)) {
  const latest = readFileSync(latestPath, 'utf8')
  const match = latest.match(/^version:\s*['"]?([^'"\r\n]+)['"]?/m)
  const latestVersion = match?.[1]
  if (latestVersion !== expectedVersion) {
    failures.push(`dist/latest.yml version is ${latestVersion ?? 'missing'}, expected ${expectedVersion}`)
  }
}

if (failures.length > 0) {
  console.error(`Release version check failed for ${expectedVersion}:`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Release version check passed for ${expectedVersion}`)
