import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const outputDir = path.join(process.cwd(), 'outputs', 'excel')
fs.mkdirSync(outputDir, { recursive: true })

const pythonBin = path.join(process.cwd(), '.venv', 'bin', 'python3')
const cliPath = path.join(process.cwd(), 'src', 'services', 'excel', 'cli.py')

router.get('/templates', (_req: Request, res: Response) => {
  return res.json({
    templates: [
      { id: 'invoice', name: 'Hoa don', desc: 'Hoa don ban hang voi cong thuc tinh tong' },
      { id: 'budget', name: 'Ngan sach', desc: 'Bao cao chi phi theo quy voi bieu do' },
      { id: 'employee', name: 'Nhan vien', desc: 'Danh sach nhan vien' },
      { id: 'inventory', name: 'Ton kho', desc: 'Quan ly nhap xuat ton' },
    ]
  })
})

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { template, title } = req.body
    if (!template) return res.status(400).json({ error: 'Template required' })

    const outFile = path.join(outputDir, `${template}_${uuidv4().replace(/-/g, "").slice(0, 8)}.xlsx`)
    const { execSync } = await import('child_process')
    const result = execSync(
      `"${pythonBin}" "${cliPath}" template --name "${template}" --output "${outFile}"`,
      { encoding: 'utf-8', timeout: 30000 }
    )
    const parsed = JSON.parse(result.trim())
    return res.json({ success: true, ...parsed, downloadUrl: `/api/excel/download/${path.basename(parsed.file_path)}` })
  } catch (err: any) {
    return res.status(500).json({ error: 'Excel generation failed', details: err.message })
  }
})

router.post('/from-data', async (req: Request, res: Response) => {
  try {
    const { title, columns, data, chartType } = req.body
    if (!columns?.length || !data?.length) return res.status(400).json({ error: 'columns and data required' })

    const tempFile = path.join(outputDir, `custom_${uuidv4().replace(/-/g, "").slice(0, 8)}.json`)
    fs.writeFileSync(tempFile, JSON.stringify({ title, columns, data, chartType }), 'utf-8')
    const outFile = tempFile.replace('.json', '.xlsx')

    const { execSync } = await import('child_process')
    const result = execSync(
      `"${pythonBin}" "${cliPath}" custom --input "${tempFile}" --output "${outFile}"`,
      { encoding: 'utf-8', timeout: 30000 }
    )
    const parsed = JSON.parse(result.trim())
    try { fs.unlinkSync(tempFile) } catch {}
    return res.json({ success: true, ...parsed, downloadUrl: `/api/excel/download/${path.basename(parsed.file_path)}` })
  } catch (err: any) {
    return res.status(500).json({ error: 'Excel generation failed', details: err.message })
  }
})

router.get('/download/:filename', (req: Request, res: Response) => {
  const filePath = path.join(outputDir, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  setTimeout(() => { try { fs.unlinkSync(filePath) } catch {} }, 3600000)
  return res.download(filePath)
})

export default router
