import { UIResourceRenderer } from "@mcp-ui/client";
interface MCPUIRendererProps {
  content: any;
  sendMessage: Function;
}

export function MCPUIRenderer({ sendMessage, content }: MCPUIRendererProps) {
  const handleUIAction = async ({ payload }: any) => {
    sendMessage({
      text: payload.params,
    });
  };

  // Check if content has the UI resource structure with type wrapper (content.type === 'resource')
  if (
    content &&
    typeof content === "object" &&
    content.type === "resource" &&
    content.resource
  ) {
    return (
      <div
        style={{
          display: "flex",
          padding: "20px",
          justifyContent: "center",
        }}
      >
        <UIResourceRenderer
          htmlProps={{
            autoResizeIframe: true,
            style: {
              width: content.resource.text.includes("kendocard") ? 400 : 650,
              maxHeight: 520,
              borderRadius: 10,
            },
          }}
          resource={content.resource}
          onUIAction={handleUIAction}
        />
      </div>
    );
  }

  if (content) {
    return (
      <div className="my-4 p-4 border border-red-500/20 rounded-lg bg-red-800/20">
        <p className="text-red-400 text-sm">Debug: Non-UI content received</p>
        <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-40">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}
