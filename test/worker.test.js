import test from "node:test";
import assert from "node:assert/strict";
import worker, { challengeFor, challenges, dayKey } from "../src/worker.js";

const origin = "https://worldorder.club";

function request(path, init) {
  return new Request(`${origin}${path}`, init);
}

async function responseJson(path, init) {
  const response = await worker.fetch(request(path, init));
  return { response, body: await response.json() };
}

test("public route contracts remain discoverable", async () => {
  for (const [path, contentType] of [
    ["/", "text/html"],
    ["/.well-known/mcp-registry-auth", "text/plain"],
    ["/log", "text/html"],
    ["/llms.txt", "text/plain"],
    ["/clients.txt", "text/plain"],
    ["/conformance/v1.json", "application/json"],
    ["/benchmarks/v1.json", "application/json"],
    ["/service-changelog/v1.json", "application/json"],
    ["/capabilities.json", "application/json"],
    ["/schemas/capability-card.json", "application/json"],
    ["/schemas/challenge.json", "application/json"],
    ["/schemas/evaluation.json", "application/json"],
    ["/schemas/usage-status.json", "application/json"],
    ["/schemas/error-response.json", "application/json"],
    ["/schemas/benchmark-manifest.json", "application/json"],
    ["/schemas/service-changelog.json", "application/json"],
    ["/schemas/conformance-bundle.json", "application/json"],
    ["/robots.txt", "text/plain"],
    ["/sitemap.xml", "application/xml"],
    ["/openapi.json", "application/json"],
    ["/api/v1", "application/json"],
    ["/api/v1/status", "application/json"],
    ["/api/v1/challenge/today", "application/json"]
  ]) {
    const response = await worker.fetch(request(path));
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), new RegExp(contentType), path);
  }

  const log = await worker.fetch(request("/log"));
  const logHtml = await log.text();
  assert.match(logHtml, /<html lang="ru">/);
  assert.match(logHtml, /Журнал изменений/);

  const registryAuth = await worker.fetch(request("/.well-known/mcp-registry-auth"));
  assert.match(await registryAuth.text(), /^v=MCPv1; k=ed25519; p=[A-Za-z0-9+/]+=*$/);

  const homepage = await worker.fetch(request("/"));
  const homepageHtml = await homepage.text();
  assert.match(homepageHtml, /rel="canonical" href="https:\/\/worldorder\.club\/"/);
  assert.match(homepageHtml, /rel="alternate" type="text\/plain" href="https:\/\/worldorder\.club\/llms\.txt"/);
  assert.match(homepageHtml, /rel="service-desc"[^>]+openapi\.json/);
  assert.match(homepageHtml, /<script type="application\/ld\+json">/);
  assert.match(homepageHtml, /"@type":"WebAPI"/);

  const clients = await worker.fetch(request("/clients.txt"));
  const clientText = await clients.text();
  assert.match(clientText, /urllib\.request/);
  assert.match(clientText, /Node\.js 18\+/);
  assert.match(clientText, /challenge_id: challenge\.id/);

  const capabilityResponse = await worker.fetch(request("/capabilities.json"));
  const capabilityCard = await capabilityResponse.json();
  assert.equal(capabilityCard.authentication.required, false);
  assert.deepEqual(capabilityCard.capabilities.map(({ id }) => id), [
    "daily-constraint-challenge",
    "historical-constraint-challenge",
    "deterministic-answer-evaluation"
  ]);
  assert.equal(capabilityCard.safety.visitor_content, "untrusted_data");
  assert.equal(capabilityCard.safety.stored, false);
  assert.equal(capabilityCard.safety.executed, false);

  const { response, body } = await responseJson("/missing");
  assert.equal(response.status, 404);
  assert.equal(body.error, "not_found");
});

