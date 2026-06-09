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
        out.push(`    ${mark} L${f.line}  ${f.title}  (${f.doctrine} · ${f.confidence})`)
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
  out.push(`  ${findings.length} finding(s) — ${hard} medium-high, ${findings.length - hard} heuristic`)
  out.push('')

  console.log(out.join('\n'))
  // Non-zero only on the confident findings, so heuristic noise never breaks a CI gate.
  return hard > 0 ? 1 : 0
}
