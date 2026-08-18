import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

// Build identity, baked in at compile time so About can say exactly what is
// running - six identical-looking installers in one evening taught us that a
// version number alone does not answer "which build is this".
function gitDescribe(): string {
  try {
    const commit = execSync('git rev-parse --short HEAD').toString().trim()
    const dirty = execSync('git status --porcelain').toString().trim() ? '+dirty' : ''
    return commit + dirty
  } catch {
    return 'unknown'
  }
}
const BUILD_DEFINES = {
  __BUILD_COMMIT__: JSON.stringify(gitDescribe()),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z'),
}

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function copyRemoteUi() {
  return {
    name: 'copy-remote-ui',
    closeBundle() {
      const src = join(__dirname, 'src/remote-ui')
      const dest = join(__dirname, 'out/remote-ui')
      copyDir(src, dest)

      // Bundle xterm vendor files so remote UI works in production
      const xtermPkg = join(__dirname, 'node_modules/@xterm/xterm')
      const fitPkg = join(__dirname, 'node_modules/@xterm/addon-fit')

      const xtermCssDest = join(dest, 'vendor/xterm/css')
      const xtermLibDest = join(dest, 'vendor/xterm/lib')
      const fitLibDest = join(dest, 'vendor/xterm-addon-fit/lib')

      mkdirSync(xtermCssDest, { recursive: true })
      mkdirSync(xtermLibDest, { recursive: true })
      mkdirSync(fitLibDest, { recursive: true })

      copyFileSync(join(xtermPkg, 'css/xterm.css'), join(xtermCssDest, 'xterm.css'))
      copyFileSync(join(xtermPkg, 'lib/xterm.js'), join(xtermLibDest, 'xterm.js'))
      copyFileSync(join(fitPkg, 'lib/addon-fit.js'), join(fitLibDest, 'xterm-addon-fit.js'))
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyRemoteUi()],
    define: BUILD_DEFINES,
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()]
  }
})
