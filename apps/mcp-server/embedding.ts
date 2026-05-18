import { env, pipeline } from '@huggingface/transformers';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

class LocalProvider implements EmbeddingProvider {
  private extractorInstance: any = null;

  constructor() {
    env.cacheDir = join(homedir(), '.omnihub', 'models');
  }

  private async getExtractor() {
    if (!this.extractorInstance) {
      this.extractorInstance = await pipeline(
        'feature-extraction',
        'onnx-community/all-MiniLM-L6-v2-ONNX',
        { dtype: 'q4' }
      );
    }
    return this.extractorInstance;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  }
}

export function getEmbeddingProvider(): EmbeddingProvider {
  // switched to strictly return the local model provider, bypassing cloud APIs for embeddings
  return new LocalProvider();
}