# 🇻🇳 VietRAG — Hệ thống RAG tiếng Việt

VietRAG là một ứng dụng web hỏi đáp trên tài liệu (RAG — Retrieval-Augmented Generation):
tải tài liệu lên, backend cắt thành đoạn, tạo embedding bằng OpenAI và lưu vào Elasticsearch;
khi hỏi, backend tìm các đoạn gần nhất bằng kNN rồi đưa làm ngữ cảnh cho model chat của OpenAI.
Ngoài ra có tạo slide PowerPoint, file Excel và tài liệu Markdown bằng LLM.

Giao diện và prompt tạo tài liệu viết bằng tiếng Việt. Phần xử lý văn bản (cắt đoạn, tìm kiếm)
**chưa có xử lý riêng cho tiếng Việt** — xem [Hạn chế đã biết](#-hạn-chế-đã-biết).

---

## 📐 Kiến trúc

```
Trình duyệt ──► Next.js (frontend, :3000)
                  │  gọi đường dẫn tương đối /api/*
                  │  next.config.js rewrite ─► http://localhost:3001/api/*
                  ▼
               Express + TypeScript (backend, :3001)
                  ├─► Elasticsearch 8.9 (:9200)   chunk + embedding, metadata tài liệu
                  ├─► SQLite (backend/data/vietrag.db)   users, templates, generated_files
                  ├─► Ổ đĩa local: uploads/, outputs/{ppt,excel,generated}
                  ├─► OpenAI API   text-embedding-3-small, gpt-4o-mini
                  └─► python3 (tiến trình con, mỗi request một lần)
                         src/services/ppt/cli.py     tạo .pptx (cũng gọi OpenAI)
                         src/services/excel/cli.py   tạo .xlsx
```

| Thành phần | Thực tế trong code | File |
|---|---|---|
| Tiến trình | 2 tiến trình Node chạy lâu dài (Next.js, Express) + Elasticsearch. Python không phải service: backend spawn `python3` cho từng request PPT/Excel/đọc template `.docx` | `backend/src/index.ts`, `backend/src/routes/ppt.ts` |
| Frontend → backend | Frontend gọi `/api/...` (đường dẫn tương đối). Next.js rewrite sang `http://localhost:3001` — địa chỉ viết cứng, không có biến env | `frontend/next.config.js`, `frontend/src/lib/api.ts` |
| Vector store | Elasticsearch, index `vietrag_chunks` (`dense_vector` 1536 chiều, cosine) và `vietrag_documents` | `backend/src/services/elasticsearch.ts` |
| CSDL quan hệ | SQLite qua `better-sqlite3` (WAL), file `data/vietrag.db` tính từ thư mục đang chạy | `backend/src/services/db.ts` |
| LLM | Chỉ OpenAI. Model viết cứng: `text-embedding-3-small`, `gpt-4o-mini` (cả TS và Python) | `backend/src/services/openai.ts`, `backend/src/routes/generate.ts`, `backend/src/services/ppt/slide_planner.py` |
| Đăng nhập | JWT (hạn 7 ngày) ký bằng `JWT_SECRET`, mật khẩu băm bằng bcrypt; frontend giữ token trong `localStorage` | `backend/src/middleware/auth.ts`, `backend/src/routes/auth.ts`, `frontend/src/app/login/page.tsx` |
| Ranh giới TS ↔ Python | `execFileSync(<backend>/.venv/bin/python3, [cli.py, lệnh, --flag=giá_trị ...])`, không qua shell; Python in JSON ra stdout, lỗi in JSON ra stderr và exit 1 | `backend/src/routes/ppt.ts`, `backend/src/routes/excel.ts`, `backend/src/routes/generate.ts` |

Lưu ý: backend dùng `process.cwd()` để tìm `data/`, `uploads/`, `outputs/`, `.venv/` và `src/services/**/cli.py`,
nên phải chạy backend **từ thư mục `backend/`**.

---

## ✨ Chức năng có trong code

| Chức năng | Endpoint | Cần đăng nhập? |
|---|---|---|
| Kiểm tra sống | `GET /health` → `{ status, timestamp }` | Không |
| Đăng ký / đăng nhập | `POST /api/auth/register`, `POST /api/auth/login` | Không |
| Thông tin user hiện tại | `GET /api/auth/me` | JWT |
| Danh sách user | `GET /api/auth/users` | JWT + role `admin` |
| Upload tài liệu vào RAG (chỉ `.txt` được trích text) | `POST /api/documents/upload`, `GET /api/documents`, `GET /api/documents/:id`, `DELETE /api/documents/:id` | Không |
| Hỏi đáp RAG (top 5 chunk) | `POST /api/chat` | Không |
| Tìm kiếm ngữ nghĩa | `POST /api/search` | Không |
| Hội thoại (lưu trong RAM) | `/api/conversations` (POST, GET, GET `:id`, POST `:id/messages`, DELETE `:id`) | Không |
| Tạo slide từ file `.pdf/.docx/.doc/.txt/.md` hoặc từ text | `POST /api/ppt/generate`, `POST /api/ppt/from-text`, `GET /api/ppt/download/:filename` | Không |
| Tạo Excel từ 4 mẫu (`invoice`, `budget`, `employee`, `inventory`) hoặc từ dữ liệu | `GET /api/excel/templates`, `POST /api/excel/generate`, `POST /api/excel/from-data`, `GET /api/excel/download/:filename` | Không |
| Quản lý file mẫu | `GET /api/templates`, `GET /api/templates/:id`, `GET /api/templates/:id/download` | Không |
| | `POST /api/templates`, `DELETE /api/templates/:id` | JWT (user bất kỳ) |
| Tạo tài liệu Markdown bằng LLM (theo mẫu hoặc tự do) | `POST /api/generate/from-template`, `POST /api/generate/free`, `GET /api/generate/history` | JWT |
| | `GET /api/generate/download/:filename` | Không |

Trang frontend (`frontend/src/app/`): `/`, `/login`, `/chat`, `/search`, `/upload`, `/ppt`, `/admin`.

---

## 🚀 Chạy local

Yêu cầu: Node.js (Dockerfile dùng `node:18`), Python 3, Docker (chỉ để chạy Elasticsearch), OpenAI API key.

### 1. Elasticsearch

Chạy riêng một container với cấu hình giống `docker-compose.yml`:

```bash
docker run -d --name vietrag-es -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch:8.9.0
```

Nếu Elasticsearch không chạy, backend vẫn khởi động (chỉ in cảnh báo) nhưng upload/chat/search sẽ lỗi khi gọi.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Sửa .env: điền OPENAI_API_KEY và JWT_SECRET (tạo bằng: openssl rand -hex 32)

npm install

# Python venv cho route PPT / Excel / đọc template .docx — đường dẫn phải đúng là backend/.venv
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt openpyxl   # openpyxl chưa có trong requirements.txt nhưng Excel cần

npm run dev          # tsx watch src/index.ts → http://localhost:3001, kiểm tra: /health
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Backend phải nghe cổng 3001 vì rewrite trong `frontend/next.config.js` viết cứng cổng này.

### Biến môi trường của backend (`backend/.env`)

| Biến | Bắt buộc | Mặc định trong code | Đọc ở |
|---|---|---|---|
| `JWT_SECRET` | **Có** — thiếu hoặc rỗng thì backend dừng ngay khi khởi động | không có | `backend/src/middleware/auth.ts` |
| `OPENAI_API_KEY` | Có (embedding, chat, tạo tài liệu; tiến trình Python kế thừa biến này) | không có | `backend/src/services/openai.ts` |
| `ELASTICSEARCH_URL` | Không | `http://localhost:9200` | `backend/src/services/elasticsearch.ts` |
| `PORT` | Không | `3001` | `backend/src/index.ts` |
| `CORS_ORIGINS` | Không (phân tách bằng dấu phẩy) | `http://localhost:3000,http://localhost:5173` | `backend/src/index.ts` |
| `NODE_ENV` | Không — bằng `development` thì response lỗi kèm stack trace | — | `backend/src/middleware/errorHandler.ts` |

### Test và kiểm tra tĩnh

```bash
cd backend
npm test         # node:test, các file backend/test/*.test.ts
npm run lint     # eslint src test
npx tsc --noEmit
```

Test dùng thư mục tạm, `python3` giả và không gọi OpenAI (`backend/test/helpers.ts`).
Frontend chưa có test và chưa có script `test`.

### Docker Compose

`docker-compose.yml` khai báo 3 service: `elasticsearch`, `backend`, `frontend`. File `.env` ở thư mục gốc
(từ `.env.example`) cần `OPENAI_API_KEY` và `JWT_SECRET`; thiếu `JWT_SECRET` thì `docker compose` báo lỗi và dừng.

Chạy **toàn bộ stack** bằng Docker hiện **chưa dùng được** — xem mục "Docker full stack" ở phần hạn chế.
Hãy chạy local như trên.

---

## 🧭 Quyết định kỹ thuật

Mỗi mục ghi đánh đổi đọc được từ code: được gì, mất gì, khi nào nên đổi.

### 1. Elasticsearch làm vector store

Code: `backend/src/services/elasticsearch.ts` — field `embedding` kiểu `dense_vector` (1536 chiều, `similarity: cosine`),
truy vấn `knn` với `k = limit`, `num_candidates: 100`.

- **Được:** một service vừa lưu vector vừa lưu nội dung chunk và metadata tài liệu; kNN chạy trong Elasticsearch
  nên backend không phải tự tính khoảng cách. Field `content` cũng đã được index dạng `text`, nên có sẵn chỗ để thêm
  tìm kiếm từ khoá (BM25) sau này.
- **Mất:** thêm một tiến trình JVM nặng (compose cấp heap 512 MB) chỉ để làm kNN — code hiện **chỉ dùng kNN**, chưa dùng
  tìm kiếm từ khoá. Số chiều 1536 viết cứng theo `text-embedding-3-small`: đổi model embedding là phải tạo lại index
  và embed lại toàn bộ tài liệu. Metadata tài liệu nằm ở Elasticsearch trong khi user/template nằm ở SQLite, nên hai
  nơi lưu không có ràng buộc chung.
- **Khi nào nên đổi:** nếu vẫn chỉ cần kNN ở quy mô nhỏ, một vector store nhúng (ví dụ extension vector cho SQLite/Postgres)
  bớt được một service. Nếu cần kết hợp từ khoá + vector (hybrid search), nên giữ Elasticsearch và dùng thêm field `content`.

### 2. Cắt tài liệu: theo đoạn trước, rồi cửa sổ 500 từ chồng 50

Code: `backend/src/routes/documents.ts` gọi `chunkText(text, { chunkSize: 500, overlap: 50, strategy: 'paragraphs' })`
trong `backend/src/services/chunker.ts`.

Cơ chế thật:
1. Tách văn bản theo dòng trống thành các đoạn.
2. Đoạn có **độ dài ≤ 500 ký tự** giữ nguyên thành 1 chunk.
3. Đoạn dài hơn thì cắt theo "từ" (tách bằng khoảng trắng): cửa sổ 500 từ, mỗi bước tiến 450 từ (chồng 50 từ).
   Đoạn dài hơn 500 ký tự nhưng không quá 500 từ vẫn ra 1 chunk.
4. Các đoạn ngắn **không được gộp** với nhau.

- **Được:** chunk bám theo ranh giới đoạn nên thường là một ý trọn vẹn; phần chồng 50 từ giữ ngữ cảnh ở chỗ cắt
  của đoạn rất dài. Logic đơn giản, không cần tokenizer.
- **Mất:** ngưỡng giữ nguyên tính bằng **ký tự** còn cửa sổ cắt tính bằng **từ** — hai đơn vị khác nhau. Tài liệu nhiều
  đoạn ngắn sinh nhiều chunk rất nhỏ, mỗi chunk tốn một lần gọi embedding và ít ngữ cảnh. "Từ" ở đây là cụm giữa hai
  khoảng trắng, với tiếng Việt tức là **âm tiết**, không phải từ. Kích thước chunk không đo bằng token của model.
- **Khi nào nên đổi:** khi chất lượng truy hồi kém với tài liệu nhiều đoạn ngắn (gộp đoạn cho tới một ngưỡng), hoặc
  khi cần kiểm soát chi phí/độ dài ngữ cảnh chính xác (cắt theo token).

### 3. Gọi Python bằng tiến trình con với argv, không qua shell

Code: `backend/src/routes/ppt.ts`, `backend/src/routes/excel.ts`, `backend/src/routes/generate.ts` dùng `execFileSync`;
test ở `backend/test/ppt.test.ts`, `backend/test/excel.test.ts`, `backend/test/generate.test.ts`.

- **Được:** dùng thẳng thư viện Python (`python-pptx`, `PyMuPDF`, `python-docx`, `openpyxl`) mà không phải dựng
  service riêng. Mỗi giá trị là một phần tử argv dạng `--flag=giá_trị`, không có shell nên dấu nháy, `$()`, backtick
  giữ nguyên là chữ; giá trị bắt đầu bằng `-` không bị hiểu thành flag khác. `theme`, `language`, tên mẫu Excel còn
  được kiểm tra theo danh sách cho phép trước khi spawn. Hợp đồng giữa hai bên đơn giản: JSON qua stdout/stderr.
- **Mất:** `execFileSync` là lời gọi **đồng bộ** — trong lúc Python chạy (timeout tới 120 giây với PPT), event loop
  của Node bị chặn và **mọi request khác phải chờ**. Mỗi request tốn chi phí khởi động Python. Đường dẫn
  `backend/.venv/bin/python3` viết cứng theo thư mục đang chạy, nên môi trường nào cũng phải tạo venv đúng chỗ đó.
- **Khi nào nên đổi:** khi có nhiều hơn một người dùng đồng thời — tối thiểu chuyển sang `execFile`/`spawn` bất đồng bộ;
  xa hơn là hàng đợi job hoặc một service Python chạy lâu dài.

### 4. Không dùng MySQL, Redis, MinIO

Trước đây `docker-compose.yml` khai báo ba service này nhưng không dòng code nào trong `backend/` hay `frontend/`
dùng tới, nên đã bỏ. Dữ liệu quan hệ nằm trong SQLite (`backend/src/services/db.ts`), file nằm trên ổ đĩa local.

- **Được:** ít container, ít cổng mở, ít mật khẩu mặc định; cấu hình mô tả đúng hệ thống đang chạy. SQLite nhúng
  trong tiến trình, không cần cài đặt.
- **Mất:** chỉ chạy được **một instance** backend — file SQLite và thư mục `uploads/`, `outputs/` không chia sẻ được giữa
  nhiều máy. Không có cache (mỗi câu hỏi đều gọi embedding lại) và không có object storage.
- **Khi nào nên đổi:** khi cần chạy nhiều instance backend (chuyển file sang object storage, dữ liệu sang CSDL dạng server),
  hoặc khi chi phí embedding cho câu hỏi lặp lại đáng kể (thêm cache).

### 5. JWT không trạng thái, lưu ở `localStorage`

Code: `backend/src/middleware/auth.ts`, `frontend/src/app/login/page.tsx`.

- **Được:** backend không cần lưu session; kiểm tra token chỉ là một phép verify chữ ký.
- **Mất:** không thu hồi được token trước khi hết hạn 7 ngày; role nằm trong token nên đổi role chỉ có hiệu lực ở lần
  đăng nhập sau; token trong `localStorage` đọc được bởi bất kỳ script nào chạy trên trang (rủi ro khi có XSS).
  Không có giá trị mặc định cho `JWT_SECRET` — thiếu là không khởi động.
- **Khi nào nên đổi:** khi cần đăng xuất cưỡng bức/khoá tài khoản ngay (session phía server hoặc danh sách thu hồi),
  hoặc khi muốn giảm rủi ro XSS (cookie `httpOnly`).

---

## ⚠️ Hạn chế đã biết

Kiểm tra tại commit hiện tại của nhánh này.

**Phân quyền**
- Không có xác thực trên: `/api/chat`, `/api/search`, `/api/documents/*` (kể cả xoá), `/api/conversations/*`,
  `/api/ppt/*`, `/api/excel/*`, `GET /api/templates*`, `GET /api/generate/download/:filename`.
  Ai gọi được backend là upload/xoá tài liệu và dùng OpenAI key của hệ thống được.
- `POST`/`DELETE /api/templates` chỉ cần đăng nhập, không kiểm tra chủ sở hữu hay role: user bất kỳ xoá được mẫu của người khác.
- Không có API tạo hay nâng quyền admin; role `admin` chỉ có được bằng cách sửa trực tiếp bảng `users` trong SQLite.
- Trang `/admin` của frontend chỉ kiểm tra có token trong `localStorage`, không kiểm tra role.

**RAG**
- Upload tài liệu RAG chỉ trích text từ `.txt`. `.pdf`, `.doc`, `.docx` qua được bộ lọc MIME nhưng trả lỗi 400
  "File type not yet supported" (`backend/src/routes/documents.ts`). (Route PPT thì có đọc PDF/DOCX qua Python.)
- Chat không dùng lịch sử hội thoại (`conversationHistory: []`, có `TODO` trong `backend/src/routes/chat.ts`).
  `/api/conversations` lưu trong RAM, mất khi khởi động lại, và không nối với `/api/chat`.
- Embedding các chunk được gọi song song không giới hạn; nếu một lần gọi lỗi, tài liệu đã được index trước đó vẫn còn
  với số chunk không đầy đủ (không rollback).
- `GET /api/documents` trả tối đa 100 tài liệu. Xoá tài liệu không xoá file đã upload trong `uploads/`.
- Chunk cuối của một đoạn dài có thể trùng hoàn toàn với phần chồng của chunk trước (vòng lặp trong `overlapChunk`).
- Model và tham số LLM viết cứng, không đổi được qua cấu hình; chỉ hỗ trợ OpenAI.

**Tiếng Việt**
- Không có xử lý riêng cho tiếng Việt: không tách từ tiếng Việt, mapping Elasticsearch không khai báo analyzer, cắt
  chunk theo khoảng trắng (tức theo âm tiết), embedding dùng model đa dụng của OpenAI.
- System prompt của chat RAG viết bằng tiếng Anh và không yêu cầu trả lời bằng tiếng Việt (`backend/src/services/openai.ts`).
  Tiếng Việt chỉ xuất hiện ở giao diện, thông báo lỗi và prompt của `/api/generate/*`.

**Chất lượng code**
- `npx tsc --noEmit` trong `backend/` báo 9 lỗi, tất cả ở `backend/src/services/elasticsearch.ts` (kiểu tham số
  `body` không khớp client `@elastic/elasticsearch` 9.x). `npm run dev` vẫn chạy vì `tsx` không kiểm tra kiểu,
  nhưng `npm run build` thất bại.
- `npm run lint` trong `backend/` báo 37 lỗi.
- `backend/package.json` dùng client `@elastic/elasticsearch` ^9.4.2 trong khi image là Elasticsearch 8.9.0;
  tương thích giữa hai phiên bản này chưa được kiểm chứng.
- Test backend (30 test trong `backend/test/`) tập trung vào xác thực, `JWT_SECRET`, chống chèn lệnh và path traversal;
  chưa có test cho chunking, RAG hay Elasticsearch. Frontend có 0 test.
- `execFileSync` chặn event loop trong lúc tạo PPT/Excel (xem Quyết định 3).
- File tải về bị xoá sau 1 giờ bằng `setTimeout` trong bộ nhớ; khởi động lại backend trước đó thì file ở lại.

**Docker full stack**
- `Dockerfile.backend` chạy `npm run build`, hiện thất bại vì lỗi `tsc` ở trên.
- Image backend không có Python, `.venv` hay các file `src/services/**/*.py`, nên route PPT/Excel không chạy trong container.
- Rewrite `/api/*` → `http://localhost:3001` trong `frontend/next.config.js` trỏ về chính container frontend, không tới backend.
- `Dockerfile.frontend` copy thư mục `public/` nhưng `frontend/` không có thư mục này.
- Elasticsearch trong compose tắt bảo mật (`xpack.security.enabled=false`) và publish cổng 9200.

**Tài liệu cũ**
- `docs/ARCHITECTURE.md`, `docker-compose.dev.yml` và `scripts/setup.sh` vẫn mô tả/khởi động MySQL, Redis, MinIO;
  chưa được cập nhật theo README này.

---

## 📁 Cấu trúc thư mục

```
vietrag/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app, đăng ký route, GET /health
│   │   ├── middleware/           # auth.ts (JWT), errorHandler.ts
│   │   ├── routes/               # auth, chat, conversations, documents, excel, generate, ppt, search, templates
│   │   ├── services/
│   │   │   ├── chunker.ts, elasticsearch.ts, openai.ts, db.ts
│   │   │   ├── ppt/              # Python: trích xuất tài liệu, lập kế hoạch slide, dựng .pptx
│   │   │   └── excel/            # Python: dựng .xlsx
│   │   └── utils/downloadPath.ts # chặn path traversal ở route download
│   ├── test/                     # node:test
│   ├── requirements.txt          # thư viện Python
│   └── .env.example
├── frontend/
│   ├── src/app/                  # các trang Next.js (App Router)
│   ├── src/lib/api.ts
│   └── next.config.js            # rewrite /api/* sang backend
├── docker-compose.yml            # elasticsearch + backend + frontend
├── Dockerfile.backend
├── Dockerfile.frontend
└── .env.example                  # biến cho docker compose
```

---

## 📄 Giấy phép

Chưa có file giấy phép trong repo.
