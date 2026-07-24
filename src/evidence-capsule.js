import { createHash } from 'node:crypto'

import { CHECK_MANIFEST } from './core.js'
import { RESULT_DOCUMENT_TYPE } from './result.js'

export const EVIDENCE_CAPSULE_DOCUMENT_TYPE = 'whitehack-evidence-capsule/v1'
export const EVIDENCE_CAPSULE_DISCLOSURE_PROFILE = 'whitehack-public-minimal/v1'
export const EVIDENCE_CAPSULE_MEDIA_TYPE = 'application/vnd.whitehack.evidence-capsule.v1+json'
export const EVIDENCE_CAPSULE_ADDRESS_ALGORITHM = 'sha256'
export const EVIDENCE_CAPSULE_SCANNER_VERSION = '0.9.0'
export const MAX_EVIDENCE_CAPSULE_BYTES = 64 * 1024

const MAX_FINDINGS = 10_000
const CONFIDENCE = new Set(['high', 'medium-high', 'medium', 'heuristic'])
const GATING_CONFIDENCE = new Set(['high', 'medium-high'])
const CHECK_BY_ID = new Map(CHECK_MANIFEST.map((check) => [check.id, check]))

const SCAN_FIELDS = Object.freeze([
  'document_type',
  'status',
  'complete',
  'scanner',
  'target',
  'redacted',
  'scope',
  'summary',
  'findings',
  'error',
])
const SCANNER_FIELDS = Object.freeze(['name', 'version', 'check_count'])
const FINDING_FIELDS = Object.freeze([
  'file',
  'line',
  'check',
  'title',
  'confidence',
  'doctrine',
  'principle',
  'message',
  'snippet',
])
const GROUP_FIELDS = Object.freeze([
  'check',
  'confidence',
  'doctrine',
  'principle',
  'count',
])
const SCOPE_COUNTERS = Object.freeze([
  'files_scanned',
  'bytes_scanned',
  'entries_observed',
  'excluded_paths',
  'non_regular_paths',
  'unsupported_files',
])
const LIMIT_FIELDS = Object.freeze([
  'maxFiles',
  'maxFileBytes',
  'maxTotalBytes',
  'maxEntries',
  'maxDepth',
  'maxPathBytes',
  'maxLinesPerFile',
  'maxFindings',
])
const CONFIDENCE_FIELDS = Object.freeze([
  'high',
  'medium-high',
  'medium',
  'heuristic',
])

const DISCLOSURE = Object.freeze({
  profile: EVIDENCE_CAPSULE_DISCLOSURE_PROFILE,
  scan_metadata_retained: Object.freeze(['scanner']),
  finding_group_fields: GROUP_FIELDS,
  target_retained: false,
  locations_retained: false,
  source_text_retained: false,
  scope_retained: false,
  caller_text_retained: false,
})

