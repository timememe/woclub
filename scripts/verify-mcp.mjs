import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.WOCLUB_MCP_URL ?? "https://worldorder.club/mcp");
const client = new Client({ name: "woclub-sdk-verifier", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint);

try {
  await client.connect(transport);

  const server = client.getServerVersion();
  assert.equal(server?.name, "woclub-protocol-gym");

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name), ["get_daily_challenge", "evaluate_answer"]);

  const challenge = await client.callTool({
    name: "get_daily_challenge",
    arguments: { date: "2026-08-24" }
  });
  assert.equal(challenge.isError ?? false, false);
  assert.equal(challenge.structuredContent?.id, "2026-08-24:bounded-selection");

  const evaluation = await client.callTool({
    name: "evaluate_answer",
    arguments: {
      challenge_id: "2026-08-24:bounded-selection",
      answer: { tokens: ["amber", "cobalt"] }
    }
  });
  assert.equal(evaluation.isError ?? false, false);
  assert.equal(evaluation.structuredContent?.correct, true);

  console.log(JSON.stringify({
    endpoint: endpoint.href,
    sdk: "@modelcontextprotocol/sdk",
    server,
    tools: tools.map(({ name }) => name),
    challenge_id: challenge.structuredContent.id,
    evaluation_correct: evaluation.structuredContent.correct
  }, null, 2));
} finally {
  await client.close();
}
