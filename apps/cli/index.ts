#!/usr/bin/env bun
import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as readline from 'node:readline';
import { addMemory, searchMemories, autoCategorize } from '../mcp-server/ai.js';
import { CONFIG, getApiKey, saveApiKey } from '../config.js';

const program = new Command();

program
  .name('omnihub')
  .description('CLI to manage your personal memory hub');

// ensure the user has an api key set up first
function requireAuth() {
  const key = getApiKey();
  if (!key) {
    console.error('❌ You need to set your Gemini API key first!');
    console.error('👉 Run: omnihub login');
    process.exit(1);
  }
  process.env.GEMINI_API_KEY = key;
}

function getEditorContent(): string {
  const editor = process.env.EDITOR || 'nano'; 
  const tmpPath = join(tmpdir(), `omnihub-log-${Date.now()}.md`);
  
  const instructions = `\n\n# --- Omnihub Entry ---\n# Type your memory above this line.\n# Save and close the editor to submit.\n`;
  writeFileSync(tmpPath, instructions);

  console.log(`Opening ${editor}...`);
  spawnSync(editor, [tmpPath], { stdio: 'inherit' });

  const rawContent = readFileSync(tmpPath, 'utf-8');
  const finalContent = rawContent.replace(/# --- Omnihub Entry ---[\s\S]*/, '').trim();

  unlinkSync(tmpPath);

  return finalContent;
}

program.command('login')
  .description('Set up your Gemini API key')
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('🔑 Enter your Gemini API Key (get one at aistudio.google.com): ', (key) => {
      if (key.trim()) {
        saveApiKey(key.trim());
        console.log('✅ API Key saved securely to ~/.omnihub/config.json');
      } else {
        console.log('❌ No key provided.');
      }
      rl.close();
      process.exit(0);
    });
  });

program.command('log')
  .description('Log a new memory (opens editor if no content provided)')
  .option('-c, --category <type>', `Category: ${CONFIG.categories.join(', ')}`)
  .argument('[content]', 'The actual note or context')
  .action(async (content, options) => {
    requireAuth(); // no api key found then exit

    let finalContent = content;
    if (!finalContent) {
      finalContent = getEditorContent();
      if (!finalContent) {
        console.log('❌ Aborted: No content provided.');
        process.exit(0);
      }
    }

    let category = options.category;
    if (!category) {
      process.stdout.write('🤖 Auto-categorizing... ');
      category = await autoCategorize(finalContent);
      console.log(`[${category}]`);
    } else if (!CONFIG.categories.includes(category)) {
      console.error(`❌ Invalid category. Must be one of: ${CONFIG.categories.join(', ')}`);
      process.exit(1);
    }

    console.log('Generating embedding and saving...');
    await addMemory(category, finalContent);
    console.log('✅ Saved successfully.');
    process.exit(0);
  });

program.command('search')
  .description('Semantic search your memories')
  .argument('<query>', 'What are you looking for?')
  .action(async (query) => {
    requireAuth();
    
    console.log(`Searching for: "${query}"...`);
    const results = await searchMemories(query);
    console.log('\nResults:\n', results);
    process.exit(0);
  });

program.parse();