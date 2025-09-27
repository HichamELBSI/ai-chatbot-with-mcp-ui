import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createUIResource } from "@mcp-ui/server";

const Input = z.object({
  firstname: z.string(),
  lastname: z.string(),
});

// ---------- Supabase ----------
const supabase = createClient(
  "https://zaiqvuaravycwlkfmcwq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaXF2dWFyYXZ5Y3dsa2ZtY3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg1OCwiZXhwIjoyMDczOTY1ODU4fQ.HQrGXKn7p4IJEo1Fp3D6sMCiScVIPwFzj4NdOCbHOE0"
);

// ---------- Tool ----------
export const showUserDetails = tool({
  name: "show_user_details",
  description: "Show user details",
  inputSchema: Input,
  execute: async (args) => {
    // 1) Fetch the user (include id for join)
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id, firstname, lastname, avatar_url")
      .eq("firstname", args.firstname)
      .eq("lastname", args.lastname)
      .single();

    if (userError) throw userError;

    // 2) Fetch all tasks assigned to this user
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("status, user_task!inner(user_id)")
      .eq("user_task.user_id", user.id);

    if (tasksError) throw tasksError;

    // 3) Count tasks by status in JS
    const counts = { todo: 0, in_progress: 0, done: 0 };
    for (const t of tasks ?? []) {
      const s = (t as any).status as keyof typeof counts;
      if (s && counts[s] !== undefined) {
        counts[s] += 1;
      }
    }

    // 4) Return UIResource with both user and counts
    return createUIResource({
      uri: "ui://kendo-demo/interactive-component-card",
      content: {
        type: "externalUrl",
        iframeUrl: "http://localhost:4173/kendocard",
      },
      encoding: "text",
      metadata: {
        "mcpui.dev/ui-preferred-frame-size": { width: 960, height: 520 },
        "mcpui.dev/ui-initial-render-data": {
          user,
          taskCounts: counts, // { todo, in_progress, done }
        },
      },
    });
  },
});
