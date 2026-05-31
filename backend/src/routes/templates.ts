import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import db from '../services/db.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
const uploadDir = path.join(process.cwd(), 'uploads', 'templates')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4().replace(/-/g, '')}${path.extname(file.originalname)}`),
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md', '.pdf']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

// GET /api/templates - List all templates
router.get('/', (req: AuthRequest, res: Response) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all()
  return res.json({ templates })
})

// GET /api/templates/:id - Get template details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
  if (!template) return res.status(404).json({ error: 'Khong tim thay mau' })

  // Read preview text if available
  if (template.file_path && fs.existsSync(template.file_path)) {
    try {
      const ext = path.extname(template.file_path).toLowerCase()
      if (['.txt', '.md'].includes(ext)) {
        template.preview_text = fs.readFileSync(template.file_path, 'utf-8').slice(0, 2000)
      }
    } catch {}
  }

  return res.json({ template })
})

// POST /api/templates - Upload new template
router.post('/', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui long chon file mau' })

    const { name, description, category } = req.body
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '')

    // Extract preview text for text files
    let previewText = ''
    if (['txt', 'md'].includes(ext)) {
      try { previewText = fs.readFileSync(req.file.path, 'utf-8').slice(0, 2000) } catch {}
    }

    const result = db.prepare(
      'INSERT INTO templates (name, description, category, file_path, file_type, preview_text, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name || req.file.originalname,
      description || '',
      category || 'general',
      req.file.path,
      ext,
      previewText,
      req.user?.id
    )

    return res.json({
      success: true,
      template: {
        id: result.lastInsertRowid,
        name: name || req.file.originalname,
        file_type: ext,
      }
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'Loi tai len mau', details: err.message })
  }
})

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
  if (!template) return res.status(404).json({ error: 'Khong tim thay mau' })

  try { fs.unlinkSync(template.file_path) } catch {}
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id)

  return res.json({ success: true })
})

// GET /api/templates/:id/download - Download template file
router.get('/:id/download', (req: AuthRequest, res: Response) => {
  const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
  if (!template || !fs.existsSync(template.file_path)) {
    return res.status(404).json({ error: 'Khong tim thay file' })
  }
  return res.download(template.file_path, `${template.name}.${template.file_type}`)
})

export default router
