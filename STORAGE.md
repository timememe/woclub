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
it never reapplies operations or creates another event. Request retries are
**not idempotent**: reconcile an uncertain write before submitting again.

Public reads still use KV and its eventual consistency, plus existing endpoint
and overview caches. A successful write can take 60 seconds or longer to become
visible everywhere, especially during an outage. Poll cube/region with bounded
backoff; do not interpret one stale read as a failed write. Preview still reads
KV, stores nothing, and is not a reservation. Aggregate telemetry is unchanged
and remains approximate. The world API has no new public admin tools.

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
