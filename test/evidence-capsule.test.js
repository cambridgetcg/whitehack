import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'

import { CHECK_MANIFEST } from '../src/core.js'
import {
  EVIDENCE_CAPSULE_ADDRESS_ALGORITHM,
  EVIDENCE_CAPSULE_DISCLOSURE_PROFILE,
  EVIDENCE_CAPSULE_DOCUMENT_TYPE,
  EVIDENCE_CAPSULE_SCANNER_VERSION,
  MAX_EVIDENCE_CAPSULE_BYTES,
  addressEvidenceCapsule,
  canonicalizeEvidenceCapsule,
  createEvidenceCapsule,
  encodeEvidenceCapsule,
  parseEvidenceCapsuleBytes,
} from '../src/evidence-capsule.js'
import { createScanResult } from '../src/result.js'

const CLI = fileURLToPath(new URL('../bin/whitehack.js', import.meta.url))

function scope(overrides = {}) {
  const base = {
    files_scanned: 2,
    bytes_scanned: 128,
    entries_observed: 3,
    excluded_paths: 0,
    non_regular_paths: 0,
    unsupported_files: 1,
    excluded_basenames: [
      '.git',
      '.hg',
      '.next',
      '.svn',
      'build',
      'coverage',
      'dist',
      'node_modules',
      'out',
      'vendor',
    ],
    limits: {
      maxFiles: 10_000,
      maxFileBytes: 1024 * 1024,
      maxTotalBytes: 64 * 1024 * 1024,
      maxEntries: 100_000,
      maxDepth: 64,
      maxPathBytes: 4096,
      maxLinesPerFile: 10_000,
      maxFindings: 10_000,
    },
  }
  return {
    ...base,
    ...overrides,
    limits: { ...base.limits, ...overrides.limits },
  }
}

function finding(check, overrides = {}) {
  const manifest = CHECK_MANIFEST.find(({ id }) => id === check)
  assert.ok(manifest, check)
  return {
    file: 'src/example.js',
    line: 1,
    check,
    title: `${check} review prompt`,
    confidence: manifest.confidence,
    doctrine: manifest.doctrine,
    principle: manifest.principle,
    message: `review ${check}`,
    snippet: 'caller-controlled source',
    ...overrides,
  }
}

function scanResult(findings, overrides = {}) {
  return createScanResult({
    version: '0.9.0',
    checkCount: CHECK_MANIFEST.length,
    target: overrides.target ?? '.',
    findings,
    scope: overrides.scope ?? scope(),
    redacted: overrides.redacted ?? false,
  })
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true)
  for (const child of Object.values(value)) assertDeepFrozen(child)
}

