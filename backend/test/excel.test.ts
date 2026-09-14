import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  setupWorkspace,
  installStubPython,
  startServer,
  assertDownloadIsConfined,
  assertDownloadServesOutputFile,
} from './helpers.js'

const workspace = setupWorkspace()
const stubResult = { file_path: '/stub/out/budget_abc123.xlsx', file_size: 42 }
installStubPython(workspace, stubResult)
const { default: excelRouter } = await import('../src/routes/excel.js')
const server = await startServer('/api/excel', excelRouter)
after(() => server.close())

const TEMPLATES = ['invoice', 'budget', 'employee', 'inventory'] // excel_builder.py TEMPLATES
const expectedSuccess = { success: true, ...stubResult, downloadUrl: '/api/excel/download/budget_abc123.xlsx' }

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json() }
}

test('generate: shell payload in template is rejected with 400 and never executed', async () => {
  const s = path.join(workspace, 'pwned-template')
  const payloads = [`invoice$(touch ${s})`, `invoice"; touch ${s}; echo "`, `invoice\`touch ${s}\``]
  for (const template of payloads) {
    const res = await postJson(`${server.baseUrl}/generate`, { template })
    assert.equal(fs.existsSync(s), false, `payload executed: ${template}`)
    assert.equal(res.status, 400)
    assert.equal(typeof res.body.error, 'string')
  }
})

test('generate: template outside the allowlist is rejected with 400', async () => {
  for (const template of ['../../evil', 'unknown', ['invoice'], 42]) {
    const res = await postJson(`${server.baseUrl}/generate`, { template })
    assert.equal(res.status, 400, JSON.stringify(template))
    assert.equal(typeof res.body.error, 'string')
  }
})

test('generate: every allowlisted template keeps the success shape', async () => {
  for (const template of TEMPLATES) {
    const res = await postJson(`${server.baseUrl}/generate`, { template })
    assert.equal(res.status, 200, template)
    assert.deepEqual(res.body, expectedSuccess)
  }
})

test('download: filename that escapes outputs/excel is rejected with 400 and nothing is served', async () => {
  await assertDownloadIsConfined(`${server.baseUrl}/download`, workspace, path.join(workspace, 'outputs', 'excel'))
})

test('download: generated file is still served', async () => {
  await assertDownloadServesOutputFile(`${server.baseUrl}/download`, path.join(workspace, 'outputs', 'excel'))
})

test('from-data: valid request keeps the success shape', async () => {
  const res = await postJson(`${server.baseUrl}/from-data`, { title: 'T', columns: [{ name: 'A' }], data: [[1]] })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, expectedSuccess)
})
