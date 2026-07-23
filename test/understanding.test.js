import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'

import { scanText } from '../src/core.js'
import {
  UNDERSTANDING_CONTEXT_PROFILE,
  UNDERSTANDING_DOCUMENT_TYPE,
  UNDERSTANDING_SOURCE_PROTOCOL,
  createUnderstanding,
} from '../src/understanding.js'

function context(overrides = {}) {
  const base = {
    profile: 'whitehack-agent-wallet-projection/v1',
    source_protocol: 'agent-wallet/0.1',
    records: {
      descriptor: 'verified',
      capability: 'verified',
      intent: 'verified',
      simulation: 'verified',
      continuity: 'verified',
    },
    relations: {
      'descriptor-capability': 'match',
      'capability-intent': 'match',
      delegate: 'match',
      chain: 'match',
      source: 'match',
      'intent-simulation': 'match',
      revocation: 'match',
    },
    policy: {
      calls: 'within-bounds',
      spend: 'within-bounds',
      fee: 'within-bounds',
      expiry: 'within-bounds',
      use: 'within-bounds',
      approvals: 'not-required',
    },
    simulation: {
      execution: 'passed',
      effects: 'match',
      fee: 'within-bounds',
    },
    custody: {
      'descriptor-mode': 'self-custodied',
      'signer-exportability': 'non-exportable',
    },
  }
  return {
    ...base,
    ...overrides,
    records: { ...base.records, ...overrides.records },
    relations: { ...base.relations, ...overrides.relations },
    policy: { ...base.policy, ...overrides.policy },
    simulation: { ...base.simulation, ...overrides.simulation },
    custody: { ...base.custody, ...overrides.custody },
  }
}

function inference(document, id) {
  return document.inferences.find((entry) => entry.id === id)
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true)
  for (const child of Object.values(value)) assertDeepFrozen(child)
}

