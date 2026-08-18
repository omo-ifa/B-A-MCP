import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("packed tarball installs and the installed bin lists zero tools", async () => {
  const projectRoot = process.cwd();

  // Pack the current package into a temp dir.
  const stage = mkdtempSync(join(tmpdir(), "ba-mcp-pack-"));
  execFileSync("npm", ["pack", "--pack-destination", stage], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  const tarball = readdirSync(stage).find((f) => f.endsWith(".tgz"));
  assert.ok(tarball, "npm pack produced a tarball");

  // Install the tarball into a clean consumer project.
  const consumer = mkdtempSync(join(tmpdir(), "ba-mcp-consumer-"));
  execFileSync("npm", ["init", "-y"], { cwd: consumer, stdio: "pipe" });
  execFileSync("npm", ["install", join(stage, tarball!)], {
    cwd: consumer,
    stdio: "pipe",
  });

  // Run the installed binary over stdio and assert zero tools.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["--no-install", "b-a-mcp"],
    cwd: consumer,
  });
  const client = new Client(
    { name: "b-a-mcp-pack-test", version: "0.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools, []);
  await client.close();
});
