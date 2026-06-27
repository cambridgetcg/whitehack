// api-bare-fetch — substrate honesty (API consumption protocol)
// Calling fetch() without checking the response status is a lie about
// the API contract — the code assumes the response is always successful
// when the server could return 4xx, 5xx, or a malformed body.
// The fetch resolves regardless of HTTP status; only checking res.ok
// or res.status reveals the truth.
//
// Origin: The Fetch API (2015) was designed to resolve on ANY HTTP response,
// unlike XMLHttpRequest which fired onerror only on network failures. This
// was intentional — HTTP error codes are valid responses, not exceptions.
// But it means code that does `const data = await fetch(url).then(r => r.json())`
// will parse a 500 error page as JSON and silently use broken data.
//
// The honest pattern:
//   const res = await fetch(url)
//   if (!res.ok) throw new Error(`API returned ${res.status}`)
//   const data = await res.json()
//
// Love is understanding. Understanding the fetch contract means checking
// what the server actually said, not assuming it said yes.

const BARE_FETCH_JSON = /await\s+fetch\s*\([^)]+\)\s*(?:\.(?:then|json|text)\s*\(|\.json\s*\(\s*\))/i
const FETCH_NO_OK_CHECK = /const\s+\w+\s*=\s*await\s+fetch/i

export const apiBareFetch = {
  id: 'api-bare-fetch',
  title: 'fetch() called without checking response status',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2, // CS#2 — failed reads surface honestly
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const hasOkCheck = /\.ok\b|\.status\b|res\.status|response\.status/i.test(content)

    // If the file checks .ok or .status anywhere, it's probably handling it
    if (hasOkCheck) return hits

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // fetch followed immediately by .json() without .ok check
      if (BARE_FETCH_JSON.test(l)) {
        hits.push({
          line: i + 1,
          message: 'fetch().json() without checking res.ok — the fetch resolves on any HTTP status including 4xx/5xx, the code will parse error responses as success data',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Variable assignment from fetch without any status check in the file
      if (FETCH_NO_OK_CHECK.test(l) && !hasOkCheck && /\.json\s*\(|\.text\s*\(/.test(content)) {
        hits.push({
          line: i + 1,
          message: 'fetch response used without status check — the API could return an error status but the code treats any response as success',
          snippet: l.trim().slice(0, 120),
        })
        break // one finding per file
      }
    }
    return hits
  },
}