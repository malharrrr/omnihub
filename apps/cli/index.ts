#!/usr/bin/env bun
import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { addMemory, searchMemories, autoCategorize } from '../mcp-server/ai.js';
import { CONFIG } from '../config.js';
import { loadMemories } from '../mcp-server/storage.js';

const program = new Command();

program
  .name('omnihub')
  .description('CLI to manage your personal, local-first memory hub');

function checkVectorDimensions() {
  const memories = loadMemories();
  if (memories.length > 0 && memories[0].embedding && memories[0].embedding.length !== 384) {
    console.error('\n❌ FATAL: Legacy high-dimensional vectors detected.');
    console.error('OmniHub has upgraded to a blazing fast, completely offline AI engine (384-dim).');
    console.error('👉 Please run: omnihub reset\n(Note: This will delete your old cloud-based memories to ensure stability.)\n');
    process.exit(1);
  }
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

program.command('reset')
  .description('Wipe your legacy database to migrate to the new local AI engine')
  .action(() => {
    if (existsSync(CONFIG.dataFile)) {
      unlinkSync(CONFIG.dataFile);
      console.log('✅ Legacy database wiped. You are ready to use the new local engine!');
    } else {
      console.log('✅ Database is already clean.');
    }
    const backupPath = CONFIG.dataFile.replace('.json', '.backup.json');
    if (existsSync(backupPath)) unlinkSync(backupPath);
    
    process.exit(0);
  });

program.command('log')
  .description('Log a new memory (opens editor if no content provided)')
  .option('-c, --category <type>', `Category: ${CONFIG.categories.join(', ')}`)
  .argument('[content]', 'The actual note or context')
  .action(async (content, options) => {
    checkVectorDimensions();

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
      process.stdout.write('🤖 Auto-categorizing locally... ');
      category = await autoCategorize(finalContent);
      console.log(`[${category}]`);
    } else if (!CONFIG.categories.includes(category)) {
      console.error(`❌ Invalid category. Must be one of: ${CONFIG.categories.join(', ')}`);
      process.exit(1);
    }

    console.log('Generating local embedding and saving...');
    await addMemory(category, finalContent);
    console.log('✅ Saved successfully.');
    process.exit(0);
  });

program.command('search')
  .description('Semantic search your memories')
  .argument('<query>', 'What are you looking for?')
  .action(async (query) => {
    checkVectorDimensions();
    
    console.log(`Searching for: "${query}"...`);
    const results = await searchMemories(query);
    console.log('\nResults:\n', results);
    process.exit(0);
  });

program.parse();
