import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
// define the path: ~/.omnihub/config.json
const CONFIG_DIR = join(homedir(), '.omnihub');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export const CONFIG = {
  categories: ["architecture", "bug_fix", "tech_stack", "idea", "meeting_notes"],
  dataFile: "memories.json", 
  embeddingModel: "gemini-embedding-2",
  defaultSearchLimit: 5
};

export function getApiKey(): string {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  if (existsSync(CONFIG_FILE)) {
    try {
      const configData = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (configData.GEMINI_API_KEY) {
        return configData.GEMINI_API_KEY;
      }
    } catch (e) {
    }
  }

  return "";
}

export function saveApiKey(key: string) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  writeFileSync(CONFIG_FILE, JSON.stringify({ GEMINI_API_KEY: key }, null, 2), {
    mode: 0o600 // only the owner can read/write this file
  });
}