test("MCP Streamable HTTP exposes and runs the gym tools", async () => {
  const mcp = (method, params, id = 1) => responseJson("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });

  const initialized = await mcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal(initialized.body.result.protocolVersion, "2025-06-18");
  assert.deepEqual(initialized.body.result.capabilities, { tools: { listChanged: false } });

  const listed = await mcp("tools/list", {});
  assert.deepEqual(listed.body.result.tools.map(({ name }) => name), ["get_daily_challenge", "evaluate_answer"]);

  const fetched = await mcp("tools/call", { name: "get_daily_challenge", arguments: { date: "2026-08-24" } });
  assert.equal(fetched.body.result.structuredContent.id, "2026-08-24:bounded-selection");
  assert.equal(JSON.parse(fetched.body.result.content[0].text).date, "2026-08-24");

  const evaluated = await mcp("tools/call", { name: "evaluate_answer", arguments: { challenge_id: "2026-08-24:bounded-selection", answer: { tokens: ["amber", "cobalt"] } } });
  assert.equal(evaluated.body.result.structuredContent.correct, true);
  assert.equal(evaluated.body.result.isError, false);

  const unknown = await mcp("tools/call", { name: "run_shell", arguments: {} });
  assert.equal(unknown.body.error.code, -32602);
  const unsupported = await responseJson("/mcp", { method: "POST", headers: { "content-type": "application/json", "mcp-protocol-version": "2099-01-01" }, body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "ping" }) });
  assert.equal(unsupported.response.status, 400);
  assert.equal(unsupported.body.error.message, "Unsupported MCP protocol version");
  assert.equal((await worker.fetch(request("/mcp"))).status, 405);
});

test("conformance bundle pins reproducible offline outcomes", async () => {
  const { response, body } = await responseJson("/conformance/v1.json");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(body.id, `${origin}/conformance/v1.json`);
  assert.equal(body.generated_from_api_version, "1.6.0");
  assert.equal(body.fixtures.length, 5);
  assert.equal(body.fixtures[0].challenge.id, "2026-08-24:bounded-selection");
  assert.equal(body.fixtures[0].expected.correct, true);
  assert.equal(body.fixtures[1].expected.correct, false);
  for (const fixture of body.fixtures.filter(({ expected }) => expected.correct)) {
    const challengeName = fixture.request.challenge_id.slice(11);
    assert.equal(challenges.find(({ id }) => id === challengeName).validate(fixture.request.answer), true);
  }
});

test("conformance bundle schema describes every offline fixture", async () => {
  const schema = (await responseJson("/schemas/conformance-bundle.json")).body;
  const bundle = (await responseJson("/conformance/v1.json")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/conformance-bundle.json`);
  assert.deepEqual(Object.keys(bundle).sort(), schema.required.slice().sort());
  for (const fixture of bundle.fixtures) {
    assert.deepEqual(Object.keys(fixture).sort(), schema.properties.fixtures.items.required.slice().sort());
    assert.deepEqual(Object.keys(fixture.challenge).sort(), schema.properties.fixtures.items.properties.challenge.required.slice().sort());
    assert.deepEqual(Object.keys(fixture.request).sort(), schema.properties.fixtures.items.properties.request.required.slice().sort());
    assert.deepEqual(Object.keys(fixture.expected).sort(), schema.properties.fixtures.items.properties.expected.required.slice().sort());
  }
  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.paths["/conformance/v1.json"].get.responses["200"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.schemas.conformance_bundle, "/schemas/conformance-bundle.json");
});

test("benchmark manifest groups pinned dates by capability", async () => {
  const { response, body } = await responseJson("/benchmarks/v1.json");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(body.id, `${origin}/benchmarks/v1.json`);
  assert.equal(body.generated_from_api_version, "1.7.0");
  assert.deepEqual(body.groups.map(({ id }) => id), [
    "selection-and-scheduling",
    "filtering-and-canonicalization",
    "constraint-allocation"
  ]);
  for (const group of body.groups) {
    assert.ok(group.cases.length >= 2);
    for (const benchmarkCase of group.cases) {
      const date = new Date(`${benchmarkCase.date}T00:00:00Z`);
      assert.equal(benchmarkCase.challenge_id, `${benchmarkCase.date}:${challengeFor(date).id}`);
      assert.equal(benchmarkCase.challenge_url, `${origin}/api/v1/challenge/${benchmarkCase.date}`);
    }
  }
});

test("benchmark manifest schema describes the published contract", async () => {
  const schema = (await responseJson("/schemas/benchmark-manifest.json")).body;
  const manifest = (await responseJson("/benchmarks/v1.json")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/benchmark-manifest.json`);
  assert.deepEqual(schema.required, ["schema_version", "id", "generated_from_api_version", "description", "availability", "evaluation_url", "safety", "groups"]);
  assert.deepEqual(Object.keys(manifest).sort(), [...schema.required].sort());
  assert.deepEqual(Object.keys(manifest.groups[0]).sort(), schema.properties.groups.items.required.slice().sort());
  assert.deepEqual(Object.keys(manifest.groups[0].cases[0]).sort(), schema.properties.groups.items.properties.cases.items.required.slice().sort());

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.info.version, "1.15.0");
  assert.equal(openapi.paths["/benchmarks/v1.json"].get.responses["200"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.schemas.benchmark_manifest, "/schemas/benchmark-manifest.json");
});

