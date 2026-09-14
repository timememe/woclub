# World storage and migration

All REST and MCP world mutations use the single `world` instance of the
`WORLD_COORDINATOR` Durable Object. Its SQLite-backed transactional key/value
storage is authoritative. One transaction commits changed chunks, global cube
count, the bounded activity sequence, and a projection outbox. Logical values
are split into 12,000-character segments below the 128 KiB value limit.

Successful responses acknowledge durable state, not immediate global visibility.
An alarm copies the outbox to the existing `METRICS` KV `w:` keys. Projection and
mutations are ordered within the coordinator; older pending projection must
finish before a newer mutation commits. On projection failure the durable
outbox survives eviction/restart, alarms retry, and further writes return an
error until projection recovers. Retrying projection copies existing activity;
it never reapplies operations or creates another event. Unkeyed request retries remain **not idempotent**. Batch/build can now carry a
request_id for the bounded durable receipt behavior below; reconcile an uncertain
write before submitting again.

World reads still use KV and its eventual consistency, plus existing endpoint
and overview caches. A successful write can take 60 seconds or longer to become
visible everywhere, especially during an outage. Poll cube/region with bounded
backoff; do not interpret one stale read as a failed write. Preview still reads
KV, stores nothing, and is not a reservation. Aggregate telemetry is unchanged
and remains approximate. The world API has no new public admin tools.

## Durable batch receipts

Batch/build with a canonical UUIDv4 `request_id` commits a SHA-256 fingerprint,
structured outcome and 24-hour expiry in the same transaction as world state.
The shared coordinator checks retained IDs before the projection gate. Identical
normalized operations return the original outcome without writes; conflicts fail
with 409. Receipt lookup reads authoritative storage, even when KV projection is
unavailable. It never interprets a storage failure as an unknown ID.

Receipt metadata uses `r:meta:<id>`, an expiry-sorted `r:expiry:<ms>:<id>` index,
and `r:count`. Outcomes use segmented logical `r:outcome:<id>` values; they never
enter the public KV projection. At most 10,000 unexpired receipts are retained.
New keyed writes at capacity fail before any world mutation. Cleanup removes at
most 100 expired entries per pass (plus an explicitly reused expired ID); it runs
on keyed admission and the existing alarm. Alarm scheduling preserves pending
world projection and the earliest receipt expiry. Unknown means absent or expired,
not proof of non-commit. ID reuse after expiry may execute again.

No migration/import is necessary: existing world state is unchanged and an absent
receipt count means zero. The world-only admin export/import deliberately excludes
receipts; it is not a receipt backup. Preserve this Durable Object namespace and
receipt-aware runtime during recovery. Do not restore a pre-receipt writer while
retained receipts are promised: it can execute duplicate requests. If rollback is
needed, pause new writes, retain receipt lookup and stored records, and repair the
current runtime instead of discarding the replay guarantee.

## First migration (operator CLI only)

1. Run all tests. Set `WORLD_WRITE_MODE = "paused"` in `wrangler.toml`.
   Deploy only Worker `woclub`, with its new SQLite Durable Object binding.
   Both REST and MCP writes are gated; reads and preview remain available.
2. Wait at least 60 seconds after confirming the paused deployment, so older
   in-flight Worker requests drain. Do not import while any old writer remains.
3. Provision a random `WORLD_ADMIN_TOKEN` Worker secret, retaining it only in
   gitignored `.run-scratch/world-admin-token` (mode 600). Never put it in git,
   command-line arguments, public docs, or output. The CLI loads that file.
4. `node scripts/world-storage.mjs snapshot .run-scratch/world-before.json`
   reads only existing world keys via the fixed Cloudflare API and checks cube
   count against metadata. Save a second snapshot and compare `entries` to
   establish stable input. Preserve both backups on this persistent volume.
5. Rehearse import on a local `wrangler dev` instance using the same source,
   binding, and a local test token. Export and compare every original entry.
   Exercise writes/restart locally; never create verification guest activity.
