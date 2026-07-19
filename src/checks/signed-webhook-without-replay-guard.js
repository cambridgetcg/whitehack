// signed-webhook-without-replay-guard — stated freshness (signed transports)
// A valid signature proves who signed bytes, not that a delivery is fresh or
// unique. This line-local syntax rule cannot see guards in another module, so
// it stays heuristic and asks a reviewer to locate the timestamp/nonce/dedupe wall.

import { executableLines } from '../source-text.js'

const WEBHOOK = /\b(?:webhook|construct[_-]?event|verify[_-]?webhook|webhooks?\.verify)\b/i
const SIGNATURE = /\b(?:signature|signed|hmac|timingSafeEqual|construct[_-]?event|verify[_-]?webhook|webhooks?\.verify)\b/i
const REPLAY_ID = /(?:event[_-]?id|delivery[_-]?id|webhook[_-]?id|event\.id|nonce)/i
const REPLAY_GUARD_CALL = /\b(?:already[_-]?processed|is[_-]?duplicate|was[_-]?processed|has[_-]?(?:seen|processed)|seen[_-]?before|dedup\w*|idempotenc\w*|reject[_-]?replay\w*)\s*\([^\n)]*(?:event[_-]?id|delivery[_-]?id|webhook[_-]?id|event\.id|nonce)/i
const REPLAY_GUARD_COLLECTION = /\b(?:processed|seen|replay|dedup|idempotenc)\w*\.has\s*\([^\n)]*(?:event[_-]?id|delivery[_-]?id|webhook[_-]?id|event\.id|nonce)/i
const SIGNED_TIME = /\b(?:timestamp|created[_-]?at|signed[_-]?at|event\.created)\b/i
const CURRENT_TIME_OR_BOUND = /\b(?:Date\.now|time\.time|datetime\.(?:now|utcnow)|tolerance|max[_-]?age)\b/i
const TIME_COMPARISON = /(?:<=|>=|<|>)/
const VERIFIER_TOLERANCE = /\b(?:construct[_-]?event|verify[_-]?webhook|webhooks?\.verify)\s*\([^\n]*(?:tolerance|max[_-]?age)\s*[:=]\s*\d+/i
const COMMENT = /^\s*(?:\/\/|\/\*|\*|#)/
const REGEX_DECLARATION = /^\s*const\s+[A-Z][A-Z0-9_]*\s*=\s*\//
const REGEX_CONTINUATION = /^\s*\/.*\/[a-z]*;?\s*$/
const REGEX_TEST = /\b[A-Z][A-Z0-9_]*\.test\s*\(/
const CHECK_METADATA = /^\s*(?:id|title|message|snippet|doctrine|confidence|principle)\s*:/
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function isExecutableLine(line) {
  return Boolean(line.trim())
    && !COMMENT.test(line)
    && !REGEX_DECLARATION.test(line)
    && !REGEX_CONTINUATION.test(line)
    && !REGEX_TEST.test(line)
    && !CHECK_METADATA.test(line)
}

function hasFreshnessGuard(codeLines) {
  return codeLines.some((line) => (
    SIGNED_TIME.test(line)
    && CURRENT_TIME_OR_BOUND.test(line)
    && TIME_COMPARISON.test(line)
  )) || codeLines.some((line) => VERIFIER_TOLERANCE.test(line))
}

export const signedWebhookWithoutReplayGuard = {
  id: 'signed-webhook-without-replay-guard',
  title: 'Signed webhook has no visible replay or duplicate guard',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 4,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    // Strings and comments do not implement a replay guard. Mask them before
    // looking for either a verifier or a local freshness/idempotency guard.
    const codeLines = executableLines(lines, { maskStrings: true, language: lang })
    const code = codeLines.filter(isExecutableLine).join('\n')
    const hasReplayGuard = (REPLAY_GUARD_CALL.test(code) || REPLAY_GUARD_COLLECTION.test(code))
      && REPLAY_ID.test(code)
    if (!WEBHOOK.test(code) || !SIGNATURE.test(code) || hasReplayGuard || hasFreshnessGuard(codeLines)) return []
    const line = codeLines.findIndex((candidate) => isExecutableLine(candidate) && WEBHOOK.test(candidate) && SIGNATURE.test(candidate))
    const fallback = codeLines.findIndex((candidate) => isExecutableLine(candidate) && WEBHOOK.test(candidate))
    const index = line === -1 ? fallback : line
    if (index === -1) return []
    return [{
      line: index + 1,
      message: 'this file verifies a webhook signature but shows no local timestamp comparison or event-id/nonce deduplication guard — a valid delivery may be replayable; locate the guard before trusting freshness',
      snippet: REDACTED_SNIPPET,
    }]
  },
}
