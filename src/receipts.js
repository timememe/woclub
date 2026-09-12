export const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
export const RECEIPT_CAPACITY = 10000;
export const REQUEST_ID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
export const validRequestId = value => typeof value === 'string' && value.length === 36 && new RegExp(REQUEST_ID_PATTERN).test(value);

// Inputs have passed validateOps. Fixed tuples fingerprint execution semantics,
// not JSON key order, ignored fields, or the location of a builder default.
export async function operationFingerprint(ops) {
  const canonical = ops.map(op => op.op === 'remove'
    ? ['remove', op.x, op.y, op.z]
    : ['place', op.x, op.y, op.z, typeof op.type === 'string' ? op.type : null, op.builder ?? null]);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function batchResponse(outcome) {
  return {ok: true, summary: outcome.summary, results: outcome.results,
    ...(outcome.receipt ? {receipt: outcome.receipt, replayed: Boolean(outcome.replayed)} : {})};
}