const EPISTEMIC = Object.freeze({
  basis: 'scanner-output-claim',
  finding_semantics: 'review-prompt-not-vulnerability-verdict',
  empty_semantics: 'no-bundled-match-not-security-proof',
  provenance: 'unverified',
  coverage: 'bounded-heuristic',
  content_address: 'canonical-bytes-identity-not-authenticity',
  complete_semantics: 'capsule-transformation-complete',
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

const BOUNDARIES = Object.freeze({
  capability_subject: 'evidence-capsule-transform',
  direct_capabilities: DIRECT_CAPABILITIES,
  input_inspection: INPUT_INSPECTION,
  publication_authority: 'external',
  storage_receipt_included: false,
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

function requireString(value, label, pattern, allowEmpty = false) {
  if (
    typeof value !== 'string'
    || (!allowEmpty && value.length === 0)
    || (pattern && !pattern.test(value))
  ) {
    fail(`${label} is invalid`)
  }
  return value
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} must be a boolean`)
  return value
}

function requireInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} is invalid`)
  }
  return value
}

function requireConstArray(value, expected, label) {
  const entries = snapshotDenseArray(value, label, expected.length)
  if (
    entries.length !== expected.length
    || entries.some((entry, index) => entry !== expected[index])
  ) {
    fail(`${label} does not match the capsule profile`)
  }
  return [...expected]
}

function serializeScanner(value, label) {
  const scanner = snapshotRecord(value, SCANNER_FIELDS, label)
  requireExact(scanner.name, 'whitehack', `${label}.name`)
  requireExact(
    scanner.version,
    EVIDENCE_CAPSULE_SCANNER_VERSION,
    `${label}.version`,
  )
  requireExact(scanner.check_count, CHECK_MANIFEST.length, `${label}.check_count`)
  return {
    name: 'whitehack',
    version: EVIDENCE_CAPSULE_SCANNER_VERSION,
    check_count: CHECK_MANIFEST.length,
  }
}

function validateScope(value) {
  const scope = snapshotRecord(
    value,
    [...SCOPE_COUNTERS, 'excluded_basenames', 'limits'],
    'scan.scope',
  )
  for (const field of SCOPE_COUNTERS) {
    requireInteger(scope[field], 0, Number.MAX_SAFE_INTEGER, `scan.scope.${field}`)
  }
  const basenames = snapshotDenseArray(
    scope.excluded_basenames,
    'scan.scope.excluded_basenames',
    10_000,
  )
  const observedBasenames = new Set()
  for (const entry of basenames) {
    if (
      typeof entry !== 'string'
      || entry.length === 0
      || observedBasenames.has(entry)
    ) {
      fail('scan.scope.excluded_basenames is invalid')
    }
    observedBasenames.add(entry)
  }
  const limits = snapshotRecord(scope.limits, LIMIT_FIELDS, 'scan.scope.limits')
  for (const field of LIMIT_FIELDS) {
    requireInteger(limits[field], 1, Number.MAX_SAFE_INTEGER, `scan.scope.limits.${field}`)
  }
}

function serializeFinding(value, index, redacted) {
  const label = `scan.findings[${index}]`
  const finding = snapshotRecord(value, FINDING_FIELDS, label)
  requireString(finding.file, `${label}.file`)
  requireInteger(finding.line, 0, Number.MAX_SAFE_INTEGER, `${label}.line`)
  const check = requireString(finding.check, `${label}.check`)
  if (!CONFIDENCE.has(finding.confidence)) fail(`${label}.confidence is invalid`)
  const doctrine = requireString(finding.doctrine, `${label}.doctrine`)
  const principle = requireInteger(finding.principle, 1, 6, `${label}.principle`)
  const manifest = CHECK_BY_ID.get(check)
  if (!manifest) fail(`${label}.check is not in the bundled check manifest`)
  if (doctrine !== manifest.doctrine) {
    fail(`${label}.doctrine does not match the bundled check manifest`)
  }
  if (principle !== manifest.principle) {
    fail(`${label}.principle does not match the bundled check manifest`)
  }
  if (finding.confidence !== manifest.confidence && finding.confidence !== 'heuristic') {
    fail(`${label}.confidence does not match the bundled check manifest`)
  }

  if (redacted) {
    requireExact(finding.title, null, `${label}.title`)
    requireExact(finding.message, null, `${label}.message`)
    requireExact(finding.snippet, null, `${label}.snippet`)
  } else {
    requireString(finding.title, `${label}.title`)
    requireString(finding.message, `${label}.message`)
    requireString(finding.snippet, `${label}.snippet`, undefined, true)
  }

  return { check, confidence: finding.confidence, doctrine, principle }
}

function validateSummary(value, findings) {
  const summary = snapshotRecord(
    value,
    ['finding_count', 'gating_finding_count', 'by_confidence'],
    'scan.summary',
  )
  const byConfidence = snapshotRecord(
    summary.by_confidence,
    CONFIDENCE_FIELDS,
    'scan.summary.by_confidence',
  )
  const expected = {
    high: 0,
    'medium-high': 0,
    medium: 0,
    heuristic: 0,
  }
  for (const finding of findings) expected[finding.confidence] += 1
  requireExact(summary.finding_count, findings.length, 'scan.summary.finding_count')
  requireExact(
    summary.gating_finding_count,
    findings.filter(({ confidence }) => GATING_CONFIDENCE.has(confidence)).length,
    'scan.summary.gating_finding_count',
  )
  for (const field of CONFIDENCE_FIELDS) {
    requireExact(byConfidence[field], expected[field], `scan.summary.by_confidence.${field}`)
  }
}

function validateCompleteScan(value) {
  const scan = snapshotRecord(value, SCAN_FIELDS, 'scan')
  requireExact(scan.document_type, RESULT_DOCUMENT_TYPE, 'scan.document_type')
  requireExact(scan.status, 'complete', 'scan.status')
  requireExact(scan.complete, true, 'scan.complete')
  requireExact(scan.error, null, 'scan.error')
  requireString(scan.target, 'scan.target')
  const redacted = requireBoolean(scan.redacted, 'scan.redacted')
  const scanner = serializeScanner(scan.scanner, 'scan.scanner')
  validateScope(scan.scope)
  const values = snapshotDenseArray(scan.findings, 'scan.findings', MAX_FINDINGS)
  const findings = values.map((finding, index) => serializeFinding(finding, index, redacted))
  validateSummary(scan.summary, findings)
  return { scanner, findings }
}

function compareGroups(left, right) {
  for (const key of ['check', 'confidence', 'doctrine']) {
    if (left[key] < right[key]) return -1
    if (left[key] > right[key]) return 1
  }
  return left.principle - right.principle
}

function aggregateFindings(findings) {
  const groups = new Map()
  for (const finding of findings) {
    const key = JSON.stringify([
      finding.check,
      finding.confidence,
      finding.doctrine,
      finding.principle,
    ])
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
    } else {
      groups.set(key, { ...finding, count: 1 })
    }
  }
  return [...groups.values()].sort(compareGroups)
}

