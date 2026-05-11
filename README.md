# 🧠 OmniHub

**A zero-infrastructure MCP server and CLI for your AI second brain.**

OmniHub is a lightweight, local memory system that gives your AI assistants (Claude, Gemini, etc.) access to your personal knowledge history — decisions, ideas, milestones, notes — through semantic search over the Model Context Protocol (MCP). No database to provision, no container to run. Just a JSON file and a fast CLI.

---

## Why OmniHub?

AI assistants have no memory of your past work by default. You end up re-explaining context every session. OmniHub fixes this by letting you log structured notes from anywhere on your machine and expose them to your AI via MCP — so instead of repeating yourself, you just ask.

> _"What was the last architectural decision I made regarding databases?"_  
> Your AI queries OmniHub, scans your logs, and answers based on your actual history.

**No Docker. No Postgres. No cloud.**  
Everything lives in `~/.omnihub/memories.json`, searched in-memory using cosine similarity over vector embeddings. Atomic writes protect your data even if the process is interrupted.

---

## Features

- **Fast CLI** — log a memory or search your history in one command from any directory
- **Editor mode** — omit the content argument and OmniHub opens your `$EDITOR` for longer notes
- **Auto-categorization** — skip the `-c` flag and let the AI pick the right category for you
- **Multi-provider support** — use Gemini (default) or OpenAI for both embeddings and categorization
- **Semantic search** — finds relevant entries by meaning, not just keywords; filter by category or score
- **6 MCP tools** — log, search, list, edit, delete, and export memories directly from your AI client
- **Markdown export** — dump your entire memory bank as a structured `.md` file grouped by category
- **Persistent config** — API keys and provider preference stored securely in `~/.omnihub/config.json`
- **Atomic writes** — memories written via temp-file-then-rename to prevent corruption
- **Privacy-first** — all data stays local; `memories.json` is gitignored by default
---

## Prerequisites

