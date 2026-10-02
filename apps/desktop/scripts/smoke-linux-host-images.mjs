/** Verify Linux's selected Host runtime through the real, built attachment pipeline. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { desktopHostRuntime } from '../lib/types/host-node.js'

assert.equal(process.platform, 'linux', 'This smoke owns the Linux Host runtime')
if (process.argv[2] !== '--child') {
  const [primaryRuntime, runtimeDir] = process.argv.slice(2)
  assert(primaryRuntime && runtimeDir, 'Pass primary-runtime and prepared DSH project directories')
  const { node } = desktopHostRuntime('linux', process.execPath, '', primaryRuntime)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const child = spawnSync(node, [fileURLToPath(import.meta.url), '--child', runtimeDir], {
    env, encoding: 'utf8', timeout: 30_000,
  })
  assert.ifError(child.error)
  assert.equal(child.signal, null, child.stderr)
  assert.equal(child.status, 0, child.stderr)
  process.stdout.write(child.stdout)
} else {
  assert.equal(process.versions.electron, undefined)
  assert.equal(process.env.ELECTRON_RUN_AS_NODE, undefined)
  const requireRuntime = createRequire(join(process.argv[3], 'package.json'))
  const sharp = requireRuntime('sharp')
  const { saveImageFile, readImageFile, readRequestImageFile } = await import(
    pathToFileURL(requireRuntime.resolve('@deepseek-ai/dsh-attachment-local')).href
  )
  const scratch = await mkdtemp(join(tmpdir(), 'dsh-linux-host-images-'))
  try {
    const attachmentRoot = join(scratch, 'attachments', 'v1')
    const data = await sharp({ create: { width: 64, height: 32, channels: 3, background: 'white' } }).png().toBuffer()
    const limits = {
      maxImageBytes: 1024 * 1024, maxImagesPerMessage: 2, maxMessageImageBytes: 2 * 1024 * 1024,
      maxImagePixels: 1_000_000, maxImageDimension: 2000, mediaTypes: ['image/png'],
    }
    const policy = { maxPixels: 512, maxDimension: 32, maxBytes: 1024 * 1024 }
    for (let i = 0; i < 3; i++) {
      const ref = await saveImageFile(attachmentRoot, { data, mediaType: 'image/png', name: 'fixture.png' }, limits, policy)
      const stored = await readImageFile(attachmentRoot, ref)
      assert.equal(stored.ref.width, 32)
      assert.equal(stored.ref.height, 16)
      const variant = await readRequestImageFile(attachmentRoot, stored, {
        width: 16, height: 8, maxBytes: 1024 * 1024,
      })
      assert(variant.data.byteLength > 0)
    }
    // Prove package scripts find the selected Node without Electron launchers.
    await writeFile(join(scratch, 'package.json'), JSON.stringify({
      name: 'linux-host-package-smoke', private: true, scripts: { check: 'node check.cjs' },
    }))
    await writeFile(join(scratch, 'check.cjs'), "if(process.versions.electron)process.exit(1);console.log('plain Node package script ok')")
    const pnpm = join(process.argv[3], 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
    const check = spawnSync(process.execPath, [pnpm, '--config.verify-deps-before-run=false', 'run', 'check'], {
      cwd: scratch, env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}` },
      encoding: 'utf8', timeout: 15_000,
    })
    assert.ifError(check.error)
    assert.equal(check.status, 0, check.stderr)
    console.log(`PASS: standalone Node ${process.versions.node}; attachment save/read/resize x3; package script`)
  } finally { await rm(scratch, { recursive: true, force: true }) }
}
