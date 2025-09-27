import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createUIResource } from "@mcp-ui/server";
// ---------- Supabase ----------
const supabase = createClient(
  "https://zaiqvuaravycwlkfmcwq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaXF2dWFyYXZ5Y3dsa2ZtY3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg1OCwiZXhwIjoyMDczOTY1ODU4fQ.HQrGXKn7p4IJEo1Fp3D6sMCiScVIPwFzj4NdOCbHOE0"
);

async function rewriteFilters(
  table: string,
  filters: { field: string; op: string; value?: any }[]
) {
  const out: typeof filters = [];
  let first: string | undefined;
  let last: string | undefined;

  for (const f of filters) {
    const field = f.field.toLowerCase();

    if (
      table === "tasks" &&
      (field === "user.firstname" || field === "user_task.user.firstname")
    ) {
      first = f.value;
      continue;
    }
    if (
      table === "tasks" &&
      (field === "user.lastname" || field === "user_task.user.lastname")
    ) {
      last = f.value;
      continue;
    }

    out.push(f);
  }

  // If both first & last collected, resolve the user_id and filter on that instead
  if (table === "tasks" && first && last) {
    const { data: user, error } = await supabase
      .from("user")
      .select("id")
      .eq("firstname", first)
      .eq("lastname", last)
      .maybeSingle();

    if (!error && user) {
      out.push({ field: "user_task.user_id", op: "eq", value: user.id });
    } else {
      // fallback: keep name-based filters if user lookup fails
      if (first)
        out.push({ field: "user_task.user.firstname", op: "eq", value: first });
      if (last)
        out.push({ field: "user_task.user.lastname", op: "eq", value: last });
    }
  }

  return out;
}
function normalizeField(table: string, field: string) {
  const f = field.trim();

  if (table === "tasks" && f.startsWith("user.")) {
    return f.replace(/^user\./, "user_task.user.");
  }
  if (table === "project") {
    if (f.startsWith("user.")) {
      return f.replace(/^user\./, "tasks.user_task.user.");
    }
    if (f.startsWith("user_task.")) {
      return f.replace(/^user_task\./, "tasks.user_task.");
    }
  }
  return f;
}

function expandRelations(
  table: string,
  relations: string[] = [],
  filters: Array<{ field: string }>
) {
  const rels = new Set(relations.map((r) => r.toLowerCase()));
  const fields = filters.map((f) => f.field.toLowerCase());
  const parts: string[] = [];

  const has = (...keys: string[]) => keys.some((k) => rels.has(k));

  if (table === "tasks") {
    if (has("project")) {
      parts.push(`project:project_id(name,id)`);
    }
    if (
      has("user", "users", "assignees", "user_task", "user_task.user") ||
      fields.some((f) => f.startsWith("user_task.user."))
    ) {
      parts.push(
        `user_task!inner(user:user_id(id, firstname, lastname, avatar_url))`
      );
    }
  }

  if (table === "project") {
    const wantsTasks =
      has(
        "tasks",
        "tasks.user_task",
        "tasks.user_task.user",
        "user",
        "users",
        "assignees",
        "user_task",
        "user_task.user"
      ) || fields.some((f) => f.startsWith("tasks."));

    if (wantsTasks) {
      parts.push(
        `tasks!inner(user_task!inner(user:user_id(id, firstname, lastname, avatar_url)))`
      );
    }
  }

  return parts.join(", ");
}

// ---------- Zod Schemas ----------
const Filter = z.object({
  field: z.string(),
  op: z.enum(["eq", "ilike", "neq", "gt", "gte", "lt", "lte", "is", "in"]),
  value: z.any().nullable().optional(),
});

const Input = z.object({
  table: z.enum(["user", "tasks", "project", "user_task"]),
  columns: z.array(z.string()).optional(),
  relations: z.array(z.string()).optional(),
  filters: z.array(Filter).optional(),
  order: z
    .object({ field: z.string(), ascending: z.boolean().default(true) })
    .optional(),
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).default(0),
});