test('creates a deterministic schema-valid public-minimal capsule and exact address', async () => {
  const privateMarker = 'PRIVATE-CALLER-MARKER-DO-NOT-RETAIN'
  const source = scanResult([
    finding('unsafe-eval', {
      file: `private/${privateMarker}/first.js`,
      line: 91,
      title: privateMarker,
      message: privateMarker,
      snippet: privateMarker,
    }),
    finding('cache-as-live', {
      file: `private/${privateMarker}/cache.js`,
      line: 72,
      title: privateMarker,
      message: privateMarker,
      snippet: privateMarker,
    }),
    finding('unsafe-eval', {
      file: `private/${privateMarker}/second.js`,
      line: 44,
      title: privateMarker,
      message: privateMarker,
      snippet: privateMarker,
    }),
  ], {
    target: `/Users/private/${privateMarker}`,
    scope: scope({ bytes_scanned: 987_654, entries_observed: 321 }),
  })

  const first = createEvidenceCapsule(source)
  const second = createEvidenceCapsule(source)
  assert.deepEqual(first, second)
  assert.equal(first.document_type, EVIDENCE_CAPSULE_DOCUMENT_TYPE)
  assert.equal(first.disclosure.profile, EVIDENCE_CAPSULE_DISCLOSURE_PROFILE)
  assert.deepEqual(first.disclosure.scan_metadata_retained, ['scanner'])
  assert.deepEqual(first.disclosure.finding_group_fields, [
    'check',
    'confidence',
    'doctrine',
    'principle',
    'count',
  ])
  assert.equal(first.disclosure.target_retained, false)
  assert.equal(first.disclosure.locations_retained, false)
  assert.equal(first.disclosure.source_text_retained, false)
  assert.equal(first.disclosure.scope_retained, false)
  assert.equal(first.disclosure.caller_text_retained, false)
  assert.equal(first.scanner.version, EVIDENCE_CAPSULE_SCANNER_VERSION)
  assert.deepEqual(first.finding_groups, [
    {
      check: 'cache-as-live',
      confidence: 'heuristic',
      doctrine: 'substrate-honesty',
      principle: 4,
      count: 1,
    },
    {
      check: 'unsafe-eval',
      confidence: 'medium-high',
      doctrine: 'substrate-honesty',
      principle: 2,
      count: 2,
    },
  ])
  for (const group of first.finding_groups) {
    assert.deepEqual(Object.keys(group), [
      'check',
      'confidence',
      'doctrine',
      'principle',
      'count',
    ])
  }
  const serialized = JSON.stringify(first)
  assert.equal(serialized.includes(privateMarker), false)
  for (const forbidden of [
    '"target"',
    '"scope"',
    '"file"',
    '"line"',
    '"title"',
    '"message"',
    '"snippet"',
    '"source"',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden)
  }
  assert.equal(first.epistemic.provenance, 'unverified')
  assert.equal(first.epistemic.coverage, 'bounded-heuristic')
  assert.equal(
    first.epistemic.content_address,
    'canonical-bytes-identity-not-authenticity',
  )
  assert.equal(
    first.boundaries.capability_subject,
    'evidence-capsule-transform',
  )
  assert.equal(first.boundaries.direct_capabilities.filesystem, false)
  assert.equal(first.boundaries.direct_capabilities.network, false)
  assert.equal(first.boundaries.direct_capabilities.storage, false)
  assert.equal(first.boundaries.direct_capabilities.signing, false)
  assert.equal(first.boundaries.direct_capabilities.encryption, false)
  assert.equal(first.boundaries.publication_authority, 'external')
  assert.equal(first.boundaries.storage_receipt_included, false)
  assertDeepFrozen(first)

  const schema = JSON.parse(
    await readFile(new URL('../schema/evidence-capsule-v1.schema.json', import.meta.url), 'utf8'),
  )
  const validate = new Ajv2020({ strict: true }).compile(schema)
  assert.equal(validate(first), true, JSON.stringify(validate.errors))
  assert.equal(
    schema.$id,
    'https://github.com/cambridgetcg/whitehack/schema/evidence-capsule-v1.schema.json',
  )

  const canonical = canonicalizeEvidenceCapsule(first)
  assert.equal(canonical.startsWith('{"boundaries":'), true)
  assert.equal(canonical.endsWith('}'), true)
  assert.equal(canonical.endsWith('\n'), false)
  assert.equal(new TextDecoder().decode(encodeEvidenceCapsule(first)), canonical)
  const expectedDigest = createHash('sha256').update(canonical).digest('hex')
  assert.equal(
    addressEvidenceCapsule(first),
    `${EVIDENCE_CAPSULE_ADDRESS_ALGORITHM}:${expectedDigest}`,
  )
  assert.deepEqual(parseEvidenceCapsuleBytes(encodeEvidenceCapsule(first)), first)
})

test('aggregation, canonical bytes, and address are independent of finding order and location', () => {
  const firstScan = scanResult([
    finding('unsafe-eval', { file: 'secret/one.js', line: 7 }),
    finding('cache-as-live', { file: 'secret/two.js', line: 9 }),
    finding('unsafe-eval', { file: 'secret/three.js', line: 11 }),
  ], {
    target: '/private/first',
    scope: scope({ files_scanned: 3, bytes_scanned: 400 }),
  })
  const secondScan = scanResult([
    finding('unsafe-eval', {
      file: 'different/c.js',
      line: 999,
      title: 'different title',
      message: 'different message',
      snippet: 'different source',
    }),
    finding('unsafe-eval', { file: 'different/a.js', line: 1 }),
    finding('cache-as-live', { file: 'different/b.js', line: 2 }),
  ], {
    target: '/unrelated/second',
    scope: scope({
      files_scanned: 800,
      bytes_scanned: 55_555,
      entries_observed: 999,
    }),
  })

  const first = createEvidenceCapsule(firstScan)
  const second = createEvidenceCapsule(secondScan)
  assert.deepEqual(first, second)
  assert.equal(canonicalizeEvidenceCapsule(first), canonicalizeEvidenceCapsule(second))
  assert.equal(addressEvidenceCapsule(first), addressEvidenceCapsule(second))
})

test('an empty completed scan produces a bounded empty capsule, not a security claim', () => {
  const capsule = createEvidenceCapsule(scanResult([], {
    scope: scope({
      files_scanned: 0,
      bytes_scanned: 0,
      entries_observed: 0,
      unsupported_files: 0,
    }),
  }))
  assert.deepEqual(capsule.finding_groups, [])
  assert.equal(
    capsule.epistemic.empty_semantics,
    'no-bundled-match-not-security-proof',
  )
  assert.match(addressEvidenceCapsule(capsule), /^sha256:[0-9a-f]{64}$/u)
})

