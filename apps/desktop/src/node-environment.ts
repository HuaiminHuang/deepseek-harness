/** Electron Node-mode startup, with private shell launchers scoped to package installation. */

import { delimiter } from 'node:path'

/**
 * Select Electron's Node mode and the shell launcher used by package scripts.
 * @param executable - Selected Host executable.
 * @param bin - Directory containing Node or the Electron node shell launcher.
 * @param environment - Caller environment preserved for plugin execution.
 * @param electronNodeMode - False when the selected executable is standalone Node.
 * @returns Environment for a Node-mode child process.
 */
export function desktopNodeEnvironment(
  executable: string, bin: string | undefined, environment: NodeJS.ProcessEnv,
  electronNodeMode = true,
): NodeJS.ProcessEnv {
  const inherited = { ...environment }
  delete inherited.ELECTRON_RUN_AS_NODE
  return {
    ...inherited,
    ...electronNodeMode ? { ELECTRON_RUN_AS_NODE: '1' } : {},
    ...(bin === undefined ? {} : { DSH_DESKTOP_NODE_EXECUTABLE: executable, PATH: `${bin}${delimiter}${environment.PATH ?? ''}` }),
  }
}
