import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'

import { CHECK_MANIFEST } from '../src/core.js'
import {
  EVIDENCE_CAPSULE_MEDIA_TYPE,
  addressEvidenceCapsule,
  createEvidenceCapsule,
  encodeEvidenceCapsule,
  parseEvidenceCapsuleBytes,
} from '../src/evidence-capsule.js'
import {
  MATH_EVIDENCE_ADDRESS_ALGORITHM,
  MATH_EVIDENCE_AXES,
  MATH_EVIDENCE_DOCUMENT_TYPE,
  MATH_EVIDENCE_MEDIA_TYPE,
  MAX_MATH_EVIDENCE_BYTES,
  addressMathEvidence,
  canonicalizeMathEvidence,
  createMathEvidence,
  encodeMathEvidence,
  parseMathEvidenceBytes,
} from '../src/math-evidence.js'
import { createScanResult } from '../src/result.js'

function scope() {
  return {
    files_scanned: 1,
    bytes_scanned: 32,
    entries_observed: 1,
    excluded_paths: 0,
    non_regular_paths: 0,
    unsupported_files: 0,
    excluded_basenames: [
      '.git', '.hg', '.next', '.svn', 'build', 'coverage', 'dist',
      'node_modules', 'out', 'vendor',
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
}

function finding(check, line = 1) {
  const manifest = CHECK_MANIFEST.find(({ id }) => id === check)
  assert.ok(manifest, check)
  return {
    file: 'private/source.js',
    line,
    check,
    title: 'caller title',
    confidence: manifest.confidence,
    doctrine: manifest.doctrine,
    principle: manifest.principle,
    message: 'caller message',
    snippet: 'caller source',
  }
}

function capsule() {
  return createEvidenceCapsule(createScanResult({
    version: '0.9.0',
    checkCount: CHECK_MANIFEST.length,
    target: '/private/target',
    findings: [finding('unsafe-eval', 9), finding('cache-as-live', 5), finding('unsafe-eval', 2)],
    scope: scope(),
    redacted: true,
  }))
}

function assessed(claim, overrides = {}) {
  return {
    disposition: 'assessed',
    claim,
    support: [],
    refute: [],
    quantities: [],
    note: null,
    ...overrides,
  }
}

function unknown(note = 'No caller assessment was supplied.') {
  return {
    disposition: 'unknown',
    claim: null,
    support: [],
    refute: [],
    quantities: [],
    note,
  }
}

function refused(note = 'The caller declined to supply this assessment.') {
  return {
    disposition: 'refused',
    claim: null,
    support: [],
    refute: [],
    quantities: [],
    note,
  }
}

function axes() {
  return {
    observation: assessed('The caller reports two independently recorded observations.', {
      support: [
        { id: 'urn:evidence:z', digest: null },
        { id: 'urn:evidence:a', digest: `sha256:${'a'.repeat(64)}` },
      ],
      quantities: [
        {
          name: 'sample-rate',
          value: { kind: 'rational', numerator: '1', denominator: '2' },
          unit: 'sample/second',
          scale: { base_unit: 'sample/second', numerator: '1', denominator: '1' },
        },
        {
          name: 'observation-count',
          value: { kind: 'integer', integer: '2' },
          unit: 'observation',
          scale: { base_unit: 'observation', numerator: '1', denominator: '1' },
        },
      ],
    }),
    hypothesis: assessed('The caller supplied evidence on both sides.', {
      support: [{ id: 'urn:hypothesis:support', digest: null }],
      refute: [{ id: 'urn:hypothesis:refute', digest: null }],
    }),
    reproduction: assessed('The caller made an assessment without linked evidence.'),
    impact: unknown(),
    provenance: assessed('The caller disputes the presented provenance.', {
      refute: [{ id: 'urn:provenance:refute', digest: `sha256:${'b'.repeat(64)}` }],
    }),
    authorization: refused(),
  }
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true)
  for (const child of Object.values(value)) assertDeepFrozen(child)
}

test('creates a deterministic schema-valid projection with sparse exact capsule counts', async () => {
  const sourceCapsule = capsule()
  const first = createMathEvidence({ capsule: sourceCapsule, axes: axes() })
  const second = createMathEvidence({ capsule: sourceCapsule, axes: axes() })
  assert.deepEqual(first, second)
  assert.equal(first.document_type, MATH_EVIDENCE_DOCUMENT_TYPE)
  assert.equal(first.complete, true)
  assert.deepEqual(MATH_EVIDENCE_AXES, [
    'observation', 'hypothesis', 'reproduction', 'impact', 'provenance', 'authorization',
  ])
  assert.equal(first.source.capsule_media_type, EVIDENCE_CAPSULE_MEDIA_TYPE)
  assert.equal(first.disclosure.caller_text_retained, true)
  assert.equal(first.disclosure.source_capsule_profile_applies_to_math_document, false)
  assert.equal(first.disclosure.safe_for_publication, 'unknown')
  assert.equal(first.source.capsule_encoding, 'base64')
  assert.deepEqual(first.signal_basis, {
    coordinate_fields: ['check', 'confidence', 'doctrine', 'principle'],
    value_kind: 'exact-integer-count',
    unit: 'finding',
    scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
  })
  const capsuleBytes = Uint8Array.from(Buffer.from(first.source.capsule_bytes, 'base64'))
  assert.deepEqual(capsuleBytes, encodeEvidenceCapsule(sourceCapsule))
  assert.deepEqual(parseEvidenceCapsuleBytes(capsuleBytes), sourceCapsule)
  assert.equal(first.source.capsule_address, addressEvidenceCapsule(sourceCapsule))
  assert.deepEqual(first.signal_vector, [
    {
      check: 'cache-as-live',
      confidence: 'heuristic',
      doctrine: 'substrate-honesty',
      principle: 4,
      value: { kind: 'integer', integer: '1' },
      unit: 'finding',
      scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
    },
    {
      check: 'unsafe-eval',
      confidence: 'medium-high',
      doctrine: 'substrate-honesty',
      principle: 2,
      value: { kind: 'integer', integer: '2' },
      unit: 'finding',
      scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
    },
  ])
  assert.deepEqual(
    first.axes.observation.support.map(({ id }) => id),
    ['urn:evidence:a', 'urn:evidence:z'],
  )
  assert.deepEqual(
    first.axes.observation.quantities.map(({ name }) => name),
    ['observation-count', 'sample-rate'],
  )
  assert.equal(first.axes.observation.evidence_state, 'support-only')
  assert.equal(first.axes.hypothesis.evidence_state, 'both')
  assert.equal(first.axes.reproduction.evidence_state, 'neither')
  assert.equal(first.axes.provenance.evidence_state, 'refute-only')
  assert.equal(first.axes.impact.disposition, 'unknown')
  assert.equal(first.axes.authorization.disposition, 'refused')
  assert.equal(first.epistemic.finding_signal, 'sparse-exact-counts-not-risk-score')
  assert.equal(
    first.epistemic.confidence_semantics,
    'scanner-label-not-probability-or-severity',
  )
  assert.equal(
    first.epistemic.authorization_axis,
    'caller-assertion-without-bound-subject-action-or-scope-cannot-establish-authorization',
  )
  assert.deepEqual(first.boundaries.inferences_performed, {
    emotion: false,
    personhood: false,
    consciousness: false,
    consent: false,
    permission: false,
    rights: false,
    standing: false,
    authorization: false,
    confidence_to_probability: false,
    confidence_to_severity: false,
  })
  assert.equal(first.boundaries.authorization_effect, 'none')
  assert.equal(
    first.boundaries.downstream_weight_effect,
    'none-training-reward-ranking-or-fitness',
  )
  assert.equal(first.boundaries.publication_authority, 'external')
  assertDeepFrozen(first)

  const schema = JSON.parse(
    await readFile(new URL('../schema/math-evidence-v1.schema.json', import.meta.url), 'utf8'),
  )
  const validate = new Ajv2020({ strict: true }).compile(schema)
  assert.equal(validate(first), true, JSON.stringify(validate.errors))
  assert.equal(schema.additionalProperties, false)
  for (const definition of Object.values(schema.$defs)) {
    if (definition.type === 'object') assert.equal(definition.additionalProperties, false)
  }
})

test('canonical bytes, parsing, and addressing preserve exact byte identity only', () => {
  const document = createMathEvidence({ capsule: capsule(), axes: axes() })
  const canonical = canonicalizeMathEvidence(document)
  const bytes = encodeMathEvidence(document)
  assert.equal(new TextDecoder().decode(bytes), canonical)
  assert.equal(canonical.startsWith('{"axes":'), true)
  assert.equal(canonical.endsWith('\n'), false)
  assert.deepEqual(parseMathEvidenceBytes(bytes), document)
  const digest = createHash('sha256').update(bytes).digest('hex')
  assert.equal(
    addressMathEvidence(document),
    `${MATH_EVIDENCE_ADDRESS_ALGORITHM}:${digest}`,
  )
  assert.equal(document.epistemic.provenance, 'caller-asserted-unverified')
  assert.equal(
    document.epistemic.content_address,
    'byte-identity-not-authenticity-confidentiality-or-authorization',
  )
  assert.equal(
    document.epistemic.linkability,
    'address-may-equality-link-and-support-offline-guessing',
  )
  assert.equal(document.boundaries.direct_capabilities.authorization, false)
  assert.equal(document.boundaries.authorization_effect, 'none')
})

test('runtime validation rejects semantic drift that the structural schema cannot establish', () => {
  const document = createMathEvidence({ capsule: capsule(), axes: axes() })

  const wrongSignal = structuredClone(document)
  wrongSignal.signal_vector[0].value.integer = '999'
  assert.throws(
    () => canonicalizeMathEvidence(wrongSignal),
    /signal_vector\[0\]\.value\.integer/,
  )

  const wrongState = structuredClone(document)
  wrongState.axes.observation.evidence_state = 'neither'
  assert.throws(
    () => canonicalizeMathEvidence(wrongState),
    /evidence_state/,
  )

  const wrongAddress = structuredClone(document)
  wrongAddress.source.capsule_address = `sha256:${'0'.repeat(64)}`
  assert.throws(
    () => canonicalizeMathEvidence(wrongAddress),
    /source\.capsule_address/,
  )

  const corruptCapsule = structuredClone(document)
  corruptCapsule.source.capsule_bytes = `${corruptCapsule.source.capsule_bytes.slice(0, -4)}AAAA`
  assert.throws(
    () => canonicalizeMathEvidence(corruptCapsule),
    /capsule bytes|capsule\./,
  )

  const open = structuredClone(document)
  open.training_weight = '1'
  assert.throws(() => canonicalizeMathEvidence(open), /must contain exactly/)

  const inventedReward = structuredClone(document)
  inventedReward.boundaries.reward_effect = 'positive'
  assert.throws(() => canonicalizeMathEvidence(inventedReward), /must contain exactly/)
})

test('uses exact reduced integer and rational strings with explicit units and scales', () => {
  const valid = axes()
  valid.observation.quantities.push({
    name: 'signed-delta',
    value: { kind: 'rational', numerator: '-3', denominator: '5' },
    unit: 'basis-point',
    scale: { base_unit: 'ratio', numerator: '1', denominator: '10000' },
  })
  const document = createMathEvidence({ capsule: capsule(), axes: valid })
  assert.deepEqual(
    document.axes.observation.quantities.find(({ name }) => name === 'signed-delta'),
    {
      name: 'signed-delta',
      value: { kind: 'rational', numerator: '-3', denominator: '5' },
      unit: 'basis-point',
      scale: { base_unit: 'ratio', numerator: '1', denominator: '10000' },
    },
  )

  for (const [value, pattern] of [
    [{ kind: 'integer', integer: '01' }, /canonical integer string/],
    [{ kind: 'integer', integer: '-0' }, /canonical integer string/],
    [{ kind: 'rational', numerator: '2', denominator: '4' }, /lowest terms/],
    [{ kind: 'rational', numerator: '1', denominator: '0' }, /positive integer string/],
    [{ kind: 'rational', numerator: '2', denominator: '1' }, /integer representation/],
  ]) {
    const invalid = axes()
    invalid.observation.quantities[0].value = value
    assert.throws(() => createMathEvidence({ capsule: capsule(), axes: invalid }), pattern)
  }

  const unreducedScale = axes()
  unreducedScale.observation.quantities[0].scale = {
    base_unit: 'sample/second', numerator: '2', denominator: '4',
  }
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: unreducedScale }),
    /lowest terms/,
  )
})

