import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { addMemory, searchMemories, editMemory } from './ai.js';
import { loadMemories, deleteMemoryRecord, exportToMarkdown } from './storage.js';
import { CONFIG } from '../config.js';

const server = new Server(
  { name: 'omnihub', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'log_memory',
      description: 'Logs a professional memory, thought, or decision.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: CONFIG.categories,
            description: `Must be one of: ${CONFIG.categories.join(', ')}`,
          },
          content: {
            type: 'string',
            description: 'The detailed context or rationale.',
          },
        },
        required: ['category', 'content'],
      },
    },
    {
      name: 'search_context',
      description: "Searches the user's past notes using semantic similarity.",
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The semantic search query.' },
          limit: { type: 'number', description: 'Max results to return (default 5).' },
          min_score: {
            type: 'number',
            description: 'Minimum similarity score 0–1 (default 0).',
          },
          category: {
            type: 'string',
            enum: CONFIG.categories,
            description: 'Optional: filter results by category.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_memories',
      description: 'Lists stored memories, optionally filtered by category.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: CONFIG.categories,
            description: 'Optional category filter.',
          },
          limit: { type: 'number', description: 'Max entries to return.' },
        },
      },
    },
    {
      name: 'delete_memory',
      description: 'Deletes a memory by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The ID of the memory to delete.' },
        },
        required: ['id'],
      },
    },
    {
      name: 'edit_memory',
      description: 'Edits the content (and optionally category) of an existing memory by ID.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The memory ID to edit.' },
          content: { type: 'string', description: 'New content.' },
          category: {
            type: 'string',
            enum: CONFIG.categories,
            description: 'Optional new category.',
          },
        },
        required: ['id', 'content'],
      },
    },
    {
      name: 'export_memories',
      description: 'Exports all memories as a Markdown document.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    const a = args as Record<string, unknown>;

    if (name === 'log_memory') {
      const result = await addMemory(a.category as string, a.content as string);
      return { content: [{ type: 'text', text: result }] };
    }

    if (name === 'search_context') {
      const results = await searchMemories(
        a.query as string,
        (a.limit as number) ?? CONFIG.defaultSearchLimit,
        (a.min_score as number) ?? 0,
        a.category as string | undefined
      );
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }

    if (name === 'list_memories') {
      let memories = loadMemories();
      if (a.category) memories = memories.filter((m) => m.category === a.category);
      const limit = (a.limit as number) ?? 50;
      const stripped = memories
        .slice(-limit)
        .map(({ embedding: _, ...rest }) => rest);
      return { content: [{ type: 'text', text: JSON.stringify(stripped, null, 2) }] };
    }

    if (name === 'delete_memory') {
      const ok = deleteMemoryRecord(a.id as string);
      return {
        content: [
          {
            type: 'text',
            text: ok
              ? `✅ Memory ${a.id} deleted.`
              : `❌ Memory with id "${a.id}" not found.`,
          },
        ],
      };
    }

    if (name === 'edit_memory') {
      const result = await editMemory(
        a.id as string,
        a.content as string,
        a.category as string | undefined
      );
      return { content: [{ type: 'text', text: result }] };
    }

    if (name === 'export_memories') {
      const memories = loadMemories();
      const md = exportToMarkdown(memories);
      return { content: [{ type: 'text', text: md }] };
    }

    throw new Error(`Tool "${name}" not found.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🧠 OmniHub MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});