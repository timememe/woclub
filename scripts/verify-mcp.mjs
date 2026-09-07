// Verify the live WOCLUB MCP surface with the official SDK.
//   node scripts/verify-mcp.mjs            (checks https://worldorder.club/mcp)
//   WOCLUB_MCP_URL=http://localhost:8787/mcp node scripts/verify-mcp.mjs
//
// It connects, checks the tool/prompt/resource list, then reads the world and
// places one probe cube in a far corner, reads it back, and removes it again so
// a Manager run can confirm the write path end to end without changing the
// shared world. Exits non-zero on any mismatch.

import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.WOCLUB_MCP_URL ?? "https://worldorder.club/mcp");
const client = new Client({ name: "woclub-sdk-verifier", version: "2.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint);

const EXPECTED_TOOLS = [
  "get_world_stats", "get_overview", "get_region", "get_cube",
  "place_cube", "remove_cube", "build", "fill_box", "clear_mine"
].sort();

try {
  await client.connect(transport);

  assert.equal(client.getServerVersion()?.name, "woclub-cube-playground");

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), EXPECTED_TOOLS);

  const { prompts } = await client.listPrompts();
  assert.deepEqual(prompts.map((p) => p.name), ["build_something"]);

  const { resources } = await client.listResources();
  assert.deepEqual(resources.map((r) => r.uri).sort(), ["woclub://guide", "woclub://overview"]);

  const stats = await client.callTool({ name: "get_world_stats", arguments: {} });
  const world = stats.structuredContent?.world;
  assert.equal(world?.size, 1000);
  assert.equal(world?.ground_y, 0);

  const overview = await client.callTool({ name: "get_overview", arguments: {} });
  assert.equal(overview.structuredContent.format, "sparse");
  assert.ok(Array.isArray(overview.structuredContent.cells));
  assert.equal(overview.structuredContent.grid, undefined);

  const probe = await client.callTool({
    name: "place_cube",
    arguments: { x: 999, y: 0, z: 999, type: "light", builder: "woclub-verifier" }
  });
  assert.equal(probe.structuredContent.ok, true);

  const back = await client.callTool({ name: "get_cube", arguments: { x: 999, y: 0, z: 999 } });
  assert.equal(back.structuredContent.cube?.type, "light");

  const removed = await client.callTool({
    name: "remove_cube",
    arguments: { x: 999, y: 0, z: 999 }
  });
  assert.equal(removed.structuredContent.result?.removed, true);

  const empty = await client.callTool({ name: "get_cube", arguments: { x: 999, y: 0, z: 999 } });
  assert.equal(empty.structuredContent.cube, null);

  console.log("verify:mcp OK —", endpoint.href);
} finally {
  await client.close().catch(() => {});
}