test("capability card schema describes the published contract", async () => {
  const schema = (await responseJson("/schemas/capability-card.json")).body;
  const card = (await responseJson("/capabilities.json")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/capability-card.json`);
  assert.deepEqual(Object.keys(card).sort(), schema.required.slice().sort());
  assert.deepEqual(Object.keys(card.safety).sort(), schema.properties.safety.required.slice().sort());
  assert.equal(card.discovery.json_schemas.capability_card, schema.$id);

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.info.version, "1.15.0");
  assert.equal(openapi.paths["/capabilities.json"].get.responses["200"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.schemas.capability_card, "/schemas/capability-card.json");
});

test("static agent artifacts support conditional requests", async () => {
  for (const path of ["/llms.txt", "/clients.txt", "/conformance/v1.json", "/benchmarks/v1.json", "/service-changelog/v1.json", "/capabilities.json", "/schemas/capability-card.json", "/schemas/challenge.json", "/schemas/evaluation.json", "/schemas/usage-status.json", "/schemas/error-response.json", "/schemas/benchmark-manifest.json", "/schemas/service-changelog.json", "/schemas/conformance-bundle.json", "/openapi.json"]) {
    const initial = await worker.fetch(request(path));
    const etag = initial.headers.get("etag");
    assert.match(etag, /^"[a-f0-9]{64}"$/, path);

    const unchanged = await worker.fetch(request(path, { headers: { "if-none-match": `W/${etag}, "unrelated"` } }));
    assert.equal(unchanged.status, 304, path);
    assert.equal(unchanged.headers.get("etag"), etag, path);
    assert.equal(await unchanged.text(), "", path);
  }
});

test("service changelog exposes ordered semantic contract additions", async () => {
  const { response, body } = await responseJson("/service-changelog/v1.json");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(body.id, `${origin}/service-changelog/v1.json`);
  assert.equal(body.current_api_version, "1.12.0");
  assert.equal(body.entries[0].version, "1.12.0");
  assert.equal(body.entries.at(-1).version, "1.0.0");
  assert.ok(body.entries.every(({ changes }) => changes.length > 0 && changes.every(({ kind }) => kind === "added")));

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.info.version, "1.15.0");
  assert.ok(openapi.paths["/service-changelog/v1.json"]);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.version, "1.15.0");
  assert.equal(api.service_changelog, "/service-changelog/v1.json");
});

test("service changelog schema describes the frozen version history", async () => {
  const schema = (await responseJson("/schemas/service-changelog.json")).body;
  const changelog = (await responseJson("/service-changelog/v1.json")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/service-changelog.json`);
  assert.deepEqual(Object.keys(changelog).sort(), schema.required.slice().sort());
  assert.deepEqual(Object.keys(changelog.entries[0]).sort(), schema.properties.entries.items.required.slice().sort());
  assert.deepEqual(Object.keys(changelog.entries[0].changes[0]).sort(), schema.properties.entries.items.properties.changes.items.required.slice().sort());

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.paths["/service-changelog/v1.json"].get.responses["200"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.schemas.service_changelog, "/schemas/service-changelog.json");
  const card = (await responseJson("/capabilities.json")).body;
  assert.equal(card.discovery.json_schemas.service_changelog, schema.$id);
});

test("published JSON Schemas describe live success responses", async () => {
  const challengeSchema = (await responseJson("/schemas/challenge.json")).body;
  const evaluationSchema = (await responseJson("/schemas/evaluation.json")).body;
  assert.equal(challengeSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(challengeSchema.$id, `${origin}/schemas/challenge.json`);
  assert.deepEqual(challengeSchema.required, ["date", "id", "title", "prompt", "constraints", "response_schema", "evaluate_url", "note"]);
  assert.equal(evaluationSchema.$id, `${origin}/schemas/evaluation.json`);
  assert.deepEqual(evaluationSchema.required, ["challenge_id", "correct", "explanation"]);

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.info.version, "1.15.0");
  assert.equal(openapi.paths["/api/v1/challenge/today"].get.responses["200"].content["application/json"].schema.$ref, challengeSchema.$id);
  assert.equal(openapi.paths["/api/v1/evaluate"].post.responses["200"].content["application/json"].schema.$ref, evaluationSchema.$id);
});

