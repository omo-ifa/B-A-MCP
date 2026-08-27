import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { contextAuditTool, runContextAudit, toCallToolResult } from "./tools/context-audit/index.js";
import { overrideLogTool, runOverrideLog, toCallToolResult as toOverrideResult } from "./tools/override-log/index.js";
import { docDriftTool, runDocDrift, toCallToolResult as toDocDriftResult } from "./tools/doc-drift/index.js";

export function createServer(): Server {
  const server = new Server(
    { name: "b-a-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [contextAuditTool, overrideLogTool, docDriftTool] }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === contextAuditTool.name) {
      return toCallToolResult(await runContextAudit((req.params.arguments ?? {}) as { path?: string }));
    }
    if (req.params.name === overrideLogTool.name) {
      return toOverrideResult(runOverrideLog((req.params.arguments ?? {}) as { overrides?: unknown }));
    }
    if (req.params.name === docDriftTool.name) {
      return toDocDriftResult(runDocDrift((req.params.arguments ?? {}) as { pairs?: unknown }));
    }
    return { content: [{ type: "text", text: JSON.stringify({ error: { code: "UNKNOWN_TOOL", message: `unknown tool: ${req.params.name}` } }) }], isError: true };
  });

  return server;
}
