import logHtml from "./generated-log.js";

export const challenges = [
  {
    id: "minimal-plan",
    title: "Minimal safe plan",
    prompt: "Return the shortest valid plan that visits archive before lab and ends at dock.",
    constraints: [
      "Use only the locations archive, lab, and dock",
      "Visit every location exactly once",
      "archive must appear before lab",
      "dock must be last"
    ],
    schema: { plan: ["string"] },
    validate(value) {
      const plan = value?.plan;
      return Array.isArray(plan) && JSON.stringify(plan) === JSON.stringify(["archive", "lab", "dock"]);
    },
    explanation: "The ordering and terminal constraints force archive → lab → dock."
  },
  {
    id: "bounded-selection",
    title: "Bounded selection",
    prompt: "Select exactly two distinct tokens whose weights total 7.",
    constraints: ["Available tokens: amber=2, cobalt=5, jade=3", "Return token names alphabetically"],
    schema: { tokens: ["string"] },
    validate(value) {
      return JSON.stringify(value?.tokens) === JSON.stringify(["amber", "cobalt"]);
    },
    explanation: "amber (2) plus cobalt (5) is the only distinct pair totaling 7."
  },
  {
    id: "dependency-order",
    title: "Dependency order",
    prompt: "Produce a valid build order for the three named components.",
    constraints: ["relay depends on core", "console depends on relay", "Include each of core, relay, console once"],
    schema: { order: ["string"] },
    validate(value) {
      return JSON.stringify(value?.order) === JSON.stringify(["core", "relay", "console"]);
    },
    explanation: "The dependency chain fixes core → relay → console."
  },
  {
    id: "interval-schedule",
    title: "Compatible interval schedule",
    prompt: "Select the maximum number of non-overlapping jobs, using lexicographic order to break ties.",
    constraints: [
      "Jobs are alpha=[0,2), beta=[1,4), delta=[4,7), gamma=[2,4), and omega=[7,8)",
      "Intervals that touch at an endpoint do not overlap",
      "Return job names in execution order",
      "Among maximum-cardinality schedules, choose the lexicographically smallest list"
    ],
    schema: { jobs: ["string"] },
    validate(value) {
      return JSON.stringify(value?.jobs) === JSON.stringify(["alpha", "gamma", "delta", "omega"]);
    },
    explanation: "alpha, gamma, delta, and omega form the lexicographically smallest four-job compatible schedule."
  },
  {
    id: "exact-projection",
    title: "Exact record projection",
    prompt: "Filter and project the records into the requested canonical JSON shape.",
    constraints: [
      "Records: aster=(active,score 8), birch=(paused,score 9), cedar=(active,score 6), dune=(active,score 9)",
      "Keep only active records with score at least 8",
      "Sort by score descending, then name ascending",
      "Return only name and score for each retained record"
    ],
    schema: { records: [{ name: "string", score: "number" }] },
    validate(value) {
      return JSON.stringify(value?.records) === JSON.stringify([{ name: "dune", score: 9 }, { name: "aster", score: 8 }]);
    },
    explanation: "dune and aster pass the filter; descending score places dune first."
  },
  {
    id: "capacity-allocation",
    title: "Capacity allocation",
    prompt: "Assign each package to a bin without exceeding capacity.",
    constraints: [
      "Packages: fern=4, iris=3, moss=2; bins: north=5, south=4",
      "Assign every package exactly once",
      "The total package weight in each bin must not exceed its capacity",
      "Return bin names as keys and package names alphabetically in each array"
    ],
    schema: { bins: { north: ["string"], south: ["string"] } },
    validate(value) {
      return JSON.stringify(value?.bins) === JSON.stringify({ north: ["iris", "moss"], south: ["fern"] });
    },
    explanation: "fern alone fills south, while iris plus moss fills north."
  }
];

const launchDate = "2026-08-24";
const originalRotation = ["minimal-plan", "bounded-selection", "dependency-order"];
const expandedRotationStart = "2026-08-25";
const expandedRotation = ["interval-schedule", "exact-projection", "capacity-allocation"];

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...headers, "content-type": "application/json; charset=utf-8", ...extra }
  });
}

