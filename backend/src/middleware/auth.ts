import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// No fallback: a default secret lives in a public repo, so anyone could mint tokens (any role).
// Throwing at import stops the process before it can listen.
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set; refusing to start. Set it to a long random string (e.g. in backend/.env).')
  }
  return secret
}

const JWT_SECRET = requireJwtSecret()

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string; role: string }
}

export function generateToken(user: { id: number; email: string; name: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Vui long dang nhap' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token het han, vui long dang nhap lai' })
  }
}

// Use after authMiddleware. The role comes from the signed token, so it only changes on next login.
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Chi admin moi co quyen truy cap' })
  next()
}
