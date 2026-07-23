import { CHECK_MANIFEST } from './core.js'

export const UNDERSTANDING_DOCUMENT_TYPE = 'whitehack-understanding/v1'
export const UNDERSTANDING_CONTEXT_PROFILE = 'whitehack-agent-wallet-projection/v1'
export const UNDERSTANDING_SOURCE_PROTOCOL = 'agent-wallet/0.1'

const MAX_FINDINGS = 10_000
const MAX_FILE_BYTES = 1_024
const SAFE_TEXT = /^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/u
const CHECK_ID = /^[a-z][a-z0-9-]{0,63}$/u
const CONFIDENCE = new Set(['high', 'medium-high', 'heuristic'])
const CHECK_BY_ID = new Map(CHECK_MANIFEST.map((check) => [check.id, check]))

const RECORD_STATES = new Set(['absent', 'unverified', 'verified', 'invalid'])
const RELATION_STATES = new Set(['match', 'mismatch', 'unknown'])
const BOUND_STATES = new Set(['within-bounds', 'outside-bounds', 'unknown'])
const APPROVAL_STATES = new Set([
  'not-required',
  'requirement-satisfied',
  'requirement-unsatisfied',
  'unknown',
])
const EXECUTION_STATES = new Set([
  'passed',
  'failed',
  'stale',
  'inconclusive',
  'not-run',
])
const DESCRIPTOR_MODES = new Set([
  'self-custodied',
  'delegated-signer',
  'platform-custodied',
  'watch-only',
  'unknown',
])
const EXPORTABILITY_STATES = new Set(['non-exportable', 'exportable', 'unknown'])

const CONTEXT_SHAPE = Object.freeze({
  records: Object.freeze([
    'descriptor',
    'capability',
    'intent',
    'simulation',
    'continuity',
  ]),
  relations: Object.freeze([
    'descriptor-capability',
    'capability-intent',
    'delegate',
    'chain',
    'source',
    'intent-simulation',
    'revocation',
  ]),
  policy: Object.freeze([
    'calls',
    'spend',
    'fee',
    'expiry',
    'use',
    'approvals',
  ]),
  simulation: Object.freeze([
    'execution',
    'effects',
    'fee',
  ]),
  custody: Object.freeze([
    'descriptor-mode',
    'signer-exportability',
  ]),
})

const PERMANENT_UNKNOWNS = Object.freeze([
  Object.freeze({
    id: 'finding-provenance',
    reason: 'Manifest-consistent finding metadata does not prove which scanner produced it or which source and configuration were scanned.',
  }),
  Object.freeze({
    id: 'scanner-coverage',
    reason: 'Even a genuine scanner finding is only a bounded heuristic match, and absence of findings is not proof of honesty or security.',
  }),
  Object.freeze({
    id: 'adapter-trust',
    reason: 'Record validity does not authenticate the simulation or chain adapter selected by the host.',
  }),
  Object.freeze({
    id: 'payload-semantics',
    reason: 'The projection does not decode chain-native payloads or prove displayed intent, unsigned bytes, and signed bytes are identical in meaning.',
  }),
  Object.freeze({
    id: 'projection-freshness',
    reason: 'No evaluation time is retained; expiry, simulation, revocation, approval, and usage projections can become stale and must be rechecked atomically at sign time.',
  }),
  Object.freeze({
    id: 'current-continuity',
    reason: 'The projection cannot prove that it contains the complete current continuity head or that the host advances it with durable compare-and-swap.',
  }),
  Object.freeze({
    id: 'durable-usage-reservation',
    reason: 'Current spend, intent count, nonce state, and atomic sign-time reservation remain host-owned.',
  }),
  Object.freeze({
    id: 'approval-authenticity',
    reason: 'A projected approval state does not prove who approved, what exact bytes they approved, or that the host authenticated the evidence.',
  }),
  Object.freeze({
    id: 'consent',
    reason: 'Purpose text, policy fit, and signatures do not establish present consent for execution.',
  }),
  Object.freeze({
    id: 'custody-truth',
    reason: 'Declared custody mode and signer exportability are assertions, not proof of hardware, provider, recovery, or operator behavior.',
  }),
  Object.freeze({
    id: 'live-chain-state',
    reason: 'No live chain, contract state, price, MEV, finality, or execution outcome is observed.',
  }),
  Object.freeze({
    id: 'signing-broadcast-outcome',
    reason: 'This understanding path does not sign, submit, retry, reconcile, or observe a transaction.',
  }),
  Object.freeze({
    id: 'subject-binding',
    reason: 'The closed context projection contains no wallet, capability, intent, simulation, or operation identifier. A retained caller file label does not bind it to a wallet subject or operation.',
  }),
])

