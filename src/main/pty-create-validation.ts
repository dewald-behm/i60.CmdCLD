import { existsSync, statSync } from 'fs'

export interface PtyCreateRequest {
  id: string
  cwd: string
  /** Whether the invoking event resolved to a live window + webContents. */
  hasWindow: boolean
  /** Whether a terminal already exists under this id. */
  idInUse: boolean
}

/** Check a pty:create request. Returns null when it may proceed, otherwise a
 *  message explaining the refusal.
 *
 *  These used to be bare `return`s in the IPC handler, which resolved the
 *  invoke with undefined: the renderer's .catch() never fired and the tile sat
 *  there blank with no way to tell why. Every rejection now carries a reason
 *  the renderer can print into the terminal.
 */
export function validatePtyCreate(req: PtyCreateRequest): string | null {
  if (!req.hasWindow) return 'No owning window for this request.'
  if (req.idInUse) return `Terminal "${req.id}" already exists.`
  if (!req.cwd) return 'No folder given for this terminal.'
  try {
    if (!existsSync(req.cwd)) return `Folder not found: ${req.cwd}`
    if (!statSync(req.cwd).isDirectory()) return `Not a folder: ${req.cwd}`
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `Cannot open folder ${req.cwd}: ${msg}`
  }
  return null
}

export interface PtySize {
  cols: number
  rows: number
}

/** What a pty spawns at when the caller has no fitted grid to report
 *  (remote sessions, the Autopilot reviewer terminal). */
export const DEFAULT_PTY_SIZE: Readonly<PtySize> = Object.freeze({ cols: 80, rows: 24 })

// Beyond this a fit is not something a tile produced; treat it as garbage.
const MAX_PTY_DIM = 10000

/** The size a new pty should spawn at.
 *
 *  The renderer fits its xterm to the tile before asking for a pty, so it
 *  knows the real cols/rows up front. Spawning at those dims matters: the pty
 *  used to spawn at 80x24 and rely on the tile's ResizeObserver to correct it,
 *  but that observer fires ~100 ms after mount while the spawn itself (ConPTY
 *  on Windows especially) can take longer — and a resize for a pty that does
 *  not exist yet is dropped. The agent then launched into an 80x24 pty inside
 *  a much larger grid, and its first repaints smeared across the tile.
 *
 *  Anything that is not a plausible fitted size falls back to the default. */
export function resolvePtySpawnSize(size: PtySize | undefined): PtySize {
  if (!size || typeof size !== 'object') return { ...DEFAULT_PTY_SIZE }
  const { cols, rows } = size
  const ok = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAX_PTY_DIM
  if (!ok(cols) || !ok(rows)) return { ...DEFAULT_PTY_SIZE }
  return { cols, rows }
}
