// api-error-without-shape — substrate honesty (API error protocol)
// An error response with just a string ("Not found") or just a status code
// is a lie about what went wrong. The client knows something failed but
// not why, not what to do about it, and not how to report it.
//
// The honest error shape (RFC 7807, Problem Details for HTTP APIs, 2016):
//   { "type": "https://example.com/errors/insufficient-funds",
//     "title": "Insufficient funds",
//     "status": 400,
//     "detail": "Your balance is 30.00 but the transfer requires 50.00.",
//     "instance": "/transactions/12345" }
//
// At minimum, an error response should include:
//   - error: a human-readable message (what went wrong)
//   - code: a machine-readable code (for client logic)
//   - detail: additional context (what to do about it)
//
// An API that returns { error: "fail" } or just "Error" as a string
// is telling the client "something went wrong" without saying what or why.

const MINIMAL_ERROR = /return\s+(?:new\s+)?Response\s*\(\s*(?:JSON\.stringify\s*\(\s*)?['"`](?:error|fail|invalid|not.?found|error|something.?went.?wrong)['"`]/i
const ERROR_NO_CODE = /error\s*:\s*['"`][^'"`]{1,30}['"`]\s*[)}]/i
const PLAINTEXT_ERROR = /return\s+(?:new\s+)?Response\s*\(\s*['"`].*(?:error|fail|invalid|not.?found).*['"`]\s*,/i

export const apiErrorWithoutShape = {
  id: 'api-error-without-shape',
  title: 'API error response missing structured error shape',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 3, // CS#3 — inspectable decisions
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Plaintext error response
      if (PLAINTEXT_ERROR.test(l)) {
        hits.push({
          line: i + 1,
          message: 'API returns plaintext error string — client can\'t parse error programmatically, include a structured error object with type, title, detail (RFC 7807)',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Minimal error with no code or detail
      if (MINIMAL_ERROR.test(l)) {
        hits.push({
          line: i + 1,
          message: 'API returns minimal error — just "error" or "fail" without code, detail, or type. The client knows something went wrong but not what or why',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Error with short message but no code field
      if (ERROR_NO_CODE.test(l) && !/code\s*:|type\s*:|detail\s*:|instance\s*:/i.test(l)) {
        hits.push({
          line: i + 1,
          message: 'API error has message but no machine-readable code — clients can\'t handle errors programmatically without a code field, add { error, code, detail }',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}