test('rejects incomplete, open, inconsistent, or non-manifest scan documents', () => {
  const valid = scanResult([finding('unsafe-eval')])

  const open = structuredClone(valid)
  open.invented = true
  assert.throws(() => createEvidenceCapsule(open), /must contain exactly/)

  const incomplete = structuredClone(valid)
  incomplete.complete = false
  assert.throws(() => createEvidenceCapsule(incomplete), /scan\.complete/)

  const wrongCount = structuredClone(valid)
  wrongCount.scanner.check_count -= 1
  assert.throws(() => createEvidenceCapsule(wrongCount), /scan\.scanner\.check_count/)

  const covertVersion = structuredClone(valid)
  covertVersion.scanner.version = '999999999999999999.0.0'
  assert.throws(() => createEvidenceCapsule(covertVersion), /scan\.scanner\.version/)

  const inventedCheck = structuredClone(valid)
  inventedCheck.findings[0].check = 'invented-check'
  assert.throws(() => createEvidenceCapsule(inventedCheck), /bundled check manifest/)

  const wrongDoctrine = structuredClone(valid)
  wrongDoctrine.findings[0].doctrine = 'transparency'
  assert.throws(() => createEvidenceCapsule(wrongDoctrine), /doctrine does not match/)

  const wrongSummary = structuredClone(valid)
  wrongSummary.summary.finding_count = 2
  assert.throws(() => createEvidenceCapsule(wrongSummary), /summary\.finding_count/)

  const redacted = structuredClone(scanResult([finding('unsafe-eval')], { redacted: true }))
  redacted.findings[0].snippet = 'source reintroduced'
  assert.throws(() => createEvidenceCapsule(redacted), /snippet/)
})

test('avoids ordinary accessors, reports Proxy inspection, and rejects noncanonical capsules', () => {
  let invoked = false
  const accessorScan = structuredClone(scanResult([finding('unsafe-eval')]))
  Object.defineProperty(accessorScan.findings[0], 'snippet', {
    enumerable: true,
    get() {
      invoked = true
      return 'must not run'
    },
  })
  assert.throws(
    () => createEvidenceCapsule(accessorScan),
    /must be an enumerable data property/,
  )
  assert.equal(invoked, false)

  let proxyTrapCount = 0
  const proxiedScan = new Proxy(
    structuredClone(scanResult([finding('unsafe-eval')])),
    {
      ownKeys(target) {
        proxyTrapCount += 1
        return Reflect.ownKeys(target)
      },
      getOwnPropertyDescriptor(target, property) {
        proxyTrapCount += 1
        return Reflect.getOwnPropertyDescriptor(target, property)
      },
    },
  )
  const proxiedCapsule = createEvidenceCapsule(proxiedScan)
  assert.ok(proxyTrapCount > 0)
  assert.equal(
    proxiedCapsule.boundaries.input_inspection.caller_proxy_traps_may_run,
    true,
  )

  const twoGroups = createEvidenceCapsule(scanResult([
    finding('unsafe-eval'),
    finding('cache-as-live'),
  ]))
  const reversed = structuredClone(twoGroups)
  reversed.finding_groups.reverse()
  assert.throws(
    () => canonicalizeEvidenceCapsule(reversed),
    /uniquely canonical-sorted/,
  )

  const openCapsule = structuredClone(twoGroups)
  openCapsule.finding_groups[0].file = 'must-not-enter'
  assert.throws(
    () => addressEvidenceCapsule(openCapsule),
    /must contain exactly/,
  )
})

test('exact-byte parser rejects noncanonical, invalid UTF-8, and oversized inputs', () => {
  const capsule = createEvidenceCapsule(scanResult([finding('unsafe-eval')]))
  const canonical = encodeEvidenceCapsule(capsule)
  assert.deepEqual(parseEvidenceCapsuleBytes(canonical), capsule)
  assert.throws(
    () => parseEvidenceCapsuleBytes(
      new TextEncoder().encode(`${canonicalizeEvidenceCapsule(capsule)}\n`),
    ),
    /canonical evidence-capsule encoding/,
  )
  assert.throws(
    () => parseEvidenceCapsuleBytes(Uint8Array.of(0xff)),
    /valid canonical UTF-8 JSON/,
  )
  assert.throws(
    () => parseEvidenceCapsuleBytes(new Uint8Array(MAX_EVIDENCE_CAPSULE_BYTES + 1)),
    /byte limit/,
  )
})

