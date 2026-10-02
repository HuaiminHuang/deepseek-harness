/** Select the Host executable without loading Linux image libraries into Electron. */
import { accessSync, constants } from 'node:fs'
import { dirname, join } from 'node:path'

/** Linux uses the prepared Node payload; other platforms retain Electron Node mode. */
export function desktopHostRuntime(
  platform: NodeJS.Platform,
  electron: string,
  electronNodeBin: string,
  primaryRuntime: string,
): { node: string; nodeBin: string } {
  if (platform !== 'linux') return { node: electron, nodeBin: electronNodeBin }
  const node = join(primaryRuntime, 'dependencies', 'node', 'bin', 'node')
  // A missing payload must fail startup rather than fall back to the crashing runtime.
  accessSync(node, constants.X_OK)
  return { node, nodeBin: dirname(node) }
}
