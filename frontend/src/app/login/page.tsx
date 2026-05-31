"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login" ? { email, password } : { email, password, name }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      router.push("/admin")
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VietRAG</h1>
          <p className="text-gray-500 mt-1">Nền tảng RAG tiếng Việt</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setError("") }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setMode("register"); setError("") }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required minLength={6}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
              ) : mode === "login" ? (
                "Đăng nhập"
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary-600 font-medium hover:underline"
            >
              {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 VietRAG. Bảo mật dữ liệu là ưu tiên hàng đầu.
        </p>
      </div>
    </div>
  )
}
