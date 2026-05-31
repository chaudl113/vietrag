import { Router, Request, Response, NextFunction } from 'express';
import { generateEmbedding } from '../services/openai.js';
import { searchChunks, getDocument } from '../services/elasticsearch.js';

const router = Router();

interface SearchRequest {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  documentId: string;
  filename: string;
  content: string;
  snippet: string;
  score: number;
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit = 10 }: SearchRequest = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: { message: 'Query is required' } });
    }

    // Generate embedding for search query
    const embedding = await generateEmbedding(query);

    // Search for similar chunks
    const chunks = await searchChunks(embedding, limit);

    // Enrich results with document info
    const results: SearchResult[] = [];
    for (const chunk of chunks) {
      const doc = await getDocument(chunk.documentId);
      if (doc) {
        results.push({
          id: chunk.id,
          documentId: chunk.documentId,
          filename: doc.filename,
          content: chunk.content,
          snippet: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
          score: chunk.score
        });
      }
    }

    res.json({
      query,
      results,
      total: results.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
