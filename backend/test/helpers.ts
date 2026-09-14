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
