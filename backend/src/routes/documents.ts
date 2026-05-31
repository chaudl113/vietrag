import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from '../services/openai.js';
import { chunkText } from '../services/chunker.js';
import {
  indexDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  indexChunk,
  updateDocumentChunkCount
} from '../services/elasticsearch.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError(400, 'Invalid file type. Only .txt, .pdf, .doc, .docx allowed'));
    }
  }
});

// Helper to extract text from file (simplified - in production use proper parsers)
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  // For now, only handle plain text files
  // In production, use pdf-parse, mammoth, etc.
  if (file.mimetype === 'text/plain') {
    const fs = await import('fs/promises');
    return fs.readFile(file.path, 'utf-8');
  }
  // Placeholder for other file types
  throw createError(400, 'File type not yet supported for text extraction');
}

// POST /api/documents/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw createError(400, 'No file uploaded');
    }

    const file = req.file;
    const documentId = uuidv4();

    // Extract text from file
    const text = await extractTextFromFile(file);

    // Chunk the text
    const chunks = chunkText(text, {
      chunkSize: 500,
      overlap: 50,
      strategy: 'paragraphs'
    });

    // Index document first
    await indexDocument({
      id: documentId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      chunkCount: chunks.length
    });

    // Generate embeddings and index chunks
    const chunkPromises = chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk.content);
      return indexChunk({
        id: `${documentId}_chunk_${index}`,
        documentId,
        content: chunk.content,
        embedding,
        metadata: chunk.metadata
      });
    });

    await Promise.all(chunkPromises);

    // Update chunk count
    await updateDocumentChunkCount(documentId, chunks.length);

    res.status(201).json({
      id: documentId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      chunkCount: chunks.length,
      message: 'Document uploaded and indexed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = await getAllDocuments();
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await getDocument(req.params.id);
    if (!document) {
      throw createError(404, 'Document not found');
    }
    res.json(document);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteDocument(req.params.id);
    if (!deleted) {
      throw createError(404, 'Document not found');
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
