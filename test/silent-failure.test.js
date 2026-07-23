import assert from 'node:assert/strict'
import test from 'node:test'

import { silentFailure } from '../src/checks/silent-failure.js'

function detect(source) {
  return silentFailure.detect(source, source.split('\n'))
}

test('ignores the exact AgentTool in-memory Map arithmetic defaults', () => {
  const source = `function aggregate(entries: readonly AssetAmount[]): Map<string, bigint> {
  const result = new Map<string, bigint>();
  for (const entry of entries) {
    result.set(
      entry.asset_id,
      (result.get(entry.asset_id) ?? 0n) + BigInt(entry.amount_atomic),
    );
  }
  return result;
}

function effectsMatch(intent: TransactionIntent, amount: bigint): boolean {
  const declared = aggregate(intent.declared_spends);
  for (const [asset, amount] of native) {
    if ((declared.get(asset) ?? 0n) < amount) return false;
  }
  return true;
}

function spendState(usage: UsageAssertion, asset: string, amount: bigint): boolean {
  const prior = aggregate(usage.spent);
  for (const [asset, amount] of simulated) {
    const limit = capability.spend_limits.find((entry) => entry.asset_id === asset);
    if (!limit || (prior.get(asset) ?? 0n) + amount > BigInt(limit.max_total)) {
      return false;
    }
  }
  return true;
}`

  assert.deepEqual(detect(source), [])
})

test('ignores arithmetic defaults on explicit local Map allocations', () => {
  const source = `const totals: ReadonlyMap<string, bigint> = new Map()
const exceeded = (totals.get("ETH") ?? 0n) > 10n`

  assert.deepEqual(detect(source), [])
})

test('keeps synchronous and awaited external reads visible', () => {
  const source = `const syncValue = redis.get(key) ?? 0
const bigintValue = syncLedger.get(key) ?? 0n
const awaitedValue = (await redis.get(key)) ?? 0
const queryValue = database.query(sql) ?? []
const fileValue = readFile(path) ?? ""`
  const hits = detect(source)

  assert.deepEqual(hits.map((hit) => hit.line), [1, 2, 3, 4, 5])
})

test('does not infer that an unknown Map-like factory is in-memory', () => {
  const source = `const cache = makeCache()
const attempts = (cache.get(key) ?? 0) + 1`

  assert.equal(detect(source).length, 1)
})

test('does not trust Map or factory-call initializer prefixes', () => {
  const source = `function aggregate(): Map<string, number> {
  const result = new Map<string, number>()
  return result
}

const direct = new Map() && redis
const directAttempts = (direct.get(key) ?? 0) + 1
const projected = aggregate() && redis
const projectedAttempts = (projected.get(key) ?? 0) + 1`

  assert.deepEqual(detect(source).map((hit) => hit.line), [7, 9])
})

test('does not trust a factory which can return an externally supplied Map', () => {
  const source = `function maybeLocal(remote: Map<string, number>, useRemote: boolean): Map<string, number> {
  const local = new Map<string, number>()
  if (useRemote) return remote
  return local
}

const counts = maybeLocal(remoteCounts, useRemote)
const attempts = (counts.get(key) ?? 0) + 1`

  assert.equal(detect(source).length, 1)
})

test('does not trust factory return prefixes or shadowed allocation bindings', () => {
  const source = `function prefixed(): Map<string, number> {
  const result = new Map<string, number>()
  return result && redis
}

function shadowed(remote: Map<string, number>, flag: boolean): Map<string, number> {
  const result = remote
  if (flag) {
    const result = new Map<string, number>()
  }
  return result
}

const prefixedCounts = prefixed()
const prefixedAttempts = (prefixedCounts.get(key) ?? 0) + 1
const shadowedCounts = shadowed(remoteCounts, flag)
const shadowedAttempts = (shadowedCounts.get(key) ?? 0) + 1`

  assert.deepEqual(detect(source).map((hit) => hit.line), [15, 17])
})

