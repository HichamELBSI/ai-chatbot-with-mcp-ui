# MCP server

## Run the server

```batch
cd kendo-mcp-ui-server
pnpm install
pnpm build
pnpm preview
```

# Chatbot AI client

## Setup the AI chatbot client

1- Create a `.env` file at the root of the ai-bot-mcp-ui folter, copy the content of `.env.local` in the `.env` and set your anthropic API Key

```
VITE_ANTHROPIC_API_KEY=sk-ant-apixxx
```

2- Run the AI chat bot

```batch
cd kendo-ai-bot-mcp-ui
yarn install
yarn dev
```

## Usage

Your chatbot is running here: `http://localhost:3000`

The database has 3 simple tables: `User`, `tasks`, `user_task`

Prompt example:

- `Show me 10 tasks`
- `Show me 10 users`
- `Show me 50 tasks that are done`
- `Show me all the projects`

Interactive components are breaking the text barrier so you can directly click on the buttons in the generated UI (kendo components). It will generate the prompt and call the tools.
