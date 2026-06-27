// The report deliberately states its own limits. A honesty tool that overstated
// its certainty would be the first thing it ought to flag.

export function report(findings, target) {
  const out = ['', `whitehack v0.2.1 — scanned ${target}`, '']

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
      out.push(`  ${file}`)
      for (const f of list) {
        const mark = f.confidence === 'heuristic' ? '·' : '!'
        const cs = f.principle ? ` · CS#${f.principle}` : ''
        out.push(`    ${mark} L${f.line}  ${f.title}  (${f.doctrine} · ${f.confidence}${cs})`)
        out.push(`        ${f.message}`)
        out.push(`        > ${f.snippet}`)
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

  const hard = findings.filter((f) => f.confidence !== 'heuristic').length
  // Report all confidence levels accurately. The old summary said
  // "X medium-high, Y heuristic" which silently downgraded "high"
  // findings to "medium-high" in the count — a lie in the summary line.
  const high = findings.filter((f) => f.confidence === 'high').length
  const medHigh = findings.filter((f) => f.confidence === 'medium-high').length
  const heur = findings.length - hard
  const parts = []
  if (high) parts.push(`${high} high`)
  if (medHigh) parts.push(`${medHigh} medium-high`)
  if (heur) parts.push(`${heur} heuristic`)
  out.push(`  ${findings.length} finding(s) — ${parts.length ? parts.join(', ') : 'none'}`)
  out.push('')

  console.log(out.join('\n'))
  // Non-zero only on the confident findings, so heuristic noise never breaks a CI gate.
  return hard > 0 ? 1 : 0
}
