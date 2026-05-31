'use client'

import { useState, useCallback } from 'react'
import { Upload, File, Trash2, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Doc {
  id: string
  name: string
  status: 'processing' | 'ready' | 'error'
  size: number
  chunks: number
  uploadedAt: Date
}

export default function UploadPage() {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    await uploadFiles(files)
  }, [])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await uploadFiles(Array.from(e.target.files))
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      const tempDoc: Doc = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        status: 'processing',
        size: file.size,
        chunks: 0,
        uploadedAt: new Date(),
      }
      setDocuments(prev => [tempDoc, ...prev])

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
        const data = await res.json()
        setDocuments(prev => prev.map(d =>
          d.id === tempDoc.id
            ? { ...d, id: data.id || d.id, status: 'ready', chunks: data.chunks || 0 }
            : d
        ))
      } catch {
        setDocuments(prev => prev.map(d =>
          d.id === tempDoc.id ? { ...d, status: 'error' } : d
        ))
      }
    }
    setUploading(false)
  }

  const deleteDoc = async (id: string) => {
    try { await fetch(`/api/documents/${id}`, { method: 'DELETE' }) } catch {}
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold">📄 Quản lý tài liệu</h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" className="hidden" multiple accept=".pdf,.docx,.txt,.md" onChange={handleFileInput} />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
          <p className="text-lg font-medium mb-2">
            {uploading ? 'Đang tải lên...' : 'Kéo thả tài liệu vào đây'}
          </p>
          <p className="text-gray-500 text-sm">hoặc nhấn để chọn file • PDF, DOCX, TXT, MD</p>
          {uploading && <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto mt-4" />}
        </div>

        {/* Document list */}
        <div className="mt-8">
          <h2 className="font-semibold text-lg mb-4">Tài liệu đã tải ({documents.length})</h2>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có tài liệu nào</p>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="card flex items-center gap-4">
                  <File className="w-8 h-8 text-primary-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-sm text-gray-500">{formatSize(doc.size)} • {doc.chunks} chunks</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.status === 'processing' && <span className="flex items-center gap-1 text-sm text-yellow-600"><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý</span>}
                    {doc.status === 'ready' && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="w-4 h-4" /> Sẵn sàng</span>}
                    {doc.status === 'error' && <span className="flex items-center gap-1 text-sm text-red-600"><AlertCircle className="w-4 h-4" /> Lỗi</span>}
                    <button onClick={() => deleteDoc(doc.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
