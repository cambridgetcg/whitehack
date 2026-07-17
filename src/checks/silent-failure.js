// silent-failure — substrate honesty
// A read that fails must degrade VISIBLY. A catch that returns a falsy default,
// or a `?? 0` / `|| []` over a read, turns "I could not read this" into a
// confident, wrong value ("0 in stock", "$0 balance") that something downstream
// trusts. The fix is to surface the failure (throw / log / a typed error / a
// visible "—"), not to swallow it.

const FALSY = /\breturn\s+(0|\[\]|\{\}|null|''|""|false)\s*(;|\/\/|$)/
const SAFE_DEFAULT = /(\?\?|\|\|)\s*(0|\[\]|''|"")/
const GUARD = /\b(throw|console\.|logger?\.|report\(|rethrow|process\.exit|process\.stderr|process\.stdout|captureException|Sentry|warn\(|error\(|logFor\w*\(|logError\(|logBridgeSkip\(|logEvent\(|logWarn\(|logInfo\(|logDebug\(|onDebug\(|onDone\(|onWarn\(|setError\(|onError\(|fail\()/
const READ = /(await\s|fetch\(|\.get\(|\.query\(|readFile|\.count\(|\.find\(|\.load\(|\.read\()/

export const silentFailure = {
  id: 'silent-failure',
  title: 'Read fails silently to a falsy default',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2, // Clear Standard #2 — visible failure
  langs: ['js'],
  detect(content, lines) {
    const hits = []

    // (1) catch blocks that return a falsy value without logging or rethrowing.
    for (let i = 0; i < lines.length; i++) {
      // Strip trailing // comments so we don't match "catch" inside annotation text
      const commentIdx = lines[i].indexOf('//')
      const codePart = commentIdx >= 0 ? lines[i].slice(0, commentIdx) : lines[i]
      const idx = codePart.indexOf('catch')
      if (idx === -1 || !/\bcatch\b/.test(codePart)) continue
      let depth = 0
      let started = false
      const body = []
      for (let j = i; j < Math.min(lines.length, i + 30); j++) {
        const seg = j === i ? lines[j].slice(idx) : lines[j]
        for (const ch of seg) {
          if (ch === '{') {
            depth++
            started = true
          } else if (ch === '}') {
            depth--
          }
        }
        body.push({ n: j + 1, l: lines[j] })
        if (started && depth <= 0) break
      }
      const text = body.map((b) => b.l).join('\n')
      if (GUARD.test(text)) continue
      const falsy = body.find((b) => FALSY.test(b.l))
      if (falsy) {
        hits.push({
          line: falsy.n,
          message: 'catch returns a falsy default and neither logs nor rethrows — a failure becomes a confident wrong value',
          snippet: falsy.l.trim(),
        })
      }
    }

    // (2) a read coerced to a falsy default on the same line.
    for (let i = 0; i < lines.length; i++) {
      if (SAFE_DEFAULT.test(lines[i]) && READ.test(lines[i])) {
        hits.push({
          line: i + 1,
          message: 'a read is coerced to a falsy default — "zero" and "could not read" become indistinguishable',
          snippet: lines[i].trim(),
        })
      }
    }

    return hits
  },
}
