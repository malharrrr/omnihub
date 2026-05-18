import cosineSimilarity from 'cosine-similarity';
import { CONFIG } from '../config.js';
import { getEmbeddingProvider } from './embedding.js';
import {loadMemories, addMemoryRecord, updateMemoryRecord, type Memory} from './storage.js';

export function validateContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty.');
  }
  if (content.length > CONFIG.maxContentLength) {
    throw new Error(
      `Content exceeds maximum length of ${CONFIG.maxContentLength} characters.`
    );
  }
}

export function validateCategory(category: string): void {
  if (!CONFIG.categories.includes(category)) {
    throw new Error(
      `Invalid category "${category}". Must be one of: ${CONFIG.categories.join(', ')}`
    );
  }
}

//auto categorize function
export async function autoCategorize(content: string): Promise<string> {
  const contentLower = content.toLowerCase();
  
  // local keyword mapping for your categories, feel free to change it as per your use case
  const heuristics: Record<string, string[]> = {
    bug_fix: ['bug', 'fix', 'error', 'crash', 'exception', 'issue', 'fail', 'broken', 'patch'],
    tech_stack: ['react', 'node', 'npm', 'bun', 'docker', 'typescript', 'python', 'sql', 'db', 'database', 'library', 'package', 'framework'],
    architecture: ['architecture', 'system', 'pattern', 'design', 'api', 'endpoint', 'infrastructure', 'auth', 'schema', 'routing'],
    meeting_notes: ['meeting', 'discussed', 'team', 'sync', 'client', 'standup', 'call', 'agreed', 'manager'],
  };

  const scores: Record<string, number> = {};
  for (const cat of CONFIG.categories) scores[cat] = 0;

  const words = contentLower.match(/\b\w{3,}\b/g) || [];

  for (const word of words) {
    for (const [category, keywords] of Object.entries(heuristics)) {
      if (keywords.includes(word)) {
        scores[category] += 1;
      }
    }
  }
  let bestCategory = 'idea'; 
  let maxScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
// add memory function
export async function addMemory(category: string, content: string): Promise<string> {
  validateContent(content);
  validateCategory(category);

  const provider = getEmbeddingProvider();
  let embedding: number[];

  try {
    embedding = await provider.embed(content);
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}\n` +
      `Check your API key and network connection.`
    );
  }

  addMemoryRecord({
    id: Date.now().toString(),
    category,
    content,
    embedding,
    createdAt: new Date().toISOString(),
  });

  return `Memory stored successfully under category: ${category}.`;
}
// edit memory function 
export async function editMemory(
  id: string,
  newContent: string,
  newCategory?: string
): Promise<string> {
  validateContent(newContent);
  if (newCategory) validateCategory(newCategory);

  const provider = getEmbeddingProvider();
  let embedding: number[];

  try {
    embedding = await provider.embed(newContent);
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const patch: Partial<Pick<Memory, 'content' | 'category' | 'embedding'>> = {
    content: newContent,
    embedding,
  };
  if (newCategory) patch.category = newCategory;

  const ok = updateMemoryRecord(id, patch);
  if (!ok) throw new Error(`Memory with id "${id}" not found.`);

  return `Memory ${id} updated successfully.`;
}

function calculateKeywordScore(query: string, content: string): number {
  // extract words longer than 2 chars to avoid generic stop words (it, is, a, to)
  const queryTerms = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
  if (queryTerms.length === 0) return 0;

  const contentLower = content.toLowerCase();
  let hits = 0;

  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      hits++;
    }
  }
  return hits / queryTerms.length; 
}
// omnihub search
export interface SearchResult extends Omit<Memory, 'embedding'> {
  similarity: number;
  keywordScore: number;
  combinedScore: number;
}

export async function searchMemories(
  query: string,
  limit: number = CONFIG.defaultSearchLimit,
  minScore: number = 0,
  category?: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty.');
  }

  const provider = getEmbeddingProvider();
  let queryVector: number[];

  try {
    queryVector = await provider.embed(query);
  } catch (error) {
    throw new Error(
      `Failed to generate search embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const memories = loadMemories();

  const VECTOR_WEIGHT = 0.7;
  const KEYWORD_WEIGHT = 0.3;

  const results = memories
    .filter((m) => (category ? m.category === category : true))
    .map((m) => {
      const vectorScore = cosineSimilarity(queryVector, m.embedding) as number;
      const kwScore = calculateKeywordScore(query, m.content);
      
      const combinedScore = (vectorScore * VECTOR_WEIGHT) + (kwScore * KEYWORD_WEIGHT);

      return {
        id: m.id,
        category: m.category,
        content: m.content,
        createdAt: m.createdAt,
        similarity: vectorScore,
        keywordScore: kwScore,
        combinedScore: combinedScore,
      };
    })
    .filter((m) => m.combinedScore >= minScore)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);

  return results;
}