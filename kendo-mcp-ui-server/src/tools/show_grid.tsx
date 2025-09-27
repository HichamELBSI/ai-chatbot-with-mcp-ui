import { z } from 'zod';
import { createUIResource } from '@mcp-ui/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = ['tasks', 'project', 'user', 'user_task'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

const Filter = z.object({
  field: z.string(),                 // e.g. "name" or "project.name"
  op: z.enum(['eq','ilike','neq','gt','gte','lt','lte','is','in']),
  value: z.any().nullable().optional()
});

const Input = z.object({
  table: z.enum(ALLOWED_TABLES as unknown as [AllowedTable, ...AllowedTable[]]),
  columns: z.array(z.string()).optional(),   // optional projection for the grid
  relations: z.array(z.string()).optional(), // e.g. ["project", "user_task.user"]
  filters: z.array(Filter).optional(),
  order: z.object({ field: z.string(), ascending: z.boolean().default(true) }).optional(),
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).default(0),
});

export function registerBrowseTableTool(server: any, requestHost: string) {
  const supabase = createClient('https://zaiqvuaravycwlkfmcwq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaXF2dWFyYXZ5Y3dsa2ZtY3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4OTg1OCwiZXhwIjoyMDczOTY1ODU4fQ.HQrGXKn7p4IJEo1Fp3D6sMCiScVIPwFzj4NdOCbHOE0');

  server.tool('show_grid', 'Show data from any table with kendo grid', Input.shape, async (args) => {
    const { table, columns, relations = [], filters = [], order, limit, offset } = args;

    // ---- Build SELECT with optional relation expansions
    const relSelect = relations
      .map(r => {
        // allow "project" or "user_task.user"
        if (r === 'project') return `project:project_id(name,id)`;
        if (r === 'user_task') return `user_task(user_id, task_id)`;
        if (r === 'user_task.user') return `user_task(user:user_id(firstname,lastname,avatar_url,id))`;
        return ''; // ignore unknowns
      })
      .filter(Boolean)
      .join(', ');

    const baseSelect =
      table === 'tasks'
        ? `id, name, statuses, project_id${relSelect ? `, ${relSelect}` : ''}`
        : table === 'project'
        ? `id, name${relSelect ? `, ${relSelect}` : ''}`
        : table === 'user'
        ? `id, firstname, lastname, avatar_url${relSelect ? `, ${relSelect}` : ''}`
        : `user_id, task_id, created_at${relSelect ? `, ${relSelect}` : ''}`;

    let q = supabase.from(table).select(baseSelect, { count: 'exact' }).range(offset, offset + limit - 1);

    // ---- Apply filters (only when provided)
    for (const f of filters) {
      const v = typeof f.value === 'string' ? f.value.trim() : f.value;
      if (v === '' || v === undefined) continue;

      switch (f.op) {
        case 'eq':   q = q.eq(f.field, v); break;
        case 'neq':  q = q.neq(f.field, v); break;
        case 'ilike':q = q.ilike(f.field, typeof v === 'string' && !v.includes('%') ? `%${v}%` : v); break;
        case 'gt':   q = q.gt(f.field, v); break;
        case 'gte':  q = q.gte(f.field, v); break;
        case 'lt':   q = q.lt(f.field, v); break;
        case 'lte':  q = q.lte(f.field, v); break;
        case 'is':   q = q.is(f.field, v); break; // null checks: {op:'is', value:null}
        case 'in':   q = q.in(f.field, Array.isArray(v) ? v : String(v).split(',').map(s=>s.trim())); break;
      }
    }

    if (order) q = q.order(order.field, { ascending: order.ascending });

    const { data, error, count } = await q;
    if (error) throw error;

    // ---- Normalize rows + columns for Kendo
    let kendoColumns: { field: string; title?: string }[] = [];
    let rows: Record<string, any>[] = [];

    if (table === 'tasks') {
      rows = (data ?? []).map((t: any) => {
        const users = (t.user_task ?? []).map((ut: any) => ut.user).filter(Boolean);
        const employeeNames =
          users.length === 0 ? '' : users.map((u: any) => `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim()).join(', ');
        return {
          employee_name: employeeNames,
          task_name: t.name ?? '',
          task_status: t.statuses ?? '',
          project_name: (t.project as any)?.name ?? '',
        };
      });
      kendoColumns = columns?.length
        ? columns.map(c => ({ field: c }))
        : [
            { field: 'employee_name', title: 'Employee' },
            { field: 'task_name', title: 'Task' },
            { field: 'task_status', title: 'Status' },
            { field: 'project_name', title: 'Project' },
          ];
    } else if (table === 'project') {
      rows = (data ?? []).map((p: any) => ({ project_name: p.name }));
      kendoColumns = columns?.length ? columns.map(c => ({ field: c })) : [
        { field: 'project_name', title: 'Name' },
      ];
    } else if (table === 'user') {
      rows = (data ?? []).map((u: any) => ({
        Firstname: u.firstname ?? '', Lastname: u.lastname ?? '', Avatar: u.avatar_url ?? '',
      }));
      kendoColumns = columns?.length ? columns.map(c => ({ field: c })) : [
        { field: 'Avatar', title: 'Avatar' },
        { field: 'Firstname' },
        { field: 'Lastname' },
      ];
    } else { // user_task
      rows = (data ?? []).map((ut: any) => ({ user_id: ut.user_id, task_id: ut.task_id, created_at: ut.created_at }));
      kendoColumns = columns?.length ? columns.map(c => ({ field: c })) : [
        { field: 'user_id', title: 'User' },
        { field: 'task_id', title: 'Task' },
        { field: 'created_at', title: 'Created' },
      ];
    }

    const scheme = requestHost.includes('localhost') || requestHost.includes('127.0.0.1') ? 'http' : 'https';
    const gridUrl = `${scheme}://${requestHost}/kendotable`;

    const resource = createUIResource({
      uri: `ui://kendo-table/${Date.now()}`,
      content: { type: 'externalUrl', iframeUrl: gridUrl },
      encoding: 'text',
      metadata: {
        'mcpui.dev/ui-preferred-frame-size': { width: 960, height: 520 },
        'mcpui.dev/ui-initial-render-data': {
          columns: kendoColumns,
          rows,
          total: count ?? rows.length,
          // expose what was asked so the iframe can show badges/chips
          filters: { table, relations, filters, order, limit, offset },
        },
      },
    });

    return {
      content: [
        { type: 'resource', resource }
      ], 
    };
  });
}