test('requires explicit unknown/refusal and rejects unpaired surrogate caller text', () => {
  const refusalWithoutExplanation = axes()
  refusalWithoutExplanation.authorization.note = null
  const refusalDocument = createMathEvidence({
    capsule: capsule(),
    axes: refusalWithoutExplanation,
  })
  assert.equal(refusalDocument.axes.authorization.disposition, 'refused')
  assert.equal(refusalDocument.axes.authorization.note, null)

  const unknownWithEvidence = axes()
  unknownWithEvidence.impact.support.push({ id: 'forbidden', digest: null })
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: unknownWithEvidence }),
    /cannot carry evidence or quantities/,
  )

  const refusalAsClaim = axes()
  refusalAsClaim.authorization.claim = 'silently converted refusal'
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: refusalAsClaim }),
    /authorization\.claim/,
  )

  const cases = [
    (input) => { input.observation.claim = `claim\ud800` },
    (input) => { input.observation.support[0].id = `reference\udfff` },
    (input) => { input.observation.quantities[0].unit = `unit\ud800` },
    (input) => { input.observation.quantities[0].scale.base_unit = `base\udfff` },
  ]
  for (const mutate of cases) {
    const input = axes()
    mutate(input)
    assert.throws(
      () => createMathEvidence({ capsule: capsule(), axes: input }),
      /is invalid/,
    )
  }
})