test('creates deterministic schema-valid understanding with only allowlisted finding fields', async () => {
  const secret = 'secret-marker-that-must-not-cross'
  const finding = {
    ...scanText('eval(userInput)\n', { file: 'src/example.js' })[0],
    title: secret,
    message: secret,
    snippet: secret,
  }
  const first = createUnderstanding({ findings: [finding], context: context() })
  const second = createUnderstanding({ findings: [finding], context: context() })

  assert.deepEqual(first, second)
  assert.equal(first.document_type, UNDERSTANDING_DOCUMENT_TYPE)
  assert.equal(
    first.presented_evidence.context_assertions.profile,
    UNDERSTANDING_CONTEXT_PROFILE,
  )
  assert.equal(
    first.presented_evidence.context_assertions.source_protocol,
    UNDERSTANDING_SOURCE_PROTOCOL,
  )
  assert.equal(first.redaction.profile, 'whitehack-finding-field-allowlist/v1')
  assert.deepEqual(first.redaction.retained_finding_fields, [
    'file',
    'line',
    'check',
    'confidence',
    'doctrine',
    'principle',
  ])
  assert.equal(first.redaction.other_finding_fields_removed, true)
  assert.equal(first.redaction.caller_file_label_retained, true)
  assert.equal(first.redaction.caller_file_label_sensitivity, 'unknown')
  assert.equal(JSON.stringify(first).includes(secret), false)
  assert.equal(first.boundaries.direct_capabilities.filesystem, false)
  assert.equal(first.boundaries.direct_capabilities.network, false)
  assert.equal(first.boundaries.direct_capabilities.key_access, false)
  assert.equal(first.boundaries.direct_capabilities.signing, false)
  assert.equal(first.boundaries.direct_capabilities.rpc, false)
  assert.equal(first.boundaries.direct_capabilities.authorization, false)
  assert.equal(first.boundaries.input_inspection.ordinary_accessors_invoked, false)
  assert.equal(first.boundaries.input_inspection.caller_proxy_traps_may_run, true)
  assert.equal(first.boundaries.input_inspection.sandboxed, false)
  assert.equal(first.boundaries.wallet_subject_bound, false)
  assert.equal(inference(first, 'source-attention').status, 'supported')
  assert.equal(inference(first, 'caller-declared-record-chain-consistency').status, 'supported')
  assert.equal(inference(first, 'caller-declared-static-policy-consistency').status, 'supported')
  assert.equal(inference(first, 'caller-declared-simulation-consistency').status, 'supported')
  assert.equal(inference(first, 'caller-declared-continuity-consistency').status, 'supported')
  assert.equal(inference(first, 'caller-declared-custody-description').status, 'supported')
  assert.equal(inference(first, 'execution-readiness').status, 'indeterminate')
  assert.equal(inference(first, 'source-attention').epistemic_basis, 'caller-assertion')
  assert.equal(
    inference(first, 'caller-declared-record-chain-consistency').epistemic_basis,
    'caller-assertion',
  )
  assert.equal(inference(first, 'execution-readiness').epistemic_basis, 'caller-assertion')
  assert.match(inference(first, 'execution-readiness').question, /host-side evidence/)
  assert.equal(typeof first.unknowns.consent, 'string')
  assert.equal(typeof first.unknowns['scanner-coverage'], 'string')
  assert.equal(typeof first.unknowns['finding-provenance'], 'string')
  assert.equal(typeof first.unknowns['payload-semantics'], 'string')
  assert.equal(typeof first.unknowns['projection-freshness'], 'string')
  assert.equal(typeof first.unknowns['subject-binding'], 'string')
  assert.equal(typeof first.unknowns['durable-usage-reservation'], 'string')
  assertDeepFrozen(first)

  const callerFileMarker = 'const privateKey = "caller-file-label-marker"'
  const retainedFileLabel = createUnderstanding({
    findings: [{ ...finding, file: callerFileMarker }],
    context: context(),
  })
  assert.equal(
    retainedFileLabel.presented_evidence.finding_claims[0].file,
    callerFileMarker,
  )
  assert.equal(
    retainedFileLabel.redaction.caller_file_label_sensitivity,
    'unknown',
  )

  const schema = JSON.parse(
    await readFile(new URL('../schema/understanding-v1.schema.json', import.meta.url), 'utf8'),
  )
  const validate = new Ajv2020({ strict: true }).compile(schema)
  assert.equal(validate(first), true, JSON.stringify(validate.errors))

  const duplicateInference = structuredClone(first)
  duplicateInference.inferences[1].id = 'source-attention'
  assert.equal(validate(duplicateInference), false)

  const missingPermanentUnknown = structuredClone(first)
  delete missingPermanentUnknown.unknowns.consent
  assert.equal(validate(missingPermanentUnknown), false)

  const inventedContextField = structuredClone(first)
  inventedContextField.presented_evidence.context_assertions.records.invented = 'verified'
  assert.equal(validate(inventedContextField), false)
})

test('copies and canonical-sorts location-preserving finding metadata before freezing', () => {
  const findings = [
    {
      file: 'z.js',
      line: 7,
      check: 'unsafe-eval',
      confidence: 'medium-high',
      doctrine: 'substrate-honesty',
      principle: 2,
      title: 'ignored',
      message: 'ignored',
      snippet: 'ignored',
    },
    {
      file: 'a.js',
      line: 3,
      check: 'silent-failure',
      confidence: 'medium-high',
      doctrine: 'substrate-honesty',
      principle: 2,
      title: 'ignored',
      message: 'ignored',
      snippet: 'ignored',
    },
  ]
  const inputContext = context()
  const document = createUnderstanding({ findings, context: inputContext })

  findings[0].file = 'mutated.js'
  inputContext.records.descriptor = 'invalid'
  assert.deepEqual(
    document.presented_evidence.finding_claims
      .map(({ file }) => file),
    ['a.js', 'z.js'],
  )
  assert.equal(
    document.presented_evidence.context_assertions.records.descriptor,
    'verified',
  )

  const sameLocation = {
    file: 'same.js',
    line: 1,
    check: 'unsafe-eval',
    confidence: 'medium-high',
    doctrine: 'substrate-honesty',
    principle: 2,
  }
  const downgraded = { ...sameLocation, confidence: 'heuristic' }
  assert.deepEqual(
    createUnderstanding({
      findings: [sameLocation, downgraded],
      context: context(),
    }),
    createUnderstanding({
      findings: [downgraded, sameLocation],
      context: context(),
    }),
  )
})

