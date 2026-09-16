import test from 'node:test';
import assert from 'node:assert/strict';
import { INSPECTION_TOOLS, ENDPOINT, selectTools, withPlaygroundTools } from '../public/examples/ai_sdk_tools.mjs';

function fixture() {
  const tools = Object.fromEntries(INSPECTION_TOOLS.map(name => [name, { execute: async () => name }]));
  tools.build = { execute: () => { throw Error('world mutation exposed'); } };
  tools.future_mutation = tools.build;
  return tools;
}

test('AI SDK excludes writes and unknown tools while preserving native tool identity', () => {
  const discovered = fixture();
  const selected = selectTools(discovered);
  assert.deepEqual(Object.keys(selected), INSPECTION_TOOLS);
  assert.equal(selected.preview_build, discovered.preview_build);
  delete discovered.get_template;
  assert.throws(() => selectTools(discovered), /get_template/);
});

test('AI SDK connection remains open through asynchronous work then closes', async () => {
  let closed = false;
  const result = await withPlaygroundTools(async tools => {
    await Promise.resolve();
    assert.equal(closed, false);
    return tools.get_world_stats.execute({});
  }, async config => {
    assert.deepEqual(config, { transport: { type: 'http', url: ENDPOINT } });
    return { tools: async () => fixture(), close: async () => { closed = true; } };
  });
  assert.equal(result, 'get_world_stats');
  assert.equal(closed, true);
});

test('AI SDK closes on discovery, schema and caller failures without retrying', async () => {
  for (const stage of ['discovery', 'schema', 'caller']) {
    let closes = 0, discoveries = 0, calls = 0;
    await assert.rejects(withPlaygroundTools(async () => {
      calls++;
      throw Error('caller failure');
    }, async () => ({
      tools: async () => {
        discoveries++;
        if (stage === 'discovery') throw Error('discovery failure');
        return stage === 'schema' ? {} : fixture();
      }, close: async () => { closes++; },
    })));
    assert.equal(closes, 1);
    assert.equal(discoveries, 1);
    assert.equal(calls, stage === 'caller' ? 1 : 0);
  }
});
