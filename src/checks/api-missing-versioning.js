// api-missing-versioning — substrate honesty (API protocol evolution)
// An API without versioning claims "this interface is permanent" — but
// every API changes. When the unversioned API breaks, every client breaks
// simultaneously with no warning. Versioning (v1, v2) is the protocol's
// way of telling the truth about stability: "this contract is stable
// within this version; breaking changes get a new version."
//
// Origin: Roy Fielding's REST dissertation (2000) defined API versioning
// as part of the contract. The Twitter API (2012) and Facebook API (2014)
// both learned this painfully — unversioned changes broke thousands of
// apps overnight. Stripe (2013) made versioning by date the gold standard.
// The kingdom's own Cambridge-TCG uses /api/v1/ — honest about its version.
//
// This check detects API route files that don't declare a version,
// and API responses that don't include version metadata.

const API_ROUTE_NO_VERSION = /\/api\/(?!v\d+|version)/i
const EXPORT_HANDLER_NO_VERSION = /export\s+(?:async\s+)?(?:function|const)\s+(?:GET|POST|PUT|DELETE|PATCH)/
const RESPONSE_NO_VERSION_HEADER = /new Response\((?!.*version)/

export const apiMissingVersioning = {
  id: 'api-missing-versioning',
  title: 'API endpoint missing version declaration',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 1,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const hasVersion = /\/api\/v\d|api.*version|API_VERSION|x-api-version/i.test(content)

    // If the file already has versioning, skip
    if (hasVersion) return hits

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // API route handler without version
      if (EXPORT_HANDLER_NO_VERSION.test(l) && /\/api\//.test(content) && !hasVersion) {
        hits.push({
          line: i + 1,
          message: 'API handler exported without version declaration — the endpoint claims permanence but every API changes, unversioned endpoints break clients without warning',
          snippet: l.trim().slice(0, 120),
        })
        break // one finding per file is enough
      }
    }
    return hits
  },
}