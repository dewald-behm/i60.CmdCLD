import { describe, expect, it } from 'vitest'
import { recoveryActionForInput, shouldReloadAfterRenderGone } from '../src/main/window-recovery'

const key = (over: Partial<Parameters<typeof recoveryActionForInput>[0]>) => ({
  type: 'keyDown',
  key: 'r',
  control: false,
  meta: false,
  shift: false,
  alt: false,
  ...over,
})

// These shortcuts are handled in the main process from before-input-event, so they
// still work when the renderer's JS thread is pegged and no page-side handler runs.
describe('recoveryActionForInput', () => {
  it('reloads on Ctrl+Shift+R on Windows/Linux', () => {
    expect(recoveryActionForInput(key({ key: 'R', control: true, shift: true }), 'win32')).toBe('reload')
    expect(recoveryActionForInput(key({ key: 'r', control: true, shift: true }), 'linux')).toBe('reload')
  })

  it('reloads on Cmd+Shift+R on macOS, not Ctrl', () => {
    expect(recoveryActionForInput(key({ key: 'R', meta: true, shift: true }), 'darwin')).toBe('reload')
    expect(recoveryActionForInput(key({ key: 'R', control: true, shift: true }), 'darwin')).toBeNull()
  })

  it('opens devtools on Mod+Shift+I', () => {
    expect(recoveryActionForInput(key({ key: 'I', control: true, shift: true }), 'win32')).toBe('devtools')
    expect(recoveryActionForInput(key({ key: 'i', meta: true, shift: true }), 'darwin')).toBe('devtools')
  })

  // Plain Ctrl+R is reverse-search in every shell and must reach the PTY untouched.
  it('leaves Ctrl+R without Shift alone', () => {
    expect(recoveryActionForInput(key({ key: 'r', control: true }), 'win32')).toBeNull()
  })

  it('ignores key-up and Alt-modified chords', () => {
    expect(recoveryActionForInput(key({ type: 'keyUp', key: 'R', control: true, shift: true }), 'win32')).toBeNull()
    expect(recoveryActionForInput(key({ key: 'R', control: true, shift: true, alt: true }), 'win32')).toBeNull()
  })
})

describe('shouldReloadAfterRenderGone', () => {
  it('reloads after a crash, OOM, or an external kill', () => {
    expect(shouldReloadAfterRenderGone('crashed')).toBe(true)
    expect(shouldReloadAfterRenderGone('oom')).toBe(true)
    expect(shouldReloadAfterRenderGone('killed')).toBe(true)
  })

  it('does not reload a renderer that exited cleanly', () => {
    expect(shouldReloadAfterRenderGone('clean-exit')).toBe(false)
  })
})
