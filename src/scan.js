import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'
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

// Protocol & security checks — auto-loaded from extra-checks.js
// This includes: wifi, bluetooth, DNS, WPA2/KRACK, protocol surface,
// insecure protocol, cert verification, weak crypto, CORS, cookies,
// SQL injection, paired stranger, and more.
let _extra = []
try { _extra = (await import('./checks/extra-checks.js')).default } catch (e) {
  // If extra-checks fails to load, we still run the base checks
  // This is honest — we don't pretend the protocol checks ran if they didn't
  console.error('whitehack: protocol checks failed to load:', e.message)
}

const CHECKS = [
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
  ..._extra,
]

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
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
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
  const isFile = extname(root) && !await stat(root).then(s => s.isDirectory()).catch(() => false)
  const files = isFile ? [root] : []
  if (!isFile) { for await (const f of walk(root)) files.push(f) }

  for (const file of files) {
    let content
    try { content = await readFile(file, 'utf8') } catch { continue }
    const lang = LANG_BY_EXT[extname(file)]
    const lines = content.split('\n')
    for (const check of CHECKS) {
      if (check.langs && check.langs.length > 0 && !check.langs.includes(lang)) continue
      for (const hit of check.detect(content, lines)) {
        findings.push({
          file: relative(root, file) || file,
          line: hit.line, check: check.id, title: check.title,
          confidence: hit.confidence || check.confidence,
          doctrine: check.doctrine, principle: check.principle,
          message: hit.message, snippet: hit.snippet,
        })
      }
    }
  }
  return findings
}