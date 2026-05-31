'use client'

import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, FileText, Presentation, FileSpreadsheet, MessageSquare,
  Upload, Download, Trash2, Send, Loader2, Plus, Search, ArrowLeft,
  CheckCircle, AlertCircle, Sparkles, Palette, ChevronRight, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

type Tab = 'dashboard' | 'documents' | 'ppt' | 'excel' | 'chat'

// ─── Shared state ───────────────────────────────────────────
interface Doc { id: string; name: string; status: 'processing'|'ready'|'error'; size: number; chunks: number }
interface ChatMsg { id: string; role: 'user'|'assistant'; content: string; sources?: any[] }

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Tong quan' },
    { id: 'documents' as Tab, icon: FileText, label: 'Tai lieu' },
    { id: 'ppt' as Tab, icon: Presentation, label: 'Tao PPT' },
    { id: 'excel' as Tab, icon: FileSpreadsheet, label: 'Tao Excel' },
    { id: 'chat' as Tab, icon: MessageSquare, label: 'Hoi dap' },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Ve trang chu
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary-400" /> Admin Dashboard
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
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          VietRAG Admin v1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && <DashboardTab onNavigate={setTab} />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'ppt' && <PPTTab />}
        {tab === 'excel' && <ExcelTab />}
        {tab === 'chat' && <ChatTab />}
      </main>
    </div>
  )
}

// ─── Dashboard Tab ──────────────────────────────────────────
function DashboardTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [stats, setStats] = useState({ docs: 0, conversations: 0 })

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(d => setStats(s => ({ ...s, docs: d.length || 0 }))).catch(() => {})
    fetch('/api/conversations').then(r => r.json()).then(d => setStats(s => ({ ...s, conversations: d.length || 0 }))).catch(() => {})
  }, [])

  const cards = [
    { icon: FileText, label: 'Tai lieu', value: stats.docs, color: 'bg-blue-500', tab: 'documents' as Tab },
    { icon: Presentation, label: 'PPT da tao', value: '-', color: 'bg-orange-500', tab: 'ppt' as Tab },
    { icon: FileSpreadsheet, label: 'Excel da tao', value: '-', color: 'bg-green-500', tab: 'excel' as Tab },
    { icon: MessageSquare, label: 'Cuoc hoi thoai', value: stats.conversations, color: 'bg-purple-500', tab: 'chat' as Tab },
  ]

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Tong quan</h2>
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

      {/* Quick actions */}
      <h3 className="font-semibold mb-4">Truy cap nhanh</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Upload, label: 'Upload tai lieu', desc: 'PDF, DOCX, TXT, MD', tab: 'documents' as Tab, color: 'border-blue-200 bg-blue-50' },
          { icon: Sparkles, label: 'Tao PPT', desc: 'Tao PowerPoint tu tai lieu', tab: 'ppt' as Tab, color: 'border-orange-200 bg-orange-50' },
          { icon: BarChart3, label: 'Tao Excel', desc: 'Tao bang tinh tu mau', tab: 'excel' as Tab, color: 'border-green-200 bg-green-50' },
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