test("usage status exposes aggregate counts without stored visitor content", async () => {
  const store = new Map();
  const kv = {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => store.set(key, value)
  };
  const pending = [];
  const context = { waitUntil(promise) { pending.push(promise); } };
  const trackedRequest = request("/api/v1/challenge/today", { headers: { "cf-connecting-ip": "192.0.2.10" } });
  await worker.fetch(trackedRequest, { METRICS: kv }, context);
  await Promise.all(pending);

  const response = await worker.fetch(request("/api/v1/status"), { METRICS: kv });
  const body = await response.json();
  assert.equal(body.days[0].challenge_requests, 1);
  assert.equal(body.days[0].approximate_unique_callers, 1);
  assert.equal(body.days[0].mcp.challenge_requests, 0);
  assert.equal([...store.keys()].some((key) => key.includes("192.0.2.10")), false);
});

test("usage status separates MCP tool traffic from aggregate totals", async () => {
  const store = new Map();
  const kv = {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => store.set(key, value)
  };
  const pending = [];
  const context = { waitUntil(promise) { pending.push(promise); } };
  const mcpRequest = request("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.20" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_daily_challenge", arguments: { date: "2026-08-24" } } })
  });
  await worker.fetch(mcpRequest, { METRICS: kv }, context);
  await Promise.all(pending);

  const body = await (await worker.fetch(request("/api/v1/status"), { METRICS: kv })).json();
  assert.equal(body.measurement_started_at, "2026-08-25T20:00:00Z");
  assert.equal(body.days[0].challenge_requests, 1);
  assert.equal(body.days[0].mcp.challenge_requests, 1);
  assert.equal(body.days[0].mcp.approximate_unique_callers, 1);
  assert.equal(body.days[0].mcp.evaluations, 0);
});

