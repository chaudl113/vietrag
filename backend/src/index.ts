import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeIndices } from './services/elasticsearch.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import searchRouter from './routes/search.js';
import conversationsRouter from './routes/conversations.js';
import pptRouter from './routes/ppt.js';
import excelRouter from './routes/excel.js';
import authRouter from './routes/auth.js';
import templatesRouter from './routes/templates.js';
import generateRouter from './routes/generate.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/search', searchRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/ppt', pptRouter);
app.use('/api/excel', excelRouter);
app.use('/api/auth', authRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/generate', generateRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

// Global error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Initialize Elasticsearch indices (optional - skip if ES not available)
    try {
      await initializeIndices();
      console.log('Elasticsearch indices initialized');
    } catch (esErr) {
      console.warn('Elasticsearch not available, skipping (chat/search features disabled)');
    }

    app.listen(PORT, () => {
      console.log(`VietRAG backend server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API base: http://localhost:${PORT}/api`);
      console.log(`PPT generation: http://localhost:${PORT}/api/ppt/generate`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
