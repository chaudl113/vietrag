'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Plus, Trash2, MessageSquare, Menu, X, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { documentName: string; chunk: string; score: number }[]
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: Date
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  const newConversation = () => {
    const conv: Conversation = {
      id: Date.now().toString(),
      title: 'Cuộc trò chuyện mới',
      messages: [],
      updatedAt: new Date(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(conv.id)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() }

    if (!activeConvId) newConversation()

    setConversations(prev => prev.map(c =>
      c.id === (activeConvId || prev[0]?.id)
        ? { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? input.slice(0, 40) : c.title, updatedAt: new Date() }
        : c
    ))

    const msg = input
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationId: activeConvId }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'Xin lỗi, tôi không thể trả lời lúc này.',
        sources: data.sources || [],
        timestamp: new Date(),
      }
      setConversations(prev => prev.map(c =>
        c.id === (activeConvId || prev[0]?.id)
          ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date() }
          : c
      ))
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Lỗi kết nối. Vui lòng kiểm tra backend đã chạy chưa (port 3001).',
        timestamp: new Date(),
      }
      setConversations(prev => prev.map(c =>
        c.id === (activeConvId || prev[0]?.id)
          ? { ...c, messages: [...c.messages, errMsg], updatedAt: new Date() }
          : c
      ))
    }
    setLoading(false)
  }

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) setActiveConvId(null)
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-gray-900 text-white flex-shrink-0 transition-all overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <button onClick={newConversation} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-600 hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Cuộc trò chuyện mới
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConvId(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 ${activeConvId === conv.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm truncate flex-1">{conv.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">Chưa có cuộc trò chuyện</p>
          )}
        </div>
        <div className="p-4 border-t border-gray-700">
          <a href="/" className="text-sm text-gray-400 hover:text-white">← Về trang chủ</a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-semibold truncate">{activeConv?.title || 'VietRAG Chat'}</h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Chào mừng đến VietRAG</h2>
              <p className="text-gray-500 max-w-md">Đặt câu hỏi về tài liệu của bạn. Tôi sẽ tìm kiếm và trả lời với nguồn trích dẫn.</p>
            </div>
          ) : (
            activeConv.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <p className="text-xs font-medium text-gray-500">📚 Nguồn tham khảo:</p>
                      {msg.sources.map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
                          <span className="font-medium text-primary-700">{s.documentName}</span>
                          <span className="text-gray-400 ml-2">({Math.round(s.score * 100)}%)</span>
                          <p className="text-gray-600 mt-1 line-clamp-2">{s.chunk}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-assistant flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span className="text-sm text-gray-500">Đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" />
            <button onClick={() => fileInputRef.current?.click()} className="p-3 hover:bg-gray-100 rounded-xl transition-colors" title="Đính kèm tài liệu">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Nhập câu hỏi của bạn..."
              className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
