import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { setupWorkspace, startServer } from './helpers.js'

setupWorkspace()
const { default: db } = await import('../src/services/db.js')
const { generateToken } = await import('../src/middleware/auth.js')
const { default: authRouter } = await import('../src/routes/auth.js')
const server = await startServer('/api/auth', authRouter)
after(() => server.close())

function insertUser(email: string, role: string) {
  const r = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(email, 'x', email, role)
  return { id: Number(r.lastInsertRowid), email, name: email, role }
}

const admin = insertUser('admin@example.test', 'admin')
const member = insertUser('member@example.test', 'user')

async function getUsers(authorization?: string) {
  const res = await fetch(`${server.baseUrl}/users`, { headers: authorization ? { authorization } : {} })
  return { status: res.status, body: await res.json() }
}

test('GET /users without a token is still 401', async () => {
  const res = await getUsers()
  assert.equal(res.status, 401)
  assert.equal(typeof res.body.error, 'string')
})

test('GET /users with a token signed by another key is still 401', async () => {
  const forged = jwt.sign({ ...admin }, 'not-the-server-secret')
  const res = await getUsers(`Bearer ${forged}`)
  assert.equal(res.status, 401)
})

test('GET /users as a non-admin is 403 and lists nobody', async () => {
  const res = await getUsers(`Bearer ${generateToken(member)}`)
  assert.equal(res.status, 403)
  assert.equal(typeof res.body.error, 'string')
  assert.equal(res.body.users, undefined)
})

test('GET /users as a freshly registered user is 403', async () => {
  const reg = await fetch(`${server.baseUrl}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'new@example.test', password: 'secret123', name: 'New' }),
  })
  const { token } = await reg.json()
  const res = await getUsers(`Bearer ${token}`)
  assert.equal(res.status, 403)
  assert.equal(res.body.users, undefined)
})

test('GET /users as admin returns the user list as before', async () => {
  const res = await getUsers(`Bearer ${generateToken(admin)}`)
  assert.equal(res.status, 200)
  assert.deepEqual(Object.keys(res.body), ['users'])
  const emails = res.body.users.map((u: { email: string }) => u.email)
  assert.ok(emails.includes(admin.email) && emails.includes(member.email))
  for (const u of res.body.users) {
    assert.deepEqual(Object.keys(u).sort(), ['created_at', 'email', 'id', 'name', 'role'])
  }
})