const BOUNDARIES = Object.freeze({
  direct_capabilities: Object.freeze({
    filesystem: false,
    process: false,
    network: false,
    wallet: false,
    clock: false,
    key_store_access: false,
    signing: false,
    rpc: false,
    simulation: false,
    broadcast: false,
    authorization: false,
  }),
  input_inspection: Object.freeze({
    ordinary_accessors_invoked: false,
    caller_proxy_traps_may_run: true,
    sandboxed: false,
  }),
  wallet_subject_bound: false,
})

function fail(message) {
  throw new TypeError(message)
}

function snapshotRecord(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`)
  }
  let descriptors
  try {
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch {
    fail(`${label} properties could not be inspected safely`)
  }
  const ownKeys = Reflect.ownKeys(descriptors)
  if (ownKeys.some((key) => typeof key !== 'string')) {
    fail(`${label} must not contain symbol properties`)
  }
  const expected = [...keys].sort()
  const actual = ownKeys.sort()
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${label} must contain exactly: ${expected.join(', ')}`)
  }
  const snapshot = {}
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !('value' in descriptor)) {
      fail(`${label}.${key} must be an enumerable data property`)
    }
    snapshot[key] = descriptor.value
  }
  return snapshot
}

function snapshotFields(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`)
  }
  const snapshot = {}
  for (const key of keys) {
    let descriptor
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key)
    } catch {
      fail(`${label}.${key} could not be inspected safely`)
    }
    if (!descriptor?.enumerable || !('value' in descriptor)) {
      fail(`${label}.${key} must be an enumerable data property`)
    }
    snapshot[key] = descriptor.value
  }
  return snapshot
}

function snapshotDenseArray(value, label, maximumLength) {
  let isArray
  try {
    isArray = Array.isArray(value)
  } catch {
    fail(`${label} could not be inspected safely`)
  }
  if (!isArray) fail(`${label} must be an array`)

  let descriptors
  try {
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch {
    fail(`${label} properties could not be inspected safely`)
  }
  const ownKeys = Reflect.ownKeys(descriptors)
  if (ownKeys.some((key) => typeof key !== 'string')) {
    fail(`${label} must not contain symbol properties`)
  }
  const lengthDescriptor = descriptors.length
  if (
    !lengthDescriptor
    || lengthDescriptor.enumerable
    || !('value' in lengthDescriptor)
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
    || lengthDescriptor.value > maximumLength
  ) {
    fail(`${label}.length is invalid`)
  }
  const length = lengthDescriptor.value
  if (ownKeys.length !== length + 1) {
    fail(`${label} must be a dense array without extra properties`)
  }

  const snapshot = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor?.enumerable || !('value' in descriptor)) {
      fail(`${label}[${index}] must be an enumerable data property`)
    }
    snapshot.push(descriptor.value)
  }
  return snapshot
}

function requireEnum(value, values, label) {
  if (!values.has(value)) fail(`${label} is invalid`)
  return value
}

function requireSafeString(value, pattern, label) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || !SAFE_TEXT.test(value)
    || (pattern && !pattern.test(value))
  ) {
    fail(`${label} is invalid`)
  }
  return value
}

function requireFile(value, label) {
  requireSafeString(value, undefined, label)
  if (value.length > MAX_FILE_BYTES) {
    fail(`${label} exceeds the ${MAX_FILE_BYTES}-code-unit limit`)
  }
  if (new TextEncoder().encode(value).length > MAX_FILE_BYTES) {
    fail(`${label} exceeds the ${MAX_FILE_BYTES}-byte limit`)
  }
  return value
}

function requireInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} is invalid`)
  }
  return value
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const item of Object.values(value)) freeze(item)
  return Object.freeze(value)
}

