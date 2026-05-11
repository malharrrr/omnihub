import {existsSync, readFileSync, writeFileSync, renameSync, mkdirSync} from 'node:fs';
import { dirname } from 'node:path';
import { CONFIG } from '../config.js';

export interface Memory {
  id: string;
  category: string;
  content: string;
  embedding: number[];
  createdAt: string;
}

function ensureDataFile(): void {
  const dir = dirname(CONFIG.dataFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(CONFIG.dataFile)) {
    atomicWrite([]);
  }
}

//write then rename memories.json (backup)
function atomicWrite(memories: Memory[]): void {
  const tmp = CONFIG.dataFile + '.tmp';
  writeFileSync(tmp, JSON.stringify(memories, null, 2), 'utf-8');
  renameSync(tmp, CONFIG.dataFile);
}

export function loadMemories(): Memory[] {
  ensureDataFile();
  try {
    const raw = readFileSync(CONFIG.dataFile, 'utf-8');
    return JSON.parse(raw) as Memory[];
  } catch {
    console.error('⚠️  memories.json is corrupted. Starting fresh.');
    atomicWrite([]);
    return [];
  }
}

export function saveMemories(memories: Memory[]): void {
  ensureDataFile();
  atomicWrite(memories);
}

export function addMemoryRecord(memory: Memory): void {
  const memories = loadMemories();
  memories.push(memory);
  saveMemories(memories);
}

export function deleteMemoryRecord(id: string): boolean {
  const memories = loadMemories();
  const idx = memories.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  memories.splice(idx, 1);
  saveMemories(memories);
  return true;
}

export function updateMemoryRecord(
  id: string,
  patch: Partial<Pick<Memory, 'content' | 'category' | 'embedding'>>
): boolean {
  const memories = loadMemories();
  const idx = memories.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  memories[idx] = { ...memories[idx], ...patch };
  saveMemories(memories);
  return true;
}

export function getMemoryById(id: string): Memory | undefined {
  return loadMemories().find((m) => m.id === id);
}

//export memories to a .md file
export function exportToMarkdown(memories: Memory[]): string {
  const lines: string[] = ['# OmniHub Memory Export\n'];
  const byCategory: Record<string, Memory[]> = {};

  for (const m of memories) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`## ${cat}\n`);
    for (const m of items) {
      const date = new Date(m.createdAt).toLocaleString();
      lines.push(`### ${date} \`[${m.id}]\``);
      lines.push(m.content);
      lines.push('');
    }
  }
  return lines.join('\n');
}