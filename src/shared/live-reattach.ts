/**
 * Rebuilding terminal tiles from the PTYs main already holds.
 *
 * The tile list lives only in renderer memory, so a reload (recovery hotkey, crash
 * recovery, DevTools reload) would otherwise come back to an empty grid while the
 * agents keep running headless in main. Restoring from the last-session file is the
 * wrong answer there: it mints fresh ids, so every tile would create a second PTY and
 * launch a second agent beside the first. Reusing main's ids sends TerminalPanel down
 * its remount path instead — `pty:exists` says yes, scrollback is replayed, nothing
 * is launched.
 */
import { AGENT_CLIS, normalizeAgentCli, type AgentCli } from './agent-cli'

/** What main reports for each live PTY (see TerminalMeta in pty-manager). */
export interface LiveSession {
  id: string
  path: string
  name: string
  color: string
  agentCli?: AgentCli
  launchArgs?: string
}

export interface ReattachedTerminal {
  id: string
  path: string
  name: string
  color: string
  agentCli: AgentCli
  claudeArgs: string
  codexArgs: string
  grokArgs: string
  opencodeArgs: string
}

export function terminalsFromLiveSessions(
  live: LiveSession[],
  pickColor: (used: string[]) => string,
): ReattachedTerminal[] {
  const used = live.map((s) => s.color).filter((c) => c !== '')
  return live.map((s) => {
    const agentCli = normalizeAgentCli(s.agentCli)
    let color = s.color
    if (color === '') {
      color = pickColor(used)
      used.push(color)
    }
    const args = Object.fromEntries(
      AGENT_CLIS.map((cli) => [`${cli}Args`, cli === agentCli ? (s.launchArgs ?? '') : '']),
    ) as Pick<ReattachedTerminal, 'claudeArgs' | 'codexArgs' | 'grokArgs' | 'opencodeArgs'>
    return { id: s.id, path: s.path, name: s.name, color, agentCli, ...args }
  })
}
