import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import express, { Router } from 'express'

export const backendDir = path.resolve(import.meta.dirname, '..')

/**
 * Create a throwaway workspace and chdir into it. Route modules resolve
 * outputs/, uploads/, data/ and .venv/ from process.cwd() at import time,
 * so this must run BEFORE they are imported (use dynamic import).
 * Each test file runs in its own process (node:test isolation), so the
 * chdir does not leak between files.
 */
export function setupWorkspace(): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vietrag-test-')))
  process.chdir(dir)
  process.env.JWT_SECRET = 'test-only-jwt-secret'
  // Never reach OpenAI from tests.
  delete process.env.OPENAI_API_KEY
  process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9/'
  return dir
}

/**
 * Fake `<workspace>/.venv/bin/python3`: records each argv entry on its own line
 * in `<workspace>/.venv/bin/python3.argv`, then prints `stdout`.
 */
export function installStubPython(workspace: string, stdout: object): string {
  const bin = path.join(workspace, '.venv', 'bin')
  fs.mkdirSync(bin, { recursive: true })
  const json = JSON.stringify(stdout)
  if (json.includes("'")) throw new Error('stub stdout must not contain single quotes')
  const script = `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a"; done > "$0.argv"\nprintf '%s' '${json}'\n`
  const file = path.join(bin, 'python3')
  fs.writeFileSync(file, script, { mode: 0o755 })
  return `${file}.argv`
}

/** Point `<workspace>/.venv/bin/python3` at the real python3 on PATH. */
export function installRealPython(workspace: string): void {
  const real = execFileSync('/bin/sh', ['-c', 'command -v python3'], { encoding: 'utf-8' }).trim()
  if (!real) throw new Error('python3 not found on PATH; required by this test')
  const bin = path.join(workspace, '.venv', 'bin')
  fs.mkdirSync(bin, { recursive: true })
  fs.symlinkSync(real, path.join(bin, 'python3'))
}

/**
 * GET `${downloadUrl}/<name>` must only ever serve files directly inside `outputDir`.
 * Plants files next to the output dir and at the workspace root, then tries to reach them.
 */
export async function assertDownloadIsConfined(downloadUrl: string, workspace: string, outputDir: string) {
  const sibling = path.join(path.dirname(outputDir), 'secret-sibling.txt')
  const root = path.join(workspace, 'secret-root.txt')
  fs.writeFileSync(sibling, 'SECRET-SIBLING')
  fs.writeFileSync(root, 'SECRET-ROOT')
  const attempts = [
    '..%2Fsecret-sibling.txt',
    '..%2F..%2Fsecret-root.txt',
    '%2E%2E%2F%2E%2E%2Fsecret-root.txt',
    `..%2F${path.basename(outputDir)}%2F..%2Fsecret-sibling.txt`,
    encodeURIComponent(root),
  ]
  for (const name of attempts) {
    const res = await fetch(`${downloadUrl}/${name}`)
    const text = await res.text()
    assert.ok(!text.includes('SECRET-'), `served a file outside outputDir for ${name}`)
    assert.equal(res.status, 400, name)
    assert.equal(typeof JSON.parse(text).error, 'string', name)
  }
}

/** A file inside `outputDir` is still downloadable, and a missing one is still 404. */
export async function assertDownloadServesOutputFile(downloadUrl: string, outputDir: string) {
  fs.writeFileSync(path.join(outputDir, 'result_ok123.bin'), 'OUTPUT-BYTES')
  const ok = await fetch(`${downloadUrl}/result_ok123.bin`)
  assert.equal(ok.status, 200)
  assert.equal(await ok.text(), 'OUTPUT-BYTES')
  const missing = await fetch(`${downloadUrl}/does_not_exist.bin`)
  assert.equal(missing.status, 404)
  assert.equal(typeof (await missing.json()).error, 'string')
}

/** Mount a router the same way src/index.ts does and listen on an ephemeral port. */
export async function startServer(mountPath: string, router: Router) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(mountPath, router)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${port}${mountPath}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