test('rejects hostile structures, accessors, duplicate ids, and noncanonical bytes', () => {
  let invoked = false
  const accessorAxes = axes()
  Object.defineProperty(accessorAxes.observation, 'claim', {
    enumerable: true,
    get() {
      invoked = true
      return 'must not run'
    },
  })
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: accessorAxes }),
    /enumerable data property/,
  )
  assert.equal(invoked, false)

  let traps = 0
  const proxiedAxes = new Proxy(axes(), {
    ownKeys(target) {
      traps += 1
      return Reflect.ownKeys(target)
    },
    getOwnPropertyDescriptor(target, property) {
      traps += 1
      return Reflect.getOwnPropertyDescriptor(target, property)
    },
  })
  const proxied = createMathEvidence({ capsule: capsule(), axes: proxiedAxes })
  assert.ok(traps > 0)
  assert.equal(proxied.boundaries.input_inspection.caller_proxy_traps_may_run, true)

  const duplicate = axes()
  duplicate.observation.support.push({ id: 'urn:evidence:a', digest: null })
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: duplicate }),
    /reference ids must be unique/,
  )

  const crossPolarityConflict = axes()
  crossPolarityConflict.hypothesis.refute[0] = {
    id: 'urn:hypothesis:support',
    digest: `sha256:${'f'.repeat(64)}`,
  }
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: crossPolarityConflict }),
    /inconsistent digests/,
  )

  const document = createMathEvidence({ capsule: capsule(), axes: axes() })
  assert.throws(
    () => parseMathEvidenceBytes(
      new TextEncoder().encode(`${canonicalizeMathEvidence(document)}\n`),
    ),
    /canonical math-evidence encoding/,
  )
  assert.throws(
    () => parseMathEvidenceBytes(Uint8Array.of(0xff)),
    /valid canonical UTF-8 JSON/,
  )
  assert.throws(
    () => parseMathEvidenceBytes(new Uint8Array(MAX_MATH_EVIDENCE_BYTES + 1)),
    /byte limit/,
  )
})