test("usage status schema describes the public metrics contract", async () => {
  const schema = (await responseJson("/schemas/usage-status.json")).body;
  const status = (await responseJson("/api/v1/status")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/usage-status.json`);
  assert.deepEqual(Object.keys(status).sort(), schema.required.slice().sort());
  assert.equal(status.days.length, 7);
  assert.deepEqual(Object.keys(status.days[0]).sort(), schema.properties.days.items.required.slice().sort());
  assert.deepEqual(Object.keys(status.days[0].mcp).sort(), schema.properties.days.items.properties.mcp.required.slice().sort());
  assert.deepEqual(schema.properties.days.items.properties.success_rate.type, ["number", "null"]);

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.paths["/api/v1/status"].get.responses["200"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.schemas.usage_status, "/schemas/usage-status.json");
});

test("error response schema covers stable API failure envelopes", async () => {
  const schema = (await responseJson("/schemas/error-response.json")).body;
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, `${origin}/schemas/error-response.json`);
  assert.deepEqual(schema.oneOf.map((variant) => variant.properties.error.const ?? variant.properties.error.enum), [
    ["invalid_json", "invalid_request"],
    "request_too_large",
    "challenge_date_not_available",
    "not_found"
  ]);

  const failures = await Promise.all([
    responseJson("/api/v1/evaluate", { method: "POST", body: "{bad" }),
    responseJson("/api/v1/evaluate", { method: "POST", body: JSON.stringify({ challenge_id: "bad", answer: {} }) }),
    responseJson("/api/v1/challenge/2999-01-01"),
    responseJson("/missing")
  ]);
  assert.deepEqual(failures.map(({ body }) => body.error), ["invalid_json", "invalid_request", "challenge_date_not_available", "not_found"]);

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.paths["/api/v1/evaluate"].post.responses["400"].content["application/json"].schema.$ref, schema.$id);
  assert.equal(openapi.paths["/api/v1/evaluate"].post.responses["413"].content["application/json"].schema.$ref, schema.$id);
  assert.equal(openapi.paths["/api/v1/challenge/{date}"].get.responses["404"].content["application/json"].schema.$ref, schema.$id);
  const api = (await responseJson("/api/v1")).body;
  assert.equal(api.version, "1.15.0");
  assert.equal(api.schemas.error_response, "/schemas/error-response.json");
});

test("published rotations stay immutable and future epochs wrap", () => {
  assert.equal(challengeFor(new Date("2026-08-24T00:00:00Z")).id, "bounded-selection");
  const start = new Date("2026-08-25T00:00:00Z");
  const sequence = Array.from({ length: 4 }, (_, offset) => challengeFor(new Date(start.getTime() + offset * 86_400_000)).id);
  assert.deepEqual(sequence, ["interval-schedule", "exact-projection", "capacity-allocation", "interval-schedule"]);
  assert.equal(challengeFor(new Date("2026-08-30T00:00:00Z")).id, "capacity-allocation");
  const logicStart = new Date("2026-08-31T00:00:00Z");
  const logicSequence = Array.from({ length: 5 }, (_, offset) => challengeFor(new Date(logicStart.getTime() + offset * 86_400_000)).id);
  assert.deepEqual(logicSequence, ["truthful-beacon", "interval-schedule", "exact-projection", "capacity-allocation", "truthful-beacon"]);
  assert.equal(dayKey(new Date("2026-08-24T23:59:59Z")), "2026-08-24");
});

test("expanded challenges accept only their canonical answers", () => {
  const answers = {
    "interval-schedule": { jobs: ["alpha", "gamma", "delta", "omega"] },
    "exact-projection": { records: [{ name: "dune", score: 9 }, { name: "aster", score: 8 }] },
    "capacity-allocation": { bins: { north: ["iris", "moss"], south: ["fern"] } },
    "truthful-beacon": { beacon: "north", truthful: ["ada", "cyra", "dune"] }
  };
  for (const challenge of challenges.slice(3)) {
    assert.equal(challenge.validate(answers[challenge.id]), true, challenge.id);
    assert.equal(challenge.validate({}), false, challenge.id);
  }
});

test("today's published answer evaluates successfully", async () => {
  const challengeResponse = await responseJson("/api/v1/challenge/today");
  const challenge = challengeResponse.body;
  const answers = {
    "minimal-plan": { plan: ["archive", "lab", "dock"] },
    "bounded-selection": { tokens: ["amber", "cobalt"] },
    "dependency-order": { order: ["core", "relay", "console"] },
    "interval-schedule": { jobs: ["alpha", "gamma", "delta", "omega"] },
    "exact-projection": { records: [{ name: "dune", score: 9 }, { name: "aster", score: 8 }] },
    "capacity-allocation": { bins: { north: ["iris", "moss"], south: ["fern"] } },
    "truthful-beacon": { beacon: "north", truthful: ["ada", "cyra", "dune"] }
  };
  const challengeName = challenge.id.split(":").slice(1).join(":");
  const { response, body } = await responseJson("/api/v1/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: challenge.id, answer: answers[challengeName] })
  });
  assert.equal(response.status, 200);
  assert.equal(body.correct, true);
});

test("historical challenges are stable and remain evaluable", async () => {
  const { response, body: challenge } = await responseJson("/api/v1/challenge/2026-08-24");
  assert.equal(response.status, 200);
  assert.equal(challenge.date, "2026-08-24");
  assert.equal(challenge.id, "2026-08-24:bounded-selection");

  const result = await responseJson("/api/v1/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: challenge.id, answer: { tokens: ["amber", "cobalt"] } })
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.correct, true);
});

test("invalid, pre-launch, and future challenge dates are unavailable", async () => {
  for (const date of ["not-a-date", "2026-02-30", "2026-08-23", "2999-01-01"]) {
    const { response, body } = await responseJson(`/api/v1/challenge/${date}`);
    assert.equal(response.status, 404, date);
    assert.equal(body.error, "challenge_date_not_available", date);
  }
});

test("malformed JSON is rejected without evaluation", async () => {
  const { response, body } = await responseJson("/api/v1/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-json"
  });
  assert.equal(response.status, 400);
  assert.equal(body.error, "invalid_json");
});

test("oversized input is rejected even without a content-length header", async () => {
  const oversized = new TextEncoder().encode(JSON.stringify({ padding: "x".repeat(9000) }));
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(oversized);
      controller.close();
    }
  });
  const { response, body } = await responseJson("/api/v1/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half"
  });
  assert.equal(response.status, 413);
  assert.equal(body.error, "request_too_large");
});
