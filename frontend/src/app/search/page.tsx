'use client'

import { useState } from 'react'
import { Search, FileText, ArrowLeft, Filter, Loader2, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface Result {
  id: string
  documentName: string
  chunk: string
  score: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [docType, setDocType] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, docType: docType || undefined }),
      })
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold">🔍 Tìm kiếm ngữ nghĩa</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Nhập câu hỏi cần tìm kiếm..."
              className="w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button onClick={search} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tìm
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Tất cả loại</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="txt">TXT</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-500">Đang tìm kiếm...</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không tìm thấy kết quả cho &quot;{query}&quot;</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Tìm thấy {results.length} kết quả</p>
            {results.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.documentName}</span>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        {Math.round(r.score * 100)}% liên quan
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{r.chunk}</p>
                    <Link href={`/chat`} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-2">
                      <MessageSquare className="w-3 h-3" /> Hỏi về nội dung này
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !searched ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nhập câu hỏi để tìm kiếm trong tài liệu</p>
            <p className="text-gray-400 text-sm mt-2">Tìm kiếm theo ngữ nghĩa, không chỉ từ khóa</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
