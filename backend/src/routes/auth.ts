import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../services/db.js'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Vui long dien day du thong tin' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mat khau toi thieu 6 ky tu' })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return res.status(400).json({ error: 'Email da ton tai' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const result = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email, hashed, name)

    const user = { id: result.lastInsertRowid as number, email, name, role: 'user' }
    const token = generateToken(user)

    return res.json({ success: true, token, user: { id: user.id, email, name, role: 'user' } })
  } catch (err: any) {
    return res.status(500).json({ error: 'Loi dang ky', details: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui long nhap email va mat khau' })
    }

    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return res.status(401).json({ error: 'Email hoac mat khau khong dung' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Email hoac mat khau khong dung' })
    }

    const tokenUser = { id: user.id, email: user.email, name: user.name, role: user.role }
    const token = generateToken(tokenUser)

    return res.json({ success: true, token, user: tokenUser })
  } catch (err: any) {
    return res.status(500).json({ error: 'Loi dang nhap', details: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user })
})

// GET /api/auth/users (admin only)
router.get('/users', authMiddleware, (req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users').all()
  return res.json({ users })
})

export default router
