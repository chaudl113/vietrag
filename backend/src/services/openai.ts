import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, ' ')
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function chatCompletion(params: {
  message: string;
  context: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  try {
    const { message, context, conversationHistory = [] } = params;

    const systemMessage = `You are a helpful assistant that answers questions based on the provided context. 
If the context doesn't contain relevant information, say so politely and provide a general answer if possible.
Always cite which source documents you're referencing when possible.

Context:
${context}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content || 'No response generated';
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw new Error('Failed to generate chat response');
  }
}
