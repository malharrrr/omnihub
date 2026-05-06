# 🧠 Omnihub (MCP Server)

A lightweight, local, zero-infrastructure "second brain" that acts as an automated context provider for your AI assistants (like Claude or Gemini). 

Instead of searching through scattered notes, you can log your daily decisions, ideas, and milestones via a fast CLI. When you need context later, your AI assistant can seamlessly query this hub using the Model Context Protocol (MCP) and semantic search to answer your questions based on your own history.

**Zero Infrastructure:** It uses a pure JSON file and in-memory cosine similarity. No databases to host, no Docker containers to run.

##  Features
* **Frictionless Logging:** Pop open your terminal default editor (Vim, VS Code, Nano) to drop in massive code blocks or quick notes.
* **AI Auto-Categorization:** No need to manually tag your notes. Omnihub automatically categorizes your entries using Gemini 2.5 Flash.
* **MCP Integration:** Plugs directly into Claude Code, Cursor, or Gemini CLI to give your AI assistants long-term memory of your career.

---

## Quick Start

### 1. Prerequisites
*   [Bun](https://bun.sh/) installed locally.
*   A Gemini API Key (used to generate embeddings and auto-categorize).

### 2. Global Installation (Recommended)
To make the `omnihub` command available everywhere on your computer (so you can log memories from any project folder), install it globally:

```bash
# Clone the repository
git clone https://github.com/YOU/malharrrr/omnihub.git
cd omnihub

# Install dependencies
bun install

# Link it globally to your system
bun link
```

### 3. Setup Environment
Copy the example environment file and add your Gemini API key:
```bash
cp .env.example .env
```
*Edit `.env` and paste your key.*

---

### Installation
##  Installation & Setup

Omnihub is available on npm. Install it globally so you can access your second brain from any directory on your machine:

```bash
npm install -g omnihub-cli
```

### Authentication

Omnihub is powered by the Gemini API. You only need to set your API key once. Run the following command and paste your key (get one for free at [aistudio.google.com](https://aistudio.google.com/)):

```bash
omnihub login
```

Your key is securely saved locally to `~/.omnihub/config.json`. You will never need to mess with `.env` files, and Omnihub will automatically authenticate no matter what folder you are working in.

##  Usage

Once logged in, you can start logging and searching your memories instantly.

**Log a memory directly:**
```bash
omnihub log "Just discovered a great way to handle global CLI configs in Node.js"
```

**Open your default editor for multi-line logs:**
```bash
omnihub log
```

**Search your memories:**
```bash
omnihub search "CLI config"
```



## Customizing It For Yourself
This tool is designed to be personalized. Open `apps/config.ts` to make it your own!

You can modify the `categories` array to fit your workflow. 
*   **Software Engineers:** `["architecture", "bug_fix", "tech_stack"]`
*   **Designers:** `["inspiration", "feedback", "typography"]`
*   **Founders:** `["product_idea", "user_feedback", "marketing"]`

---

## Usage: Connecting to AI (MCP)
You can plug this server into any MCP-compatible client. 

**Example: Connecting to Claude Code (Terminal)**
```bash
# Run this from inside your cloned omnihub directory:
claude mcp add omnihub --transport stdio "bun run $(pwd)/apps/mcp-server/index.ts"
```

Once connected, simply ask your AI: *"What was the last architectural decision I made regarding databases?"* The AI will automatically trigger the search tool, scan your JSON file, and give you an answer based entirely on your personal logs.

---

## Privacy & Security
Your data is strictly yours. 
*   Memories are saved locally to `memories.json` in the root folder.
*   `memories.json` is automatically ignored in `.gitignore`.
*   **Never commit your `.env` or `memories.json` file to a public repository!**

[![npm version](https://badge.fury.io/js/omnihub-cli.svg)](https://www.npmjs.com/package/omnihub-cli)

## License
MIT License. Feel free to fork it, change it, and make it yours!