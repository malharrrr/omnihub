#!/usr/bin/env bun
import { Command } from 'commander';
import { addMemory, searchMemories } from '../mcp-server/ai.js';
import { CONFIG } from '../config.js';

const program = new Command();

program
  .name('omnihub')
  .description('CLI to manage your omnihub');

program.command('log')
  .description('Log a new memory')
  .requiredOption('-c, --category <type>', `Category: ${CONFIG.categories.join(', ')}`)
  .argument('<content>', 'The actual note or context')
  .action(async (content, options) => {
    if (!CONFIG.categories.includes(options.category)) {
      console.error(`❌ Invalid category. Must be one of: ${CONFIG.categories.join(', ')}`);
      process.exit(1);
    }
    console.log('Generating embedding and saving...');
    await addMemory(options.category, content);
    console.log('✅ Saved successfully.');
    process.exit(0);
  });

program.command('search')
  .description('Semantic search your memories')
  .argument('<query>', 'What are you looking for?')
  .action(async (query) => {
    console.log(`Searching for: "${query}"...`);
    const results = await searchMemories(query);
    console.log('\nResults:\n', results);
    process.exit(0);
  });

program.parse();