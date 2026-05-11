import { getApiKey, getProvider, CONFIG } from '../config.js';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

class GeminiProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const ai = new GoogleGenerativeAI(getApiKey('gemini'));
    const model = ai.getGenerativeModel({ model: CONFIG.defaultEmbeddingModel });
    const result = await model.embedContent(text);
    return result.embedding.values as number[];
  }
}

class OpenAIProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey('openai')}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI embedding failed (${response.status}): ${err}`);
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = getProvider();
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
    default:
      return new GeminiProvider();
  }
}