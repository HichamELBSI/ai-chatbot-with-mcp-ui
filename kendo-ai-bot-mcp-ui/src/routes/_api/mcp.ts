import { createFileRoute } from '@tanstack/react-router'
import { createElement } from 'react'

export const Route = createFileRoute('/_api/mcp')({
  component: RouteComponent,
})

function RouteComponent() {
  return createElement('div', null, 'Hello from MCP API');
}
