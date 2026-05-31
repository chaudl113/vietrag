import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const uploadDir = path.join(process.cwd(), 'uploads', 'ppt')
const outputDir = path.join(process.cwd(), 'outputs', 'ppt')
fs.mkdirSync(uploadDir, { recursive: true })
fs.mkdirSync(outputDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, ['.pdf', '.docx', '.doc', '.txt', '.md'].includes(ext))
  },
})

router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Upload a document file' })
    const theme = req.body.theme || 'professional'
    const language = req.body.language || 'vi'
    const { execSync } = await import('child_process')
    const cli = path.join(process.cwd(), 'src', 'services', 'ppt', 'cli.py')
    const result = execSync(
      `python3 "${cli}" generate --file "${req.file.path}" --theme "${theme}" --language "${language}" --output-dir "${outputDir}"`,
      { encoding: 'utf-8', timeout: 120000 }
    )
    const parsed = JSON.parse(result.trim())
    try { fs.unlinkSync(req.file.path) } catch {}
    return res.json({ success: true, ...parsed, downloadUrl: `/api/ppt/download/${path.basename(parsed.file_path)}` })
  } catch (err: any) {
    return res.status(500).json({ error: 'PPT generation failed', details: err.message })
  }
})

router.post('/from-text', async (req: Request, res: Response) => {
  try {
    const { text, title, theme = 'professional', language = 'vi' } = req.body
    if (!text || text.length < 50) return res.status(400).json({ error: 'Content too short' })
    const tempFile = path.join(uploadDir, `text_${uuidv4()}.txt`)
    fs.writeFileSync(tempFile, text, 'utf-8')
    const { execSync } = await import('child_process')
    const cli = path.join(process.cwd(), 'src', 'services', 'ppt', 'cli.py')
    const result = execSync(
      `python3 "${cli}" generate --file "${tempFile}" --title "${title || ''}" --theme "${theme}" --language "${language}" --output-dir "${outputDir}"`,
      { encoding: 'utf-8', timeout: 120000 }
    )
    const parsed = JSON.parse(result.trim())
    try { fs.unlinkSync(tempFile) } catch {}
    return res.json({ success: true, ...parsed, downloadUrl: `/api/ppt/download/${path.basename(parsed.file_path)}` })
  } catch (err: any) {
    return res.status(500).json({ error: 'PPT generation failed', details: err.message })
  }
})

router.get('/download/:filename', (req: Request, res: Response) => {
  const filePath = path.join(outputDir, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  setTimeout(() => { try { fs.unlinkSync(filePath) } catch {} }, 3600000)
  return res.download(filePath)
})

export default router
