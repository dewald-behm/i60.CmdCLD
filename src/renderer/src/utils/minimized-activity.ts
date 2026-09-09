/**
 * Keeps busy/idle tracking alive for minimised terminals.
 *
 * TerminalPanel is what reports PTY data to the activity tracker, and minimising
 * unmounts the panel. Without this, every minimised tile went "idle" two seconds
 * after it left the grid, the taskbar chip switched to the finished-while-minimised
 * ring, and the promised busy pulse could never show — however hard the agent was
 * working. Main keeps sending the data events regardless; this just listens.
 */
export function watchMinimizedActivity(
  ids: Iterable<string>,
  subscribe: (id: string, cb: (data: string) => void) => () => void,
  onData: (id: string) => void,
): () => void {
  const unsubs: Array<() => void> = []
  for (const id of ids) unsubs.push(subscribe(id, () => onData(id)))
  return () => { for (const u of unsubs) u() }
}
