import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding, chatCompletion } from '../services/openai.js';
import { searchChunks, getDocument } from '../services/elasticsearch.js';

const router = Router();

interface ChatRequest {
  message: string;
  conversationId?: string;
}

interface Source {
  documentId: string;
  filename: string;
  content: string;
  score: number;
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, conversationId }: ChatRequest = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: { message: 'Message is required' } });
    }

    // Generate embedding for the user's message
    const embedding = await generateEmbedding(message);

    // Search for relevant chunks in Elasticsearch
    const chunks = await searchChunks(embedding, 5);

    // Build context and sources
    const contextParts: string[] = [];
    const sources: Source[] = [];
    const seenDocuments = new Set<string>();

    for (const chunk of chunks) {
      // Get document info for each chunk
      if (!seenDocuments.has(chunk.documentId)) {
        const doc = await getDocument(chunk.documentId);
        if (doc) {
          sources.push({
            documentId: chunk.documentId,
            filename: doc.filename,
            content: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
            score: chunk.score
          });
          seenDocuments.add(chunk.documentId);
        }
      }
      contextParts.push(`[Source: ${chunk.documentId}]\n${chunk.content}`);
    }

    const context = contextParts.join('\n\n---\n\n');

    // Generate response using OpenAI
    const answer = await chatCompletion({
      message,
      context,
      conversationHistory: [] // TODO: Load from conversation store
    });

    const responseConversationId = conversationId || uuidv4();

    res.json({
      answer,
      conversationId: responseConversationId,
      sources
    });
  } catch (error) {
    next(error);
  }
});

export default router;
