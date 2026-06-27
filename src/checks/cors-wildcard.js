// cors-wildcard — substrate honesty (access control)
// CORS Access-Control-Allow-Origin: * tells the browser "any website can
// read responses from this endpoint." Combined with credentials: 'include',
// it's a lie about access control — the API claims to be protected by
// authentication but any origin can make authenticated cross-site requests.
// This is the WiFi equivalent of leaving the door open and saying "it's locked."

const CORS_WILDCARD = /Access-Control-Allow-Origin['"\s:]*\s*['"]\*['"]/
const CORS_CREDENTIALS_WILDCARD = /credentials['"\s:]*\s*['"]include['"]/

export const corsWildcard = {
  id: 'cors-wildcard',
  title: 'CORS wildcard origin — any website can access this endpoint',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const hasWildcard = CORS_WILDCARD.test(content)
    const hasCredentials = CORS_CREDENTIALS_WILDCARD.test(content)

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (CORS_WILDCARD.test(l)) {
        const msg = hasCredentials
          ? 'CORS set to wildcard * with credentials:include — any website can make authenticated cross-site requests, access control is a lie'
          : 'CORS Access-Control-Allow-Origin:* — any website can read responses from this endpoint'
        hits.push({
          line: i + 1,
          message: msg,
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}