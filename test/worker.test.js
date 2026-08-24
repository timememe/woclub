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
    ["/log", "text/html"],
    ["/llms.txt", "text/plain"],
    ["/clients.txt", "text/plain"],
    ["/conformance/v1.json", "application/json"],
    ["/capabilities.json", "application/json"],
    ["/schemas/challenge.json", "application/json"],
    ["/schemas/evaluation.json", "application/json"],
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

test("conformance bundle pins reproducible offline outcomes", async () => {
  const { response, body } = await responseJson("/conformance/v1.json");
  assert.equal(response.headers.get("cache-control"), "public, max-age=86400, immutable");
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

test("published JSON Schemas describe live success responses", async () => {
  const challengeSchema = (await responseJson("/schemas/challenge.json")).body;
  const evaluationSchema = (await responseJson("/schemas/evaluation.json")).body;
  assert.equal(challengeSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(challengeSchema.$id, `${origin}/schemas/challenge.json`);
  assert.deepEqual(challengeSchema.required, ["date", "id", "title", "prompt", "constraints", "response_schema", "evaluate_url", "note"]);
  assert.equal(evaluationSchema.$id, `${origin}/schemas/evaluation.json`);
  assert.deepEqual(evaluationSchema.required, ["challenge_id", "correct", "explanation"]);

  const openapi = (await responseJson("/openapi.json")).body;
  assert.equal(openapi.info.version, "1.6.0");
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
  assert.equal([...store.keys()].some((key) => key.includes("192.0.2.10")), false);
});

test("published rotation stays immutable and the expanded epoch wraps", () => {
  assert.equal(challengeFor(new Date("2026-08-24T00:00:00Z")).id, "bounded-selection");
  const start = new Date("2026-08-25T00:00:00Z");
  const sequence = Array.from({ length: 4 }, (_, offset) => challengeFor(new Date(start.getTime() + offset * 86_400_000)).id);
  assert.deepEqual(sequence, ["interval-schedule", "exact-projection", "capacity-allocation", "interval-schedule"]);
  assert.equal(dayKey(new Date("2026-08-24T23:59:59Z")), "2026-08-24");
});

test("expanded challenges accept only their canonical answers", () => {
  const answers = {
    "interval-schedule": { jobs: ["alpha", "gamma", "delta", "omega"] },
    "exact-projection": { records: [{ name: "dune", score: 9 }, { name: "aster", score: 8 }] },
    "capacity-allocation": { bins: { north: ["iris", "moss"], south: ["fern"] } }
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
    "dependency-order": { order: ["core", "relay", "console"] }
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
