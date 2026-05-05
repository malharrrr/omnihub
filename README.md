# 🧠 Omnihub (MCP Server)

A lightweight, local, zero-infrastructure "second brain" that acts as an automated context provider for your AI assistants (like Claude or Gemini). 

Instead of searching through scattered notes, you can log your daily decisions, ideas, and milestones via a fast CLI. When you need context later, your AI assistant can seamlessly query this hub using the Model Context Protocol (MCP) and semantic search to answer your questions based on your own history.

**Zero Infrastructure:** It uses a pure JSON file and in-memory cosine similarity. No databases to host, no Docker containers to run.

---

## Quick Start

### 1. Prerequisites
*   [Bun](https://bun.sh/) installed locally.
*   A Gemini API Key (used to generate the vector embeddings for semantic search).

### 2. Global Installation (Recommended)
To make the `omnihub` command available everywhere on your computer (so you can log memories from any project folder), install it globally:

\`\`\`bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/omnihub.git
cd omnihub

# Install dependencies
bun install

# Link it globally to your system
bun link
\`\`\`

### 3. Setup Environment
Copy the example environment file and add your Gemini API key:
\`\`\`bash
cp .env.example .env
\`\`\`
*Edit `.env` and paste your key.*

---

## Customizing It For Yourself
This tool is designed to be personalized. Open `apps/config.ts` to make it your own!

You can modify the `categories` array to fit your workflow. 
*   **Software Engineers:** `["architecture", "bug_fix", "tech_stack"]`
*   **Designers:** `["inspiration", "feedback", "typography"]`
*   **Founders:** `["product_idea", "user_feedback", "marketing"]`

---

## Usage: The CLI
Use the CLI to quickly log your thoughts or query your database from anywhere.

**1. Log a Memory:**
Provide the category flag (`-c`) and your note.
\`\`\`bash
omnihub log -c architecture "Just swapped out Postgres for a pure JSON file to keep this tool portable."
\`\`\`

**2. Semantic Search:**
Search for concepts, not exact keywords.
\`\`\`bash
omnihub search "database decisions"
\`\`\`

---

## Usage: Connecting to AI (MCP)
You can plug this server into any MCP-compatible client 

**Example: Connecting to Claude Code (Terminal)**
\`\`\`bash
Run this from inside your cloned omnihub directory:
claude mcp add omnihub --transport stdio "bun run $(pwd)/apps/mcp-server/index.ts"
\`\`\`

Once connected, simply ask your AI: *"What was the last architectural decision I made regarding databases?"* The AI will automatically trigger the search tool, scan your JSON file, and give you an answer based entirely on your personal logs.

---

## Privacy & Security
Your data is strictly yours. 
*   Memories are saved locally to `memories.json` in the root folder.
*   `memories.json` is automatically ignored in `.gitignore`.
*   **Never commit your `.env` or `memories.json` file to a public repository!**

## License
MIT License. Feel free to fork it, change it, and make it yours!
