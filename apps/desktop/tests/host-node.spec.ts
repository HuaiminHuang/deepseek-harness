import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { desktopHostRuntime } from '../src/host-node.ts'

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

it('uses the prepared standalone Node and its real bin directory on Linux', () => {
  const root = mkdtempSync(join(tmpdir(), 'desktop-host-node-'))
  roots.push(root)
  const node = join(root, 'dependencies', 'node', 'bin', 'node')
  mkdirSync(dirname(node), { recursive: true })
  writeFileSync(node, '')
  chmodSync(node, 0o755)
  expect(desktopHostRuntime('linux', '/electron', '/electron-bin', root)).toEqual({ node, nodeBin: dirname(node) })
  rmSync(node)
  expect(() => desktopHostRuntime('linux', '/electron', '/electron-bin', root)).toThrow()
})

it.each(['darwin', 'win32'] as const)('retains Electron on %s without needing a standalone payload', (platform) => {
  expect(desktopHostRuntime(platform, '/electron', '/electron-bin', '/missing')).toEqual({
    node: '/electron', nodeBin: '/electron-bin',
  })
})
