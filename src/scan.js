import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, extname, relative } from 'node:path'
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

function registerCheck(check) {
  const detect = check.redactSnippet
    ? (...args) => check.detect(...args).map((hit) => ({ ...hit, snippet: SENSITIVE_SNIPPET }))
    : (...args) => check.detect(...args)
  return Object.freeze({ ...check, detect })
}

// Protocol & security checks — registered in extra-checks.js
// This includes: wifi (protocol flaws, evil twin, KRACK, PMK exposure, deauth,
// weak encryption, WPA2-krack), bluetooth (protocol flaws, paired stranger),
// DNS plaintext, password auth, insecure protocol, cert verification, weak
// crypto, crypto-awareness (nonce uniqueness, signature fail-open, signed
// webhook bytes/replay), CORS, cookies, SQL injection, protocol surface.
// This import is deliberately fail-closed: a broken rule module must make the
// scanner unavailable, never silently downgrade a full scan to the base pack.
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

const LANG_BY_EXT = {
  '.js': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js',
  '.mjs': 'js', '.cjs': 'js', '.sol': 'sol', '.json': 'json',
  '.yaml': 'yaml', '.yml': 'yaml', '.py': 'py', '.rs': 'rs',
  '.c': 'c', '.h': 'c', '.go': 'go', '.java': 'java',
  '.swift': 'swift', '.env': 'env', '.conf': 'wifi-config',
  '.cfg': 'wifi-config', '.toml': 'yaml',
}
const EXT = new Set(Object.keys(LANG_BY_EXT))
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'out', 'vendor'])

async function* walk(dir) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch (e) {
    throw new Error(`cannot read directory ${dir}: ${e.message}`)
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name.startsWith('.')) continue
    if (IGNORE.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (EXT.has(extname(e.name))) yield p
  }
}

export async function scan(root) {
  const findings = []
  let rootInfo
  try { rootInfo = await stat(root) }
  catch (e) { throw new Error(`cannot access scan root ${root}: ${e.message}`) }
  if (!rootInfo.isFile() && !rootInfo.isDirectory()) {
    throw new Error(`scan root is not a regular file or directory: ${root}`)
  }
  const isFile = rootInfo.isFile()
  const files = isFile ? [root] : []
  if (!isFile) { for await (const f of walk(root)) files.push(f) }

  for (const file of files) {
    let content
    try { content = await readFile(file, 'utf8') }
    catch (e) {
      throw new Error(`cannot read file ${file}: ${e.message}`)
    }
    const lang = LANG_BY_EXT[extname(file)] || (basename(file) === '.env' ? 'env' : undefined)
    const lines = content.split('\n')
    const detected = []
    for (const check of CHECKS) {
      if (check.langs && check.langs.length > 0 && !check.langs.includes(lang)) continue
      for (const hit of check.detect(content, lines, { file, lang })) {
        detected.push({ check, hit })
      }
    }

    // A second check can match the same credential-bearing line. Stage all
    // hits first so one sensitive check redacts every overlapping snippet,
    // independent of check registration order. A line-0 sensitive finding is
    // file-level and therefore redacts all snippets from that file.
    const sensitiveLines = new Set(
      detected.filter(({ check }) => check.redactSnippet).map(({ hit }) => hit.line),
    )
    const redactFile = sensitiveLines.has(0)
    for (const { check, hit } of detected) {
      findings.push({
        file: relative(root, file) || file,
        line: hit.line, check: check.id, title: check.title,
        confidence: hit.confidence || check.confidence,
        doctrine: check.doctrine, principle: check.principle,
        message: hit.message,
        snippet: check.redactSnippet || redactFile || sensitiveLines.has(hit.line)
          ? SENSITIVE_SNIPPET
          : hit.snippet,
      })
    }
  }
  return findings
}
