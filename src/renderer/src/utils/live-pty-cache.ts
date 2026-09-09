/**
 * Which ptys this renderer believes are live. A cache, not the truth: pty lifetime
 * belongs to main, and TerminalPanel asks main (`pty:exists`) whenever the cache
 * says "not live". The dangerous direction is a stale "live": a mount that trusts
 * it skips the check, replays an empty scrollback and never launches anything.
 *
 * So a panel forgets its id on unmount. While a tile is minimised it has no panel,
 * hears neither data nor exit, and the agent may well have exited meanwhile.
 */
const live = new Set<string>()

export const livePtyCache = {
  add(id: string): void { live.add(id) },
  has(id: string): boolean { return live.has(id) },
  forget(id: string): void { live.delete(id) },
  clear(): void { live.clear() },
}