// ---------- Tool ----------
export const showGrid = tool({
  name: "show_grid",
  description: "Show data from any table with kendo grid",
  inputSchema: Input,
  execute: async (args) => {
    const { table, columns, order, limit, offset } = args;
    let { relations = [], filters = [] } = args;

    // 1) Rewrite, normalize, expand
    const rewrittenFilters = await rewriteFilters(table, filters);
    const normalizedFilters = rewrittenFilters.map((f) => ({
      ...f,
      field: normalizeField(table, f.field),
    }));
    const relSelect = expandRelations(table, relations, normalizedFilters);

    // 2) Build SELECT
    const baseSelect =
      table === "tasks"
        ? `id, name, status, project_id${relSelect ? `, ${relSelect}` : ""}`
        : table === "project"
          ? `id, name${relSelect ? `, ${relSelect}` : ""}`
          : table === "user"
            ? `id, firstname, lastname, avatar_url${relSelect ? `, ${relSelect}` : ""}`
            : `user_id, task_id, created_at${relSelect ? `, ${relSelect}` : ""}`;

    let q = supabase
      .from(table)
      .select(baseSelect, { count: "exact" })
      .range(offset, offset + limit - 1);

    // 3) Apply filters
    for (const f of normalizedFilters) {
      const v = typeof f.value === "string" ? f.value.trim() : f.value;
      if (v === "" || v === undefined) continue;

      switch (f.op) {
        case "eq":
          q = q.eq(f.field, v);
          break;
        case "neq":
          q = q.neq(f.field, v);
          break;
        case "ilike":
          q = q.ilike(
            f.field,
            typeof v === "string" && !v.includes("%") ? `%${v}%` : v
          );
          break;
        case "gt":
          q = q.gt(f.field, v);
          break;
        case "gte":
          q = q.gte(f.field, v);
          break;
        case "lt":
          q = q.lt(f.field, v);
          break;
        case "lte":
          q = q.lte(f.field, v);
          break;
        case "is":
          q = q.is(f.field, v);
          break;
        case "in":
          q = q.in(
            f.field,
            Array.isArray(v)
              ? v
              : String(v)
                  .split(",")
                  .map((s) => s.trim())
          );
          break;
      }
    }

    if (order) {
      q = q.order(normalizeField(table, order.field), {
        ascending: order.ascending,
      });
    }

    const { data, error, count } = await q;
    if (error) throw error;

    // 4) Normalize rows + columns for Kendo
    let kendoColumns: { field: string; title?: string }[] = [];
    let rows: Record<string, any>[] = [];

    if (table === "tasks") {
      rows = (data ?? []).map((t: any) => {
        const users = (t.user_task ?? [])
          .map((ut: any) => ut.user)
          .filter(Boolean);
        const employeeNames = users.length
          ? users
              .map((u: any) =>
                `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim()
              )
              .join(", ")
          : "";
        return {
          employee_name: employeeNames,
          task_name: t.name ?? "",
          task_status: t.status ?? "",
          project_name: (t.project as any)?.name ?? "",
        };
      });
      kendoColumns = columns?.length
        ? columns.map((c) => ({ field: c }))
        : [
            { field: "employee_name", title: "Employee" },
            { field: "task_name", title: "Task" },
            { field: "task_status", title: "Status" },
            { field: "project_name", title: "Project" },
          ];
    } else if (table === "project") {
      rows = (data ?? []).map((p: any) => ({ project_name: p.name }));
      kendoColumns = columns?.length
        ? columns.map((c) => ({ field: c }))
        : [{ field: "project_name", title: "Name" }];
    } else if (table === "user") {
      rows = (data ?? []).map((u: any) => ({
        Firstname: u.firstname ?? "",
        Lastname: u.lastname ?? "",
        Avatar: u.avatar_url ?? "",
      }));
      kendoColumns = columns?.length
        ? columns.map((c) => ({ field: c }))
        : [
            { field: "Avatar", title: "Avatar" },
            { field: "Firstname" },
            { field: "Lastname" },
          ];
    } else {
      rows = (data ?? []).map((ut: any) => ({
        user_id: ut.user_id,
        task_id: ut.task_id,
        created_at: ut.created_at,
      }));
      kendoColumns = columns?.length
        ? columns.map((c) => ({ field: c }))
        : [
            { field: "user_id", title: "User" },
            { field: "task_id", title: "Task" },
            { field: "created_at", title: "Created" },
          ];
    }

    // 5) Return UIResource
    return createUIResource({
      uri: "ui://kendo-demo/interactive-component",
      content: {
        type: "externalUrl",
        iframeUrl: "http://localhost:4173/kendotable",
      },
      encoding: "text",
      metadata: {
        "mcpui.dev/ui-preferred-frame-size": { width: 960, height: 520 },
        "mcpui.dev/ui-initial-render-data": {
          columns: kendoColumns,
          rows,
          total: count ?? rows.length,
          filters: {
            table,
            relations,
            filters: normalizedFilters,
            order,
            limit,
            offset,
          },
        },
      },
    });
  },
});
