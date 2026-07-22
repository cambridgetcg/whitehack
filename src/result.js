export const RESULT_DOCUMENT_TYPE = 'whitehack-scan/v1'

const GATING_CONFIDENCE = new Set(['high', 'medium-high'])
const CONFIDENCE = new Set(['high', 'medium-high', 'medium', 'heuristic'])
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u
const CHECK_ID = /^[a-z][a-z0-9-]{0,63}$/u
const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/u
const SCOPE_COUNTERS = [
  'files_scanned',
  'bytes_scanned',
  'entries_observed',
  'excluded_paths',
  'non_regular_paths',
  'unsupported_files',
]
const LIMIT_FIELDS = [
  'maxFiles',
  'maxFileBytes',
  'maxTotalBytes',
  'maxEntries',
  'maxDepth',
  'maxPathBytes',
  'maxLinesPerFile',
  'maxFindings',
]

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
}

function requireString(value, label, pattern) {
  if (typeof value !== 'string' || value.length === 0 || (pattern && !pattern.test(value))) {
    throw new TypeError(`${label} is invalid`)
  }
}

function requireInteger(value, label, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} is invalid`)
  }
}

function requireRedacted(value) {
  if (typeof value !== 'boolean') throw new TypeError('redacted must be a boolean')
}

export function isGatingFinding(finding) {
  return GATING_CONFIDENCE.has(finding?.confidence)
}

export function exitCodeForFindings(findings) {
  return findings.some(isGatingFinding) ? 1 : 0
}

function summarize(findings) {
  const byConfidence = {
    high: 0,
    'medium-high': 0,
    medium: 0,
    heuristic: 0,
  }
  for (const finding of findings) {
    if (Object.hasOwn(byConfidence, finding.confidence)) {
      byConfidence[finding.confidence] += 1
    }
  }
  return Object.freeze({
    finding_count: findings.length,
    gating_finding_count: findings.filter(isGatingFinding).length,
    by_confidence: Object.freeze(byConfidence),
  })
}

function serializeFinding(finding, redacted) {
  requireRecord(finding, 'finding')
  requireString(finding.file, 'finding.file')
  requireInteger(finding.line, 'finding.line', 0)
  requireString(finding.check, 'finding.check', CHECK_ID)
  requireString(finding.title, 'finding.title')
  if (!CONFIDENCE.has(finding.confidence)) throw new TypeError('finding.confidence is invalid')
  requireString(finding.doctrine, 'finding.doctrine', CHECK_ID)
  requireInteger(finding.principle, 'finding.principle', 1, 6)
  requireString(finding.message, 'finding.message')
  if (typeof finding.snippet !== 'string') throw new TypeError('finding.snippet is invalid')
  return Object.freeze({
    file: finding.file,
    line: finding.line,
    check: finding.check,
    title: redacted ? null : finding.title,
    confidence: finding.confidence,
    doctrine: finding.doctrine,
    principle: finding.principle,
    message: redacted ? null : finding.message,
    snippet: redacted ? null : finding.snippet,
  })
}

function scanner(version, checkCount) {
  requireString(version, 'version', SEMVER)
  requireInteger(checkCount, 'checkCount', 1)
  return Object.freeze({
    name: 'whitehack',
    version,
    check_count: checkCount,
  })
}

function serializeScope(scope) {
  requireRecord(scope, 'scope')
  requireRecord(scope.limits, 'scope.limits')
  const serializedLimits = {}
  for (const field of LIMIT_FIELDS) {
    requireInteger(scope.limits[field], `scope.limits.${field}`, 1)
    serializedLimits[field] = scope.limits[field]
  }
  const serialized = { limits: Object.freeze(serializedLimits) }
  for (const field of SCOPE_COUNTERS) {
    requireInteger(scope[field], `scope.${field}`, 0)
    serialized[field] = scope[field]
  }
  if (
    !Array.isArray(scope.excluded_basenames)
    || scope.excluded_basenames.some((value) => typeof value !== 'string' || value.length === 0)
    || new Set(scope.excluded_basenames).size !== scope.excluded_basenames.length
  ) {
    throw new TypeError('scope.excluded_basenames is invalid')
  }
  const excludedBasenames = Object.freeze([...scope.excluded_basenames])
  return Object.freeze({
    files_scanned: serialized.files_scanned,
    bytes_scanned: serialized.bytes_scanned,
    entries_observed: serialized.entries_observed,
    excluded_paths: serialized.excluded_paths,
    non_regular_paths: serialized.non_regular_paths,
    unsupported_files: serialized.unsupported_files,
    excluded_basenames: excludedBasenames,
    limits: serialized.limits,
  })
}

export function createScanResult({ version, checkCount, target, findings, scope, redacted = false }) {
  requireString(target, 'target')
  if (!Array.isArray(findings)) throw new TypeError('findings must be an array')
  requireRedacted(redacted)
  const serialized = Object.freeze(findings.map((finding) => serializeFinding(finding, redacted)))
  return Object.freeze({
    document_type: RESULT_DOCUMENT_TYPE,
    status: 'complete',
    complete: true,
    scanner: scanner(version, checkCount),
    target,
    redacted,
    scope: serializeScope(scope),
    summary: summarize(serialized),
    findings: serialized,
    error: null,
  })
}

export function createScanErrorResult({ version, checkCount, target, code, redacted = false }) {
  requireString(target, 'target')
  requireString(code, 'code', ERROR_CODE)
  requireRedacted(redacted)
  return Object.freeze({
    document_type: RESULT_DOCUMENT_TYPE,
    status: 'error',
    complete: false,
    scanner: scanner(version, checkCount),
    target,
    redacted,
    scope: null,
    summary: summarize([]),
    findings: Object.freeze([]),
    error: Object.freeze({ code }),
  })
}