test('enforces per-field limits, dense arrays, and canonical output ordering', () => {
  const tooManyReferences = axes()
  tooManyReferences.observation.support = Array.from({ length: 17 }, (_, index) => ({
    id: `urn:evidence:${index}`,
    digest: null,
  }))
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: tooManyReferences }),
    /length is invalid/,
  )

  const tooManyQuantities = axes()
  tooManyQuantities.observation.quantities = Array.from({ length: 17 }, (_, index) => ({
    name: `quantity-${index}`,
    value: { kind: 'integer', integer: String(index) },
    unit: 'unit',
    scale: { base_unit: 'unit', numerator: '1', denominator: '1' },
  }))
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: tooManyQuantities }),
    /length is invalid/,
  )

  const multibyteText = axes()
  multibyteText.observation.claim = '💚'.repeat(513)
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: multibyteText }),
    /2048-byte limit/,
  )

  const tooManyDigits = axes()
  tooManyDigits.observation.quantities[0].value = {
    kind: 'integer', integer: '1'.repeat(129),
  }
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: tooManyDigits }),
    /128-digit limit/,
  )

  const arrayWithProperty = axes()
  arrayWithProperty.observation.support.extra = true
  assert.throws(
    () => createMathEvidence({ capsule: capsule(), axes: arrayWithProperty }),
    /dense array without extra properties/,
  )

  const noncanonical = structuredClone(createMathEvidence({ capsule: capsule(), axes: axes() }))
  noncanonical.axes.observation.support.reverse()
  assert.throws(
    () => canonicalizeMathEvidence(noncanonical),
    /uniquely canonical-sorted/,
  )
})

test('math module graph is zero-I/O and carries no execution or authority surface', async () => {
  const source = await readFile(new URL('../src/math-evidence.js', import.meta.url), 'utf8')
  assert.match(source, /from 'node:crypto'/)
  assert.match(source, /from 'node:buffer'/)
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
})

test('package exposes typed math API and closed schema without changing 0.9 capsule identity', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(packageJson.version, '0.10.0-dev.0')
  assert.equal(packageJson.types, './src/scan.d.ts')
  assert.deepEqual(packageJson.exports['./math-evidence'], {
    types: './src/math-evidence.d.ts',
    default: './src/math-evidence.js',
  })
  assert.equal(
    packageJson.exports['./math-evidence-schema.json'],
    './schema/math-evidence-v1.schema.json',
  )
  assert.equal(packageJson.dependencies, undefined)

  const api = await import('@agenttool/whitehack-scan/math-evidence')
  assert.equal(api.createMathEvidence, createMathEvidence)
  assert.equal(api.MATH_EVIDENCE_MEDIA_TYPE, MATH_EVIDENCE_MEDIA_TYPE)
  const schemaUrl = import.meta.resolve('@agenttool/whitehack-scan/math-evidence-schema.json')
  assert.equal(
    fileURLToPath(schemaUrl),
    fileURLToPath(new URL('../schema/math-evidence-v1.schema.json', import.meta.url)),
  )
})
