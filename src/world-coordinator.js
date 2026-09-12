import {RECEIPT_TTL_MS, RECEIPT_CAPACITY, validRequestId, operationFingerprint, batchResponse} from './receipts.js';

// Durable authoritative world storage. Visitor values remain inert JSON strings.
// Split logical values to stay below Durable Object KV's 128 KiB value ceiling.
export function storageAdapter(storage, dirty = new Set()) {
  return {
    async get(key) {
      const count = await storage.get('head:' + key);
      if (count === undefined) return null;
      let value = '';
      for (let i = 0; i < count; i++) value += await storage.get(`part:${key}:${i}`);
      return value;
    },
    async put(key, value) {
      const old = await storage.get('head:' + key) || 0;
      const count = Math.ceil(value.length / 12000);
      for (let i = 0; i < count; i++) await storage.put(`part:${key}:${i}`, value.slice(i * 12000, (i + 1) * 12000));
      for (let i = count; i < old; i++) await storage.delete(`part:${key}:${i}`);
      await storage.put('head:' + key, count);
      dirty.add(key);
    },
    async delete(key) {
      const count = await storage.get('head:' + key) || 0;
      for (let i = 0; i < count; i++) await storage.delete(`part:${key}:${i}`);
      await storage.delete('head:' + key);
      dirty.add(key);
    },
    async list({prefix = '', limit = 1000, cursor} = {}) {
      const rows = await storage.list({prefix: 'head:' + prefix, limit: limit + 1, ...(cursor ? {startAfter: cursor} : {})});
      const names = [...rows.keys()].slice(0, limit);
      return {keys: names.map(name => ({name: name.slice(5)})), list_complete: rows.size <= limit, cursor: names.at(-1)};
    }
  };
}

