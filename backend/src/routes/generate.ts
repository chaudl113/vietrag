import { Router, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import db from '../services/db.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
const outputDir = path.join(process.cwd(), 'outputs', 'generated')
fs.mkdirSync(outputDir, { recursive: true })

const pythonBin = path.join(process.cwd(), '.venv', 'bin', 'python3')

async function extractTemplateContent(template: any): Promise<string> {
  if (!template.file_path || !fs.existsSync(template.file_path)) return ''
  const ext = path.extname(template.file_path).toLowerCase()

  if (['.txt', '.md'].includes(ext)) {
    return fs.readFileSync(template.file_path, 'utf-8')
  }

  if (ext === '.docx') {
    try {
      const { execSync } = await import('child_process')
      const result = execSync(
        `"${pythonBin}" -c "
import sys; sys.path.insert(0, '${path.join(process.cwd(), 'src')}');
from services.ppt.document_extractor import extract_docx;
doc = extract_docx('${template.file_path}');
print(doc.to_markdown()[:3000])
"`,
        { encoding: 'utf-8', timeout: 15000 }
      )
      return result.trim()
    } catch {
      return ''
    }
  }

  return ''
}

router.post('/from-template', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, prompt } = req.body
    if (!prompt) return res.status(400).json({ error: 'Vui lòng nhập mô tả cần tạo' })

    let templateContent = ''
    let templateName = 'custom'

    if (templateId) {
      const template: any = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId)
      if (!template) return res.status(404).json({ error: 'Không tìm thấy mẫu' })
      templateName = template.name
      templateContent = await extractTemplateContent(template)
    }

    const { default: openai } = await import('openai')
    const client = new openai()

    const systemPrompt = templateContent
      ? `Bạn là trợ lý tạo tài liệu chuyên nghiệp. Dưới đây là NỘI DUNG MẪU để tham khảo format/structure:\n\n---TEMPLATE START---\n${templateContent.slice(0, 4000)}\n---TEMPLATE END---\n\nHãy tạo tài liệu MỚI theo ĐÚNG FORMAT của mẫu trên, nhưng với nội dung theo yêu cầu của người dùng.\n- Giữ nguyên cấu trúc, heading levels, style của mẫu\n- Thay đổi nội dung cho phù hợp với yêu cầu\n- Trả lời bằng tiếng Việt có dấu\n- Chỉ trả về nội dung tài liệu, không giải thích`
      : `Bạn là trợ lý tạo tài liệu chuyên nghiệp. Tạo tài liệu theo yêu cầu của người dùng.\n- Trả lời bằng tiếng Việt có dấu\n- Sử dụng markdown format\n- Chỉ trả về nội dung tài liệu, không giải thích`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const generatedContent = response.choices[0].message.content || ''
    const safeName = templateName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    const outputFile = path.join(outputDir, `${safeName}_${uuidv4().replace(/-/g, '').slice(0, 8)}.md`)
    fs.writeFileSync(outputFile, generatedContent, 'utf-8')

    db.prepare(
      'INSERT INTO generated_files (user_id, template_id, title, file_path, file_type, file_size, prompt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user?.id, templateId || null, prompt.slice(0, 200), outputFile, 'md', generatedContent.length, prompt)

    return res.json({
      success: true,
      content: generatedContent,
      file_path: outputFile,
      file_name: `${safeName}.md`,
      file_size: generatedContent.length,
      downloadUrl: `/api/generate/download/${path.basename(outputFile)}`,
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi tạo tài liệu', details: err.message })
  }
})

router.post('/free', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body
    if (!prompt) return res.status(400).json({ error: 'Vui lòng nhập mô tả' })

    const { default: openai } = await import('openai')
    const client = new openai()

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Bạn là trợ lý tạo tài liệu. Tạo nội dung bằng tiếng Việt có dấu, markdown format. Chỉ trả về nội dung.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const content = response.choices[0].message.content || ''
    const outputFile = path.join(outputDir, `generated_${uuidv4().replace(/-/g, '').slice(0, 8)}.md`)
    fs.writeFileSync(outputFile, content, 'utf-8')

    return res.json({
      success: true,
      content,
      file_path: outputFile,
      file_name: `generated.md`,
      file_size: content.length,
      downloadUrl: `/api/generate/download/${path.basename(outputFile)}`,
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi tạo nội dung', details: err.message })
  }
})

router.get('/history', authMiddleware, (req: AuthRequest, res: Response) => {
  const files = db.prepare(
    'SELECT * FROM generated_files WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user?.id)
  return res.json({ files })
})

router.get('/download/:filename', (req: AuthRequest, res: Response) => {
  const filePath = path.join(outputDir, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Không tìm thấy file' })
  setTimeout(() => { try { fs.unlinkSync(filePath) } catch {} }, 3600000)
  return res.download(filePath)
})

export default router