test('capsule module graph has hashing but no I/O, network, storage, wallet, or key authority', async () => {
  const source = await readFile(new URL('../src/evidence-capsule.js', import.meta.url), 'utf8')
  assert.match(source, /from 'node:crypto'/)
  assert.doesNotMatch(
    source,
    /from ['"]node:(?:fs|child_process|http|https|net|tls|dgram|dns|process|os|path|url)/u,
  )
  assert.doesNotMatch(source, /\bimport\s*\(/u)
  assert.doesNotMatch(source, /\brequire\s*\(/u)
  assert.doesNotMatch(source, /\bfetch\s*\(/u)
  assert.doesNotMatch(source, /\bWebSocket\b/u)
  assert.doesNotMatch(source, /\bDate\.now\s*\(/u)
  assert.doesNotMatch(source, /\bMath\.random\s*\(/u)
  assert.doesNotMatch(source, /\.(?:sign|encrypt|decrypt|send|put|upload)\s*\(/u)

  const pending = [new URL('../src/evidence-capsule.js', import.meta.url)]
  const visited = new Set()
  while (pending.length > 0) {
    const moduleUrl = pending.pop()
    if (visited.has(moduleUrl.href)) continue
    visited.add(moduleUrl.href)
    const moduleSource = await readFile(moduleUrl, 'utf8')
    for (const match of moduleSource.matchAll(/\bfrom\s+['"]([^'"]+)['"]/gu)) {
      const specifier = match[1]
      if (specifier === 'node:crypto') continue
      assert.equal(specifier.startsWith('.'), true, `${moduleUrl.pathname}: ${specifier}`)
      pending.push(new URL(specifier, moduleUrl))
    }
  }
})

test('capsule CLI emits exact local canonical bytes with exit 0 and fails without partial output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'whitehack-capsule-'))
  try {
    const source = join(root, 'private-source.js')
    await writeFile(source, 'eval(userInput)\n')
    const completed = spawnSync(
      process.execPath,
      [CLI, 'capsule', source, '--require-files'],
      { encoding: 'utf8' },
    )
    assert.equal(completed.status, 0)
    assert.equal(completed.stderr, '')
    assert.equal(completed.stdout.endsWith('\n'), false)
    const document = JSON.parse(completed.stdout)
    assert.equal(document.document_type, EVIDENCE_CAPSULE_DOCUMENT_TYPE)
    assert.ok(document.finding_groups.some(({ check }) => check === 'unsafe-eval'))
    assert.equal(completed.stdout.includes(root), false)
    assert.equal(canonicalizeEvidenceCapsule(document), completed.stdout)
    const digest = createHash('sha256').update(completed.stdout).digest('hex')
    assert.equal(addressEvidenceCapsule(document), `sha256:${digest}`)

    const missing = spawnSync(
      process.execPath,
      [CLI, 'capsule', join(root, 'missing.js'), '--require-files'],
      { encoding: 'utf8' },
    )
    assert.equal(missing.status, 2)
    assert.equal(missing.stdout, '')
    assert.match(missing.stderr, /scan_root_missing/)
    assert.equal(missing.stderr.includes(root), false)

    const empty = join(root, 'empty')
    await mkdir(empty)
    const optionalEmpty = spawnSync(
      process.execPath,
      [CLI, 'capsule', empty],
      { encoding: 'utf8' },
    )
    assert.equal(optionalEmpty.status, 0)
    assert.equal(optionalEmpty.stderr, '')
    assert.deepEqual(JSON.parse(optionalEmpty.stdout).finding_groups, [])

    const emptyResult = spawnSync(
      process.execPath,
      [CLI, 'capsule', empty, '--require-files'],
      { encoding: 'utf8' },
    )
    assert.equal(emptyResult.status, 2)
    assert.equal(emptyResult.stdout, '')
    assert.match(emptyResult.stderr, /scan_empty_scope/)

    const badOption = spawnSync(
      process.execPath,
      [CLI, 'capsule', source, '--json'],
      { encoding: 'utf8' },
    )
    assert.equal(badOption.status, 2)
    assert.equal(badOption.stdout, '')
    assert.match(badOption.stderr, /cli_usage/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('package exposes one capsule API and its exact closed schema under a new release identity', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(packageJson.version, '0.9.0')
  assert.equal(packageJson.version, EVIDENCE_CAPSULE_SCANNER_VERSION)
  assert.equal(
    packageJson.exports['./evidence-capsule'],
    './src/evidence-capsule.js',
  )
  assert.equal(
    packageJson.exports['./evidence-capsule-schema.json'],
    './schema/evidence-capsule-v1.schema.json',
  )
  assert.equal(packageJson.dependencies, undefined)
  for (const lifecycle of ['preinstall', 'install', 'postinstall']) {
    assert.equal(packageJson.scripts[lifecycle], undefined)
  }

  const selfReferenced = await import('@agenttool/whitehack-scan/evidence-capsule')
  assert.equal(selfReferenced.createEvidenceCapsule, createEvidenceCapsule)
  const schemaUrl = import.meta.resolve(
    '@agenttool/whitehack-scan/evidence-capsule-schema.json',
  )
  assert.equal(
    fileURLToPath(schemaUrl),
    fileURLToPath(new URL('../schema/evidence-capsule-v1.schema.json', import.meta.url)),
  )
})