6. `node scripts/world-storage.mjs import .run-scratch/world-before.json`
   imports transactionally, only while writes are paused. Repeating import is
   a no-op after initialization; it cannot overwrite an active world.
7. `node scripts/world-storage.mjs export .run-scratch/world-imported.json`
   and `node scripts/world-storage.mjs status`. Compare all exported entries
   against the captured source, including activity and cube timestamps. Expect
   `initialized:true`, `pending_keys:0`, and the original cube count.
8. Set `WORLD_WRITE_MODE = "coordinated"`, deploy, and verify homepage, region,
   stats, changes, preview and authenticated status through read-only calls.
   A configured production Worker never falls back to direct KV writes.

`WORLD_ADMIN_BASE=http://localhost:8799 WORLD_ADMIN_TOKEN=local-test-only` selects
only the supported local test endpoint. The admin endpoint returns 404 without
the secret; no arbitrary destination from submitted world content is fetched.

## Rollback

Before activation, if import/deployment fails, the original KV world is untouched.
Keep writes paused while investigating. The pre-migration git commit is `b20ba96`.
To restore its request handler, extract `b20ba96:src/worker.js` into
`src/worker-rollback.js` and change `src/entry.js` to export its default handler
from that file while still exporting `WorldCoordinator` from the current
`src/worker.js`. Preserve the current Durable Object binding/migration
configuration and class export; an old entry point without the class will fail
deployment. Do not delete the namespace or its stored backup. The old handler
does not honor the pause variable: deploy it only at the final rollback step.

After activation, **never** deploy the old direct-KV writer over a stale projection.
First pause both public write paths using the new runtime, wait for in-flight
requests, and inspect authenticated status. Wait until `pending_keys` is zero;
if projection is failing, repair that path while keeping writes paused. Export
the authoritative world and capture KV, compare all chunk/meta/activity entries,
then retain both backups before deploying an older runtime. If equality cannot
be established, remain paused rather than discard acknowledged writes. The
coordinator data stays intact for repair. Re-enabling a coordinator after an
old writer has run requires an explicit new migration, not replaying the
idempotent initial import.

References: [Cloudflare storage transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
and [alarms](https://developers.cloudflare.com/durable-objects/api/alarms/).

## Bounded global reads (2026-09-14)

Overview and stats consume the same ordered chunk iterator, with one bulk KV
`get(names, "text")` for at most four keys in flight. Each text value is removed
from the response Map and parsed as the consumer reaches it; parsed chunks are
not accumulated. Listing order and cell insertion order preserve raster ties.
The existing cache and eventual-consistency contract remain unchanged. A failed
bulk read or parse propagates before any overview cache is published.

There are at most 1,024 legal chunk columns. Two 1,000-key list pages and 256
bulk reads leave room below 300 KV operations including metadata, cache and
aggregate telemetry. This reduces operation count, not dense-world CPU work.

Payload bound: a coordinate key has at most 11 ASCII bytes. The 40 UTF-16-code-
unit builder bound needs at most 240 JSON bytes (six per control character or
unpaired surrogate). Block indices need at most two digits; a timestamp within the
JavaScript Date range needs at most 17 bytes including a possible minus sign.
Including delimiters, 280 bytes per cell conservatively covers the stored JSON.
Four 20,000-cell chunks therefore use at most 22,400,008 value bytes, below even
25 decimal MB. An additional JSON text envelope adds at most 44 escape bytes
per cell plus key/envelope overhead: below 25,921,000 bytes, also below the
runtime's 25 MiB (26,214,400-byte) cap. Do not increase the group size without
recalculating both bounds. Values outside the writer's bounds are not supported.

Reference: https://developers.cloudflare.com/kv/api/read-key-value-pairs/ .
`node --test test/global-reads.test.js` checks counted REST/MCP reads and escaped
payloads. `node scripts/verify-global-reads.mjs` exercises the installed local
workerd KV binding and full escaped four-value group, without production access.
The installed Miniflare 5 alpha requires its exported V4-options converter.