test('keeps absence, invalidity, contradictions, and stale simulation visible', () => {
  const absent = createUnderstanding({
    findings: [],
    context: context({
      records: {
        continuity: 'absent',
        simulation: 'unverified',
      },
      relations: {
        revocation: 'unknown',
        'intent-simulation': 'unknown',
      },
      policy: {
        use: 'unknown',
        approvals: 'unknown',
      },
      simulation: {
        execution: 'not-run',
        effects: 'unknown',
        fee: 'unknown',
      },
      custody: {
        'signer-exportability': 'unknown',
      },
    }),
  })
  assert.equal(inference(absent, 'source-attention').status, 'indeterminate')
  assert.equal(inference(absent, 'caller-declared-record-chain-consistency').status, 'indeterminate')
  assert.equal(inference(absent, 'caller-declared-static-policy-consistency').status, 'indeterminate')
  assert.equal(inference(absent, 'caller-declared-simulation-consistency').status, 'indeterminate')
  assert.equal(inference(absent, 'caller-declared-continuity-consistency').status, 'indeterminate')
  assert.equal(inference(absent, 'caller-declared-custody-description').status, 'indeterminate')
  assert.equal(typeof absent.unknowns['record-verification'], 'string')
  assert.equal(typeof absent.unknowns['record-relations'], 'string')
  assert.equal(typeof absent.unknowns['static-policy-context'], 'string')

  const unknownEffects = createUnderstanding({
    findings: [],
    context: context({
      simulation: { effects: 'unknown' },
    }),
  })
  assert.equal(typeof unknownEffects.unknowns['static-policy-context'], 'string')

  const contradicted = createUnderstanding({
    findings: [],
    context: context({
      records: { capability: 'invalid' },
      relations: { 'capability-intent': 'mismatch' },
      policy: {
        spend: 'outside-bounds',
        approvals: 'requirement-unsatisfied',
      },
      simulation: {
        execution: 'stale',
        effects: 'mismatch',
      },
      custody: {
        'descriptor-mode': 'watch-only',
        'signer-exportability': 'exportable',
      },
    }),
  })
  assert.equal(inference(contradicted, 'caller-declared-record-chain-consistency').status, 'contradicted')
  assert.equal(inference(contradicted, 'caller-declared-static-policy-consistency').status, 'contradicted')
  assert.equal(inference(contradicted, 'caller-declared-simulation-consistency').status, 'contradicted')
  assert.equal(inference(contradicted, 'caller-declared-custody-description').status, 'supported')
  assert.equal(inference(contradicted, 'execution-readiness').status, 'indeterminate')
})

test('includes the intent-simulation relation and keeps large outputs schema-valid', async () => {
  const mismatched = createUnderstanding({
    findings: [],
    context: context({
      relations: { 'intent-simulation': 'mismatch' },
    }),
  })
  assert.equal(
    inference(mismatched, 'caller-declared-simulation-consistency').status,
    'contradicted',
  )

  const template = scanText('eval(userInput)\n', { file: 'src/example.js' })[0]
  const document = createUnderstanding({
    findings: Array.from({ length: 65 }, (_, index) => ({
      ...template,
      file: `src/example-${index}.js`,
    })),
    context: context(),
  })
  assert.equal(document.presented_evidence.finding_claims.length, 65)
  assert.deepEqual(
    inference(document, 'source-attention').basis,
    ['/presented_evidence/finding_claims'],
  )

  const schema = JSON.parse(
    await readFile(new URL('../schema/understanding-v1.schema.json', import.meta.url), 'utf8'),
  )
  const validate = new Ajv2020({ strict: true }).compile(schema)
  assert.equal(validate(document), true, JSON.stringify(validate.errors))
})

