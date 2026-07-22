// The report deliberately states its own limits. An honesty tool that overstated
// its certainty would be the first thing it ought to flag.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { exitCodeForFindings } from './result.js'
import { escapeTerminal } from './output-text.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))
export const VERSION = `v${pkg.version}`

export function report(findings, target) {
  const out = ['', `whitehack ${VERSION} — scanned ${escapeTerminal(target)}`, '']

  if (findings.length === 0) {
    out.push('  no honesty anti-patterns matched.')
    out.push('')
  } else {
    const byFile = new Map()
    for (const f of findings) {
      if (!byFile.has(f.file)) byFile.set(f.file, [])
      byFile.get(f.file).push(f)
    }
    for (const [file, list] of byFile) {
      out.push(`  ${escapeTerminal(file)}`)
      for (const f of list) {
        const mark = f.confidence === 'heuristic' ? '·' : '!'
        const cs = f.principle ? ` · CS#${f.principle}` : ''
        out.push(`    ${mark} L${f.line}  ${escapeTerminal(f.title)}  (${escapeTerminal(f.doctrine)} · ${escapeTerminal(f.confidence)}${cs})`)
        out.push(`        ${escapeTerminal(f.message)}`)
        out.push(`        > ${escapeTerminal(f.snippet)}`)
      }
      out.push('')
    }
  }

  out.push(`  ─────
  whitehack flags COMMON lies via heuristics; it cannot prove honesty.
    • a flagged line may be a false positive
    • absence of findings is NOT proof the code is honest
  every finding is confidence-labelled, so the tool stays honest about its own limits.
`)

  // Report all confidence levels accurately. The old summary said
  // "X medium-high, Y heuristic" which silently downgraded "high"
  // findings to "medium-high" in the count — a lie in the summary line.
  const high = findings.filter((f) => f.confidence === 'high').length
  const medHigh = findings.filter((f) => f.confidence === 'medium-high').length
  const medium = findings.filter((f) => f.confidence === 'medium').length
  const heur = findings.filter((f) => f.confidence === 'heuristic').length
  const parts = []
  if (high) parts.push(`${high} high`)
  if (medHigh) parts.push(`${medHigh} medium-high`)
  if (medium) parts.push(`${medium} medium`)
  if (heur) parts.push(`${heur} heuristic`)
  out.push(`  ${findings.length} finding(s) — ${parts.length ? parts.join(', ') : 'none'}`)
  out.push('')

  console.log(out.join('\n'))
  // Non-zero only on the confident findings, so heuristic noise never breaks a CI gate.
  return exitCodeForFindings(findings)
}