function serializeFinding(value, index) {
  const finding = snapshotFields(
    value,
    ['file', 'line', 'check', 'confidence', 'doctrine', 'principle'],
    `findings[${index}]`,
  )
  const check = requireSafeString(finding.check, CHECK_ID, `findings[${index}].check`)
  const confidence = requireEnum(
    finding.confidence,
    CONFIDENCE,
    `findings[${index}].confidence`,
  )
  const doctrine = requireSafeString(
    finding.doctrine,
    CHECK_ID,
    `findings[${index}].doctrine`,
  )
  const principle = requireInteger(
    finding.principle,
    1,
    6,
    `findings[${index}].principle`,
  )
  const manifest = CHECK_BY_ID.get(check)
  if (!manifest) fail(`findings[${index}].check is not in the bundled check manifest`)
  if (doctrine !== manifest.doctrine) {
    fail(`findings[${index}].doctrine does not match the bundled check manifest`)
  }
  if (principle !== manifest.principle) {
    fail(`findings[${index}].principle does not match the bundled check manifest`)
  }
  if (confidence !== manifest.confidence && confidence !== 'heuristic') {
    fail(`findings[${index}].confidence does not match the bundled check manifest`)
  }
  return {
    file: requireFile(finding.file, `findings[${index}].file`),
    line: requireInteger(finding.line, 0, Number.MAX_SAFE_INTEGER, `findings[${index}].line`),
    check,
    confidence,
    doctrine,
    principle,
  }
}

function compareFindings(left, right) {
  for (const key of ['file', 'check', 'confidence', 'doctrine']) {
    if (left[key] < right[key]) return -1
    if (left[key] > right[key]) return 1
  }
  return left.line - right.line || left.principle - right.principle
}

function serializeContext(value) {
  const context = snapshotRecord(
    value,
    [
      'profile',
      'source_protocol',
      'records',
      'relations',
      'policy',
      'simulation',
      'custody',
    ],
    'context',
  )
  if (context.profile !== UNDERSTANDING_CONTEXT_PROFILE) {
    fail(`context.profile must equal ${UNDERSTANDING_CONTEXT_PROFILE}`)
  }
  if (context.source_protocol !== UNDERSTANDING_SOURCE_PROTOCOL) {
    fail(`context.source_protocol must equal ${UNDERSTANDING_SOURCE_PROTOCOL}`)
  }

  const records = snapshotRecord(context.records, CONTEXT_SHAPE.records, 'context.records')
  const relations = snapshotRecord(
    context.relations,
    CONTEXT_SHAPE.relations,
    'context.relations',
  )
  const policy = snapshotRecord(context.policy, CONTEXT_SHAPE.policy, 'context.policy')
  const simulation = snapshotRecord(
    context.simulation,
    CONTEXT_SHAPE.simulation,
    'context.simulation',
  )
  const custody = snapshotRecord(context.custody, CONTEXT_SHAPE.custody, 'context.custody')

  for (const key of CONTEXT_SHAPE.records) {
    records[key] = requireEnum(
      records[key],
      RECORD_STATES,
      `context.records.${key}`,
    )
  }
  for (const key of CONTEXT_SHAPE.relations) {
    relations[key] = requireEnum(
      relations[key],
      RELATION_STATES,
      `context.relations.${key}`,
    )
  }
  for (const key of ['calls', 'spend', 'fee', 'expiry', 'use']) {
    policy[key] = requireEnum(policy[key], BOUND_STATES, `context.policy.${key}`)
  }
  policy.approvals = requireEnum(
    policy.approvals,
    APPROVAL_STATES,
    'context.policy.approvals',
  )
  simulation.execution = requireEnum(
    simulation.execution,
    EXECUTION_STATES,
    'context.simulation.execution',
  )
  for (const key of ['effects', 'fee']) {
    simulation[key] = requireEnum(
      simulation[key],
      key === 'effects' ? RELATION_STATES : BOUND_STATES,
      `context.simulation.${key}`,
    )
  }
  custody['descriptor-mode'] = requireEnum(
    custody['descriptor-mode'],
    DESCRIPTOR_MODES,
    'context.custody.descriptor-mode',
  )
  custody['signer-exportability'] = requireEnum(
    custody['signer-exportability'],
    EXPORTABILITY_STATES,
    'context.custody.signer-exportability',
  )

  return {
    profile: UNDERSTANDING_CONTEXT_PROFILE,
    source_protocol: UNDERSTANDING_SOURCE_PROTOCOL,
    records,
    relations,
    policy,
    simulation,
    custody,
  }
}

