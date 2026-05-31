# 🇻🇳 VietRAG

**Nền tảng RAG (Retrieval-Augmented Generation) dành cho tiếng Việt**

VietRAG là nền tảng mã nguồn mở giúp doanh nghiệp xây dựng chatbot AI thông minh dựa trên dữ liệu riêng của mình.

## ✨ Tính năng

- 📄 Hiểu sâu tài liệu (PDF, Word, Excel, PowerPoint)
- 🔍 Tìm kiếm ngữ nghĩa thông minh
- 🤖 Chatbot AI tiếng Việt tự nhiên
- 🔐 Bảo mật dữ liệu doanh nghiệp
- 📊 Dashboard quản trị trực quan
- 🌐 Hỗ trợ đa ngôn ngữ (Việt, Anh, Trung, Nhật, Hàn)

## 🚀 Triển khai nhanh

### Yêu cầu hệ thống

- Docker & Docker Compose
- RAM: Tối thiểu 4GB (khuyến nghị 8GB+)
- Disk: 10GB+

### Cài đặt

```bash
# Clone repo
git clone https://github.com/chaudl113/vietrag.git
cd vietrag

# Khởi động services
docker compose up -d

# Truy cập: http://localhost:80
```

### Cấu hình LLM

Sau khi khởi động, vào **Settings → Model Provider** để cấu hình:

- **OpenAI**: Nhập API key
- **Claude**: Nhập API key
- **Gemini**: Nhập API key
- **Ollama** (local): URL `http://host.docker.internal:11434`

## 📦 Kiến trúc

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Vector DB  │
│   (React)    │     │  (Python)    │     │  (Elastic)  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │    LLM API   │
                    │  (OpenAI...) │
                    └──────────────┘
```

## 💰 Bảng giá

| Gói | Giá/tháng | Features |
|-----|-----------|----------|
| **Free** | 0đ | 100 trang tài liệu, 1,000 câu hỏi |
| **Starter** | 499,000đ | 1,000 trang, 10,000 câu hỏi |
| **Pro** | 1,999,000đ | 10,000 trang, Unlimited câu hỏi |
| **Enterprise** | Liên hệ | Custom, SSO, API access |

## 🛠️ Phát triển

```bash
# Frontend
cd web && npm install && npm run dev

# Backend
cd api && pip install -r requirements.txt
python ragflow_server.py
```

## 📄 License

Apache 2.0

---

**Made with ❤️ in Vietnam**
