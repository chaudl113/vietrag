import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { setupWorkspace, installRealPython, startServer } from './helpers.js'

const workspace = setupWorkspace()
installRealPython(workspace)

// Stand-in for services/ppt/document_extractor.py (the real one needs python-docx):
// logs the path it was asked to extract, so tests can see what python received.
const callsLog = path.join(workspace, 'extract-calls.log')
const extractorDir = path.join(workspace, 'src', 'services', 'ppt')
fs.mkdirSync(extractorDir, { recursive: true })
fs.writeFileSync(
  path.join(extractorDir, 'document_extractor.py'),
  [
    'class _Doc:',
    '    def to_markdown(self):',
    "        return 'stub'",
    'def extract_docx(p):',
    `    with open(${JSON.stringify(callsLog)}, 'a') as f:`,
    "        f.write(p + '\\n')",
    '    return _Doc()',
    '',
  ].join('\n'),
)

const { default: db } = await import('../src/services/db.js')
const { generateToken } = await import('../src/middleware/auth.js')
const { default: generateRouter } = await import('../src/routes/generate.js')
const server = await startServer('/api/generate', generateRouter)
after(() => server.close())

const token = generateToken({ id: 1, email: 'u@example.test', name: 'U', role: 'user' })
const templatesDir = path.join(workspace, 'uploads', 'templates')
fs.mkdirSync(templatesDir, { recursive: true })

/** A template row whose on-disk file name is attacker-shaped. */
function insertTemplate(fileName: string): { id: number; filePath: string } {
  const filePath = path.join(templatesDir, fileName)
  fs.writeFileSync(filePath, 'x')
  const r = db
    .prepare('INSERT INTO templates (name, file_path, file_type) VALUES (?, ?, ?)')
    .run('tpl', filePath, 'docx')
  return { id: Number(r.lastInsertRowid), filePath }
}

async function generateFrom(templateId: number) {
  // OPENAI_API_KEY is unset by setupWorkspace, so the request stops after template extraction.
  return fetch(`${server.baseUrl}/from-template`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ templateId, prompt: 'viet tai lieu' }),
  })
}

function extractCalls(): string[] {
  return fs.existsSync(callsLog) ? fs.readFileSync(callsLog, 'utf-8').split('\n').filter(Boolean) : []
}

test('from-template: plain .docx template path reaches the extractor unchanged', async () => {
  const { id, filePath } = insertTemplate('normal.docx')
  await generateFrom(id)
  assert.ok(extractCalls().includes(filePath), `extractor calls: ${extractCalls().join(' | ')}`)
})

test('from-template: shell metacharacters in template file_path are never executed', async () => {
  // Relative: a file name cannot contain '/'. The shell would run in the server cwd (workspace).
  const s = path.join(workspace, 'pwned-shell')
  const { id, filePath } = insertTemplate('tpl$(touch pwned-shell).docx')
  await generateFrom(id)
  assert.equal(fs.existsSync(s), false, 'shell payload executed')
  assert.ok(extractCalls().includes(filePath), `extractor calls: ${extractCalls().join(' | ')}`)
})

test('from-template: python quote break-out in template file_path is never executed', async () => {
  const s = path.join(workspace, 'pwned-py')
  const { id, filePath } = insertTemplate("tpl'+str(__import__('os').system('touch pwned-py'))+'.docx")
  await generateFrom(id)
  assert.equal(fs.existsSync(s), false, 'python payload executed')
  assert.ok(extractCalls().includes(filePath), `extractor calls: ${extractCalls().join(' | ')}`)
})
