import { readdir, readFile } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'
import { silentFailure } from './checks/silent-failure.js'
import { cacheAsLive } from './checks/cache-as-live.js'
import { decisionWithoutWhy } from './checks/decision-without-why.js'
import { staleOracle } from './checks/stale-oracle.js'
import { uncheckedTransfer } from './checks/unchecked-transfer.js'
import { spotPriceAsFair } from './checks/spot-price-as-fair.js'
import { silentRevert } from './checks/silent-revert.js'
import { floatMoney } from './checks/float-money.js'

const CHECKS = [
  silentFailure,
  cacheAsLive,
  decisionWithoutWhy,
  staleOracle,
  uncheckedTransfer,
  spotPriceAsFair,
  silentRevert,
  floatMoney,
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
    if (e.name.startsWith('.')) continue
    if (IGNORE.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (EXT.has(extname(e.name))) yield p
  }
}

export async function scan(root) {
  const findings = []
  for await (const file of walk(root)) {
    let content
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }
    const lang = LANG_BY_EXT[extname(file)]
    const lines = content.split('\n')
    for (const check of CHECKS) {
      if (check.langs && !check.langs.includes(lang)) continue
      for (const hit of check.detect(content, lines)) {
        findings.push({
          file: relative(root, file) || file,
          line: hit.line,
          check: check.id,
          title: check.title,
          confidence: hit.confidence || check.confidence,
          doctrine: check.doctrine,
          message: hit.message,
          snippet: hit.snippet,
        })
      }
    }
  }
  return findings
}
