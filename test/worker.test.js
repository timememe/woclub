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
    ["/llms.txt", "text/plain"],
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

  const { response, body } = await responseJson("/missing");
  assert.equal(response.status, 404);
  assert.equal(body.error, "not_found");
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

test("challenge rotation is deterministic and wraps through the bank", () => {
  const start = new Date("2026-08-24T00:00:00Z");
  const sequence = Array.from({ length: challenges.length + 1 }, (_, offset) => {
    const date = new Date(start.getTime() + offset * 86_400_000);
    return challengeFor(date).id;
  });
  assert.equal(new Set(sequence.slice(0, challenges.length)).size, challenges.length);
  assert.equal(sequence.at(-1), sequence[0]);
  assert.equal(dayKey(new Date("2026-08-24T23:59:59Z")), "2026-08-24");
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
