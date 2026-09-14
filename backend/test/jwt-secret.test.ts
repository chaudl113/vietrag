import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { backendDir } from './helpers.js'

// Boots the real entrypoint (src/index.ts) in a child process with a clean environment,
// so nothing from the developer's shell or backend/.env leaks in.
const tsxBin = path.join(backendDir, 'node_modules', '.bin', 'tsx')
const entry = path.join(backendDir, 'src', 'index.ts')
const OPENAI_KEY_SENTINEL = 'sk-test-must-never-be-printed-5b1f'
const READY = 'VietRAG backend server running'

type Boot = { code: number | null; listening: boolean; output: string }

function boot(extraEnv: Record<string, string>, dotenvFile?: string): Promise<Boot> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vietrag-boot-'))
  if (dotenvFile !== undefined) fs.writeFileSync(path.join(cwd, '.env'), dotenvFile)
  const env = {
    PATH: process.env.PATH ?? '',
    PORT: '0',
    // Closed local port: ES init fails fast and index.ts continues without it.
    ELASTICSEARCH_URL: 'http://127.0.0.1:9',
    // Present only so services/openai.ts can construct its client; no request is made at boot.
    OPENAI_API_KEY: OPENAI_KEY_SENTINEL,
    OPENAI_BASE_URL: 'http://127.0.0.1:9/',
    ...extraEnv,
  }
  return new Promise((resolve) => {
    const child = spawn(tsxBin, [entry], { cwd, env })
    let output = ''
    let listening = false
    const onData = (d: Buffer) => {
      output += d.toString()
      if (!listening && output.includes(READY)) {
        listening = true
        child.kill('SIGTERM')
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000)
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve({ code, listening, output })
    })
  })
}

function assertRefusedToStart(r: Boot) {
  assert.equal(r.listening, false, `server started without a JWT secret:\n${r.output}`)
  assert.notEqual(r.code, 0, `expected non-zero exit, got ${r.code}:\n${r.output}`)
  assert.match(r.output, /JWT_SECRET/, 'error must name the missing variable')
  assert.ok(!r.output.includes(OPENAI_KEY_SENTINEL), 'output leaked a secret value')
}

test('refuses to start when JWT_SECRET is not set', async () => {
  assertRefusedToStart(await boot({}))
})

test('refuses to start when JWT_SECRET is empty', async () => {
  assertRefusedToStart(await boot({ JWT_SECRET: '' }))
})

test('starts when JWT_SECRET is set in the environment', async () => {
  const r = await boot({ JWT_SECRET: 'boot-test-secret' })
  assert.equal(r.listening, true, r.output)
})

test('starts when JWT_SECRET comes from .env in the working directory', async () => {
  const r = await boot({}, 'JWT_SECRET=boot-test-secret-from-dotenv\n')
  assert.equal(r.listening, true, r.output)
})
