/**
 * The rows of the logical line that contains `row`, or null when it is too long
 * to be worth reassembling.
 *
 * Two bounds, both load-bearing:
 *
 * 1. Never ask for a row at or beyond `buffer.length`. xterm's CircularList has no
 *    bounds check — `getLine(length)` silently wraps to row 0 — so a walk that only
 *    stops at a non-wrapped row cycles through the ring forever when every row is a
 *    continuation. A full-screen TUI (OpenCode) paints every row full width in the
 *    alternate buffer, which is exactly that shape. Hovering such a tile pegged the
 *    renderer for hours; the stack was this walk, inside xterm's hover handler.
 * 2. Stop counting at `maxRows`. A logical line spanning that many rows is a dump
 *    (minified JSON, a token blob), not something with a clickable path a human
 *    wants, and scanning it on every hover is what froze the renderer before.
 */
export interface LineLike { isWrapped: boolean }
export interface BufferLike { length: number; getLine(y: number): LineLike | undefined }

export function logicalLineBounds(
  buffer: BufferLike,
  row: number,
  maxRows: number,
): { first: number; last: number } | null {
  const length = buffer.length
  if (row < 0 || row >= length) return null
  let first = row
  let last = row
  let rows = 1
  while (first > 0 && buffer.getLine(first)?.isWrapped) {
    first--
    if (++rows > maxRows) return null
  }
  while (last + 1 < length && buffer.getLine(last + 1)?.isWrapped) {
    last++
    if (++rows > maxRows) return null
  }
  return { first, last }
}
