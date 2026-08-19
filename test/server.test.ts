import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("server starts and lists zero tools", async () => {
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
  assert.deepEqual(tools, []);
  await client.close();
});
