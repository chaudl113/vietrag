const API_BASE = '/api'

export async function sendMessage(message: string, conversationId?: string) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  })
  if (!res.ok) throw new Error('Lỗi gửi tin nhắn')
  return res.json()
}

export async function uploadDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Lỗi tải tài liệu')
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/documents`)
  if (!res.ok) throw new Error('Lỗi lấy danh sách tài liệu')
  return res.json()
}

export async function deleteDocument(id: string) {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Lỗi xóa tài liệu')
  return res.json()
}

export async function searchDocuments(query: string, filters?: { dateFrom?: string; dateTo?: string; docType?: string }) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...filters }),
  })
  if (!res.ok) throw new Error('Lỗi tìm kiếm')
  return res.json()
}

export async function getConversations() {
  const res = await fetch(`${API_BASE}/conversations`)
  if (!res.ok) throw new Error('Lỗi lấy hội thoại')
  return res.json()
}

export async function deleteConversation(id: string) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Lỗi xóa hội thoại')
  return res.json()
}
