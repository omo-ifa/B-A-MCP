import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { ListPromptsResult, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { contextAuditTool, runContextAudit, toCallToolResult } from "./tools/context-audit/index.js";
import { overrideLogTool, runOverrideLog, toCallToolResult as toOverrideResult } from "./tools/override-log/index.js";
import { docDriftTool, runDocDrift, toCallToolResult as toDocDriftResult } from "./tools/doc-drift/index.js";
import { listPrompts, getPrompt, UnknownPromptError, MalformedPromptError } from "./prompts/index.js";

export function createServer(): Server {
  const server = new Server(
    { name: "b-a-mcp", version: "0.1.0" },
    { capabilities: { tools: {}, prompts: {} } }
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

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      return { prompts: listPrompts() } as ListPromptsResult;
    } catch {
      throw new McpError(ErrorCode.InternalError, "prompt directory unavailable");
    }
  });

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    try {
      return getPrompt(req.params.name, req.params.arguments as Record<string, string> | undefined) as GetPromptResult;
    } catch (e) {
      if (e instanceof UnknownPromptError || e instanceof MalformedPromptError) {
        throw new McpError(ErrorCode.InvalidParams, e.message);
      }
      throw new McpError(ErrorCode.InternalError, "prompt unavailable");
    }
  });

  return server;
}
