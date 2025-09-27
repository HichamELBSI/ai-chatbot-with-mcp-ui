# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm test` - Run test suite with Vitest
- `npm run lint` - Lint code with Biome
- `npm run format` - Format code with Biome
- `npm run check` - Run both linting and formatting checks

## Architecture

This is a Kendo MCP Client built with TanStack Start (React-based full-stack framework) that creates interactive UI visualizations from MCP (Model Context Protocol) data.

### Core Technologies
- **TanStack Start**: Full-stack React framework with file-based routing
- **@mcp-ui/client**: UI renderer for MCP responses
- **@ai-sdk/anthropic**: Anthropic AI SDK for chat functionality
- **Tailwind CSS 4.0**: Styling framework
- **Biome**: Linting and formatting (tab indentation, double quotes)
- **Vitest**: Testing framework

### Key Architecture Components

**1. Chat Interface** (`src/routes/index.tsx`)
- Main application with chat UI that switches between initial layout and chatting layout
- Uses `@ai-sdk/react` for chat functionality via `/api` endpoint
- Renders both text responses and MCP UI components

**2. MCP Integration** (`src/utils/tools.ts`)
- Creates MCP client connecting to `http://localhost:4173/sse`
- Fetches tools from MCP server for AI model integration

**3. API Route** (`src/routes/api.ts`)
- TanStack Start server route handling POST requests to `/api`
- Integrates Anthropic Claude with MCP tools
- System prompt specifically mentions `show_grid` tool for Kendo components
- **WARNING**: Contains hardcoded API key that should be moved to environment variables

**4. UI Rendering** (`src/components/MCPUIRenderer.tsx`)
- Wraps `@mcp-ui/client` UIResourceRenderer
- Handles MCP UI responses with auto-resizing iframes

**5. Routing Structure**
- File-based routing via TanStack Router
- `src/routeTree.gen.ts` is auto-generated (ignored by Biome)
- Root layout in `__root.tsx` with basic HTML structure

### MCP Tools Integration

The application is designed to work with MCP tools, specifically:
- `show_grid`: Creates Kendo Grid components with Tasks, Users, or Projects data
- Supports filtering, limits, and row selection
- Data types: "users", "projects", "tasks"

### Code Conventions

- Uses tab indentation and double quotes (enforced by Biome)
- Path aliases: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
- React JSX transform
- ESNext module system

### Important Files to Understand

- `vite.config.ts`: Vite configuration with TanStack Start, React, and Tailwind plugins
- `biome.json`: Linting/formatting rules and file ignore patterns
- `src/routes/index.tsx`: Main chat application component
- `src/routes/api.ts`: Server-side AI chat endpoint
- `src/utils/tools.ts`: MCP client integration

### Development Notes

- The MCP server is expected to run on `localhost:4173/sse`
- Application serves on port 3000 during development
- Optimizes dependencies by excluding `@progress/*` packages
- Uses auto-resizing textareas and iframe components for responsive UI