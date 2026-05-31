'use client'

import { useState, useRef } from 'react'
import { FileText, Upload, Download, Loader2, Presentation, Sparkles, ArrowLeft, Palette } from 'lucide-react'
import Link from 'next/link'

const THEMES = [
  { id: 'professional', name: 'Professional', desc: 'Clean, corporate blue', color: 'bg-blue-600' },
  { id: 'dark', name: 'Dark', desc: 'Modern dark theme', color: 'bg-gray-800' },
  { id: 'creative', name: 'Creative', desc: 'Warm, artistic style', color: 'bg-orange-500' },
  { id: 'minimal', name: 'Minimal', desc: 'Simple black & white', color: 'bg-white border' },
]

export default function PPTPage() {
  const [file, setFile] = useState<File | null>(null)
  const [theme, setTheme] = useState('professional')
  const [language, setLanguage] = useState('vi')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setResult(null)
      setError('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError('')
    }
  }

  const generate = async () => {
    if (!file) return
    setGenerating(true)
    setError('')
    setResult(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('theme', theme)
      form.append('language', language)

      const res = await fetch('/api/ppt/generate', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    }
    setGenerating(false)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <Presentation className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-bold">Tao PPT tu tai lieu</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.md" onChange={handleFileSelect} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary-600" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="font-medium">Keo tha tai lieu vao day</p>
              <p className="text-sm text-gray-500 mt-1">PDF, DOCX, TXT, MD</p>
            </>
          )}
        </div>

        {/* Theme selection */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Chon giao dien
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  theme === t.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded ${t.color} mb-2`} />
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Ngon ngu:</span>
          <div className="flex gap-2">
            {[{ id: 'vi', label: 'Tieng Viet' }, { id: 'en', label: 'English' }].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`px-4 py-1.5 rounded-full text-sm ${
                  language === lang.id ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!file || generating}
          className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Dang tao PPT...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Tao PowerPoint</>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>
        )}

        {/* Result */}
        {result && (
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Presentation className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{result.title}</h3>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <p>{result.slide_count} slides  |  Theme: {result.theme}  |  {formatSize(result.file_size)}</p>
                </div>
                <a
                  href={result.downloadUrl}
                  download
                  className="inline-flex items-center gap-2 mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Tai file .pptx
                </a>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="card bg-gray-50">
          <h3 className="font-medium mb-3">Cach hoat dong</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. <strong>Trich xuat noi dung</strong> - Doc PDF, DOCX, TXT va chuyen thanh van ban</p>
            <p>2. <strong>AI phan tich</strong> - GPT-4o-mini tao slide outline tu noi dung</p>
            <p>3. <strong>Tao PPTX</strong> - python-pptx tao PowerPoint native, co the chinh sua</p>
            <p>4. <strong>Tai ve</strong> - File .pptx goc, mo bang PowerPoint/Google Slides</p>
          </div>
        </div>
      </div>
    </div>
  )
}
