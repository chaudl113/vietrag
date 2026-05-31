'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Presentation, FileSpreadsheet, MessageSquare,
  Upload, Download, Trash2, Send, Loader2, Search,
  CheckCircle, AlertCircle, Sparkles, Palette, ChevronRight, BarChart3,
  LogOut, User, FileUp, Plus, X, FolderOpen
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

type Tab = 'dashboard' | 'documents' | 'templates' | 'generate' | 'chat'

interface UserInfo { id: number; email: string; name: string; role: string }
interface Doc { id: string; name: string; status: string; size: number; chunks: number }
interface Template { id: number; name: string; description: string; category: string; file_type: string; preview_text?: string }
interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string }
interface GenResult { success: boolean; content: string; downloadUrl: string; file_name: string; file_size: number }

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (!token || !stored) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(stored))
    setLoading(false)
  }, [router])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'documents' as Tab, icon: FileText, label: 'Quản lý tài liệu' },
    { id: 'templates' as Tab, icon: FolderOpen, label: 'Mẫu tài liệu' },
    { id: 'generate' as Tab, icon: Sparkles, label: 'Tạo file theo mẫu' },
    { id: 'chat' as Tab, icon: MessageSquare, label: 'Hỏi đáp' },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3">
            ← Về trang chủ
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary-400" /> Quản trị
          </h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && <DashboardTab onNavigate={setTab} />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'generate' && <GenerateTab />}
        {tab === 'chat' && <ChatTab />}
      </main>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────
function DashboardTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [stats, setStats] = useState({ docs: 0, templates: 0, generated: 0 })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    fetch('/api/documents', { headers }).then(r => r.json()).then(d => setStats(s => ({ ...s, docs: d.length || 0 }))).catch(() => {})
    fetch('/api/templates').then(r => r.json()).then(d => setStats(s => ({ ...s, templates: d.templates?.length || 0 }))).catch(() => {})
    fetch('/api/generate/history', { headers }).then(r => r.json()).then(d => setStats(s => ({ ...s, generated: d.files?.length || 0 }))).catch(() => {})
  }, [])

  const cards = [
    { icon: FileText, label: 'Tài liệu đã tải lên', value: stats.docs, color: 'bg-blue-500', tab: 'documents' as Tab },
    { icon: FolderOpen, label: 'Mẫu tài liệu', value: stats.templates, color: 'bg-purple-500', tab: 'templates' as Tab },
    { icon: Sparkles, label: 'File đã tạo', value: stats.generated, color: 'bg-orange-500', tab: 'generate' as Tab },
    { icon: MessageSquare, label: 'Hỏi đáp AI', value: '💬', color: 'bg-green-500', tab: 'chat' as Tab },
  ]

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">📊 Tổng quan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <button key={c.label} onClick={() => onNavigate(c.tab)}
            className="card text-left hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${c.color} rounded-xl flex items-center justify-center`}>
                <c.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-600" />
            </div>
          </button>
        ))}
      </div>

      <h3 className="font-semibold mb-4">🚀 Truy cập nhanh</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Upload, label: 'Tải tài liệu lên', desc: 'Hỗ trợ PDF, DOCX, TXT, MD', tab: 'documents' as Tab, color: 'border-blue-200 bg-blue-50' },
          { icon: Sparkles, label: 'Tạo file theo mẫu', desc: 'Chọn mẫu → Nhập yêu cầu → Nhận file', tab: 'generate' as Tab, color: 'border-orange-200 bg-orange-50' },
          { icon: MessageSquare, label: 'Hỏi đáp tài liệu', desc: 'Chat AI xoay quanh dữ liệu của bạn', tab: 'chat' as Tab, color: 'border-green-200 bg-green-50' },
        ].map(a => (
          <button key={a.label} onClick={() => onNavigate(a.tab)}
            className={`border-2 ${a.color} rounded-xl p-4 text-left hover:shadow-md transition-all`}>
            <a.icon className="w-8 h-8 mb-2 text-gray-700" />
            <p className="font-medium">{a.label}</p>
            <p className="text-sm text-gray-500">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Documents ──────────────────────────────────────────────
function DocumentsTab() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/documents', { headers }).then(r => r.json()).then(d => setDocs(d || [])).catch(() => {})
  }, [])

  const upload = async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      const temp: Doc = { id: Date.now().toString(), name: file.name, status: 'processing', size: file.size, chunks: 0 }
      setDocs(prev => [temp, ...prev])
      try {
        const form = new FormData(); form.append('file', file)
        const res = await fetch('/api/documents/upload', { method: 'POST', body: form, headers })
        const data = await res.json()
        setDocs(prev => prev.map(d => d.id === temp.id ? { ...d, id: data.id || d.id, status: 'ready', chunks: data.chunks || 0 } : d))
      } catch { setDocs(prev => prev.map(d => d.id === temp.id ? { ...d, status: 'error' } : d)) }
    }
    setUploading(false)
  }

  const deleteDoc = async (id: string) => {
    try { await fetch(`/api/documents/${id}`, { method: 'DELETE', headers }) } catch {}
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const fmtSize = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📁 Quản lý tài liệu</h2>
        <button onClick={() => fileRef.current?.click()} className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Tải lên
        </button>
      </div>
      <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.txt,.md" onChange={e => e.target.files && upload(Array.from(e.target.files))} />

      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={e => { e.preventDefault(); setDragActive(false); upload(Array.from(e.dataTransfer.files)) }}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}`}
      >
        <FileUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Kéo thả file vào đây hoặc nhấn <strong>Tải lên</strong></p>
        <p className="text-xs text-gray-400 mt-1">Hỗ trợ: PDF, DOCX, TXT, MD (tối đa 50MB)</p>
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-primary-600 mx-auto mt-2" />}
      </div>

      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id} className="card flex items-center gap-4 py-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.name}</p>
              <p className="text-xs text-gray-500">{fmtSize(doc.size)} {doc.chunks > 0 && `• ${doc.chunks} chunks`}</p>
            </div>
            {doc.status === 'processing' && <span className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang xử lý</span>}
            {doc.status === 'ready' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sẵn sàng</span>}
            {doc.status === 'error' && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Lỗi</span>}
            <button onClick={() => deleteDoc(doc.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-center text-gray-400 py-8">Chưa có tài liệu nào. Hãy tải lên để bắt đầu!</p>}
      </div>
    </div>
  )
}

// ─── Templates ──────────────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {})
  }, [])

  const uploadTemplate = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('name', name || file.name)
      form.append('description', desc)
      form.append('category', 'custom')
      const token = localStorage.getItem('token')
      const res = await fetch('/api/templates', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setTemplates(prev => [data.template, ...prev])
        setShowUpload(false); setName(''); setDesc('')
      }
    } catch {}
    setUploading(false)
  }

  const deleteTemplate = async (id: number) => {
    const token = localStorage.getItem('token')
    await fetch(`/api/templates/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">📋 Mẫu tài liệu</h2>
          <p className="text-gray-500 text-sm mt-1">Tải lên mẫu để sử dụng khi tạo file mới</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm mẫu
        </button>
      </div>

      {showUpload && (
        <div className="card mb-6 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tải lên mẫu mới</h3>
            <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tên mẫu</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: SRS Template"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mô tả</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn gọn"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".docx,.xlsx,.pptx,.txt,.md,.pdf" onChange={e => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" /> : (
              <><Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" /><p className="text-sm text-gray-500">Nhấn để chọn file mẫu</p></>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="card flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-gray-500">{t.description || 'Không có mô tả'}</p>
              <p className="text-xs text-gray-400 mt-1">Loại: {t.file_type.toUpperCase()}</p>
            </div>
            <button onClick={() => deleteTemplate(t.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3" />
            <p>Chưa có mẫu nào. Nhấn <strong>Thêm mẫu</strong> để bắt đầu!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Generate (Tạo file theo mẫu) ───────────────────────────
function GenerateTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<GenResult | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {})
  }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const selected = templates.find(t => t.id === selectedTemplate)

  const generate = async () => {
    if (!input.trim() || generating) return
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const prompt = input; setInput(''); setGenerating(true); setLastResult(null)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/generate/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId: selectedTemplate, prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `✅ Đã tạo xong! ${data.file_name}\n\n${data.content.slice(0, 500)}${data.content.length > 500 ? '...' : ''}`,
      }])
      setLastResult(data)
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `❌ Lỗi: ${err.message}`,
      }])
    }
    setGenerating(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold">✨ Tạo file theo mẫu</h2>
        <p className="text-sm text-gray-500">Chọn mẫu (nếu có) rồi mô tả nội dung cần tạo</p>

        {/* Template selector */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setSelectedTemplate(null)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              !selectedTemplate ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            Không dùng mẫu (AI tự tạo)
          </button>
          {templates.map(t => (
            <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedTemplate === t.id ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:border-primary-400'
              }`}>
              📄 {t.name}
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-xs text-primary-600 mt-2">Đang dùng mẫu: <strong>{selected.name}</strong> ({selected.file_type.toUpperCase()})</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Sparkles className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">Mô tả nội dung cần tạo</p>
            <p className="text-sm mt-2 max-w-md text-center">
              Ví dụ: &quot;Tạo file SRS với chức năng đăng nhập, quản lý người dùng và thanh toán trực tuyến&quot;
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant max-w-[85%]'}>
              <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </div>
        ))}
        {generating && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-sm text-gray-500">Đang tạo tài liệu...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Download bar */}
      {lastResult && (
        <div className="border-t bg-green-50 px-4 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm flex-1">{lastResult.file_name} ({(lastResult.file_size / 1024).toFixed(1)} KB)</span>
          <a href={lastResult.downloadUrl} download className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1">
            <Download className="w-3 h-3" /> Tải về
          </a>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder={selected ? `Tạo file ${selected.name} với nội dung...` : "Mô tả nội dung cần tạo..."}
            className="flex-1 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={generating} />
          <button onClick={generate} disabled={!input.trim() || generating}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Tạo
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat (Hỏi đáp) ────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const msg = input; setInput(''); setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Trả lời bằng tiếng Việt có dấu. ${msg}` }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.answer || 'Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: '⚠️ Lỗi kết nối. Vui lòng kiểm tra backend đã chạy chưa.',
      }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold">💬 Hỏi đáp tài liệu</h2>
        <p className="text-sm text-gray-500">Đặt câu hỏi xoay quanh tài liệu đã tải lên</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">Đặt câu hỏi để bắt đầu</p>
            <p className="text-sm mt-2 max-w-md text-center">
              Tôi sẽ tìm kiếm trong tài liệu của bạn và trả lời bằng tiếng Việt có dấu.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
              <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-sm text-gray-500">Đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading} />
          <button onClick={send} disabled={!input.trim() || loading}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
