import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// In-memory conversation store (replace with database in production)
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    documentId: string;
    filename: string;
    score: number;
  }>;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const conversations: Map<string, Conversation> = new Map();

// POST /api/conversations - Create new conversation
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;
    const conversation: Conversation = {
      id: uuidv4(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    conversations.set(conversation.id, conversation);
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations - List all conversations
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = Array.from(conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(conv => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }));

    res.json(list);
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id - Get conversation with messages
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = conversations.get(req.params.id);
    if (!conversation) {
      throw createError(404, 'Conversation not found');
    }
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/messages - Add message to conversation
router.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, content, sources } = req.body;
    const conversation = conversations.get(req.params.id);

    if (!conversation) {
      throw createError(404, 'Conversation not found');
    }

    if (!role || !content) {
      throw createError(400, 'Role and content are required');
    }

    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      sources
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Update title if first message
    if (conversation.messages.length === 1 && role === 'user') {
      conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!conversations.has(req.params.id)) {
      throw createError(404, 'Conversation not found');
    }
    conversations.delete(req.params.id);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