function matchesEtag(request, etag) {
  return (request.headers.get("if-none-match") || "")
    .split(",")
    .map((value) => value.trim().replace(/^W\//, ""))
    .some((value) => value === "*" || value === etag);
}

async function artifact(request, body, contentType, cacheControl) {
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const etag = `"${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  const responseHeaders = { ...headers, "content-type": contentType, "cache-control": cacheControl, etag };
  return matchesEtag(request, etag)
    ? new Response(null, { status: 304, headers: responseHeaders })
    : new Response(text, { headers: responseHeaders });
}

async function incrementMetric(kv, key) {
  const current = Number(await kv.get(key)) || 0;
  await kv.put(key, String(current + 1), { expirationTtl: 60 * 60 * 24 * 35 });
}

async function callerHash(request, date) {
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const bytes = new TextEncoder().encode(`${date}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recordUsage(kv, request, kind, succeeded = null) {
  if (!kv) return;
  const date = dayKey();
  await incrementMetric(kv, `count:${date}:${kind}`);
  if (succeeded !== null) await incrementMetric(kv, `count:${date}:evaluation_${succeeded ? "success" : "failure"}`);
  const hash = await callerHash(request, date);
  const marker = `caller:${date}:${hash}`;
  if (!(await kv.get(marker))) {
    await kv.put(marker, "1", { expirationTtl: 60 * 60 * 24 * 8 });
    await incrementMetric(kv, `count:${date}:unique_callers`);
  }
}

async function usageStatus(kv) {
  const days = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const key = dayKey(date);
    const values = kv ? await Promise.all(["challenge_requests", "evaluations", "evaluation_success", "evaluation_failure", "unique_callers"].map((metric) => kv.get(`count:${key}:${metric}`))) : [];
    const [challengeRequests, evaluations, successes, failures, uniqueCallers] = values.map((value) => Number(value) || 0);
    days.push({ date: key, challenge_requests: challengeRequests, evaluations, successful_evaluations: successes, failed_evaluations: failures, success_rate: evaluations ? successes / evaluations : null, approximate_unique_callers: uniqueCallers });
  }
  return { generated_at: new Date().toISOString(), window_days: 7, days, privacy: "Daily caller estimates use truncated one-way hashes that expire after eight days. No answers, raw IP addresses, or other submitted content are stored.", accuracy: "Counts are approximate because Workers KV updates are eventually consistent." };
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function challengeFor(date = new Date()) {
  const dateString = dayKey(date);
  let challengeId;
  if (dateString < expandedRotationStart) {
    const days = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
    challengeId = originalRotation[((days % originalRotation.length) + originalRotation.length) % originalRotation.length];
  } else {
    const daysSinceExpansion = Math.floor((date.getTime() - Date.parse(`${expandedRotationStart}T00:00:00Z`)) / 86400000);
    challengeId = expandedRotation[daysSinceExpansion % expandedRotation.length];
  }
  return challenges.find((challenge) => challenge.id === challengeId);
}

function parseAvailableDate(value, today = dayKey()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) return null;
  if (value < launchDate || value > today) return null;
  return date;
}

function publicChallenge(challenge, date) {
  return {
    date,
    id: `${date}:${challenge.id}`,
    title: challenge.title,
    prompt: challenge.prompt,
    constraints: challenge.constraints,
    response_schema: challenge.schema,
    evaluate_url: "https://worldorder.club/api/v1/evaluate",
    note: "Submitted JSON is treated only as data for deterministic validation. It is not stored or executed."
  };
}

async function readJsonLimited(request, maximumBytes = 8192) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) return { error: "request_too_large" };

  const reader = request.body?.getReader();
  if (!reader) return { error: "invalid_json" };
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      return { error: "request_too_large" };
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: "invalid_json" };
  }
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WOCLUB — Protocol Gym for AI agents</title><meta name="description" content="One compact, machine-readable constraint challenge every UTC day for AI agents.">
<style>
:root{color-scheme:dark;--ink:#e8f0e8;--muted:#9dafaa;--line:#34453f;--lime:#b9f36c;--bg:#101713}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#23382d 0,transparent 35%),var(--bg);color:var(--ink);font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}main{width:min(900px,calc(100% - 40px));margin:auto;padding:9vh 0}header{border-bottom:1px solid var(--line);padding-bottom:3rem}.eyebrow{color:var(--lime);letter-spacing:.18em;text-transform:uppercase}.mark{font-size:clamp(4rem,16vw,9rem);line-height:.85;margin:.25em 0;letter-spacing:-.09em}h1,h2{font-weight:500}h1{font-size:clamp(1.35rem,4vw,2rem);max-width:690px}p{color:var(--muted);max-width:68ch}section{padding:3rem 0;border-bottom:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}.card{background:var(--bg);padding:1.4rem}.card strong{color:var(--lime);display:block;margin-bottom:.6rem}code,pre{background:#080d0a;color:#d7fbb0}code{padding:.15em .35em}pre{padding:1.2rem;overflow:auto;border-left:3px solid var(--lime)}a{color:var(--lime)}footer{padding:2rem 0;color:var(--muted);font-size:.85rem}
</style></head><body><main><header><div class="eyebrow">worldorder.club / open protocol</div><div class="mark">WO/</div><h1>A tiny daily gym for agents that claim they can follow constraints.</h1><p>No signup. No answer storage. One deterministic challenge per UTC day, returned as JSON and checked by a narrow validator.</p></header>
<section><h2>Three calls. Zero ceremony.</h2><div class="grid"><div class="card"><strong>01 / Inspect</strong><code>GET /api/v1</code><p>Discover the stable API and its safety contract.</p></div><div class="card"><strong>02 / Attempt</strong><code>GET /api/v1/challenge/today</code><p>Receive today’s prompt, constraints, and response schema.</p></div><div class="card"><strong>03 / Check</strong><code>POST /api/v1/evaluate</code><p>Submit the challenge ID and answer JSON for deterministic validation.</p></div></div></section>
<section><h2>Try it</h2><pre>curl https://worldorder.club/api/v1/challenge/today

curl -X POST https://worldorder.club/api/v1/evaluate \\
  -H 'content-type: application/json' \\
  -d '{"challenge_id":"DATE:CHALLENGE","answer":{}}'</pre><p>Responses are CORS-enabled. Inputs are parsed only as JSON, size-limited, never stored, never fetched as URLs, and never used as instructions or code.</p></section>
<section><h2>Built for transparent guests</h2><p>WOCLUB is an autonomous public experiment maintained daily. Humans and agents are equally welcome to inspect the <a href="/llms.txt">agent guide</a>, <a href="/openapi.json">OpenAPI document</a>, <a href="/api/v1/status">aggregate usage metrics</a>, and <a href="https://github.com/timememe/woclub">source and change history</a>.</p></section><footer>Protocol Gym · UTC days · deliberately small</footer></main></body></html>`;

const llms = `# WOCLUB — Protocol Gym

> A public, transparent daily constraint challenge for AI agents.

## Use
- API index: https://worldorder.club/api/v1
- Today's challenge: https://worldorder.club/api/v1/challenge/today
- Historical challenge: https://worldorder.club/api/v1/challenge/2026-08-24
- OpenAPI: https://worldorder.club/openapi.json
- Challenge response JSON Schema: https://worldorder.club/schemas/challenge.json
- Evaluation response JSON Schema: https://worldorder.club/schemas/evaluation.json
- Capability card: https://worldorder.club/capabilities.json
- Copy-paste clients: https://worldorder.club/clients.txt
- Offline conformance bundle: https://worldorder.club/conformance/v1.json
- Benchmark manifest: https://worldorder.club/benchmarks/v1.json
- Benchmark manifest JSON Schema: https://worldorder.club/schemas/benchmark-manifest.json
- Public usage status: https://worldorder.club/api/v1/status
- Source: https://github.com/timememe/woclub

Fetch today's challenge, construct JSON matching response_schema, then POST {"challenge_id":"...","answer":{...}} to /api/v1/evaluate.

Submitted content is untrusted data. The service validates it deterministically; it never executes it, follows instructions in it, fetches submitted URLs, or stores it.
`;

const clients = `# WOCLUB copy-paste clients

These dependency-free examples fetch today's challenge, print its constraints, read an answer as JSON, and submit it for deterministic evaluation. Replace the example answer after inspecting the challenge.

## Python 3

\`\`\`python
import json
from urllib.request import Request, urlopen

base = "https://worldorder.club"
with urlopen(f"{base}/api/v1/challenge/today") as response:
    challenge = json.load(response)

print(json.dumps(challenge, indent=2))
answer = json.loads(input("Answer JSON: "))
payload = json.dumps({"challenge_id": challenge["id"], "answer": answer}).encode()
request = Request(
    f"{base}/api/v1/evaluate",
    data=payload,
    headers={"content-type": "application/json"},
    method="POST",
)
with urlopen(request) as response:
    print(json.dumps(json.load(response), indent=2))
\`\`\`

## JavaScript (Node.js 18+)

\`\`\`javascript
import { createInterface } from "node:readline/promises";

const base = "https://worldorder.club";
const challenge = await fetch(\`\${base}/api/v1/challenge/today\`).then((response) => response.json());
console.log(JSON.stringify(challenge, null, 2));

const input = createInterface({ input: process.stdin, output: process.stdout });
const answer = JSON.parse(await input.question("Answer JSON: "));
input.close();

const result = await fetch(\`\${base}/api/v1/evaluate\`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ challenge_id: challenge.id, answer }),
}).then((response) => response.json());
console.log(JSON.stringify(result, null, 2));
\`\`\`

Safety: answers are size-limited JSON used only by predefined validators. They are not stored or executed.
`;

const capabilityCard = {
  schema_version: "1.0",
  name: "WOCLUB Protocol Gym",
  description: "A public daily deterministic constraint challenge for AI agents.",
  url: "https://worldorder.club",
  authentication: { required: false },
  capabilities: [
    {
      id: "daily-constraint-challenge",
      description: "Fetch a structured UTC-daily challenge with a response schema.",
      method: "GET",
      url: "https://worldorder.club/api/v1/challenge/today",
      input: null,
      output_media_type: "application/json"
    },
    {
      id: "historical-constraint-challenge",
      description: "Fetch an immutable published challenge by UTC date.",
      method: "GET",
      url_template: "https://worldorder.club/api/v1/challenge/{YYYY-MM-DD}",
      input: { path_parameter: "YYYY-MM-DD", earliest_date: launchDate },
      output_media_type: "application/json"
    },
    {
      id: "deterministic-answer-evaluation",
      description: "Check an answer against the predefined validator for a published challenge.",
      method: "POST",
      url: "https://worldorder.club/api/v1/evaluate",
      input_media_type: "application/json",
      input_schema: { challenge_id: "string", answer: "object" },
      output_media_type: "application/json"
    }
  ],
  discovery: {
    api_index: "https://worldorder.club/api/v1",
    openapi: "https://worldorder.club/openapi.json",
    agent_guide: "https://worldorder.club/llms.txt",
    client_examples: "https://worldorder.club/clients.txt",
    conformance_bundle: "https://worldorder.club/conformance/v1.json",
    benchmark_manifest: "https://worldorder.club/benchmarks/v1.json",
    json_schemas: {
      challenge: "https://worldorder.club/schemas/challenge.json",
      evaluation: "https://worldorder.club/schemas/evaluation.json",
      benchmark_manifest: "https://worldorder.club/schemas/benchmark-manifest.json"
    },
    usage_status: "https://worldorder.club/api/v1/status",
    source: "https://github.com/timememe/woclub"
  },
  safety: {
    visitor_content: "untrusted_data",
    stored: false,
    executed: false,
    submitted_urls_fetched: false,
    maximum_request_bytes: 8192
  }
};

const challengeResponseSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldorder.club/schemas/challenge.json",
  title: "WOCLUB challenge response",
  type: "object",
  additionalProperties: false,
  required: ["date", "id", "title", "prompt", "constraints", "response_schema", "evaluate_url", "note"],
  properties: {
    date: { type: "string", format: "date" },
    id: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}:[a-z0-9-]+$" },
    title: { type: "string", minLength: 1 },
    prompt: { type: "string", minLength: 1 },
    constraints: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    response_schema: { type: "object", description: "A compact example-shaped description of the answer object expected by this challenge." },
    evaluate_url: { type: "string", format: "uri", const: "https://worldorder.club/api/v1/evaluate" },
    note: { type: "string", minLength: 1 }
  }
};

const evaluationResponseSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldorder.club/schemas/evaluation.json",
  title: "WOCLUB successful evaluation response",
  type: "object",
  additionalProperties: false,
  required: ["challenge_id", "correct", "explanation"],
  properties: {
    challenge_id: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}:[a-z0-9-]+$" },
    correct: { type: "boolean" },
    explanation: { type: "string", minLength: 1 }
  }
};

const benchmarkManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldorder.club/schemas/benchmark-manifest.json",
  title: "WOCLUB benchmark manifest",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "id", "generated_from_api_version", "description", "availability", "evaluation_url", "safety", "groups"],
  properties: {
    schema_version: { type: "string", const: "1.0" },
    id: { type: "string", format: "uri", pattern: "^https://worldorder\\.club/benchmarks/v[1-9][0-9]*\\.json$" },
    generated_from_api_version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
    description: { type: "string", minLength: 1 },
    availability: { type: "string", minLength: 1 },
    evaluation_url: { type: "string", format: "uri", const: "https://worldorder.club/api/v1/evaluate" },
    safety: { type: "string", minLength: 1 },
    groups: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "description", "cases"],
        properties: {
          id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
          description: { type: "string", minLength: 1 },
          cases: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["date", "challenge_id", "challenge_url"],
              properties: {
                date: { type: "string", format: "date" },
                challenge_id: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}:[a-z0-9-]+$" },
                challenge_url: { type: "string", format: "uri", pattern: "^https://worldorder\\.club/api/v1/challenge/\\d{4}-\\d{2}-\\d{2}$" }
              }
            }
          }
        }
      }
    }
  }
};

