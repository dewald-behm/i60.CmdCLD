import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { watchMinimizedActivity } from '../src/renderer/src/utils/minimized-activity'
import { isBusy, onActivityChange, onTerminalDataReceived, removeTerminalActivity } from '../src/renderer/src/utils/terminal-activity'

describe('watchMinimizedActivity', () => {
  it('subscribes to each minimised terminal and forwards its data as activity', () => {
    const subs = new Map<string, (data: string) => void>()
    const unsubscribed: string[] = []
    const subscribe = (id: string, cb: (data: string) => void) => { subs.set(id, cb); return () => { unsubscribed.push(id) } }
    const seen: string[] = []
    const dispose = watchMinimizedActivity(['a', 'b'], subscribe, (id) => seen.push(id))
    expect([...subs.keys()]).toEqual(['a', 'b'])
    subs.get('a')!('output')
    subs.get('b')!('more')
    subs.get('a')!('again')
    expect(seen).toEqual(['a', 'b', 'a'])
    dispose()
    expect(unsubscribed.sort()).toEqual(['a', 'b'])
  })

  it('does nothing for an empty set', () => {
    const subscribe = vi.fn()
    const dispose = watchMinimizedActivity([], subscribe, () => {})
    expect(subscribe).not.toHaveBeenCalled()
    dispose()
  })
})

describe('terminal-activity idle timer (what a minimised tile depends on)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { removeTerminalActivity('t'); vi.useRealTimers() })

  it('stays busy while data keeps arriving, idles 2 s after the last chunk', () => {
    const events: boolean[] = []
    const off = onActivityChange((id, busy) => { if (id === 't') events.push(busy) })
    onTerminalDataReceived('t')
    vi.advanceTimersByTime(1500)
    onTerminalDataReceived('t')
    vi.advanceTimersByTime(1500)
    expect(isBusy('t')).toBe(true)
    vi.advanceTimersByTime(600)
    expect(isBusy('t')).toBe(false)
    expect(events).toEqual([true, false])
    off()
  })
})
