import { silentFailure } from './checks/silent-failure.js'
import { cacheAsLive } from './checks/cache-as-live.js'
import { decisionWithoutWhy } from './checks/decision-without-why.js'
import { staleOracle } from './checks/stale-oracle.js'
import { uncheckedTransfer } from './checks/unchecked-transfer.js'
import { spotPriceAsFair } from './checks/spot-price-as-fair.js'
import { silentRevert } from './checks/silent-revert.js'
import { floatMoney } from './checks/float-money.js'
import { hardcodedSecret } from './checks/hardcoded-secret.js'
import { exposedConfig } from './checks/exposed-config.js'
import { unsafeEval } from './checks/unsafe-eval.js'
import { performedIgnorance } from './checks/performed-ignorance.js'
import { trustByAuthority } from './checks/trust-by-authority.js'
import { apiStatusLie } from './checks/api-status-lie.js'
import { apiMissingVersioning } from './checks/api-missing-versioning.js'
import { apiErrorWithoutShape } from './checks/api-error-without-shape.js'
import { apiMissingRateLimit } from './checks/api-missing-rate-limit.js'
import { apiBareFetch } from './checks/api-bare-fetch.js'
import extraChecks from './checks/extra-checks.js'
import { SENSITIVE_SNIPPET } from './redaction.js'

export const LANGUAGE_BY_EXTENSION = Object.freeze({
  '.js': 'js',
  '.jsx': 'js',
  '.ts': 'js',
  '.tsx': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.sol': 'sol',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.py': 'py',
  '.rs': 'rs',
  '.c': 'c',
  '.h': 'c',
  '.go': 'go',
  '.java': 'java',
  '.swift': 'swift',
  '.env': 'env',
  '.conf': 'wifi-config',
  '.cfg': 'wifi-config',
  '.toml': 'yaml',
})

const LANGUAGE_BY_ALIAS = Object.freeze({
  c: 'c',
  cjs: 'js',
  conf: 'wifi-config',
  cfg: 'wifi-config',
  dotenv: 'env',
  env: 'env',
  go: 'go',
  golang: 'go',
  h: 'c',
  java: 'java',
  javascript: 'js',
  js: 'js',
  jsx: 'js',
  json: 'json',
  mjs: 'js',
  node: 'js',
  py: 'py',
  python: 'py',
  rs: 'rs',
  rust: 'rs',
  sol: 'sol',
  solidity: 'sol',
  swift: 'swift',
  toml: 'yaml',
  ts: 'js',
  tsx: 'js',
  typescript: 'js',
  wifi: 'wifi-config',
  'wifi-config': 'wifi-config',
  yaml: 'yaml',
  yml: 'yaml',
})

export const DEFAULT_TEXT_LIMITS = Object.freeze({
  maxLines: 10_000,
  maxFindings: 10_000,
})

export class ScanTextError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ScanTextError'
    this.code = code
  }
}

function registerCheck(check) {
  const detect = check.redactSnippet
    ? (...args) => check.detect(...args).map((hit) => ({ ...hit, snippet: SENSITIVE_SNIPPET }))
    : (...args) => check.detect(...args)
  const langs = Object.freeze([...new Set((check.langs ?? []).map(normalizeLanguage))])
  return Object.freeze({ ...check, langs, detect })
}

// Protocol and security checks are registered statically. A broken rule module
// therefore makes the scanner import fail instead of silently reducing the
// active rule set.
export const CHECKS = Object.freeze([
  silentFailure,
  cacheAsLive,
  decisionWithoutWhy,
  staleOracle,
  uncheckedTransfer,
  spotPriceAsFair,
  silentRevert,
  floatMoney,
  hardcodedSecret,
  exposedConfig,
  unsafeEval,
  performedIgnorance,
  trustByAuthority,
  apiStatusLie,
  apiMissingVersioning,
  apiErrorWithoutShape,
  apiMissingRateLimit,
  apiBareFetch,
  ...extraChecks,
].map(registerCheck))

export const CHECK_MANIFEST = Object.freeze(CHECKS.map((check) => Object.freeze({
  id: check.id,
  title: check.title,
  confidence: check.confidence,
  doctrine: check.doctrine,
  principle: check.principle,
  languages: Object.freeze([...(check.langs ?? [])]),
  redacts_source: check.redactSnippet === true,
})))