export function coordinatorClass(commitOps, clearBuilder) {
  return class WorldCoordinator {
    constructor(ctx, env) {
      this.ctx = ctx;
      this.env = env;
      // Orders projection I/O too. Durability comes from the transaction/outbox,
      // never from this in-memory queue; a restart retries the persisted outbox.
      this.tail = Promise.resolve();
    }
    exclusive(fn) {
      const next = this.tail.then(fn);
      this.tail = next.catch(() => {});
      return next;
    }
    async scheduleAlarm(projectionDelay = 1000) {
      const storage = this.ctx.storage;
      const first = await storage.list({prefix: 'r:expiry:', limit: 1});
      const expiry = first.size ? Number([...first.keys()][0].split(':')[2]) : Infinity;
      const pending = (await storage.get('pending') || []).length;
      const next = Math.min(expiry, pending ? Date.now() + projectionDelay : Infinity);
      if (Number.isFinite(next)) await storage.setAlarm(Math.max(Date.now() + 1000, next));
      else await storage.deleteAlarm();
    }
    async purgeReceipts() {
      // Bounded cleanup, indexed by expiry. It shares the projection alarm;
      // a backlog schedules another pass instead of scanning every receipt.
      await this.ctx.storage.transaction(async txn => {
        const rows = await txn.list({prefix: 'r:expiry:', limit: 100});
        let removed = 0;
        const kv = storageAdapter(txn);
        for (const [key, id] of rows) {
          if (Number(key.split(':')[2]) > Date.now()) break;
          await kv.delete('r:outcome:' + id);
          await txn.delete('r:meta:' + id);
          await txn.delete(key);
          removed++;
        }
        if (removed) await txn.put('r:count', Math.max(0, (await txn.get('r:count') || 0) - removed));
      });
    }
    async retainedReceipt(id) {
      const meta = await this.ctx.storage.get('r:meta:' + id);
      if (!meta || meta.expires_at_ms <= Date.now()) return null;
      const raw = await storageAdapter(this.ctx.storage).get('r:outcome:' + id);
      if (raw === null) throw new Error('Receipt outcome unavailable');
      return {meta, outcome: JSON.parse(raw)};
    }
    async project() {
      const pending = await this.ctx.storage.get('pending') || [];
      const kv = storageAdapter(this.ctx.storage);
      for (const key of pending.slice(0, 100)) {
        const value = await kv.get(key);
        if (value === null) await this.env.METRICS.delete(key);
        else await this.env.METRICS.put(key, value);
      }
      if (pending.length > 100) {
        await this.ctx.storage.put('pending', pending.slice(100));
        await this.scheduleAlarm();
        return false;
      }
      await this.ctx.storage.delete('pending');
      await this.scheduleAlarm();
      return true;
    }
    async alarm() {
      return this.exclusive(async () => {
        try { await this.purgeReceipts(); await this.project(); }
        catch (error) { await this.scheduleAlarm(10000); throw error; }
      });
    }
    async fetch(request) {
      const command = await request.json();
      return this.exclusive(async () => {
        if (command.action === 'status') {
          return Response.json({initialized: Boolean(await this.ctx.storage.get('initialized')), pending_keys: (await this.ctx.storage.get('pending') || []).length, meta: JSON.parse(await storageAdapter(this.ctx.storage).get('w:meta') || '{"n":0}')});
        }
        if (command.action === 'export') {
          const kv = storageAdapter(this.ctx.storage);
          const rows = await kv.list({prefix: 'w:', limit: 2000});
          const entries = [];
          for (const {name} of rows.keys) entries.push([name, await kv.get(name)]);
          return Response.json({entries});
        }
        if (command.action === 'import') {
          const result = await this.ctx.storage.transaction(async txn => {
            if (await txn.get('initialized')) return {already_initialized: true};
            const kv = storageAdapter(txn);
            for (const [key, value] of command.entries) {
              if (!/^w:(c:\d+:\d+|meta|changes)$/.test(key) || typeof value !== 'string') throw new Error('invalid import key/value');
              JSON.parse(value);
              await kv.put(key, value);
            }
            await txn.put('initialized', true);
            return {imported: command.entries.length};
          });
          return Response.json(result);
        }
        if (!await this.ctx.storage.get('initialized')) return Response.json({error: 'world_not_initialized'}, {status: 503});
        const id = command.request_id;
        if ((id !== undefined || command.action === 'receipt') && !validRequestId(id)) return Response.json({error: 'invalid_request_id'}, {status: 400});
        if (command.action === 'receipt') {
          const retained = await this.retainedReceipt(id);
          return Response.json(retained
            ? {status: 'committed', ...retained.outcome.receipt, outcome: batchResponse(retained.outcome)}
            : {status: 'unknown', request_id: id, note: 'Absent or expired; this does not prove the request never committed.'});
        }
        const fingerprint = id === undefined ? null : await operationFingerprint(command.ops);
        if (id !== undefined) {
          const retained = await this.retainedReceipt(id);
          if (retained) {
            if (retained.meta.fingerprint !== fingerprint) return Response.json({error: 'request_id_conflict'}, {status: 409});
            return Response.json({...retained.outcome, replayed: true});
          }
          await this.purgeReceipts();
          // If this particular ID expired behind a cleanup backlog, remove its
          // old index too before reusing it. Never remove a retained receipt.
          await this.ctx.storage.transaction(async txn => {
            const expired = await txn.get('r:meta:' + id);
            if (expired && expired.expires_at_ms <= Date.now()) {
              await storageAdapter(txn).delete('r:outcome:' + id);
              await txn.delete('r:meta:' + id);
              await txn.delete(`r:expiry:${expired.expires_at_ms}:${id}`);
              await txn.put('r:count', Math.max(0, (await txn.get('r:count') || 0) - 1));
            }
          });
          if ((await this.ctx.storage.get('r:count') || 0) >= RECEIPT_CAPACITY) return Response.json({error: 'receipt_capacity'}, {status: 503});
        }
        // Flush an older projection before committing a newer mutation. Failure
        // here cannot acknowledge a new write; the old durable commit survives.
        if ((await this.ctx.storage.get('pending') || []).length) {
          try {
            if (!await this.project()) return Response.json({error: 'world_projection_pending'}, {status: 503});
          }
          catch { return Response.json({error: 'world_projection_unavailable'}, {status: 503}); }
        }
        const result = await this.ctx.storage.transaction(async txn => {
          const dirty = new Set();
          const kv = storageAdapter(txn, dirty);
          const result = command.action === 'clear' ? await clearBuilder(kv, command.builder) : await commitOps(kv, command.ops);
          if (id !== undefined) {
            const now = Date.now(), expires = now + RECEIPT_TTL_MS;
            result.receipt = {request_id: id, committed_at: new Date(now).toISOString(), expires_at: new Date(expires).toISOString()};
            result.replayed = false;
            await storageAdapter(txn).put('r:outcome:' + id, JSON.stringify(result));
            await txn.put('r:meta:' + id, {fingerprint, expires_at_ms: expires});
            await txn.put(`r:expiry:${expires}:${id}`, id);
            await txn.put('r:count', (await txn.get('r:count') || 0) + 1);
            await txn.setAlarm(now + 1000);
          }
          if (dirty.size) {
            await txn.put('pending', [...dirty]);
            await txn.setAlarm(Date.now() + 1000);
          }
          return result;
        });
        // A successful result means the transaction is durable. KV projection
        // runs by alarm, at most one projection at a time, and is retryable.
        return Response.json(result);
      });
    }
  };
}