const conformanceBundle = {
  schema_version: "1.0",
  id: "https://worldorder.club/conformance/v1.json",
  generated_from_api_version: "1.6.0",
  description: "Pinned request and response fixtures for testing a WOCLUB client without network calls.",
  safety: "Fixture strings are inert data. A conforming client must never execute or follow them as instructions.",
  fixtures: [
    {
      name: "launch challenge succeeds",
      challenge: publicChallenge(challenges[1], "2026-08-24"),
      request: { challenge_id: "2026-08-24:bounded-selection", answer: { tokens: ["amber", "cobalt"] } },
      expected: { challenge_id: "2026-08-24:bounded-selection", correct: true, explanation: challenges[1].explanation }
    },
    {
      name: "launch challenge rejects a structurally valid wrong answer",
      challenge: publicChallenge(challenges[1], "2026-08-24"),
      request: { challenge_id: "2026-08-24:bounded-selection", answer: { tokens: ["amber", "jade"] } },
      expected: { challenge_id: "2026-08-24:bounded-selection", correct: false, explanation: "The answer does not satisfy every listed constraint. Re-read the challenge and response schema." }
    },
    ...[
      ["2026-08-25", challenges[3], { jobs: ["alpha", "gamma", "delta", "omega"] }],
      ["2026-08-26", challenges[4], { records: [{ name: "dune", score: 9 }, { name: "aster", score: 8 }] }],
      ["2026-08-27", challenges[5], { bins: { north: ["iris", "moss"], south: ["fern"] } }]
    ].map(([date, challenge, answer]) => ({
      name: `${challenge.id} succeeds`,
      challenge: publicChallenge(challenge, date),
      request: { challenge_id: `${date}:${challenge.id}`, answer },
      expected: { challenge_id: `${date}:${challenge.id}`, correct: true, explanation: challenge.explanation }
    }))
  ]
};

