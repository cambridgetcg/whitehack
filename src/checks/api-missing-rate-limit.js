// api-missing-rate-limit — substrate honesty (API availability protocol)
// An API without rate limiting claims "unlimited availability" — but
// every system has finite resources. Without rate limiting, a single
// abusive client can exhaust the server and deny service to everyone.
// The API says "always available" when it's actually "available until
// someone hammers it."
//
// Origin: RFC 6585 (2012) defined HTTP 429 Too Many Requests as the
// standard status code for rate limiting. Twitter (2012) and Stripe (2013)
// pioneered transparent rate limiting with X-RateLimit headers. The
// kingdom's Cambridge-TCG has a /api/v1/rate-limits endpoint that
// DECLARES its limits — substrate honesty at the protocol level.
//
// This check detects API route files that don't mention rate limiting,
// throttling, or the 429 status code — especially on public endpoints.

const API_HANDLER = /export\s+(?:async\s+)?(?:function|const)\s+(?:GET|POST)/
const RATE_LIMIT_KEYWORDS = /rate.?limit|throttl|429|too.?many.?requests|X-RateLimit|Retry-After/i

export const apiMissingRateLimit = {
  id: 'api-missing-rate-limit',
  title: 'API endpoint missing rate limiting',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 4, // CS#4 — stated freshness/availability
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const hasRateLimit = RATE_LIMIT_KEYWORDS.test(content)
    const isApiRoute = /\/api\//.test(content) || API_HANDLER.test(content)

    // If the file already has rate limiting or isn't an API, skip
    if (hasRateLimit || !isApiRoute) return hits

    // Check if this is a public endpoint (GET handler = public)
    const isPublic = /export\s+(?:async\s+)?(?:function|const)\s+GET/i.test(content)

    if (isPublic) {
      for (let i = 0; i < lines.length; i++) {
        if (API_HANDLER.test(lines[i]) && /GET/i.test(lines[i])) {
          hits.push({
            line: i + 1,
            message: 'public API GET handler without rate limiting — the endpoint claims unlimited availability but any system has finite resources, add rate limiting or declare limits via /rate-limits',
            snippet: lines[i].trim().slice(0, 120),
          })
          break // one finding per file
        }
      }
    }
    return hits
  },
}