import { createServerFileRoute } from "@tanstack/react-start/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import getTools from "../utils/tools";

const anthropicClient = createAnthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
});

export const ServerRoute = createServerFileRoute("/api").methods({
  POST: async ({ request }) => {
    try {
      const { messages } = await request.json();
      const tools = await getTools();

      const result = await streamText({
        model: anthropicClient("claude-3-7-sonnet-latest"),
        messages: convertToModelMessages(messages),
        temperature: 0.7,
        tools,
        system: `You are a helpful AI assistant that can create interactive UI components using MCP-UI. 
        # Available tools: 
          - show_grid: Create a Kendo Grid filled with data from one of these tables: "user", "tasks", "project", or "user_task". 
          - show_user_details: Create a kendo Card filled with user data. 

        ## show_user_details
          - When user asks for a specific user information or details (e.g. Show me the all the information about John Doe), use the show_user_details tool with the firstname and the lastname as params.

        ## show_grid 
          - When users ask for Grids or tables: Use show_grid 
          - When users ask for filters, here are the available fields for each tables: 
            - user: firstname, lastname, avatar_url 
            - tasks: name, project_id, status (done, in_progress, todo) and always include user and project relations 
            - user_task: user_id, task_id
            
        ### Usage rules: 
          - Always use show_grid for grids, tables, or data displays. 
          - Always set the "table" param to match the main entity the user asks about. 
          - Available filterable fields per table: 
            - user: firstname, lastname, avatar_url 
            - tasks: id, name, status (done, in_progress, todo), project_id 
            - project: id, name 
            - user_task: user_id, task_id 

        ### Relational rules: 
          - If a query about **tasks** needs to include assignee info (employees, users, people), add relation = "user_task" and filters on user.firstname / user.lastname. These will expand internally to user_task.user. 
          - If a query about **projects** needs to filter by user info (who is working on the project), add relation = "tasks.user_task" and filters like tasks.user_task.user.firstname, tasks.user_task.user.lastname. 
          - If a query about **projects** needs to filter by task info (status, name), add relation = "tasks" and filter on tasks.status or tasks.name. 
        
        ### General notes: 
          - Always prefer filtering by user.firstname + user.lastname rather than user_id when the prompt provides a name. 
          - Always include the minimal relations required so PostgREST can join the right tables. 
          - Never output invalid field paths (they must exist in the select). 
        
        ### The show_grid tool supports: 
          - filters (with operators eq, neq, ilike, gt, gte, lt, lte, is, in), 
          - ordering, 
          - limit and offset, 
          - relations (to pull in related data). Always be helpful and create engaging, interactive experiences when requested.
        `,
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to process chat request" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
