import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import {
  EVIDENCE_CAPSULE_MEDIA_TYPE,
  MAX_EVIDENCE_CAPSULE_BYTES,
  addressEvidenceCapsule,
  encodeEvidenceCapsule,
  parseEvidenceCapsuleBytes,
} from './evidence-capsule.js'

export const MATH_EVIDENCE_DOCUMENT_TYPE = 'whitehack-math-evidence/v1'
export const MATH_EVIDENCE_MEDIA_TYPE = 'application/vnd.whitehack.math-evidence.v1+json'
export const MATH_EVIDENCE_ADDRESS_ALGORITHM = 'sha256'
export const MAX_MATH_EVIDENCE_BYTES = 256 * 1024
export const MATH_EVIDENCE_AXES = Object.freeze([
  'observation',
  'hypothesis',
  'reproduction',
  'impact',
  'provenance',
  'authorization',
])

const MAX_REFERENCES_PER_POLARITY = 16
const MAX_QUANTITIES_PER_AXIS = 16
const MAX_CLAIM_BYTES = 2_048
const MAX_REFERENCE_ID_BYTES = 256
const MAX_QUANTITY_NAME_BYTES = 128
const MAX_UNIT_BYTES = 128
const MAX_INTEGER_DIGITS = 128

const SAFE_TEXT = /^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/u
const INTEGER = /^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/u
const POSITIVE_INTEGER = /^[1-9][0-9]*$/u
const SHA256_ADDRESS = /^sha256:[0-9a-f]{64}$/u
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u
const DISPOSITIONS = new Set(['assessed', 'unknown', 'refused'])

const DISCLOSURE = Object.freeze({
  profile: 'whitehack-math-evidence-caller-text/v1',
  source_capsule_profile: 'whitehack-public-minimal/v1',
  source_capsule_profile_applies_to_math_document: false,
  caller_text_retained: true,
  reference_ids_retained: true,
  quantity_labels_retained: true,
  safe_for_publication: 'unknown',
})

const EPISTEMIC = Object.freeze({
  basis: 'exact-evidence-capsule-plus-bounded-caller-assertions',
  axis_relation: 'separate-non-scalar-no-implicit-order',
  axis_scope: 'whole-document-not-implicitly-bound-to-any-signal-coordinate',
  authorization_axis: 'caller-assertion-without-bound-subject-action-or-scope-cannot-establish-authorization',
  evidence_logic: 'four-valued-support-and-refute',
  evidence_state_semantics: 'polarity-list-topology-not-truth-confidence-or-weight',
  finding_signal: 'sparse-exact-counts-not-risk-score',
  finding_semantics: 'review-prompt-not-vulnerability-verdict',
  empty_semantics: 'no-bundled-match-not-security-proof',
  coverage: 'bounded-heuristic',
  quantity_semantics: 'exact-integer-or-reduced-rational-strings',
  scale_semantics: 'base-value-equals-value-times-numerator-divided-by-denominator',
  unit_semantics: 'opaque-caller-label-no-registry-or-normalization',
  unknown_semantics: 'unassessed-not-zero',
  refusal_semantics: 'withheld-not-negative-evidence',
  provenance: 'caller-asserted-unverified',
  confidence_semantics: 'scanner-label-not-probability-or-severity',
  content_address: 'byte-identity-not-authenticity-confidentiality-or-authorization',
  linkability: 'address-may-equality-link-and-support-offline-guessing',
  complete_semantics: 'math-evidence-transformation-complete',
})

const DIRECT_CAPABILITIES = Object.freeze({
  filesystem: false,
  process: false,
  network: false,
  storage: false,
  wallet: false,
  clock: false,
  key_store_access: false,
  signing: false,
  encryption: false,
  authorization: false,
})

const INPUT_INSPECTION = Object.freeze({
  ordinary_accessors_invoked: false,
  caller_proxy_traps_may_run: true,
  sandboxed: false,
})

const INFERENCES_PERFORMED = Object.freeze({
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

function requireExact(value, expected, label) {
  if (value !== expected) fail(`${label} must equal ${JSON.stringify(expected)}`)
  return value
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
      index += 1
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true
    }
  }
  return false
}

