import { describe, expect, it } from 'vitest'
import { logicalLineBounds } from '../src/renderer/src/utils/logical-line'

/** Mimics xterm's BufferApiView: `length` rows, and getLine() indexes the
 *  underlying CircularList cyclically — an index past the end wraps to the
 *  start instead of returning undefined. */
function cyclicBuffer(wrapped: boolean[]) {
  return {
    length: wrapped.length,
    getLine: (y: number) => ({ isWrapped: wrapped[((y % wrapped.length) + wrapped.length) % wrapped.length] }),
  }
}

describe('logicalLineBounds', () => {
  it('reassembles a wrapped line: back to its first row, forward over continuations', () => {
    const buf = cyclicBuffer([false, false, true, true, false, true])
    expect(logicalLineBounds(buf, 3, 64)).toEqual({ first: 1, last: 3 })
    expect(logicalLineBounds(buf, 0, 64)).toEqual({ first: 0, last: 0 })
    expect(logicalLineBounds(buf, 5, 64)).toEqual({ first: 4, last: 5 })
  })

  it('terminates when every row is a continuation (a full-screen TUI in the alt buffer)', () => {
    // xterm's CircularList.get has no bounds check, so a walk that keeps asking for
    // row length, length+1, … cycles through the ring forever if every row says
    // isWrapped. Hovering an OpenCode tile pegged the renderer for hours this way.
    const buf = cyclicBuffer(new Array(54).fill(true))
    let calls = 0
    const counting = { length: buf.length, getLine: (y: number) => { calls++; return buf.getLine(y) } }
    expect(logicalLineBounds(counting, 20, 64)).toEqual({ first: 0, last: 53 })
    expect(calls).toBeLessThan(200)
  })

  it('never asks for a row at or beyond buffer.length', () => {
    const asked: number[] = []
    const buf = { length: 4, getLine: (y: number) => { asked.push(y); return { isWrapped: true } } }
    logicalLineBounds(buf, 2, 64)
    expect(Math.max(...asked)).toBeLessThan(4)
    expect(Math.min(...asked)).toBeGreaterThanOrEqual(0)
  })

  it('gives up early on a dump longer than maxRows instead of walking it all', () => {
    const buf = cyclicBuffer([false, ...new Array(5000).fill(true)])
    let calls = 0
    const counting = { length: buf.length, getLine: (y: number) => { calls++; return buf.getLine(y) } }
    expect(logicalLineBounds(counting, 2500, 64)).toBeNull()
    expect(calls).toBeLessThanOrEqual(70)
  })
})
