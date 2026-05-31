import { Client } from 'elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const CHUNKS_INDEX = 'vietrag_chunks';
const DOCUMENTS_INDEX = 'vietrag_documents';

export const client = new Client({ node: ELASTICSEARCH_URL });

// Vector dimensions for text-embedding-3-small
const VECTOR_DIMS = 1536;

export async function initializeIndices(): Promise<void> {
  try {
    // Create chunks index with vector mapping
    const chunksExists = await client.indices.exists({ index: CHUNKS_INDEX });
    if (!chunksExists) {
      await client.indices.create({
        index: CHUNKS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              documentId: { type: 'keyword' },
              content: { type: 'text' },
              embedding: {
                type: 'dense_vector',
                dims: VECTOR_DIMS,
                index: true,
                similarity: 'cosine'
              },
              metadata: {
                type: 'object',
                properties: {
                  pageNumber: { type: 'integer' },
                  section: { type: 'text' }
                }
              },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`Created index: ${CHUNKS_INDEX}`);
    }

    // Create documents index
    const docsExists = await client.indices.exists({ index: DOCUMENTS_INDEX });
    if (!docsExists) {
      await client.indices.create({
        index: DOCUMENTS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              filename: { type: 'text' },
              originalName: { type: 'text' },
              mimeType: { type: 'keyword' },
              size: { type: 'long' },
              chunkCount: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`Created index: ${DOCUMENTS_INDEX}`);
    }
  } catch (error) {
    console.error('Error initializing Elasticsearch indices:', error);
    throw error;
  }
}

// Chunk operations
export async function indexChunk(chunk: {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}): Promise<void> {
  await client.index({
    index: CHUNKS_INDEX,
    id: chunk.id,
    body: {
      ...chunk,
      createdAt: new Date().toISOString()
    },
    refresh: 'wait_for'
  });
}

export async function searchChunks(embedding: number[], limit: number = 5): Promise<Array<{
  id: string;
  documentId: string;
  content: string;
  score: number;
}>> {
  const result = await client.search({
    index: CHUNKS_INDEX,
    body: {
      knn: {
        field: 'embedding',
        query_vector: embedding,
        k: limit,
        num_candidates: 100
      },
      _source: ['id', 'documentId', 'content']
    }
  });

  return (result.hits.hits as any[]).map(hit => ({
    id: hit._id,
    documentId: hit._source.documentId,
    content: hit._source.content,
    score: hit._score
  }));
}

export async function deleteChunksByDocumentId(documentId: string): Promise<void> {
  await client.deleteByQuery({
    index: CHUNKS_INDEX,
    body: {
      query: {
        term: { documentId }
      }
    },
    refresh: true
  });
}

export async function getChunkCount(documentId: string): Promise<number> {
  const result = await client.count({
    index: CHUNKS_INDEX,
    body: {
      query: {
        term: { documentId }
      }
    }
  });
  return result.count;
}

// Document operations
export async function indexDocument(document: {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  chunkCount: number;
}): Promise<void> {
  await client.index({
    index: DOCUMENTS_INDEX,
    id: document.id,
    body: {
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    refresh: 'wait_for'
  });
}

export async function getDocument(id: string): Promise<any> {
  try {
    const result = await client.get({
      index: DOCUMENTS_INDEX,
      id
    });
    return result._source;
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function getAllDocuments(): Promise<any[]> {
  const result = await client.search({
    index: DOCUMENTS_INDEX,
    body: {
      query: { match_all: {} },
      sort: [{ createdAt: 'desc' }]
    },
    size: 100
  });

  return (result.hits.hits as any[]).map(hit => ({
    id: hit._id,
    ...hit._source
  }));
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    // Delete all chunks for this document
    await deleteChunksByDocumentId(id);

    // Delete the document itself
    await client.delete({
      index: DOCUMENTS_INDEX,
      id,
      refresh: 'wait_for'
    });
    return true;
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function updateDocumentChunkCount(id: string, chunkCount: number): Promise<void> {
  await client.update({
    index: DOCUMENTS_INDEX,
    id,
    body: {
      doc: {
        chunkCount,
        updatedAt: new Date().toISOString()
      }
    },
    refresh: 'wait_for'
  });
}
