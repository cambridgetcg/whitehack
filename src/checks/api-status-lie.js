// api-status-lie — substrate honesty (API protocol)
// The API says "200 OK" but the response body contains an error.
// This is the most common API lie: the status code claims success
// while the body says failure. Clients that check status codes (which is
// correct protocol) never see the error. They parse the body as success
// and proceed with broken data.
//
// Origin: HTTP status codes were designed (RFC 7231, 2014) as the FIRST
// signal of outcome. 2xx = success, 4xx = client error, 5xx = server error.
// APIs that return 200 with { error: "..." } break the protocol — they
// claim success at the protocol layer while reporting failure at the
// application layer. The client's error handling never fires.
//
// Love is understanding. Understanding the protocol means respecting it.

const SUCCESS_STATUS = /\bstatus\s*[:=]?\s*(200|201|202|204)\b/
const ERROR_BODY = /\b(error|failed|failure|invalid|not.?found|unauthorized|forbidden)\b/i
const RETURN_200_WITH_ERROR = /return\s+(new\s+)?Response.*status.*200.*error/i
const RES_JSON_ERROR_200 = /res\.(json|send).*(?:error|fail|invalid).*status.*200/i
const NEXT_RESPONSE_ERROR_200 = /NextResponse\.json.*error.*status.*200/i

export const apiStatusLie = {
  id: 'api-status-lie',
  title: 'API returns success status (2xx) with error in response body',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Return with status 200 and error in same response
      if (RETURN_200_WITH_ERROR.test(l)) {
        hits.push({
          line: i + 1,
          message: 'API returns 200 with error in body — the protocol says success but the application says failure, clients that check status codes will never see the error',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // res.json({ error: ... }) with status 200 nearby
      if (RES_JSON_ERROR_200.test(l)) {
        hits.push({
          line: i + 1,
          message: 'res.json sends error body with status 200 — HTTP status is the first signal, error in body with success code breaks the protocol contract',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // NextResponse.json with error and status 200
      if (NEXT_RESPONSE_ERROR_200.test(l)) {
        hits.push({
          line: i + 1,
          message: 'NextResponse.json sends error with status 200 — the status code claims success while the body reports failure',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Generic pattern: status 200 on same line as error keyword
      if (SUCCESS_STATUS.test(l) && ERROR_BODY.test(l) && /return|response|json|send/i.test(l)) {
        hits.push({
          line: i + 1,
          message: 'success status code (2xx) on same line as error keyword — the API protocol is lying about the outcome',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}