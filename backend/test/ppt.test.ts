import { test, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { setupWorkspace, installStubPython, startServer } from './helpers.js'

const workspace = setupWorkspace()
const stubResult = {
  file_path: '/stub/out/deck_abc123.pptx',
  file_name: 'deck.pptx',
  file_size: 123,
  slide_count: 5,
  title: 'Deck',
  theme: 'professional',
}
const argvLog = installStubPython(workspace, stubResult)
const { default: pptRouter } = await import('../src/routes/ppt.js')
const server = await startServer('/api/ppt', pptRouter)
after(() => server.close())

const THEMES = ['professional', 'dark', 'creative', 'minimal'] // pptx_builder.py THEMES
const LANGUAGES = ['vi', 'en'] // slide_planner.py default 'vi', branches on 'en'
const longText = 'Noi dung du dai de vuot nguong toi thieu nam muoi ky tu cua route from-text.'
const expectedSuccess = { success: true, ...stubResult, downloadUrl: '/api/ppt/download/deck_abc123.pptx' }

let counter = 0
function sentinel(): string {
  const p = path.join(workspace, `pwned-${++counter}`)
  assert.equal(fs.existsSync(p), false)
  return p
}

/** Shell payloads that create `file` if they ever reach /bin/sh. */
function shellPayloads(prefix: string, file: string): string[] {
  return [`${prefix}$(touch ${file})`, `${prefix}"; touch ${file}; echo "`, `${prefix}\`touch ${file}\``]
}

function readArgv(): string[] {
  return fs.readFileSync(argvLog, 'utf-8').split('\n')
}

function hasArg(argv: string[], flag: string, value: string): boolean {
  return argv.includes(`${flag}=${value}`) || argv.some((a, i) => a === flag && argv[i + 1] === value)
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json() }
}

async function postUpload(fields: Record<string, string>) {
  const form = new FormData()
  form.append('file', new Blob([longText], { type: 'text/plain' }), 'doc.txt')
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  const res = await fetch(`${server.baseUrl}/generate`, { method: 'POST', body: form })
  return { status: res.status, body: await res.json() }
}

beforeEach(() => fs.rmSync(argvLog, { force: true }))

test('from-text: shell payload in theme is rejected with 400 and never executed', async () => {
  for (const s of [sentinel(), sentinel(), sentinel()]) {
    for (const theme of shellPayloads('professional', s)) {
      const res = await postJson(`${server.baseUrl}/from-text`, { text: longText, theme })
      assert.equal(fs.existsSync(s), false, `payload executed: ${theme}`)
      assert.equal(res.status, 400)
      assert.equal(typeof res.body.error, 'string')
    }
  }
})

test('from-text: shell payload in language is rejected with 400 and never executed', async () => {
  const s = sentinel()
  for (const language of shellPayloads('vi', s)) {
    const res = await postJson(`${server.baseUrl}/from-text`, { text: longText, language })
    assert.equal(fs.existsSync(s), false, `payload executed: ${language}`)
    assert.equal(res.status, 400)
    assert.equal(typeof res.body.error, 'string')
  }
})

test('from-text: non-string theme/language are rejected with 400', async () => {
  for (const body of [{ theme: ['dark'] }, { language: ['en'] }, { theme: { x: 1 } }]) {
    const res = await postJson(`${server.baseUrl}/from-text`, { text: longText, ...body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(typeof res.body.error, 'string')
  }
})

test('from-text: title reaches python as one literal argument, not through a shell', async () => {
  const s = sentinel()
  for (const title of shellPayloads('Tieu de ', s)) {
    const res = await postJson(`${server.baseUrl}/from-text`, { text: longText, title })
    assert.equal(fs.existsSync(s), false, `payload executed: ${title}`)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, expectedSuccess)
    assert.ok(hasArg(readArgv(), '--title', title), `title not passed literally: ${readArgv().join(' | ')}`)
  }
})

test('from-text: every allowlisted theme and language is accepted and forwarded', async () => {
  for (const theme of THEMES) {
    for (const language of LANGUAGES) {
      const res = await postJson(`${server.baseUrl}/from-text`, { text: longText, title: 'T', theme, language })
      assert.equal(res.status, 200, `${theme}/${language}`)
      assert.deepEqual(res.body, expectedSuccess)
      const argv = readArgv()
      assert.ok(hasArg(argv, '--theme', theme) && hasArg(argv, '--language', language), argv.join(' | '))
    }
  }
})

test('from-text: omitted theme/language default to professional/vi', async () => {
  const res = await postJson(`${server.baseUrl}/from-text`, { text: longText })
  assert.equal(res.status, 200)
  const argv = readArgv()
  assert.ok(hasArg(argv, '--theme', 'professional') && hasArg(argv, '--language', 'vi'), argv.join(' | '))
})

test('generate (upload): shell payload in theme/language is rejected with 400 and never executed', async () => {
  const s = sentinel()
  for (const fields of [...shellPayloads('dark', s).map((theme) => ({ theme })), ...shellPayloads('en', s).map((language) => ({ language }))]) {
    const res = await postUpload(fields)
    assert.equal(fs.existsSync(s), false, `payload executed: ${JSON.stringify(fields)}`)
    assert.equal(res.status, 400)
    assert.equal(typeof res.body.error, 'string')
  }
})

test('generate (upload): valid request keeps the success shape', async () => {
  const res = await postUpload({ theme: 'creative', language: 'en' })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, expectedSuccess)
  const argv = readArgv()
  assert.ok(hasArg(argv, '--theme', 'creative') && hasArg(argv, '--language', 'en'), argv.join(' | '))
})