function stateFrom(values, supported, contradicted) {
  if (values.some((value) => contradicted.has(value))) return 'contradicted'
  if (values.every((value) => supported.has(value))) return 'supported'
  return 'indeterminate'
}

function inference(id, status, epistemicBasis, question, basis) {
  return {
    id,
    status,
    confidence: 'heuristic',
    epistemic_basis: epistemicBasis,
    question,
    basis: [...basis].sort(),
  }
}

function infer(context, findingEvidence) {
  const recordValues = CONTEXT_SHAPE.records
    .slice(0, 4)
    .map((key) => context.records[key])
  const relationValues = [
    'descriptor-capability',
    'capability-intent',
    'delegate',
    'chain',
    'source',
    'intent-simulation',
  ].map((key) => context.relations[key])
  const policyValues = ['calls', 'spend', 'fee', 'expiry', 'use']
    .map((key) => context.policy[key])

  const recordsAndRelations = stateFrom(
    [...recordValues, ...relationValues],
    new Set(['verified', 'match']),
    new Set(['invalid', 'mismatch']),
  )
  const staticPolicy = stateFrom(
    [...policyValues, context.policy.approvals],
    new Set(['within-bounds', 'not-required', 'requirement-satisfied']),
    new Set(['outside-bounds', 'requirement-unsatisfied']),
  )
  const simulation = stateFrom(
    [
      context.records.simulation,
      context.relations['intent-simulation'],
      context.simulation.execution,
      context.simulation.effects,
      context.simulation.fee,
    ],
    new Set(['verified', 'passed', 'match', 'within-bounds']),
    new Set(['invalid', 'failed', 'stale', 'mismatch', 'outside-bounds']),
  )
  const continuity = stateFrom(
    [context.records.continuity, context.relations.revocation],
    new Set(['verified', 'match']),
    new Set(['invalid', 'mismatch']),
  )
  const custody = [
    context.custody['descriptor-mode'],
    context.custody['signer-exportability'],
  ].every((value) => value !== 'unknown')
    ? 'supported'
    : 'indeterminate'

  const contextIds = (section, keys) => keys.map(
    (key) => `/presented_evidence/context_assertions/${section}/${key}`,
  )
  return [
    inference(
      'source-attention',
      findingEvidence.length > 0 ? 'supported' : 'indeterminate',
      'caller-assertion',
      'Which presented finding claims need contextual review, and what evidence would confirm or reject each concern?',
      ['/presented_evidence/finding_claims'],
    ),
    inference(
      'caller-declared-record-chain-consistency',
      recordsAndRelations,
      'caller-assertion',
      'Did the local adapter verify each record and every exact descriptor, capability, delegate, chain, source, and simulation relationship?',
      [
        ...contextIds('records', CONTEXT_SHAPE.records.slice(0, 4)),
        ...contextIds('relations', [
          'descriptor-capability',
          'capability-intent',
          'delegate',
          'chain',
          'source',
          'intent-simulation',
        ]),
      ],
    ),
    inference(
      'caller-declared-static-policy-consistency',
      staticPolicy,
      'caller-assertion',
      'Do the caller-projected call, spend, fee, expiry, use, and approval states remain inside the intended policy?',
      contextIds('policy', CONTEXT_SHAPE.policy),
    ),
    inference(
      'caller-declared-simulation-consistency',
      simulation,
      'caller-assertion',
      'Does the caller-projected simulation bind the exact intent and agree with its declared effects and fee bounds?',
      [
        '/presented_evidence/context_assertions/records/simulation',
        '/presented_evidence/context_assertions/relations/intent-simulation',
        ...contextIds('simulation', CONTEXT_SHAPE.simulation),
      ],
    ),
    inference(
      'caller-declared-continuity-consistency',
      continuity,
      'caller-assertion',
      'Does the supplied continuity projection extend the expected history and revocation epoch without claiming completeness?',
      [
        '/presented_evidence/context_assertions/records/continuity',
        '/presented_evidence/context_assertions/relations/revocation',
      ],
    ),
    inference(
      'caller-declared-custody-description',
      custody,
      'caller-assertion',
      'What custody mode and signer exportability does the caller declare, and which provider or operator evidence could substantiate them?',
      contextIds('custody', CONTEXT_SHAPE.custody),
    ),
    inference(
      'execution-readiness',
      'indeterminate',
      'caller-assertion',
      'What host-side evidence is still required before any separate authorization, signing, or broadcast decision?',
      [
        '/presented_evidence/context_assertions/policy/approvals',
        '/presented_evidence/context_assertions/records/continuity',
        '/presented_evidence/context_assertions/simulation/execution',
        '/presented_evidence/context_assertions/custody/signer-exportability',
      ],
    ),
  ]
}