function serializeDisclosure(value) {
  const disclosure = snapshotRecord(
    value,
    [
      'profile',
      'scan_metadata_retained',
      'finding_group_fields',
      'target_retained',
      'locations_retained',
      'source_text_retained',
      'scope_retained',
      'caller_text_retained',
    ],
    'capsule.disclosure',
  )
  requireExact(disclosure.profile, DISCLOSURE.profile, 'capsule.disclosure.profile')
  requireExact(
    disclosure.caller_text_retained,
    false,
    'capsule.disclosure.caller_text_retained',
  )
  for (const field of [
    'target_retained',
    'locations_retained',
    'source_text_retained',
    'scope_retained',
  ]) {
    requireExact(disclosure[field], false, `capsule.disclosure.${field}`)
  }
  return {
    profile: DISCLOSURE.profile,
    scan_metadata_retained: requireConstArray(
      disclosure.scan_metadata_retained,
      DISCLOSURE.scan_metadata_retained,
      'capsule.disclosure.scan_metadata_retained',
    ),
    finding_group_fields: requireConstArray(
      disclosure.finding_group_fields,
      DISCLOSURE.finding_group_fields,
      'capsule.disclosure.finding_group_fields',
    ),
    target_retained: false,
    locations_retained: false,
    source_text_retained: false,
    scope_retained: false,
    caller_text_retained: false,
  }
}

function serializeGroup(value, index) {
  const label = `capsule.finding_groups[${index}]`
  const group = snapshotRecord(value, GROUP_FIELDS, label)
  const check = requireString(group.check, `${label}.check`)
  if (!CONFIDENCE.has(group.confidence)) fail(`${label}.confidence is invalid`)
  const doctrine = requireString(group.doctrine, `${label}.doctrine`)
  const principle = requireInteger(group.principle, 1, 6, `${label}.principle`)
  const count = requireInteger(group.count, 1, MAX_FINDINGS, `${label}.count`)
  const manifest = CHECK_BY_ID.get(check)
  if (!manifest) fail(`${label}.check is not in the bundled check manifest`)
  if (doctrine !== manifest.doctrine || principle !== manifest.principle) {
    fail(`${label} does not match the bundled check manifest`)
  }
  if (group.confidence !== manifest.confidence && group.confidence !== 'heuristic') {
    fail(`${label}.confidence does not match the bundled check manifest`)
  }
  return { check, confidence: group.confidence, doctrine, principle, count }
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
      'publication_authority',
      'storage_receipt_included',
    ],
    'capsule.boundaries',
  )
  requireExact(
    boundaries.capability_subject,
    BOUNDARIES.capability_subject,
    'capsule.boundaries.capability_subject',
  )
  requireExact(
    boundaries.publication_authority,
    BOUNDARIES.publication_authority,
    'capsule.boundaries.publication_authority',
  )
  requireExact(
    boundaries.storage_receipt_included,
    false,
    'capsule.boundaries.storage_receipt_included',
  )
  return {
    capability_subject: BOUNDARIES.capability_subject,
    direct_capabilities: serializeFixedRecord(
      boundaries.direct_capabilities,
      DIRECT_CAPABILITIES,
      'capsule.boundaries.direct_capabilities',
    ),
    input_inspection: serializeFixedRecord(
      boundaries.input_inspection,
      INPUT_INSPECTION,
      'capsule.boundaries.input_inspection',
    ),
    publication_authority: BOUNDARIES.publication_authority,
    storage_receipt_included: false,
  }
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freeze(child)
  return Object.freeze(value)
}