function languageForFile(file) {
  if (/(?:^|[\\/])\.env$/u.test(file)) return 'env'
  const dot = file.lastIndexOf('.')
  return dot === -1 ? undefined : LANGUAGE_BY_EXTENSION[file.slice(dot).toLowerCase()]
}

function normalizeLanguage(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('scanText lang must be a non-empty string')
  }
  const canonical = LANGUAGE_BY_ALIAS[value.toLowerCase()]
  if (canonical === undefined) {
    throw new TypeError(`scanText does not support language ${JSON.stringify(value)}`)
  }
  return canonical
}

function normalizeOptions(options) {
  if (options === undefined) {
    return { file: 'input.js', lang: 'js', ...DEFAULT_TEXT_LIMITS }
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('scanText options must be an object')
  }
  const keys = Object.keys(options)
  if (keys.some((key) => !['file', 'lang', 'maxLines', 'maxFindings'].includes(key))) {
    throw new TypeError('scanText options contain an unknown field')
  }
  const file = options.file ?? 'input.js'
  if (typeof file !== 'string' || file.length === 0) {
    throw new TypeError('scanText file must be a non-empty string')
  }
  const requestedLanguage = options.lang ?? languageForFile(file)
  if (requestedLanguage === undefined) {
    throw new TypeError(`scanText cannot infer a supported language from ${JSON.stringify(file)}`)
  }
  const lang = normalizeLanguage(requestedLanguage)
  const maxLines = options.maxLines ?? DEFAULT_TEXT_LIMITS.maxLines
  const maxFindings = options.maxFindings ?? DEFAULT_TEXT_LIMITS.maxFindings
  for (const [name, value] of Object.entries({ maxLines, maxFindings })) {
    if (!Number.isSafeInteger(value) || value < 1 || value > DEFAULT_TEXT_LIMITS[name]) {
      throw new TypeError(`scanText ${name} must be an integer from 1 to ${DEFAULT_TEXT_LIMITS[name]}`)
    }
  }
  return { file, lang, maxLines, maxFindings }
}

/**
 * Scan caller-provided text without filesystem, process, network, or clock I/O.
 * Findings retain the historical Whitehack shape so existing `scan()` users
 * and formatters can consume either boundary.
 */
export function scanText(source, options) {
  if (typeof source !== 'string') throw new TypeError('scanText source must be a string')
  const { file, lang, maxLines, maxFindings } = normalizeOptions(options)
  const lines = source.split('\n')
  if (lines.length > maxLines) {
    throw new ScanTextError('scan_line_limit_exceeded', 'scanText line limit exceeded')
  }
  const detected = []

  for (const check of CHECKS) {
    if (check.langs && check.langs.length > 0 && !check.langs.includes(lang)) continue
    for (const hit of check.detect(source, lines, { file, lang })) {
      if (detected.length >= maxFindings) {
        throw new ScanTextError('scan_finding_limit_exceeded', 'scanText finding limit exceeded')
      }
      detected.push({ check, hit })
    }
  }

  // If any sensitive check matches a line, every overlapping finding is
  // redacted regardless of rule registration order.
  const sensitiveLines = new Set(
    detected.filter(({ check }) => check.redactSnippet).map(({ hit }) => hit.line),
  )
  const redactFile = sensitiveLines.has(0)

  return Object.freeze(detected.map(({ check, hit }) => {
    if (
      !hit
      || typeof hit !== 'object'
      || !Number.isSafeInteger(hit.line)
      || hit.line < 0
      || typeof hit.message !== 'string'
      || typeof hit.snippet !== 'string'
    ) {
      throw new TypeError(`check ${check.id} returned an invalid finding`)
    }
    return Object.freeze({
      file,
      line: hit.line,
      check: check.id,
      title: check.title,
      confidence: hit.confidence || check.confidence,
      doctrine: check.doctrine,
      principle: check.principle,
      message: hit.message,
      snippet: check.redactSnippet || redactFile || sensitiveLines.has(hit.line)
        ? SENSITIVE_SNIPPET
        : hit.snippet,
    })
  }))
}
