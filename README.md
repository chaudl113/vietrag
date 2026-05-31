# 🇻🇳 VietRAG — Hệ thống RAG tiếng Việt

**VietRAG** là nền tảng mã nguồn mở (Retrieval-Augmented Generation) giúp doanh nghiệp xây dựng chatbot AI thông minh dựa trên dữ liệu riêng. Hỗ trợ tiếng Việt và đa ngôn ngữ.

---

## 📐 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGƯỜI DÙNG                               │
│                    http://localhost:3000                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│              Giao diện quản trị & Chat UI                       │
│                    Port: 3000                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (Node.js/TS)                         │
│           RAG Engine · Embedding · Query · Auth                  │
│                    Port: 3001                                   │
└──────┬───────────┬──────────┬───────────┬───────────────────────┘
       │           │          │           │
┌──────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌───▼──────┐
│ Elastic  │ │  MySQL  │ │ Redis  │ │  MinIO   │
│ Search   │ │  8.0    │ │  7     │ │ Storage  │
│ Vector   │ │ Metadata│ │ Cache  │ │ Files    │
│ :9200    │ │ :3306   │ │ :6379  │ │ :9000    │
└──────────┘ └─────────┘ └────────┘ └──────────┘
       │
       ▼
┌──────────────┐
│   LLM API    │
│ OpenAI/Claude│
│ /Gemini      │
└──────────────┘
```

---

## ✨ Tính năng chính

- 📄 **Đa định dạng** — Hỗ trợ PDF, Word, Excel, PowerPoint, Markdown, Text
- 🔍 **Tìm kiếm ngữ nghĩa** — Vector search trên Elasticsearch
- 🤖 **Chat AI tiếng Việt** — Tự nhiên, hiểu ngữ cảnh
- 🔐 **Bảo mật** — Phân quyền người dùng, mã hóa dữ liệu
- 📊 **Dashboard** — Quản trị trực quan, thống kê sử dụng
- 🌐 **Đa ngôn ngữ** — Việt, Anh, Trung, Nhật, Hàn
- 📁 **Quản lý tài liệu** — Upload, phân loại, tìm kiếm thông minh
- ⚙️ **Cấu hình linh hoạt** — Hỗ trợ nhiều LLM provider

---

## 📋 Yêu cầu hệ thống

| Yêu cầu | Tối thiểu | Khuyến nghị |
|---------|-----------|-------------|
| **RAM** | 4 GB | 8 GB+ |
| **Disk** | 10 GB | 20 GB+ |
| **Docker** | 20.10+ | Mới nhất |
| **Docker Compose** | v2.0+ | Mới nhất |
| **Node.js** | 18+ | 20 LTS |
| **OpenAI API Key** | Bắt buộc | — |

---

## 🚀 Cài đặt nhanh

### Cách 1: Script tự động (khuyến nghị)

```bash
git clone https://github.com/chaudl113/vietrag.git
cd vietrag
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Cách 2: Thủ công

```bash
# 1. Clone repo
git clone https://github.com/chaudl113/vietrag.git
cd vietrag

# 2. Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa .env — điền OPENAI_API_KEY

# 3. Khởi động hạ tầng (Elasticsearch, MySQL, Redis, MinIO)
docker compose up -d

# 4. Cài đặt & chạy Backend
cd backend
npm install
npm run dev
# Backend chạy tại http://localhost:3001

# 5. Cửa sổ terminal mới — cài đặt & chạy Frontend
cd frontend
npm install
npm run dev
# Frontend chạy tại http://localhost:3000

# 6. Mở trình duyệt
open http://localhost:3000
```

### Cách 3: Docker Compose đầy đủ (production)

```bash
# Chỉnh sửa .env trước
docker compose -f docker-compose.yml up -d --build
# Truy cập http://localhost:3000
```

---

## 🔧 Biến môi trường

Sao chép `.env.example` thành `.env` và chỉnh sửa:

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `OPENAI_API_KEY` | API key OpenAI (bắt buộc) | — |
| `OPENAI_MODEL` | Model sử dụng | `gpt-4o-mini` |
| `MYSQL_ROOT_PASSWORD` | Mật khẩu MySQL root | `vietrag_password` |
| `MYSQL_DATABASE` | Tên database | `vietrag` |
| `REDIS_HOST` | Địa chỉ Redis | `localhost` |
| `REDIS_PORT` | Port Redis | `6379` |
| `ES_HOST` | Địa chỉ Elasticsearch | `localhost` |
| `ES_PORT` | Port Elasticsearch | `9200` |
| `MINIO_ENDPOINT` | Địa chỉ MinIO | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `vietrag_admin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `vietrag_secret_key` |
| `MINIO_BUCKET` | Tên bucket lưu file | `vietrag-docs` |
| `BACKEND_PORT` | Port backend | `3001` |
| `FRONTEND_PORT` | Port frontend | `3000` |
| `JWT_SECRET` | Secret key cho JWT | `change_me` |
| `NODE_ENV` | Môi trường | `development` |

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Tài liệu (Documents)

**Upload tài liệu**
```http
POST /documents/upload
Content-Type: multipart/form-data

