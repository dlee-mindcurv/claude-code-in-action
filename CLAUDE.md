# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language via a chat interface, Claude generates code using tool calls, and the result renders in a sandboxed iframe. All generated code lives in an in-memory virtual file system (no disk I/O).

## Commands

| Task | Command |
|------|---------|
| Setup (install, prisma generate, migrate) | `npm run setup` |
| Dev server (Turbopack) | `npm run dev` |
| Dev server (background, logs to logs.txt) | `npm run dev:daemon` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Run all tests | `npm run test` |
| Run single test file | `npx vitest run src/lib/__tests__/file-system.test.ts` |
| Run tests matching a name | `npx vitest run -t "pattern"` |
| Reset database | `npm run db:reset` |

## Architecture

### Tech Stack
- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with Radix UI primitives (shadcn/ui pattern via `components.json`)
- **Prisma** + SQLite for persistence
- **Vercel AI SDK** (`ai` package) + `@ai-sdk/anthropic` for streaming LLM responses
- **Vitest** + **@testing-library/react** (jsdom environment)

### Path alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Key Data Flow
1. User sends message in ChatInterface -> ChatContext calls `/api/chat` with messages + serialized file system
2. `/api/chat` route creates a VirtualFileSystem from the payload, calls `streamText` with Claude (or MockLanguageModel if no API key)
3. Claude uses `str_replace_editor` and `file_manager` tools to create/modify files in the VirtualFileSystem
4. Tool results stream back to the client; FileSystemContext applies file operations to client-side VirtualFileSystem
5. JSX transformer (Babel standalone) compiles files to JS, generates import maps (esm.sh CDN), and renders in a sandboxed iframe

### Virtual File System (`src/lib/file-system.ts`)
In-memory tree structure used on both server (during tool execution) and client (for UI state). Supports `serialize()` / `deserializeFromNodes()` for persistence. No actual filesystem access occurs.

### AI Tool System (`src/lib/tools/`)
Two tools are registered with the AI SDK:
- **str_replace_editor** (`str-replace.ts`): Zod-validated tool with commands: `create`, `view`, `str_replace`, `insert`, `undo_edit`
- **file_manager** (`file-manager.ts`): `rename` and `delete` operations

Tools mutate the server-side VirtualFileSystem during streaming; results are forwarded to the client context.

### Auth
JWT-based (JOSE library) with httpOnly cookies. 7-day expiration. Server actions in `src/actions/` handle sign-up/sign-in/sign-out. Middleware protects API routes. Anonymous users can work without accounts (state stored in localStorage via `anon-work-tracker.ts`).

### Mock Provider
When `ANTHROPIC_API_KEY` is not set, `MockLanguageModel` in `src/lib/provider.ts` generates predetermined counter/form/card components. The production model is `claude-haiku-4-5`.

### UI Layout
Three resizable panels: Chat (left) | File Tree + Code Editor or Preview (right). Uses `react-resizable-panels`. Monaco Editor for code editing. Preview uses iframe with `srcdoc`.

### Node Compatibility
`node-compat.cjs` is required via `NODE_OPTIONS` in all Next.js scripts to remove `localStorage`/`sessionStorage` globals that Node.js 25+ exposes, preventing SSR conflicts.

### Database Schema (Prisma)
- **User**: email, password (bcrypt)
- **Project**: name, messages (JSON), data (JSON serialized VirtualFileSystem), optional userId
- The database schema is auto-generated from the Prisma schema located in @prisma/schema.prisma file.  Reference it any time you need to understand the database structur.
