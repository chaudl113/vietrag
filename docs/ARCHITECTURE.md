# 🏗️ Kiến trúc VietRAG

## Tổng quan

VietRAG là hệ thống Retrieval-Augmented Generation (RAG) được thiết kế để xây dựng chatbot AI thông minh dựa trên dữ liệu riêng của doanh nghiệp.

---

## Thành phần hệ thống

### 1. Frontend (Next.js)
- **Port:** 3000
- **Trách nhiệm:** Giao diện người dùng, quản trị, chat UI
- **Công nghệ:** Next.js 14+, React, TypeScript, Tailwind CSS

### 2. Backend (Node.js/TypeScript)
- **Port:** 3001
- **Trách nhiệm:** API, RAG engine, xử lý tài liệu, xác thực
- **Công nghệ:** Express/Fastify, TypeScript

### 3. Elasticsearch 8.9.0
- **Port:** 9200
- **Trách nhiệm:** Vector storage, semantic search, full-text search
- **Chế độ:** Single-node, không security (dev)

### 4. MySQL 8.0
- **Port:** 3306
- **Trách nhiệm:** Metadata, user data, configurations

### 5. Redis 7
- **Port:** 6379
- **Trách nhiệm:** Cache, session, queue

### 6. MinIO
- **Port:** 9000 (API), 9001 (Console)
- **Trách nhiệm:** Lưu trữ file tài liệu (PDF, Word, ...)

---

## Luồng dữ liệu (Data Flow)

```
┌──────────┐     Upload file      ┌──────────┐
│  User    │ ───────────────────▶  │ Frontend │
└──────────┘                       └────┬─────┘
     ▲                                  │
     │                                  │ API Call
     │ Response                         ▼
     │                            ┌──────────┐
     └────────────────────────────│ Backend  │
                                  └────┬─────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
    ┌──────────────┐         ┌──────────────┐          ┌──────────────┐
    │    MinIO     │         │    MySQL     │          │    Redis     │
    │  Lưu file    │         │  Metadata    │          │   Cache      │
    └──────────────┘         └──────────────┘          └──────────────┘
            │
            │ Chunk & Embed
            ▼
    ┌──────────────┐
    │Elasticsearch │
    │ Vector Store │
    └──────┬───────┘
           │
           │ Similarity Search
           ▼
    ┌──────────────┐
    │  LLM API     │
    │  (OpenAI)    │
    │  Generate    │
    └──────────────┘
```

### Luồng Upload tài liệu
1. User upload file qua Frontend
2. Backend lưu file vào MinIO
3. Backend tạo metadata trong MySQL (status: processing)
4. Backend chunk văn bản → tạo embedding (OpenAI)
5. Backend lưu vectors vào Elasticsearch
6. Cập nhật MySQL status: completed

### Luồng Chat/Query
1. User gửi câu hỏi qua Frontend
2. Backend tạo embedding cho câu hỏi
3. Backend tìm kiếm vector tương đồng trên Elasticsearch
4. Backend lấy context chunks từ kết quả
5. Backend gửi prompt + context đến LLM
6. LLM trả lời dựa trên context (có cite nguồn)
7. Frontend hiển thị câu trả lời + nguồn tham khảo

---

## Thiết kế API

### Versioning
```
/api/v1/{resource}
```

### Authentication
- JWT Bearer Token
- Header: `Authorization: Bearer <token>`

### Endpoints chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /auth/register | Đăng ký |
| POST | /auth/login | Đăng nhập |
| GET | /health | Kiểm tra trạng thái |
| POST | /documents/upload | Upload tài liệu |
| GET | /documents | Danh sách tài liệu |
| DELETE | /documents/:id | Xóa tài liệu |
| POST | /chat/query | Gửi câu hỏi |
| GET | /chat/conversations | Danh sách hội thoại |
| GET | /chat/conversations/:id/messages | Tin nhắn hội thoại |
| POST | /knowledge-bases | Tạo knowledge base |
| GET | /knowledge-bases | Danh sách KB |

### Response format chuẩn
```json
{
  "success": true,
  "data": { ... },
  "message": "Thành công"
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Thiếu trường bắt buộc"
  }
}
```

---

## Schema cơ sở dữ liệu

### MySQL

**users**
```sql
CREATE TABLE users (
  id            VARCHAR(36) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  role          ENUM('admin', 'user') DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**documents**
```sql
CREATE TABLE documents (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  filename      VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100),
  size_bytes    BIGINT,
  pages         INT,
  status        ENUM('uploading', 'processing', 'completed', 'failed') DEFAULT 'uploading',
  category      VARCHAR(100),
  minio_path    VARCHAR(500),
  chunk_count   INT DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**conversations**
```sql
CREATE TABLE conversations (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  title         VARCHAR(500),
  kb_id         VARCHAR(36),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**messages**
```sql
CREATE TABLE messages (
  id              VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  role            ENUM('user', 'assistant', 'system') NOT NULL,
  content         TEXT NOT NULL,
  sources         JSON,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

**knowledge_bases**
```sql
CREATE TABLE knowledge_bases (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Elasticsearch

**documents index**
```json
{
  "mappings": {
    "properties": {
      "document_id": { "type": "keyword" },
      "chunk_index": { "type": "integer" },
      "content": { "type": "text" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536
      },
      "metadata": {
        "properties": {
          "filename": { "type": "keyword" },
          "page": { "type": "integer" },
          "category": { "type": "keyword" }
        }
      }
    }
  }
}
```

---

## Tùy chọn triển khai

### Development (local)
```bash
docker compose -f docker-compose.dev.yml up -d  # Hạ tầng
cd backend && npm run dev                         # Backend local
cd frontend && npm run dev                        # Frontend local
```

### Production (Docker)
```bash
docker compose up -d --build
```

### Production (máy chủ riêng)
- Nginx reverse proxy
- SSL/TLS với Let's Encrypt
- PM2 cho Node.js process management
- External MySQL/Redis cho HA

### Cloud (AWS/GCP/Azure)
- RDS cho MySQL
- ElastiCache cho Redis
- S3/GCS thay MinIO
- OpenSearch thay Elasticsearch

---

## Bảo mật

- JWT authentication cho tất cả API
- CORS restrict origin
- Rate limiting (100 req/min)
- File upload validation (type, size)
- Input sanitization
- Mật khẩu hash bằng bcrypt
- Secrets trong .env (không commit)
