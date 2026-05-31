export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

export interface Source {
  documentName: string
  chunk: string
  score: number
  page?: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  name: string
  status: 'processing' | 'ready' | 'error'
  size: number
  chunks: number
  uploadedAt: Date
}

export interface SearchResult {
  id: string
  documentName: string
  chunk: string
  score: number
  highlights?: string[]
}