FormData:
  - file: (binary)
  - category: string (optional)
```

```json
{
  "success": true,
  "data": {
    "id": "doc_abc123",
    "filename": "tai-lieu.pdf",
    "status": "processing",
    "created_at": "2026-05-31T10:00:00Z"
  }
}
```

**Lấy danh sách tài liệu**
```http
GET /documents?page=1&limit=20&category=general
```

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_abc123",
        "filename": "tai-lieu.pdf",
        "pages": 15,
        "status": "completed",
        "created_at": "2026-05-31T10:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

**Xóa tài liệu**
```http
DELETE /documents/:id
```

### Chat

**Gửi câu hỏi**
```http
POST /chat/query
Content-Type: application/json

{
  "question": "Chính sách bảo hành của công ty là gì?",
  "conversation_id": "conv_xyz789",
  "document_ids": ["doc_abc123"]
}
```

```json
{
  "success": true,
  "data": {
    "answer": "Chính sách bảo hành của công ty bao gồm...",
    "sources": [
      {
        "document_id": "doc_abc123",
        "filename": "chinh-sach.pdf",
        "page": 3,
        "relevance_score": 0.92,
        "excerpt": "Thời hạn bảo hành là 12 tháng..."
      }
    ],
    "conversation_id": "conv_xyz789"
  }
}
```

**Lấy lịch sử hội thoại**
```http
GET /chat/conversations/:id/messages
```

### Knowledge Base

**Tạo knowledge base**
```http
POST /knowledge-bases
Content-Type: application/json

{
  "name": "Tài liệu kỹ thuật",
  "description": "Kiến thức về sản phẩm",
  "document_ids": ["doc_abc123", "doc_def456"]
}
```

**Lấy danh sách knowledge base**
```http
GET /knowledge-bases
```

### Hệ thống

**Kiểm tra trạng thái**
```http
GET /health
```

```json
{
  "status": "ok",
  "services": {
    "elasticsearch": "connected",
    "mysql": "connected",
    "redis": "connected",
    "minio": "connected"
  },
  "version": "1.0.0"
}
```

---

## 🐛 Xử lý sự cố

### Elasticsearch không khởi động
```bash
# Kiểm tra log
docker logs vietrag-es

# Thường do thiếu bộ nhớ — giảm heap size trong docker-compose.yml:
# ES_JAVA_OPTS=-Xms256m -Xmx256m

# Hoặc tăng vm.max_map_count (Linux):
sudo sysctl -w vm.max_map_count=262144
```

### MySQL kết nối thất bại
```bash
# Kiểm tra MySQL đã sẵn sàng chưa
docker exec vietrag-mysql mysqladmin ping -u root -p

# Nếu quên mật khẩu — xóa volume và khởi động lại
docker compose down -v
docker compose up -d
```

### Port đã được sử dụng
```bash
# Kiểm tra process đang dùng port
lsof -i :3000
lsof -i :3001
lsof -i :9200

# Kill process hoặc đổi port trong .env
```

### Frontend không kết nối Backend
```bash
# Đảm bảo backend đang chạy
curl http://localhost:3001/api/v1/health

# Kiểm tra CORS trong .env
CORS_ORIGIN=http://localhost:3000
```

### MinIO không upload được file
```bash
# Kiểm tra bucket đã tạo chưa
docker exec vietrag-mono mc alias set local http://localhost:9000 vietrag_admin vietrag_secret_key
docker exec vietrag-minio mc mb local/vietrag-docs --ignore-existing
```

---

## 🛠️ Phát triển

### Cấu trúc thư mục

```
vietrag/
├── backend/              # Node.js + TypeScript API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Next.js UI
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── next.config.js
├── docs/                 # Tài liệu
├── scripts/              # Scripts hỗ trợ
├── docker-compose.yml    # Full stack
├── docker-compose.dev.yml # Dev infra only
├── Dockerfile.frontend
├── Dockerfile.backend
├── .env.example
└── README.md
```

### Chạy dev mode

```bash
# Terminal 1: Hạ tầng
docker compose -f docker-compose.dev.yml up -d

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Chạy tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

---

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. **Fork** repo
2. Tạo **branch** mới: `git checkout -b feature/ten-tinh-nang`
3. **Commit** thay đổi: `git commit -m "feat: them tinh nang X"`
4. **Push** lên branch: `git push origin feature/ten-tinh-nang`
5. Tạo **Pull Request**

### Quy tắc commit

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — Tính năng mới
- `fix:` — Sửa lỗi
- `docs:` — Tài liệu
- `refactor:` — Tái cấu trúc
- `test:` — Thêm test
- `chore:` — Công việc khác

---

## 📄 Giấy phép

Dự án được phát hành theo giấy phép [MIT](https://opensource.org/licenses/MIT).

---

**Made with ❤️ in Vietnam**
