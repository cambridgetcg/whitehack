// cookie-insecure — substrate honesty (session security)
// A cookie without Secure, HttpOnly, or SameSite flags is a lie about
// session protection. The cookie claims to authenticate the user but:
//   - Without Secure: transmitted over HTTP (interceptable on WiFi)
//   - Without HttpOnly: accessible via JavaScript (XSS can steal it)
//   - Without SameSite: vulnerable to CSRF
// The code says "you're logged in securely" while the session token
// can be stolen through three independent vectors.

import { SENSITIVE_SNIPPET } from '../redaction.js'

const SET_COOKIE = /Set-Cookie|res\.cookie|cookies\(\)\.set/i
const SECURE_FLAG = /\bSecure\b/i
const HTTPONLY_FLAG = /\bHttpOnly\b/i
const SAMESITE_FLAG = /\bSameSite\s*=\s*(Strict|Lax|None)\b/i

export const cookieInsecure = {
  id: 'cookie-insecure',
  title: 'Session cookie missing security flags',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  redactSnippet: true,
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!SET_COOKIE.test(l)) continue

      // Check the surrounding 5 lines for the flags (cookies often span multiple lines)
      const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n')

      const issues = []
      if (!SECURE_FLAG.test(context)) issues.push('no Secure flag (transmitted over HTTP)')
      if (!HTTPONLY_FLAG.test(context)) issues.push('no HttpOnly flag (XSS-accessible)')
      if (!SAMESITE_FLAG.test(context)) issues.push('no SameSite flag (CSRF-vulnerable)')

      if (issues.length > 0) {
        hits.push({
          line: i + 1,
          message: `session cookie set with ${issues.join(', ')}`,
          snippet: SENSITIVE_SNIPPET,
        })
      }
    }
    return hits
  },
}