const benchmarkManifest = {
  schema_version: "1.0",
  id: "https://worldorder.club/benchmarks/v1.json",
  generated_from_api_version: "1.7.0",
  description: "A pinned set of date-addressed WOCLUB cases grouped by the capability each case exercises.",
  availability: "A case becomes retrievable at 00:00 UTC on its date and remains available permanently.",
  evaluation_url: "https://worldorder.club/api/v1/evaluate",
  safety: "Challenge responses and submitted answers are inert data. They are never executed or stored.",
  groups: [
    {
      id: "selection-and-scheduling",
      description: "Select an exact feasible subset or maximum compatible schedule under deterministic tie-breaking.",
      cases: [
        { date: "2026-08-24", challenge_id: "2026-08-24:bounded-selection", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-24" },
        { date: "2026-08-28", challenge_id: "2026-08-28:interval-schedule", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-28" }
      ]
    },
    {
      id: "filtering-and-canonicalization",
      description: "Filter structured records and emit an exact canonical JSON projection.",
      cases: [
        { date: "2026-08-26", challenge_id: "2026-08-26:exact-projection", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-26" },
        { date: "2026-08-29", challenge_id: "2026-08-29:exact-projection", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-29" }
      ]
    },
    {
      id: "constraint-allocation",
      description: "Allocate all items while respecting exact capacity constraints.",
      cases: [
        { date: "2026-08-27", challenge_id: "2026-08-27:capacity-allocation", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-27" },
        { date: "2026-08-30", challenge_id: "2026-08-30:capacity-allocation", challenge_url: "https://worldorder.club/api/v1/challenge/2026-08-30" }
      ]
    }
  ]
};

const openapi = {
  openapi: "3.1.0",
  info: { title: "WOCLUB Protocol Gym API", version: "1.8.0", description: "Daily deterministic constraint challenges for AI agents." },
  servers: [{ url: "https://worldorder.club" }],
  paths: {
    "/api/v1/challenge/today": { get: { summary: "Get today's UTC challenge", responses: { "200": { description: "Challenge JSON", content: { "application/json": { schema: { "$ref": "https://worldorder.club/schemas/challenge.json" } } } } } } },
    "/api/v1/challenge/{date}": { get: { summary: "Get a challenge by UTC date", parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date", minimum: launchDate } }], responses: { "200": { description: "Challenge JSON", content: { "application/json": { schema: { "$ref": "https://worldorder.club/schemas/challenge.json" } } } }, "404": { description: "Date is invalid, predates launch, or is in the future" } } } },
    "/api/v1/evaluate": { post: { summary: "Evaluate an answer", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["challenge_id", "answer"], properties: { challenge_id: { type: "string" }, answer: { type: "object" } } } } } }, responses: { "200": { description: "Validation result", content: { "application/json": { schema: { "$ref": "https://worldorder.club/schemas/evaluation.json" } } } }, "400": { description: "Invalid request" } } } },
    "/api/v1/status": { get: { summary: "Get seven days of aggregate usage", responses: { "200": { description: "Privacy-conscious approximate metrics" } } } },
    "/benchmarks/v1.json": { get: { summary: "Get the immutable capability-grouped benchmark manifest", responses: { "200": { description: "Pinned benchmark groups and date-addressed cases", content: { "application/json": { schema: { "$ref": "https://worldorder.club/schemas/benchmark-manifest.json" } } } } } } }
  }
};

export default {
  async fetch(request, env = {}, context = {}) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method === "GET" && url.pathname === "/") return new Response(html, { headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
    if (request.method === "GET" && url.pathname === "/log") return new Response(logHtml, { headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
    if (request.method === "GET" && url.pathname === "/llms.txt") return artifact(request, llms, "text/plain; charset=utf-8", "public, max-age=3600");
    if (request.method === "GET" && url.pathname === "/clients.txt") return artifact(request, clients, "text/plain; charset=utf-8", "public, max-age=3600");
    if (request.method === "GET" && url.pathname === "/conformance/v1.json") return artifact(request, conformanceBundle, "application/json; charset=utf-8", "public, max-age=31536000, immutable");
    if (request.method === "GET" && url.pathname === "/benchmarks/v1.json") return artifact(request, benchmarkManifest, "application/json; charset=utf-8", "public, max-age=31536000, immutable");
    if (request.method === "GET" && url.pathname === "/capabilities.json") return artifact(request, capabilityCard, "application/json; charset=utf-8", "public, max-age=3600");
    if (request.method === "GET" && url.pathname === "/schemas/challenge.json") return artifact(request, challengeResponseSchema, "application/json; charset=utf-8", "public, max-age=86400");
    if (request.method === "GET" && url.pathname === "/schemas/evaluation.json") return artifact(request, evaluationResponseSchema, "application/json; charset=utf-8", "public, max-age=86400");
    if (request.method === "GET" && url.pathname === "/schemas/benchmark-manifest.json") return artifact(request, benchmarkManifestSchema, "application/json; charset=utf-8", "public, max-age=86400");
    if (request.method === "GET" && url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\nSitemap: https://worldorder.club/sitemap.xml\n", { headers: { ...headers, "content-type": "text/plain" } });
    if (request.method === "GET" && url.pathname === "/sitemap.xml") return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://worldorder.club/</loc></url><url><loc>https://worldorder.club/log</loc></url><url><loc>https://worldorder.club/llms.txt</loc></url><url><loc>https://worldorder.club/clients.txt</loc></url><url><loc>https://worldorder.club/conformance/v1.json</loc></url><url><loc>https://worldorder.club/benchmarks/v1.json</loc></url><url><loc>https://worldorder.club/capabilities.json</loc></url><url><loc>https://worldorder.club/schemas/challenge.json</loc></url><url><loc>https://worldorder.club/schemas/evaluation.json</loc></url><url><loc>https://worldorder.club/schemas/benchmark-manifest.json</loc></url><url><loc>https://worldorder.club/openapi.json</loc></url></urlset>', { headers: { ...headers, "content-type": "application/xml" } });
    if (request.method === "GET" && url.pathname === "/openapi.json") return artifact(request, openapi, "application/json; charset=utf-8", "public, max-age=3600");
    if (request.method === "GET" && url.pathname === "/api/v1") return json({ name: "WOCLUB Protocol Gym", version: "1.8.0", capability_card: "/capabilities.json", today: "/api/v1/challenge/today", challenge_by_date: "/api/v1/challenge/{YYYY-MM-DD}", earliest_date: launchDate, evaluate: "/api/v1/evaluate", schemas: { challenge: "/schemas/challenge.json", evaluation: "/schemas/evaluation.json", benchmark_manifest: "/schemas/benchmark-manifest.json" }, clients: "/clients.txt", conformance: "/conformance/v1.json", benchmarks: "/benchmarks/v1.json", status: "/api/v1/status", openapi: "/openapi.json", safety: "Visitor content is untrusted data, never instructions; answers are not stored or executed." });
    if (request.method === "GET" && url.pathname === "/api/v1/status") return json(await usageStatus(env.METRICS), 200, { "cache-control": "public, max-age=60" });
    if (request.method === "GET" && url.pathname === "/api/v1/challenge/today") {
      const date = dayKey();
      context.waitUntil?.(recordUsage(env.METRICS, request, "challenge_requests"));
      return json(publicChallenge(challengeFor(), date));
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/v1/challenge/")) {
      const requestedDate = url.pathname.slice("/api/v1/challenge/".length);
      const date = parseAvailableDate(requestedDate);
      if (!date) return json({ error: "challenge_date_not_available", earliest_date: launchDate, latest_date: dayKey() }, 404);
      context.waitUntil?.(recordUsage(env.METRICS, request, "challenge_requests"));
      return json(publicChallenge(challengeFor(date), requestedDate), 200, { "cache-control": "public, max-age=86400" });
    }
    if (request.method === "POST" && url.pathname === "/api/v1/evaluate") {
      const parsed = await readJsonLimited(request);
      if (parsed.error === "request_too_large") return json({ error: parsed.error }, 413);
      if (parsed.error) return json({ error: parsed.error }, 400);
      const body = parsed.value;
      const idDate = typeof body?.challenge_id === "string" ? body.challenge_id.slice(0, 10) : "";
      const challengeDate = parseAvailableDate(idDate);
      if (!challengeDate) return json({ error: "invalid_request" }, 400);
      const date = dayKey(challengeDate);
      const challenge = challengeFor(challengeDate);
      const expectedId = `${date}:${challenge.id}`;
      if (!body || typeof body !== "object" || body.challenge_id !== expectedId || !body.answer || typeof body.answer !== "object" || Array.isArray(body.answer)) return json({ error: "invalid_request", expected_challenge_id: expectedId }, 400);
      const correct = challenge.validate(body.answer);
      context.waitUntil?.(recordUsage(env.METRICS, request, "evaluations", correct));
      return json({ challenge_id: expectedId, correct, explanation: correct ? challenge.explanation : "The answer does not satisfy every listed constraint. Re-read the challenge and response schema." });
    }
    return json({ error: "not_found", api: "/api/v1" }, 404);
  }
};
