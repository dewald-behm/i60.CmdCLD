/**
 * Rewrites the download table in README.md for the version in package.json.
 *
 * Release assets carry the version in their file names (see `build.*.artifactName` in
 * package.json), so a README link is only right for one release. Rather than hand-edit
 * it each time, `npm version` runs this from its `version` lifecycle hook — after the
 * bump, before the release commit — so every `chore(release)` commit carries links to
 * the installers that tag will produce. `npm run version:check` fails if they drift.
 *
 * Only the block between the two marker comments is replaced; prose around it is yours.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version
const { owner, repo } = pkg.build.publish[0]

const START = '<!-- downloads:start -->'
const END = '<!-- downloads:end -->'

function renderDownloads() {
  const releases = `https://github.com/${owner}/${repo}/releases`
  const base = `${releases}/download/v${version}`
  const link = (file) => `[\`${file}\`](${base}/${file})`
  return [
    `Current release: **v${version}** ([release notes](${releases}/tag/v${version}) · [all releases](${releases}))`,
    '',
    '| Operating system | CPU | Download | Notes |',
    '| --- | --- | --- | --- |',
    `| Windows 10 / 11 | x64 (Intel / AMD 64-bit) | ${link(`CmdCLD-Setup-${version}.exe`)} | One-click installer, per-user (no admin rights needed). Runs under emulation on ARM PCs. |`,
    `| macOS | Apple Silicon (M1, M2, M3, M4…) | ${link(`CmdCLD-${version}-arm64.dmg`)} | About This Mac shows **Chip: Apple M…** |`,
    `| macOS | Intel | ${link(`CmdCLD-${version}-x64.dmg`)} | About This Mac shows **Processor: Intel…** |`,
    `| Linux | x86_64 | ${link(`CmdCLD-${version}.AppImage`)} | \`chmod +x\` the file and run it; no install step. |`,
  ].join('\n')
}

const readmePath = join(root, 'README.md')
const readme = readFileSync(readmePath, 'utf8')
const start = readme.indexOf(START)
const end = readme.indexOf(END)
if (start === -1 || end === -1 || end < start) {
  console.error(`README.md is missing the ${START} / ${END} markers`)
  process.exit(1)
}
const eol = readme.includes('\r\n') ? '\r\n' : '\n'
const block = renderDownloads().replace(/\n/g, eol)
const next = readme.slice(0, start + START.length) + eol + block + eol + readme.slice(end)
if (next !== readme) {
  writeFileSync(readmePath, next)
  console.log(`README.md download links updated to v${version}`)
} else {
  console.log(`README.md download links already at v${version}`)
}
