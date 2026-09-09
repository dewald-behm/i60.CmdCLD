import { describe, expect, it } from 'vitest'
import { DEFAULT_PTY_SIZE, resolvePtySpawnSize } from '../src/main/pty-create-validation'

describe('resolvePtySpawnSize', () => {
  it('uses the size the tile fitted to, so the agent never launches into an 80x24 pty inside a larger grid', () => {
    expect(resolvePtySpawnSize({ cols: 143, rows: 41 })).toEqual({ cols: 143, rows: 41 })
  })

  it('falls back to the default when no size is given (remote and reviewer callers)', () => {
    expect(resolvePtySpawnSize(undefined)).toEqual(DEFAULT_PTY_SIZE)
    expect(DEFAULT_PTY_SIZE).toEqual({ cols: 80, rows: 24 })
  })

  it('rejects sizes a fit could not have produced instead of spawning a degenerate pty', () => {
    expect(resolvePtySpawnSize({ cols: 0, rows: 24 })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize({ cols: 80, rows: -1 })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize({ cols: Number.NaN, rows: 24 })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize({ cols: 80.5, rows: 24 })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize({ cols: 100000, rows: 24 })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize({ cols: '120', rows: 30 } as unknown as { cols: number; rows: number })).toEqual(DEFAULT_PTY_SIZE)
    expect(resolvePtySpawnSize(null as unknown as undefined)).toEqual(DEFAULT_PTY_SIZE)
  })
})
