'use client'

import Link from 'next/link'
import { MessageSquare, Upload, Search, Shield, ArrowRight, Zap, Globe, Lock, Presentation, LayoutDashboard } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">VietRAG</span>
          </div>
          <div className="flex items-center gap-4">
<Link href="/login" className="btn-primary flex items-center gap-2">
              Bắt đầu <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Admin
            </Link>
            <Link href="/ppt" className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1">
              <Presentation className="w-4 h-4" /> Tao PPT
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" /> Được xây dựng cho tiếng Việt
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Trí tuệ nhân tạo<br />
          <span className="text-primary-600">cho tiếng Việt</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Hỏi đáp thông minh dựa trên tài liệu của bạn. Upload tài liệu, đặt câu hỏi, nhận câu trả lời chính xác với nguồn trích dẫn.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/chat" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5" /> Bắt đầu chat
          </Link>
          <Link href="/upload" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" /> Tải tài liệu
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Tính năng nổi bật</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MessageSquare, title: 'Hỏi đáp tiếng Việt', desc: 'Hiểu ngữ cảnh tiếng Việt tự nhiên, trả lời chính xác' },
            { icon: Search, title: 'Tìm kiếm ngữ nghĩa', desc: 'Tìm kiếm theo ý nghĩa, không chỉ từ khóa' },
            { icon: Upload, title: 'Upload tài liệu', desc: 'Hỗ trợ PDF, DOCX, TXT. Xử lý tự động' },
{ icon: Shield, title: 'Bao mat du lieu', desc: 'Du lieu duoc ma hoa va luu tru an toan' },
            { icon: Presentation, title: 'Tao PPT tu tai lieu', desc: 'AI tao PowerPoint tu PDF, DOCX voi slide chinh sua duoc' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Bảng giá</h2>
        <p className="text-gray-600 text-center mb-12">Chọn gói phù hợp với nhu cầu của bạn</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Miễn phí', price: '0đ', period: '/tháng', features: ['100 câu hỏi/tháng', '5 tài liệu', '1GB lưu trữ', 'Hỗ trợ email'], cta: 'Bắt đầu miễn phí', popular: false },
            { name: 'Chuyên nghiệp', price: '299.000đ', period: '/tháng', features: ['Không giới hạn câu hỏi', '100 tài liệu', '10GB lưu trữ', 'API access', 'Hỗ trợ ưu tiên'], cta: 'Đăng ký ngay', popular: true },
            { name: 'Doanh nghiệp', price: 'Liên hệ', period: '', features: ['Không giới hạn tất cả', 'On-premise deploy', 'SSO & RBAC', 'SLA 99.9%', 'Dedicated support'], cta: 'Liên hệ', popular: false },
          ].map(({ name, price, period, features, cta, popular }) => (
            <div key={name} className={`card relative ${popular ? 'border-primary-600 border-2 scale-105' : ''}`}>
              {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-4 py-1 rounded-full font-medium">Phổ biến nhất</div>}
              <h3 className="text-xl font-bold mb-2">{name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{price}</span>
                <span className="text-gray-500">{period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-xl font-medium transition-colors ${popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">VietRAG</span>
            </div>
            <p>© 2026 VietRAG. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
