# VietRAG Backend

Backend API server for VietRAG - Vietnamese RAG (Retrieval-Augmented Generation) system.

## Prerequisites

- Node.js >= 18
- Elasticsearch 8.x running locally or remotely
- OpenAI API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` with your values:
- `OPENAI_API_KEY` - Your OpenAI API key
- `ELASTICSEARCH_URL` - Elasticsearch endpoint (default: http://localhost:9200)
- `PORT` - Server port (default: 3001)

4. Create uploads directory:
```bash
mkdir -p uploads
```

## Development

```bash
npm run dev
```

## Build & Run

```bash
npm run build
npm start
```

## API Endpoints

### Chat
- `POST /api/chat` - Send message and get RAG response
  - Body: `{ "message": "string", "conversationId?": "string" }`
  - Returns: `{ "answer": "string", "conversationId": "string", "sources": [...] }`

### Documents
- `POST /api/documents/upload` - Upload document (multipart/form-data, field: `file`)
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document by ID
- `DELETE /api/documents/:id` - Delete document and its chunks

### Search
- `POST /api/search` - Semantic search
  - Body: `{ "query": "string", "limit?": number }`
  - Returns: `{ "query": "string", "results": [...], "total": number }`

### Conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations/:id/messages` - Add message to conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Health
- `GET /health` - Health check

## PPT Generation API

### POST /api/ppt/generate
Upload document -> generate PPTX.

```bash
curl -X POST http://localhost:3001/api/ppt/generate \
  -F "file=@document.pdf" \
  -F "theme=professional" \
  -F "language=vi"
```

Response:
```json
{
  "success": true,
  "file_path": "/tmp/vietrag/ppt/document_abc123.pptx",
  "file_name": "document.pptx",
  "file_size": 30968,
  "slide_count": 10,
  "title": "Document Title",
  "theme": "professional",
  "downloadUrl": "/api/ppt/download/document_abc123.pptx"
}
```

### POST /api/ppt/from-text
Generate PPT from raw text.

```bash
curl -X POST http://localhost:3001/api/ppt/from-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Your content here...", "title": "My Presentation", "theme": "dark"}'
```

### GET /api/ppt/download/:filename
Download generated PPTX file.
