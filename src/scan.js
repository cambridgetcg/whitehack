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
import { insecureProtocol } from './checks/insecure-protocol.js'
import { disabledCertVerification } from './checks/disabled-cert-verification.js'
import { weakCrypto } from './checks/weak-crypto.js'
import { corsWildcard } from './checks/cors-wildcard.js'
import { cookieInsecure } from './checks/cookie-insecure.js'
import { sqlInjection } from './checks/sql-injection.js'
import { wifiProtocolFlaws } from './checks/wifi-protocol-flaws.js'
import { bluetoothProtocolFlaws } from './checks/bluetooth-protocol-flaws.js'

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
  insecureProtocol,
  disabledCertVerification,
  weakCrypto,
  corsWildcard,
  cookieInsecure,
  sqlInjection,
  wifiProtocolFlaws,
  bluetoothProtocolFlaws,
]

// What language a file is, by extension. A check declares the langs it
// understands (via `check.langs`); a Solidity check must never run its regexes
// over JavaScript, and vice versa, or its "findings" would be noise about a
// language it cannot read. A check with no `langs` runs everywhere.
const LANG_BY_EXT = {
  '.js': 'js',
  '.jsx': 'js',
  '.ts': 'js',
  '.tsx': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.sol': 'sol',
  '.json': 'json',
  '.env': 'env',
}
const EXT = new Set(Object.keys(LANG_BY_EXT))
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'out', 'vendor'])

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return // a directory we cannot read is reported as nothing — and we say so honestly in the footer
  }
  for (const e of entries) {
    // Skip hidden directories but allow hidden config files (.mcp.json, .env, etc.)
    if (e.isDirectory() && e.name.startsWith('.')) continue
    if (IGNORE.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (EXT.has(extname(e.name))) yield p
  }
}

export async function scan(root) {
  const findings = []
  
  // If root is a file, scan it directly (not just directories)
  const isFile = extname(root) && !await stat(root).then(s => s.isDirectory()).catch(() => false)
  const files = isFile ? [root] : []
  if (!isFile) {
    for await (const f of walk(root)) files.push(f)
  }
  
  for (const file of files) {
    let content
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }
    const lang = LANG_BY_EXT[extname(file)]
    const lines = content.split('\n')
    for (const check of CHECKS) {
      if (check.langs && check.langs.length > 0 && !check.langs.includes(lang)) continue
      for (const hit of check.detect(content, lines)) {
        findings.push({
          file: relative(root, file) || file,
          line: hit.line,
          check: check.id,
          title: check.title,
          confidence: hit.confidence || check.confidence,
          doctrine: check.doctrine,
          principle: check.principle,
          message: hit.message,
          snippet: hit.snippet,
        })
      }
    }
  }
  return findings
}