- [Bun](https://bun.sh/) installed on your machine
- An API key for your chosen provider:
  - **Gemini (default):** [Google AI Studio](https://aistudio.google.com/app/apikey)
  - **OpenAI:** [platform.openai.com](https://platform.openai.com/api-keys)

---

## Installation

### Option 1: npm / npx (No clone needed)

The package is published on npm as [`omnihub-cli`](https://www.npmjs.com/package/omnihub-cli). Install it globally with your package manager of choice:

```bash
# npm
npm install -g omnihub-cli

# bun
bun add -g omnihub-cli

# pnpm
pnpm add -g omnihub-cli
```

Once installed, the `omnihub` command is available system-wide:

```bash
omnihub login
omnihub log -c architecture "My note here"
omnihub search "database decisions"
```

You can also run it without installing using `npx` or `bunx` for a quick try:

```bash
npx omnihub-cli login
npx omnihub-cli log -c idea "My note here"

# or with bun
bunx omnihub-cli login
```

> `npx`/`bunx` won't persist the global `omnihub` alias between sessions, but is handy before committing to a global install.

### Option 2: Clone & Link (For Contributors / Local Development)

```bash
git clone https://github.com/malharrrr/OmniHub.git
cd OmniHub
bun install
bun link
```

### Option 3: Local Run

Run directly from the project folder without any global install:

```bash
bun run ./apps/cli/index.ts log -c architecture "My note here"
```

---

## Setup

Run the login command to save your API key. It is stored securely (mode `0600`) at `~/.omnihub/config.json` — never in your project directory.

```bash
omnihub login
# 🔑 Enter your Gemini API Key (get one at aistudio.google.com): ...
# ✅ API Key saved securely to ~/.omnihub/config.json
```

You can also set keys via environment variables, which take precedence over stored config:

```bash
export GEMINI_API_KEY=your_key_here
# or
export OPENAI_API_KEY=your_key_here
export OMNIHUB_PROVIDER=openai
```

---

## CLI Usage

### Log a Memory

Provide a category with `-c` and your note inline:

```bash
omnihub log -c architecture "Swapped Postgres for a pure JSON file to keep the tool portable"
omnihub log -c bug_fix "Fixed cosine similarity returning NaN when embedding was empty"
omnihub log -c tech_stack "Chose Bun over Node for faster startup and native TypeScript support"
```

**Auto-categorization** — omit `-c` and the AI picks the best category for you:

```bash
omnihub log "Decided to use atomic writes to prevent data corruption on crashes"
# 🤖 Auto-categorizing... [architecture]
# ✅ Saved successfully.
```

**Editor mode** — omit the content argument entirely to open your `$EDITOR` (defaults to `nano`):

```bash
omnihub log -c meeting_notes
# Opening nano...
# (write your notes, save, and close)
# ✅ Saved successfully.
```

### Search Memories

Search by concept or intent — not exact keywords:

```bash
omnihub search "database decisions"
omnihub search "why did I pick this runtime"
omnihub search "performance tradeoffs I made"
```

---

## MCP Tools

OmniHub exposes six tools over stdio that any MCP-compatible AI client can call automatically.

| Tool | Description |
|---|---|
| `log_memory` | Log a memory with a category and content |
| `search_context` | Semantic search with optional `limit`, `min_score`, and `category` filter |
| `list_memories` | List stored memories, optionally filtered by category and limit |
| `edit_memory` | Update the content (and optionally category) of an existing memory by ID |
| `delete_memory` | Delete a memory by ID |
| `export_memories` | Export the full memory bank as a Markdown document |

### Connecting to Claude Code

Run this from inside your cloned OmniHub directory:

```bash
claude mcp add omnihub --transport stdio "bun run $(pwd)/apps/mcp-server/index.ts"
```

Once connected, your AI can query and manage your memory bank automatically:

> _"Summarize all the architectural decisions I've logged."_  
> _"Edit the memory about the database migration — we went with SQLite, not JSON."_  
> _"Delete the memory about the bug I fixed last week."_  
> _"Export all my memories as Markdown."_

### Connecting Other MCP Clients

Any client supporting the MCP stdio transport can connect the same way — point it to `apps/mcp-server/index.ts` using `bun run`.

---

## Multi-Provider Support

OmniHub supports Gemini and OpenAI for both embeddings and auto-categorization. Provider resolution follows this priority:

1. `OMNIHUB_PROVIDER` environment variable
2. `provider` field in `~/.omnihub/config.json` (set via `omnihub login`)
3. Default: **Gemini**

| Provider | Embedding Model | Categorization Model |
|---|---|---|
| Gemini (default) | `gemini-embedding-2` | `gemini-2.5-flash` |
| OpenAI | `text-embedding-3-small` | `gpt-4o-mini` |

To switch to OpenAI:

```bash
export OMNIHUB_PROVIDER=openai
export OPENAI_API_KEY=your_key_here
```

---

## Customization

Open `apps/config.ts` to configure categories, search defaults, and limits:

```typescript
export const CONFIG = {
  categories: ["architecture", "bug_fix", "tech_stack", "idea", "meeting_notes"],
  defaultSearchLimit: 5,
  maxContentLength: 10_000,
  defaultEmbeddingModel: "gemini-embedding-2",
};
```

Tailor categories to your workflow:

```typescript
// Designers
categories: ["inspiration", "feedback", "typography", "color_system"]

// Founders
categories: ["product_idea", "user_feedback", "marketing", "investor"]
```

---

## How It Works

1. **Login** — `omnihub login` saves your API key to `~/.omnihub/config.json` with restricted file permissions (`0600`).

2. **Log** — You run `omnihub log`. If no `-c` flag is given, the note is sent to Gemini/OpenAI for categorization. The content is embedded into a vector and stored alongside metadata in `~/.omnihub/memories.json` via an atomic write (write to `.tmp`, then rename).

3. **Search** — Your query is embedded the same way, then compared against all stored vectors using cosine similarity. Results are ranked by score and optionally filtered by category or minimum similarity threshold.

4. **MCP** — When an AI client is connected, it can call any of the six tools in response to your questions. You don't manage retrieval — the AI does.

5. **Export** — `export_memories` dumps your full history as a Markdown document, grouped by category with timestamps and IDs.

---

## Data & Privacy

| What | Where |
|---|---|
| Memories | `~/.omnihub/memories.json` |
| Config & API keys | `~/.omnihub/config.json` (mode `0600`) |
| Gitignore | `memories.json` is excluded by default |
| External calls | Only to Gemini or OpenAI for embedding/categorization |

Your data never leaves your machine except for the text sent to your chosen provider's API. No telemetry, no cloud storage.

> **Never commit your `~/.omnihub/` directory or any `.env` files to a public repository.**

---

## Scripts

```bash
bun install        # Install dependencies
bun run start      # Run the CLI directly
bun run typecheck  # Type-check without emitting
bun link           # Link globally (enables the omnihub command system-wide)
```

---
## License

MIT — fork it, change it, make it yours.

---

## Author

Built by [Malhar Bonde](https://github.com/malharrrr)