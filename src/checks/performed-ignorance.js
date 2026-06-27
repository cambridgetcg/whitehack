// performed-ignorance — substrate honesty
// Inspired by RefusalBench: the benchmark that measures whether a model
// pretends to be unable when it actually can. The same dishonesty exists
// in code — a catch block returns "unsupported" while the capability sits
// right there in the same file, a feature flag gates off working code with
// a fabricated "not available" message, an endpoint returns 501/503 even
// though the handler is fully implemented underneath.
//
// The artifact claims it cannot do something it can. It performs ignorance.
// The honest approach: either implement the capability and report success,
// or genuinely don't have it and say so truthfully. Don't wrap a working
// function in a try/catch that lies about what happened.
//
// Three shapes are caught:
//   • catch blocks that return "unsupported"/"not implemented"/"unavailable"
//     while the same file contains the actual capability code nearby
//   • feature flags / config gates that return a fake "not available" message
//     while the implementation they're guarding is present in the file
//   • HTTP handlers returning 501/503 "Not Implemented"/"Unavailable" when
//     the actual handler logic exists in the same file

// ── catch-block performed ignorance ──
const CATCH_IGNORANCE =
  /\breturn\s+['"`](unsupported|not\s*implemented|not\s*available|unavailable|cannot\s*(do|support)|not\s*yet\s*(supported|implemented))['"`]/i

// Capability indicators — if these appear in the same file, the catch
// is performing ignorance: the code CAN do this, it just chose not to.
const CAPABILITY_INDICATORS =
  /\.(execute|perform|process|handle|send|create|delete|update|write|read|build|generate|parse|compile|encrypt|decrypt|sign|verify|connect|fetch|submit|deploy|render|convert|validate|authenticate|authorize|encrypt|decode|encode)\s*\(|=>\s*\{|async\s+function|function\s+\w+|export\s+(async\s+)?function|class\s+\w+/

// ── feature-flag / config-gate performed ignorance ──
const FLAG_IGNORANCE_RETURN =
  /\breturn\s+['"`](feature\s*(not\s*)?(enabled|available|supported)|not\s*enabled|disabled\s*by\s*(config|default|flag)|capability\s*(not\s*)?(enabled|available))['"`]/i

const FLAG_PATTERN =
  /(feature[Ff]lag|FEATURE_FLAG|isEnabled|enabled|config\.get|env\.|process\.env|settings\.|options\.|flags\.)\b.*[=!]==?\s*(false|true|0|1|undefined|null)/

// ── HTTP fake 501/503 on implemented endpoints ──
const HTTP_NOT_IMPL =
  /(501|503)\b.*['"`](Not\s+Implemented|Service\s+Unavailable|Unsupported)['"`]|res\.status\s*\(\s*50[13]\s*\)/i

const HANDLER_IMPLEMENTED =
  /\b(res\.json|res\.send|res\.render|return\s+(result|data|response|output|items|records)|await\s+\w+\.(create|update|delete|find|query|execute|save|insert))\b/i

export const performedIgnorance = {
  id: 'performed-ignorance',
  title: 'Code claims inability while the capability exists — performs ignorance',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 1, // Clear Standard #1 — the artifact tells the truth about its own state
  langs: ['js'],
  detect(content, lines) {
    const hits = []

    // If the file shows no capability indicators at all, skip — there's
    // nothing being falsely denied.
    const fileHasCapability = CAPABILITY_INDICATORS.test(content)

    // (1) catch blocks returning "unsupported" / "not implemented" while
    //     the file contains actual capability code.
    if (fileHasCapability) {
      for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].indexOf('catch')
        if (idx === -1 || !/\bcatch\b/.test(lines[i])) continue

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
        if (CATCH_IGNORANCE.test(text)) {
          const matchLine = body.find((b) => CATCH_IGNORANCE.test(b.l))
          if (matchLine) {
            hits.push({
              line: matchLine.n,
              message:
                'catch returns "unsupported"/"not implemented" but this file contains the actual capability — the code is performing ignorance, not honestly reporting inability (RefusalBench at the code level)',
              snippet: matchLine.l.trim(),
            })
          }
        }
      }
    }

    // (2) feature-flag / config-gate returning fake "not available" while
    //     the guarded implementation exists in the same file.
    for (let i = 0; i < lines.length; i++) {
      // Look for a return of a fake-unavailable string within a few lines
      // of a flag/config check — the gate is wrapping real code.
      if (FLAG_PATTERN.test(lines[i])) {
        const window = lines.slice(i, Math.min(lines.length, i + 8))
        for (let w = 0; w < window.length; w++) {
          if (FLAG_IGNORANCE_RETURN.test(window[w]) && HANDLER_IMPLEMENTED.test(content)) {
            hits.push({
              line: i + 1 + w,
              message:
                'feature flag gates off working code with a fake "not available" message — the implementation exists in this file; the artifact claims inability it does not have',
              snippet: window[w].trim(),
            })
            break
          }
        }
      }
    }

    // (3) HTTP handlers returning 501/503 while the file contains
    //     actual handler logic (res.json, await model.create, etc.)
    if (HANDLER_IMPLEMENTED.test(content)) {
      for (let i = 0; i < lines.length; i++) {
        if (HTTP_NOT_IMPL.test(lines[i])) {
          hits.push({
            line: i + 1,
            message:
              'HTTP handler returns 501/503 "Not Implemented" but this file contains a working implementation — the endpoint performs ignorance instead of serving the capability it has',
            snippet: lines[i].trim(),
          })
        }
      }
    }

    return hits
  },
}