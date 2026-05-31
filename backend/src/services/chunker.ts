export interface Chunk {
  content: string;
  metadata: {
    pageNumber?: number;
    section?: string;
    index: number;
  };
}

export function splitByParagraphs(text: string): string[] {
  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

export function overlapChunk(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): Chunk[] {
  const { chunkSize = 500, overlap = 50 } = options;

  const chunks: Chunk[] = [];
  const words = text.split(/\s+/);

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + chunkSize, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const content = chunkWords.join(' ');

    if (content.trim().length > 0) {
      chunks.push({
        content,
        metadata: {
          index: chunkIndex
        }
      });
      chunkIndex++;
    }

    // Move forward by chunkSize - overlap
    startIndex += chunkSize - overlap;

    // Prevent infinite loop if overlap >= chunkSize
    if (startIndex <= endIndex - chunkSize) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    strategy?: 'paragraphs' | 'words';
  } = {}
): Chunk[] {
  const { chunkSize = 500, overlap = 50, strategy = 'words' } = options;

  if (strategy === 'paragraphs') {
    const paragraphs = splitByParagraphs(text);
    const chunks: Chunk[] = [];

    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length <= chunkSize) {
        chunks.push({
          content: paragraph,
          metadata: {
            section: `Paragraph ${index + 1}`,
            index
          }
        });
      } else {
        // Split long paragraphs into smaller chunks
        const subChunks = overlapChunk(paragraph, { chunkSize, overlap });
        subChunks.forEach((subChunk, subIndex) => {
          chunks.push({
            content: subChunk.content,
            metadata: {
              section: `Paragraph ${index + 1}, Part ${subIndex + 1}`,
              index: chunks.length
            }
          });
        });
      }
    });

    return chunks;
  }

  // Default: word-based chunking
  return overlapChunk(text, { chunkSize, overlap });
}