test('does not trust a factory whose Map result binding can be reassigned', () => {
  const source = `function totals(remote: Map<string, number>): Map<string, number> {
  let result = new Map<string, number>()
  result = remote
  return result
}

const counts = totals(remoteCounts)
const attempts = (counts.get(key) ?? 0) + 1`

  assert.equal(detect(source).length, 1)
})

test('does not trust a factory whose local Map get method is replaced', () => {
  const source = `function totals(): Map<string, number> {
  const result = new Map<string, number>()
  result.get = redis.get.bind(redis)
  return result
}

const counts = totals()
const attempts = (counts.get(key) ?? 0) + 1`

  assert.equal(detect(source).length, 1)
})

test('does not treat a Map annotation alone as local-allocation proof', () => {
  const source = `function attempts(cache: Map<string, number>, key: string) {
  return (cache.get(key) ?? 0) + 1
}`

  assert.equal(detect(source).length, 1)
})

test('keeps standalone Map defaults visible because they can still lie at an output boundary', () => {
  const source = `const balances = new Map()
return balances.get(asset) ?? 0`

  assert.equal(detect(source).length, 1)
})

test('a proven local Map default cannot hide an external default on the same line', () => {
  const source = `const counts = new Map()
const total = (counts.get(key) ?? 0) + (redis.get(key) ?? 0)`

  assert.equal(detect(source).length, 1)
})

test('a later unknown parameter shadows an earlier local Map binding', () => {
  const source = `function local() {
  const cache = new Map()
  return (cache.get("hits") ?? 0) + 1
}

function remote(
  cache: RedisClient,
) {
  return (cache.get("hits") ?? 0) + 1
}`

  assert.deepEqual(detect(source).map((hit) => hit.line), [9])
})

test('does not carry an in-memory binding across function scopes', () => {
  const source = `function local() {
  const cache = new Map()
}

function remote() {
  return (cache.get("hits") ?? 0) + 1
}`

  assert.deepEqual(detect(source).map((hit) => hit.line), [6])
})

test('does not exempt reassignable Map bindings', () => {
  const source = `let cache = new Map()
cache = redis
const attempts = (cache.get(key) ?? 0) + 1`

  assert.deepEqual(detect(source).map((hit) => hit.line), [3])
})

test('does not exempt a local Map whose get method is replaced', () => {
  const source = `const cache = new Map()
cache.get = redis.get.bind(redis)
const attempts = (cache.get(key) ?? 0) + 1`

  assert.deepEqual(detect(source).map((hit) => hit.line), [3])
})

test('catch defaults remain findings while visible failure handling remains quiet', () => {
  const source = `try {
  return await loadBalance()
} catch {
  return 0
}

try {
  return await loadInventory()
} catch (error) {
  logger.error(error)
  return []
}`
  const hits = detect(source)

  assert.equal(hits.length, 1)
  assert.equal(hits[0].line, 4)
  assert.match(hits[0].message, /catch returns a falsy default/)
})

test('comments and strings cannot masquerade as visible catch guards', () => {
  const source = `try {
  return await loadBalance()
} catch {
  /* TODO: throw after migration */
  return 0
}

try {
  return await loadInventory()
} catch {
  const note = "throw after migration"
  return []
}`

  assert.deepEqual(detect(source).map((hit) => hit.line), [5, 12])
})

test('catch detection preserves every supported falsy literal after masking', () => {
  const source = `try {} catch { return ''; }
try {} catch { return ""; }
try {} catch { return 0n; }
try {} catch { return "visible"; }`

  assert.deepEqual(detect(source).map((hit) => hit.line), [1, 2, 3])
})

test('detects the documented compact catch default', () => {
  const hits = detect('try { return load() } catch { return 0 }')

  assert.equal(hits.length, 1)
  assert.equal(hits[0].line, 1)
})

test('comments and quoted examples do not become same-line read findings', () => {
  const source = `// redis.get(key) ?? 0
const example = "redis.get(key) ?? 0"
const template = \`redis.get(key) ?? 0\``

  assert.deepEqual(detect(source), [])
})
