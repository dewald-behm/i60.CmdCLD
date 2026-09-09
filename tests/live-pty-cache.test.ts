import { beforeEach, describe, expect, it } from 'vitest'
import { livePtyCache } from '../src/renderer/src/utils/live-pty-cache'

describe('livePtyCache', () => {
  beforeEach(() => livePtyCache.clear())

  it('remembers a pty this renderer created or reattached', () => {
    livePtyCache.add('x')
    expect(livePtyCache.has('x')).toBe(true)
  })

  it('forgets a pty when its panel unmounts, so a remount asks main instead of trusting a stale entry', () => {
    // A minimised tile has no panel, so it hears neither data nor exit. If the agent
    // exits meanwhile, the cache would still say "live" and restore would replay an
    // empty scrollback into a dead tile with no exit line and no relaunch.
    livePtyCache.add('x')
    livePtyCache.forget('x')
    expect(livePtyCache.has('x')).toBe(false)
  })

  it('forgetting an unknown id is a no-op', () => {
    expect(() => livePtyCache.forget('nope')).not.toThrow()
  })
})