function contextUnknowns(context) {
  const unknowns = []
  if (Object.values(context.records).some((state) => state !== 'verified')) {
    unknowns.push({
      id: 'record-verification',
      reason: 'One or more projected Agent Wallet records are absent, unverified, or invalid.',
    })
  }
  if (Object.values(context.relations).some((state) => state === 'unknown')) {
    unknowns.push({
      id: 'record-relations',
      reason: 'One or more projected cross-record relationships were not evaluated.',
    })
  }
  if (
    Object.values(context.policy).some((state) => state === 'unknown')
    || context.simulation.effects === 'unknown'
    || context.simulation.fee === 'unknown'
    || context.simulation.execution === 'not-run'
    || context.simulation.execution === 'inconclusive'
  ) {
    unknowns.push({
      id: 'static-policy-context',
      reason: 'The caller projection does not establish every static policy and simulation relationship.',
    })
  }
  return unknowns
}

/**
 * Build a deterministic, fixed-field understanding document from
 * scanner finding claims and a closed caller-supplied Whitehack projection of
 * Agent Wallet assertions.
 *
 * Whitehack itself has no direct filesystem, process, network, wallet, clock,
 * key-store, signing, RPC, simulation, broadcast, or authorization capability
 * here.
 * Context values remain explicitly labelled as caller assertions; the function
 * does not verify wallet records, freshness, subject binding, consent,
 * authorization, or execution readiness. The caller's `file` label is retained
 * with unknown sensitivity. Required-field accessors are rejected and
 * discarded-field accessors are ignored, without invocation, but hostile Proxy
 * traps can still run during object inspection; this API is not a sandbox.
 */
export function createUnderstanding(options) {
  const input = snapshotRecord(options, ['findings', 'context'], 'options')
  const findingInput = snapshotDenseArray(input.findings, 'findings', MAX_FINDINGS)
  const findings = findingInput
    .map(serializeFinding)
    .sort(compareFindings)
  const context = serializeContext(input.context)
  const unknownEntries = [
    ...contextUnknowns(context),
    ...PERMANENT_UNKNOWNS.map((entry) => ({ ...entry })),
  ].sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  ))
  const unknowns = Object.fromEntries(
    unknownEntries.map(({ id, reason }) => [id, reason]),
  )

  return freeze({
    document_type: UNDERSTANDING_DOCUMENT_TYPE,
    complete: true,
    redaction: {
      profile: 'whitehack-finding-field-allowlist/v1',
      retained_finding_fields: [
        'file',
        'line',
        'check',
        'confidence',
        'doctrine',
        'principle',
      ],
      other_finding_fields_removed: true,
      caller_file_label_retained: true,
      caller_file_label_sensitivity: 'unknown',
    },
    presented_evidence: {
      finding_claims: findings,
      context_assertions: context,
    },
    inferences: infer(context, findings),
    unknowns,
    boundaries: { ...BOUNDARIES },
  })
}