test('rejects findings that do not match the bundled scanner manifest', () => {
  const finding = scanText('eval(userInput)\n', { file: 'src/example.js' })[0]
  assert.throws(
    () => createUnderstanding({
      findings: [{ ...finding, check: 'invented-check' }],
      context: context(),
    }),
    /not in the bundled check manifest/,
  )
  assert.throws(
    () => createUnderstanding({
      findings: [{ ...finding, doctrine: 'transparency' }],
      context: context(),
    }),
    /doctrine does not match/,
  )
  assert.throws(
    () => createUnderstanding({
      findings: [{ ...finding, principle: 1 }],
      context: context(),
    }),
    /principle does not match/,
  )
})

test('rejects open or unsafe projection data and never invokes accessors', () => {
  assert.throws(
    () => createUnderstanding({
      findings: [],
      context: { ...context(), private_key: 'forbidden' },
    }),
    /must contain exactly/,
  )
  assert.throws(
    () => createUnderstanding({
      findings: [],
      context: context({ policy: { spend: 'unbounded' } }),
    }),
    /context\.policy\.spend is invalid/,
  )
  assert.throws(
    () => createUnderstanding({
      findings: [{
        file: 'unsafe\u202epath.js',
        line: 1,
        check: 'unsafe-eval',
        confidence: 'medium-high',
        doctrine: 'substrate-honesty',
        principle: 2,
      }],
      context: context(),
    }),
    /findings\[0\]\.file is invalid/,
  )

  let invoked = false
  const finding = {
    file: 'safe.js',
    line: 1,
    check: 'unsafe-eval',
    confidence: 'medium-high',
    doctrine: 'substrate-honesty',
    principle: 2,
    get snippet() {
      invoked = true
      return 'must not run'
    },
  }
  createUnderstanding({ findings: [finding], context: context() })
  assert.equal(invoked, false)

  const arrayWithMapAccessor = [finding]
  Object.defineProperty(arrayWithMapAccessor, 'map', {
    get() {
      invoked = true
      return Array.prototype.map
    },
  })
  assert.throws(
    () => createUnderstanding({
      findings: arrayWithMapAccessor,
      context: context(),
    }),
    /dense array without extra properties/,
  )
  assert.equal(invoked, false)

  const arrayWithIndexAccessor = new Array(1)
  Object.defineProperty(arrayWithIndexAccessor, '0', {
    enumerable: true,
    get() {
      invoked = true
      return finding
    },
  })
  assert.throws(
    () => createUnderstanding({
      findings: arrayWithIndexAccessor,
      context: context(),
    }),
    /must be an enumerable data property/,
  )
  assert.equal(invoked, false)

  const accessorContext = context()
  Object.defineProperty(accessorContext.records, 'descriptor', {
    enumerable: true,
    get() {
      invoked = true
      return 'verified'
    },
  })
  assert.throws(
    () => createUnderstanding({
      findings: [],
      context: accessorContext,
    }),
    /must be an enumerable data property/,
  )
  assert.equal(invoked, false)
})

test('pure understanding source contains no I/O, wallet, execution, or clock surface', async () => {
  const source = await readFile(
    new URL('../src/understanding.js', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    /from ['"]node:/u,
    /\bimport\s*\(/u,
    /\brequire\s*\(/u,
    /\bfetch\s*\(/u,
    /\bWebSocket\b/u,
    /\bDate\.now\s*\(/u,
    /\bMath\.random\s*\(/u,
    /\b(?:sign|send|broadcast|rpc|privateKey|mnemonic)\s*\(/iu,
  ]) {
    assert.doesNotMatch(source, forbidden)
  }
})
