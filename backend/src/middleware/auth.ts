import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'vietrag-secret-key-change-in-production'

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