function requireSafeText(value, maximumBytes, label) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || !SAFE_TEXT.test(value)
    || hasUnpairedSurrogate(value)
    || new TextEncoder().encode(value).byteLength > maximumBytes
  ) {
    fail(`${label} is invalid or exceeds the ${maximumBytes}-byte limit`)
  }
  return value
}

function requireIntegerString(value, positive, label) {
  const pattern = positive ? POSITIVE_INTEGER : INTEGER
  if (typeof value !== 'string' || !pattern.test(value)) {
    fail(`${label} must be a canonical ${positive ? 'positive ' : ''}integer string`)
  }
  const digits = value[0] === '-' ? value.length - 1 : value.length
  if (digits > MAX_INTEGER_DIGITS) {
    fail(`${label} exceeds the ${MAX_INTEGER_DIGITS}-digit limit`)
  }
  return value
}

function greatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left
  let b = right
  while (b !== 0n) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

function requireReduced(numerator, denominator, label) {
  if (greatestCommonDivisor(BigInt(numerator), BigInt(denominator)) !== 1n) {
    fail(`${label} must be reduced to lowest terms`)
  }
}

function serializeValue(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an exact integer or rational value`)
  }
  let kindDescriptor
  try {
    kindDescriptor = Object.getOwnPropertyDescriptor(value, 'kind')
  } catch {
    fail(`${label}.kind could not be inspected safely`)
  }
  if (!kindDescriptor?.enumerable || !('value' in kindDescriptor)) {
    fail(`${label}.kind must be an enumerable data property`)
  }
  if (kindDescriptor.value === 'integer') {
    const integer = snapshotRecord(value, ['kind', 'integer'], label)
    return {
      kind: 'integer',
      integer: requireIntegerString(integer.integer, false, `${label}.integer`),
    }
  }
  if (kindDescriptor.value === 'rational') {
    const rational = snapshotRecord(value, ['kind', 'numerator', 'denominator'], label)
    const numerator = requireIntegerString(
      rational.numerator,
      false,
      `${label}.numerator`,
    )
    const denominator = requireIntegerString(
      rational.denominator,
      true,
      `${label}.denominator`,
    )
    requireReduced(numerator, denominator, label)
    if (denominator === '1') {
      fail(`${label} with denominator 1 must use the integer representation`)
    }
    return { kind: 'rational', numerator, denominator }
  }
  fail(`${label}.kind is invalid`)
}

function serializeScale(value, label) {
  const scale = snapshotRecord(value, ['base_unit', 'numerator', 'denominator'], label)
  const numerator = requireIntegerString(scale.numerator, true, `${label}.numerator`)
  const denominator = requireIntegerString(scale.denominator, true, `${label}.denominator`)
  requireReduced(numerator, denominator, label)
  return {
    base_unit: requireSafeText(scale.base_unit, MAX_UNIT_BYTES, `${label}.base_unit`),
    numerator,
    denominator,
  }
}

function compareReferences(left, right) {
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  const leftDigest = left.digest ?? ''
  const rightDigest = right.digest ?? ''
  return leftDigest < rightDigest ? -1 : leftDigest > rightDigest ? 1 : 0
}

function serializeReferences(value, label, requireCanonical) {
  const references = snapshotDenseArray(
    value,
    label,
    MAX_REFERENCES_PER_POLARITY,
  ).map((entry, index) => {
    const reference = snapshotRecord(entry, ['id', 'digest'], `${label}[${index}]`)
    if (
      reference.digest !== null
      && (typeof reference.digest !== 'string' || !SHA256_ADDRESS.test(reference.digest))
    ) {
      fail(`${label}[${index}].digest must be null or a SHA-256 address`)
    }
    return {
      id: requireSafeText(
        reference.id,
        MAX_REFERENCE_ID_BYTES,
        `${label}[${index}].id`,
      ),
      digest: reference.digest,
    }
  })
  const ids = new Set()
  for (const reference of references) {
    if (ids.has(reference.id)) fail(`${label} reference ids must be unique`)
    ids.add(reference.id)
  }
  if (requireCanonical) {
    for (let index = 1; index < references.length; index += 1) {
      if (compareReferences(references[index - 1], references[index]) >= 0) {
        fail(`${label} must be uniquely canonical-sorted`)
      }
    }
  } else {
    references.sort(compareReferences)
  }
  return references
}

function serializeQuantities(value, label, requireCanonical) {
  const quantities = snapshotDenseArray(
    value,
    label,
    MAX_QUANTITIES_PER_AXIS,
  ).map((entry, index) => {
    const quantityLabel = `${label}[${index}]`
    const quantity = snapshotRecord(entry, ['name', 'value', 'unit', 'scale'], quantityLabel)
    return {
      name: requireSafeText(
        quantity.name,
        MAX_QUANTITY_NAME_BYTES,
        `${quantityLabel}.name`,
      ),
      value: serializeValue(quantity.value, `${quantityLabel}.value`),
      unit: requireSafeText(quantity.unit, MAX_UNIT_BYTES, `${quantityLabel}.unit`),
      scale: serializeScale(quantity.scale, `${quantityLabel}.scale`),
    }
  })
  const names = new Set()
  for (const quantity of quantities) {
    if (names.has(quantity.name)) fail(`${label} names must be unique`)
    names.add(quantity.name)
  }
  if (requireCanonical) {
    for (let index = 1; index < quantities.length; index += 1) {
      if (quantities[index - 1].name >= quantities[index].name) {
        fail(`${label} must be uniquely canonical-sorted by name`)
      }
    }
  } else {
    quantities.sort((left, right) => (
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ))
  }
  return quantities
}

function evidenceState(support, refute) {
  if (support.length > 0 && refute.length > 0) return 'both'
  if (support.length > 0) return 'support-only'
  if (refute.length > 0) return 'refute-only'
  return 'neither'
}

function serializeAxis(value, axisName, output) {
  const label = `axes.${axisName}`
  const fields = output
    ? ['disposition', 'claim', 'evidence_state', 'support', 'refute', 'quantities', 'note']
    : ['disposition', 'claim', 'support', 'refute', 'quantities', 'note']
  const axis = snapshotRecord(value, fields, label)
  if (!DISPOSITIONS.has(axis.disposition)) fail(`${label}.disposition is invalid`)
  const support = serializeReferences(axis.support, `${label}.support`, output)
  const refute = serializeReferences(axis.refute, `${label}.refute`, output)
  const digestById = new Map(support.map((reference) => [reference.id, reference.digest]))
  for (const reference of refute) {
    if (digestById.has(reference.id) && digestById.get(reference.id) !== reference.digest) {
      fail(`${label} uses inconsistent digests for the same cross-polarity reference id`)
    }
  }
  const quantities = serializeQuantities(axis.quantities, `${label}.quantities`, output)
  const state = evidenceState(support, refute)
  if (output) requireExact(axis.evidence_state, state, `${label}.evidence_state`)

  let claim
  let note
  if (axis.disposition === 'assessed') {
    claim = requireSafeText(axis.claim, MAX_CLAIM_BYTES, `${label}.claim`)
    requireExact(axis.note, null, `${label}.note`)
    note = null
  } else {
    requireExact(axis.claim, null, `${label}.claim`)
    if (support.length > 0 || refute.length > 0 || quantities.length > 0) {
      fail(`${label} ${axis.disposition} disposition cannot carry evidence or quantities`)
    }
    claim = null
    note = axis.note === null
      ? null
      : requireSafeText(axis.note, MAX_CLAIM_BYTES, `${label}.note`)
  }

  return {
    disposition: axis.disposition,
    claim,
    evidence_state: state,
    support,
    refute,
    quantities,
    note,
  }
}

function serializeAxes(value, output) {
  const axes = snapshotRecord(value, MATH_EVIDENCE_AXES, 'axes')
  return Object.fromEntries(MATH_EVIDENCE_AXES.map((axis) => [
    axis,
    serializeAxis(axes[axis], axis, output),
  ]))
}

function projectSignals(capsule) {
  return capsule.finding_groups.map((group) => ({
    check: group.check,
    confidence: group.confidence,
    doctrine: group.doctrine,
    principle: group.principle,
    value: { kind: 'integer', integer: String(group.count) },
    unit: 'finding',
    scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
  }))
}

function serializeSignals(value, capsule) {
  const supplied = snapshotDenseArray(value, 'signal_vector', 10_000)
  const expected = projectSignals(capsule)
  if (supplied.length !== expected.length) {
    fail('signal_vector must be the exact sparse projection of source capsule groups')
  }
  for (let index = 0; index < supplied.length; index += 1) {
    const label = `signal_vector[${index}]`
    const signal = snapshotRecord(
      supplied[index],
      ['check', 'confidence', 'doctrine', 'principle', 'value', 'unit', 'scale'],
      label,
    )
    for (const field of ['check', 'confidence', 'doctrine', 'principle', 'unit']) {
      requireExact(signal[field], expected[index][field], `${label}.${field}`)
    }
    const value = snapshotRecord(signal.value, ['kind', 'integer'], `${label}.value`)
    requireExact(value.kind, 'integer', `${label}.value.kind`)
    requireExact(value.integer, expected[index].value.integer, `${label}.value.integer`)
    const scale = snapshotRecord(
      signal.scale,
      ['base_unit', 'numerator', 'denominator'],
      `${label}.scale`,
    )
    for (const field of ['base_unit', 'numerator', 'denominator']) {
      requireExact(scale[field], expected[index].scale[field], `${label}.scale.${field}`)
    }
  }
  return expected
}

function serializeSignalBasis(value) {
  const basis = snapshotRecord(
    value,
    ['coordinate_fields', 'value_kind', 'unit', 'scale'],
    'signal_basis',
  )
  const coordinateFields = snapshotDenseArray(
    basis.coordinate_fields,
    'signal_basis.coordinate_fields',
    4,
  )
  const expectedFields = ['check', 'confidence', 'doctrine', 'principle']
  if (
    coordinateFields.length !== expectedFields.length
    || coordinateFields.some((field, index) => field !== expectedFields[index])
  ) {
    fail('signal_basis.coordinate_fields must be the exact signal coordinate tuple')
  }
  requireExact(basis.value_kind, 'exact-integer-count', 'signal_basis.value_kind')
  requireExact(basis.unit, 'finding', 'signal_basis.unit')
  const scale = snapshotRecord(
    basis.scale,
    ['base_unit', 'numerator', 'denominator'],
    'signal_basis.scale',
  )
  requireExact(scale.base_unit, 'finding', 'signal_basis.scale.base_unit')
  requireExact(scale.numerator, '1', 'signal_basis.scale.numerator')
  requireExact(scale.denominator, '1', 'signal_basis.scale.denominator')
  return {
    coordinate_fields: expectedFields,
    value_kind: 'exact-integer-count',
    unit: 'finding',
    scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
  }
}

function canonicalBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

function decodeCapsuleBase64(value, label) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > Math.ceil(MAX_EVIDENCE_CAPSULE_BYTES / 3) * 4
    || !BASE64.test(value)
  ) {
    fail(`${label} must be bounded canonical base64`)
  }
  const bytes = Uint8Array.from(Buffer.from(value, 'base64'))
  if (canonicalBase64(bytes) !== value) fail(`${label} must be canonical base64`)
  return bytes
}

function sourceFromCapsule(capsule) {
  const bytes = encodeEvidenceCapsule(capsule)
  const normalized = parseEvidenceCapsuleBytes(bytes)
  return {
    capsule_media_type: EVIDENCE_CAPSULE_MEDIA_TYPE,
    capsule_encoding: 'base64',
    capsule_bytes: canonicalBase64(bytes),
    capsule_address: addressEvidenceCapsule(normalized),
  }
}

function serializeSource(value) {
  const source = snapshotRecord(
    value,
    ['capsule_media_type', 'capsule_encoding', 'capsule_bytes', 'capsule_address'],
    'source',
  )
  requireExact(
    source.capsule_media_type,
    EVIDENCE_CAPSULE_MEDIA_TYPE,
    'source.capsule_media_type',
  )
  requireExact(source.capsule_encoding, 'base64', 'source.capsule_encoding')
  const capsuleBytes = decodeCapsuleBase64(source.capsule_bytes, 'source.capsule_bytes')
  const capsule = parseEvidenceCapsuleBytes(capsuleBytes)
  requireExact(
    source.capsule_address,
    addressEvidenceCapsule(capsule),
    'source.capsule_address',
  )
  return {
    source: {
      capsule_media_type: EVIDENCE_CAPSULE_MEDIA_TYPE,
      capsule_encoding: 'base64',
      capsule_bytes: canonicalBase64(capsuleBytes),
      capsule_address: source.capsule_address,
    },
    capsule,
  }
}

function serializeFixedRecord(value, expected, label) {
  const record = snapshotRecord(value, Object.keys(expected), label)
  for (const [key, expectedValue] of Object.entries(expected)) {
    requireExact(record[key], expectedValue, `${label}.${key}`)
  }
  return { ...expected }
}

function serializeBoundaries(value) {
  const boundaries = snapshotRecord(
    value,
    [
      'capability_subject',
      'direct_capabilities',
      'input_inspection',
      'inferences_performed',
      'authorization_effect',
      'consent_effect',
      'permission_effect',
      'rights_effect',
      'standing_effect',
      'downstream_weight_effect',
      'publication_authority',
    ],
    'boundaries',
  )
  requireExact(
    boundaries.capability_subject,
    'math-evidence-transform',
    'boundaries.capability_subject',
  )
  requireExact(boundaries.authorization_effect, 'none', 'boundaries.authorization_effect')
  for (const effect of ['consent_effect', 'permission_effect', 'rights_effect', 'standing_effect']) {
    requireExact(boundaries[effect], 'none', `boundaries.${effect}`)
  }
  requireExact(
    boundaries.downstream_weight_effect,
    'none-training-reward-ranking-or-fitness',
    'boundaries.downstream_weight_effect',
  )
  requireExact(
    boundaries.publication_authority,
    'external',
    'boundaries.publication_authority',
  )
  return {
    capability_subject: 'math-evidence-transform',
    direct_capabilities: serializeFixedRecord(
      boundaries.direct_capabilities,
      DIRECT_CAPABILITIES,
      'boundaries.direct_capabilities',
    ),
    input_inspection: serializeFixedRecord(
      boundaries.input_inspection,
      INPUT_INSPECTION,
      'boundaries.input_inspection',
    ),
    inferences_performed: serializeFixedRecord(
      boundaries.inferences_performed,
      INFERENCES_PERFORMED,
      'boundaries.inferences_performed',
    ),
    authorization_effect: 'none',
    consent_effect: 'none',
    permission_effect: 'none',
    rights_effect: 'none',
    standing_effect: 'none',
    downstream_weight_effect: 'none-training-reward-ranking-or-fitness',
    publication_authority: 'external',
  }
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freeze(child)
  return Object.freeze(value)
}

function canonicalJson(value) {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) fail('math evidence contains a non-canonical number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  fail('math evidence contains a non-JSON value')
}

function requireBoundedDocument(document) {
  const size = new TextEncoder().encode(canonicalJson(document)).byteLength
  if (size > MAX_MATH_EVIDENCE_BYTES) {
    fail(`math evidence exceeds the ${MAX_MATH_EVIDENCE_BYTES}-byte limit`)
  }
  return document
}

function serializeDocument(value) {
  const document = snapshotRecord(
    value,
    [
      'document_type',
      'complete',
      'disclosure',
      'source',
      'signal_basis',
      'signal_vector',
      'axes',
      'epistemic',
      'boundaries',
    ],
    'math_evidence',
  )
  requireExact(
    document.document_type,
    MATH_EVIDENCE_DOCUMENT_TYPE,
    'math_evidence.document_type',
  )
  requireExact(document.complete, true, 'math_evidence.complete')
  const { source, capsule } = serializeSource(document.source)
  return freeze(requireBoundedDocument({
    document_type: MATH_EVIDENCE_DOCUMENT_TYPE,
    complete: true,
    disclosure: serializeFixedRecord(document.disclosure, DISCLOSURE, 'disclosure'),
    source,
    signal_basis: serializeSignalBasis(document.signal_basis),
    signal_vector: serializeSignals(document.signal_vector, capsule),
    axes: serializeAxes(document.axes, true),
    epistemic: serializeFixedRecord(document.epistemic, EPISTEMIC, 'epistemic'),
    boundaries: serializeBoundaries(document.boundaries),
  }))
}

/**
 * Project one exact evidence capsule and six explicit caller-supplied evidence
 * axes into a deterministic mathematical evidence document. Scanner finding
 * groups become sparse exact counts; they are never aggregated into a score.
 * The caller's support/refute references and quantities are retained as
 * unverified assertions and cannot create authorization.
 *
 * This transform performs no filesystem, process, network, storage, wallet,
 * clock, key-store, signing, encryption, or authorization action. It does not
 * infer emotion, personhood, consciousness, probability, or severity.
 * Ordinary accessors are rejected, though hostile Proxy traps can still run
 * during input inspection; this function is not a sandbox.
 */
export function createMathEvidence(options) {
  const input = snapshotRecord(options, ['capsule', 'axes'], 'options')
  const source = sourceFromCapsule(input.capsule)
  const capsule = parseEvidenceCapsuleBytes(decodeCapsuleBase64(
    source.capsule_bytes,
    'source.capsule_bytes',
  ))
  return freeze(requireBoundedDocument({
    document_type: MATH_EVIDENCE_DOCUMENT_TYPE,
    complete: true,
    disclosure: { ...DISCLOSURE },
    source,
    signal_basis: {
      coordinate_fields: ['check', 'confidence', 'doctrine', 'principle'],
      value_kind: 'exact-integer-count',
      unit: 'finding',
      scale: { base_unit: 'finding', numerator: '1', denominator: '1' },
    },
    signal_vector: projectSignals(capsule),
    axes: serializeAxes(input.axes, false),
    epistemic: { ...EPISTEMIC },
    boundaries: {
      capability_subject: 'math-evidence-transform',
      direct_capabilities: { ...DIRECT_CAPABILITIES },
      input_inspection: { ...INPUT_INSPECTION },
      inferences_performed: { ...INFERENCES_PERFORMED },
      authorization_effect: 'none',
      consent_effect: 'none',
      permission_effect: 'none',
      rights_effect: 'none',
      standing_effect: 'none',
      downstream_weight_effect: 'none-training-reward-ranking-or-fitness',
      publication_authority: 'external',
    },
  }))
}

export function canonicalizeMathEvidence(mathEvidence) {
  return canonicalJson(serializeDocument(mathEvidence))
}

export function encodeMathEvidence(mathEvidence) {
  return new TextEncoder().encode(canonicalizeMathEvidence(mathEvidence))
}

/** Parse only exact, bounded, canonical UTF-8 `whitehack-math-evidence/v1` bytes. */
export function parseMathEvidenceBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    fail('math evidence bytes must be a non-empty Uint8Array')
  }
  if (bytes.byteLength > MAX_MATH_EVIDENCE_BYTES) {
    fail(`math evidence bytes exceed the ${MAX_MATH_EVIDENCE_BYTES}-byte limit`)
  }
  const snapshot = Uint8Array.from(bytes)
  let parsed
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(snapshot)
    parsed = JSON.parse(text)
  } catch {
    fail('math evidence bytes must contain valid canonical UTF-8 JSON')
  }
  const document = serializeDocument(parsed)
  const canonical = new TextEncoder().encode(canonicalJson(document))
  if (
    canonical.byteLength !== snapshot.byteLength
    || canonical.some((byte, index) => byte !== snapshot[index])
  ) {
    fail('math evidence bytes must equal the canonical math-evidence encoding')
  }
  return document
}

/**
 * Return the SHA-256 identity of the exact canonical plaintext document bytes.
 * The address proves neither authenticity, confidentiality, nor authorization;
 * sharing it can equality-link documents and enable offline guessing.
 */
export function addressMathEvidence(mathEvidence) {
  const digest = createHash(MATH_EVIDENCE_ADDRESS_ALGORITHM)
    .update(encodeMathEvidence(mathEvidence))
    .digest('hex')
  return `${MATH_EVIDENCE_ADDRESS_ALGORITHM}:${digest}`
}
