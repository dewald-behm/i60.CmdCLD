/**
 * Renderer recovery decisions, kept pure so they can be pinned by tests.
 *
 * Context: a frozen renderer (JS main thread pegged) leaves the window answering the OS
 * — Electron's main process owns the HWND — while nothing on the page responds. The
 * in-page keyboard handlers are useless in that state, and until now the only way out
 * was closing the window, which kills every PTY. Main can still see keystrokes through
 * `before-input-event`, and a `webContents.reload()` keeps the PTYs alive: they belong
 * to main and are only released by the window's close handler.
 */

export interface RecoveryInput {
  type: string
  key: string
  control: boolean
  meta: boolean
  shift: boolean
  alt: boolean
}

export type RecoveryAction = 'reload' | 'devtools'

/**
 * Mod+Shift+R reloads the page, Mod+Shift+I opens DevTools. Shift is mandatory: plain
 * Ctrl+R is reverse-search in every shell and has to reach the PTY untouched.
 */
export function recoveryActionForInput(input: RecoveryInput, platform: string): RecoveryAction | null {
  if (input.type !== 'keyDown' || input.alt || !input.shift) return null
  const mod = platform === 'darwin' ? input.meta && !input.control : input.control && !input.meta
  if (!mod) return null
  switch (input.key.toLowerCase()) {
    case 'r': return 'reload'
    case 'i': return 'devtools'
    default: return null
  }
}

/**
 * `render-process-gone` reasons worth recovering from. A clean exit is the page going
 * away on purpose (navigation, close); everything else — crash, OOM, a kill from Task
 * Manager — leaves a dead window over live PTYs.
 */
export function shouldReloadAfterRenderGone(reason: string): boolean {
  return reason !== 'clean-exit'
}

/**
 * Reload after the renderer is gone — but never from inside the event.
 *
 * `render-process-gone` fires while Chromium is still tearing the dead renderer down.
 * Calling `webContents.reload()` synchronously there took the whole browser process
 * with it: exit code 3, no `before-quit`, no log line, every PTY lost — the opposite of
 * what the recovery path exists for. Reproduced deterministically in a standalone
 * Electron 42 script; deferring the call by one tick is enough for the reload to run
 * and the page to come back. `defer` is injectable so the rule is pinned by a test.
 */
export function recoverAfterRenderGone(
  reason: string,
  reload: () => void,
  defer: (fn: () => void) => void = (fn) => setImmediate(fn),
): void {
  if (!shouldReloadAfterRenderGone(reason)) return
  defer(reload)
}
