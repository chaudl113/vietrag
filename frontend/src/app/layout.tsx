import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VietRAG - Trí tuệ nhân tạo cho tiếng Việt',
  description: 'Hỏi đáp thông minh dựa trên tài liệu của bạn',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