function serializeCapsule(value) {
  const capsule = snapshotRecord(
    value,
    [
      'document_type',
      'complete',
      'disclosure',
      'scanner',
      'finding_groups',
      'epistemic',
      'boundaries',
    ],
    'capsule',
  )
  requireExact(
    capsule.document_type,
    EVIDENCE_CAPSULE_DOCUMENT_TYPE,
    'capsule.document_type',
  )
  requireExact(capsule.complete, true, 'capsule.complete')
  const groups = snapshotDenseArray(
    capsule.finding_groups,
    'capsule.finding_groups',
    MAX_FINDINGS,
  ).map(serializeGroup)
  let total = 0
  for (let index = 0; index < groups.length; index += 1) {
    total += groups[index].count
    if (!Number.isSafeInteger(total) || total > MAX_FINDINGS) {
      fail('capsule.finding_groups total count exceeds the finding limit')
    }
    if (index > 0 && compareGroups(groups[index - 1], groups[index]) >= 0) {
      fail('capsule.finding_groups must be uniquely canonical-sorted')
    }
  }

  return freeze({
    document_type: EVIDENCE_CAPSULE_DOCUMENT_TYPE,
    complete: true,
    disclosure: serializeDisclosure(capsule.disclosure),
    scanner: serializeScanner(capsule.scanner, 'capsule.scanner'),
    finding_groups: groups,
    epistemic: serializeFixedRecord(capsule.epistemic, EPISTEMIC, 'capsule.epistemic'),
    boundaries: serializeBoundaries(capsule.boundaries),
  })
}

function canonicalJson(value) {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) fail('capsule contains a non-canonical number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  fail('capsule contains a non-JSON value')
}

/**
 * Convert one complete, closed whitehack-scan/v1 document into a deterministic
 * public-minimal evidence capsule. The transform copies only bundled check
 * metadata and aggregate counts. It does not retain target, source, locations,
 * messages, snippets, scan scope, or other caller-controlled text.
 *
 * This module performs no filesystem, process, network, storage, wallet, clock,
 * key-store, signing, encryption, or authorization action. SHA-256 is used only
 * to identify the exact canonical capsule bytes. Ordinary accessors are
 * rejected, but hostile Proxy traps can still run during input inspection; this
 * function is not a sandbox.
 */
export function createEvidenceCapsule(scanResult) {
  const { scanner, findings } = validateCompleteScan(scanResult)
  return freeze({
    document_type: EVIDENCE_CAPSULE_DOCUMENT_TYPE,
    complete: true,
    disclosure: {
      profile: DISCLOSURE.profile,
      scan_metadata_retained: [...DISCLOSURE.scan_metadata_retained],
      finding_group_fields: [...DISCLOSURE.finding_group_fields],
      target_retained: false,
      locations_retained: false,
      source_text_retained: false,
      scope_retained: false,
      caller_text_retained: false,
    },
    scanner,
    finding_groups: aggregateFindings(findings),
    epistemic: { ...EPISTEMIC },
    boundaries: {
      capability_subject: BOUNDARIES.capability_subject,
      direct_capabilities: { ...DIRECT_CAPABILITIES },
      input_inspection: { ...INPUT_INSPECTION },
      publication_authority: BOUNDARIES.publication_authority,
      storage_receipt_included: false,
    },
  })
}

export function canonicalizeEvidenceCapsule(capsule) {
  return canonicalJson(serializeCapsule(capsule))
}

export function encodeEvidenceCapsule(capsule) {
  return new TextEncoder().encode(canonicalizeEvidenceCapsule(capsule))
}

/**
 * Parse one bounded capsule byte sequence through the normative runtime
 * validator and require the input to already be the exact canonical encoding.
 * The exported JSON Schema is a structural aid; this function also enforces
 * installed scanner/check metadata and canonical group ordering.
 */
export function parseEvidenceCapsuleBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    fail('capsule bytes must be a non-empty Uint8Array')
  }
  if (bytes.byteLength > MAX_EVIDENCE_CAPSULE_BYTES) {
    fail(`capsule bytes exceed the ${MAX_EVIDENCE_CAPSULE_BYTES}-byte limit`)
  }
  const snapshot = Uint8Array.from(bytes)
  let parsed
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(snapshot)
    parsed = JSON.parse(text)
  } catch {
    fail('capsule bytes must contain valid canonical UTF-8 JSON')
  }
  const capsule = serializeCapsule(parsed)
  const canonical = new TextEncoder().encode(canonicalJson(capsule))
  if (
    canonical.byteLength !== snapshot.byteLength
    || canonical.some((byte, index) => byte !== snapshot[index])
  ) {
    fail('capsule bytes must equal the canonical evidence-capsule encoding')
  }
  return capsule
}

/**
 * Return the SHA-256 identity of the exact canonical plaintext capsule.
 *
 * This address is not a confidentiality commitment. Publishing it can
 * equality-link scans and may reveal aggregate check/count patterns through
 * offline guessing. Keep it local or inside an encrypted envelope whenever
 * those patterns are confidential.
 */
export function addressEvidenceCapsule(capsule) {
  const digest = createHash(EVIDENCE_CAPSULE_ADDRESS_ALGORITHM)
    .update(encodeEvidenceCapsule(capsule))
    .digest('hex')
  return `${EVIDENCE_CAPSULE_ADDRESS_ALGORITHM}:${digest}`
}
