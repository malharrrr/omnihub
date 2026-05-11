import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CONFIG_DIR = join(homedir(), '.omnihub');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// resolve data file path: always stored in ~/.omnihub/ so it's stable
// regardless of which directory the user runs the CLI from.
export const DATA_FILE = join(CONFIG_DIR, 'memories.json');

export const CONFIG = {
  categories: ["architecture", "bug_fix", "tech_stack", "idea", "meeting_notes"],
  dataFile: DATA_FILE,
  defaultEmbeddingModel: "gemini-embedding-2",
  defaultSearchLimit: 5,
  maxContentLength: 10_000,
};

export type Provider = 'gemini' | 'openai';

interface StoredConfig {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  provider?: Provider;
}

function readStoredConfig(): StoredConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as StoredConfig;
    } catch {
      return {};
    }
  }
  return {};
}

export function getProvider(): Provider {
  // env variable takes precedence
  if (process.env.OMNIHUB_PROVIDER === 'openai') return 'openai';
  if (process.env.OMNIHUB_PROVIDER === 'gemini') return 'gemini';
  // then stored preference
  const stored = readStoredConfig();
  return stored.provider ?? 'gemini';
}

export function getApiKey(provider?: Provider): string {
  const p = provider ?? getProvider();

  if (p === 'openai') {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    return readStoredConfig().OPENAI_API_KEY ?? '';
  }

  // gemini (default)
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  return readStoredConfig().GEMINI_API_KEY ?? '';
}

export function saveApiKey(key: string, provider: Provider) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const existing = readStoredConfig();
  const keyField = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';

  const updated: StoredConfig = {
    ...existing,
    [keyField]: key,
    provider,
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), {
    mode: 0o600,
  });
}