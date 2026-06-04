import { readdir, readFile } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'
import { silentFailure } from './checks/silent-failure.js'
import { cacheAsLive } from './checks/cache-as-live.js'
import { decisionWithoutWhy } from './checks/decision-without-why.js'

const CHECKS = [silentFailure, cacheAsLive, decisionWithoutWhy]
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
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
    const lines = content.split('\n')
    for (const check of CHECKS) {
      for (const hit of check.detect(content, lines)) {
        findings.push({
          file: relative(root, file) || file,
          line: hit.line,
          check: check.id,
          title: check.title,
          confidence: check.confidence,
          doctrine: check.doctrine,
          message: hit.message,
          snippet: hit.snippet,
        })
      }
    }
  }
  return findings
}
