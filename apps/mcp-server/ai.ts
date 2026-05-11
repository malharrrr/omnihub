import cosineSimilarity from 'cosine-similarity';
import { CONFIG, getApiKey, getProvider } from '../config.js';
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

//auto catdegorizd function
export async function autoCategorize(content: string): Promise<string> {
  const provider = getProvider();

  if (provider === 'openai') {
    return autoCategorizeOpenAI(content);
  }
  return autoCategorizeGemini(content);
}

async function autoCategorizeGemini(content: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const ai = new GoogleGenerativeAI(getApiKey('gemini'));
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = buildCategorizationPrompt(content);

  try {
    const result = await model.generateContent(prompt);
    const category = result.response.text().trim();
    return CONFIG.categories.includes(category)
      ? category
      : CONFIG.categories[0];
  } catch (error) {
    throw new Error(
      `Auto-categorization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function autoCategorizeOpenAI(content: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey('openai')}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildCategorizationPrompt(content) }],
      temperature: 0,
      max_tokens: 32,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI categorization failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const category = data.choices[0]?.message?.content?.trim() ?? '';
  return CONFIG.categories.includes(category) ? category : CONFIG.categories[0];
}

function buildCategorizationPrompt(content: string): string {
  return `You are an AI classifier for a developer's knowledge base.
Categorize the following log entry into EXACTLY ONE of these categories:
${CONFIG.categories.join(', ')}

Rules:
1. Return ONLY the exact category name. No quotes, no markdown, no extra text.
2. If it doesn't perfectly fit, pick the closest match.

Log entry:
"${content}"`;
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

// omnihub search
export interface SearchResult extends Omit<Memory, 'embedding'> {
  similarity: number;
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

  const results = memories
    .filter((m) => (category ? m.category === category : true))
    .map((m) => ({
      id: m.id,
      category: m.category,
      content: m.content,
      createdAt: m.createdAt,
      similarity: cosineSimilarity(queryVector, m.embedding) as number,
    }))
    .filter((m) => m.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}