// ─── Documents Tab ──────────────────────────────────────────
function DocumentsTab() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(d => setDocs(d || [])).catch(() => {})
  }, [])

  const upload = async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      const temp: Doc = { id: Date.now().toString(), name: file.name, status: 'processing', size: file.size, chunks: 0 }
      setDocs(prev => [temp, ...prev])
      try {
        const form = new FormData(); form.append('file', file)
        const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
        const data = await res.json()
        setDocs(prev => prev.map(d => d.id === temp.id ? { ...d, id: data.id || d.id, status: 'ready', chunks: data.chunks || 0 } : d))
      } catch { setDocs(prev => prev.map(d => d.id === temp.id ? { ...d, status: 'error' } : d)) }
    }
    setUploading(false)
  }

  const deleteDoc = async (id: string) => {
    try { await fetch(`/api/documents/${id}`, { method: 'DELETE' }) } catch {}
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const fmtSize = (b: number) => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Quan ly tai lieu</h2>
        <button onClick={() => fileRef.current?.click()} className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>
      <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.txt,.md" onChange={e => e.target.files && upload(Array.from(e.target.files))} />

      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={e => { e.preventDefault(); setDragActive(false); upload(Array.from(e.dataTransfer.files)) }}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Keo tha file vao day hoac nhan Upload</p>
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-primary-600 mx-auto mt-2" />}
      </div>

      <div className="space-y-2">
        {docs.map(doc => (
          <div key={doc.id} className="card flex items-center gap-4 py-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.name}</p>
              <p className="text-xs text-gray-500">{fmtSize(doc.size)} {doc.chunks > 0 && `| ${doc.chunks} chunks`}</p>
            </div>
            {doc.status === 'processing' && <span className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Dang xu ly</span>}
            {doc.status === 'ready' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> San sang</span>}
            {doc.status === 'error' && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Loi</span>}
            <button onClick={() => deleteDoc(doc.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-center text-gray-400 py-8">Chua co tai lieu nao</p>}
      </div>
    </div>
  )
}

// ─── PPT Tab ────────────────────────────────────────────────
function PPTTab() {
  const [file, setFile] = useState<File|null>(null)
  const [theme, setTheme] = useState('professional')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const themes = [
    { id: 'professional', name: 'Professional', color: 'bg-blue-600' },
    { id: 'dark', name: 'Dark', color: 'bg-gray-800' },
    { id: 'creative', name: 'Creative', color: 'bg-orange-500' },
    { id: 'minimal', name: 'Minimal', color: 'bg-white border' },
  ]

  const generate = async () => {
    if (!file) return
    setGenerating(true); setError(''); setResult(null)
    try {
      const form = new FormData(); form.append('file', file); form.append('theme', theme)
      const res = await fetch('/api/ppt/generate', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err: any) { setError(err.message) }
    setGenerating(false)
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Tao PowerPoint</h2>

      <div onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 mb-6">
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError('') }} />
        {file ? (
          <div className="flex items-center justify-center gap-2"><FileText className="w-6 h-6 text-primary-600" /><span className="font-medium">{file.name}</span></div>
        ) : (
          <><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Chon tai lieu de tao PPT</p></>
        )}
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-2 flex items-center gap-2"><Palette className="w-4 h-4" /> Giao dien</p>
        <div className="flex gap-2">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm ${theme === t.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <div className={`w-4 h-4 rounded ${t.color}`} /> {t.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={!file || generating}
        className="btn-primary flex items-center gap-2 mb-6 disabled:opacity-50">
        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Dang tao...</> : <><Sparkles className="w-4 h-4" /> Tao PPT</>}
      </button>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}
      {result && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="flex-1">
              <p className="font-bold">{result.title}</p>
              <p className="text-sm text-gray-600">{result.slide_count} slides | {result.theme}</p>
            </div>
            <a href={result.downloadUrl} download className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
              <Download className="w-4 h-4" /> Tai .pptx
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Excel Tab ──────────────────────────────────────────────
function ExcelTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState<string|null>(null)
  const [downloads, setDownloads] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/excel/templates').then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {})
  }, [])

  const generate = async (templateId: string) => {
    setGenerating(templateId)
    try {
      const res = await fetch('/api/excel/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateId }),
      })
      const data = await res.json()
      if (data.success) setDownloads(prev => [{ ...data, template: templateId }, ...prev])
    } catch {}
    setGenerating(null)
  }

  const icons: Record<string, any> = { invoice: FileText, budget: BarChart3, employee: FileText, inventory: FileSpreadsheet }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-2">Tao Excel</h2>
      <p className="text-gray-500 mb-6">Chon mau de tao bang tinh Excel voi dinh dang va cong thuc san</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {templates.map(t => {
          const Icon = icons[t.id] || FileSpreadsheet
          return (
            <div key={t.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-gray-500">{t.desc}</p>
              </div>
              <button onClick={() => generate(t.id)} disabled={generating === t.id}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                {generating === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Tao
              </button>
            </div>
          )
        })}
      </div>

      {downloads.length > 0 && (
        <>
          <h3 className="font-semibold mb-3">Da tao</h3>
          <div className="space-y-2">
            {downloads.map((d, i) => (
              <div key={i} className="card flex items-center gap-3 py-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm flex-1">{d.template}.xlsx</span>
                <span className="text-xs text-gray-500">{(d.file_size/1024).toFixed(1)} KB</span>
                <a href={d.downloadUrl} download className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tai
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Chat Tab ───────────────────────────────────────────────
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
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), role: 'assistant',
        content: data.answer || 'Khong the tra loi luc nay.', sources: data.sources || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), role: 'assistant',
        content: 'Loi ket noi. Kiem tra backend da chay chua.',
      }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold">Hoi dap tai lieu</h2>
        <p className="text-sm text-gray-500">Hoi bat cu dieu gi ve tai lieu da upload</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p>Dat cau hoi de bat dau</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : <p>{msg.content}</p>}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  <p className="text-xs font-medium text-gray-500">Nguon:</p>
                  {msg.sources.map((s, i) => (
                    <p key={i} className="text-xs text-gray-500 truncate">{s.documentName} ({Math.round(s.score*100)}%)</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-sm text-gray-500">Dang suy nghi...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Nhap cau hoi..."
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
