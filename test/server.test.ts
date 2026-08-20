import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("server starts and lists one tool", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/src/index.js"],
  });
  const client = new Client(
    { name: "b-a-mcp-test", version: "0.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "context_audit");
  await client.close();
});

test("server calls context_audit over stdio and returns rendered + structuredContent", async () => {
  const transport = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] });
  const client = new Client({ name: "b-a-mcp-test", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  const res: any = await client.callTool({ name: "context_audit", arguments: { path: process.cwd() } });
  assert.ok(res.structuredContent, "structuredContent present");
  assert.equal(typeof res.structuredContent.score, "number");
  assert.equal(res.content[0].text, res.structuredContent.rendered);
  await client.close();
});

test("calling an unknown tool name returns the structured UNKNOWN_TOOL error, not a thrown exception", async () => {
  const transport = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] });
  const client = new Client({ name: "b-a-mcp-test", version: "0.0.0" }, { capabilities: {} });
  try {
    await client.connect(transport);
    const res: any = await client.callTool({ name: "not_a_real_tool", arguments: {} });
    assert.equal(res.isError, true);
    assert.equal(res.structuredContent, undefined);
    const parsed = JSON.parse(res.content[0].text);
    assert.equal(parsed.error.code, "UNKNOWN_TOOL");
    assert.ok(typeof parsed.error.message === "string" && parsed.error.message.length > 0);
  } finally {
    await client.close();
  }
});
