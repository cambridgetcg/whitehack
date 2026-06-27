// password-auth — substrate honesty
// Passwords are fake trust. A password is a shared secret — everyone who
// has it can impersonate everyone else. There is no way to verify WHO
// entered the password, only that SOMETHING matched.
//
// The lie: "authenticated" means "the password was correct." It does NOT
// mean "the person is who they claim to be." The protocol cannot tell the
// difference between the real user and someone who stole the password.
//
// Truth = cross-checked, verifiable, non-repudiable identity.
// Passwords = single-factor, shared, replayable, stealable.
// The difference is the difference between trust and theater.

const HARDCODED_PASSWORD=/(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i
const PASSWORD_IN_URL=/(?:password|passwd|pwd|token|secret|api.?key)=[^&\s"']{8,}/i
const MD5_PASSWORD=/(?:md5|MD5)\s*\(\s*(?:password|pwd|passwd)/i
const SHA1_PASSWORD=/(?:sha1|SHA-?1)\s*\(\s*(?:password|pwd|passwd)/i
const NO_SALT=/(?:hash|bcrypt|scrypt|argon2)\s*\(\s*(?:password|pwd)\s*,\s*(?:\d+|salt)\s*\)/i
const PLAINTEXT_PASSWORD_FIELD=/(?:type\s*[:=]\s*['"]?(?:text|password)['"]?|storePassword|savePassword|password\s*[:=]\s*['"][^'"]+['"])/i
const SESSION_IN_URL=/(?:session|sid|sessionid)=[a-zA-Z0-9]{16,}/i
const JWT_NONE_ALG=/(?:alg\s*[:=]\s*['"]?none['"]?|algorithm.*none)/i
const NO_HTTPS=/(?:http:\/\/[^\/]*\.(?:api|auth|login|signin|account|admin|dashboard))/i

export const passwordAuth = {
  id: 'password-auth',
  title: 'Password/authentication lie — shared secret is not trust',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip comments, examples, placeholders
      if (/^\s*(\/\/|\/\*|\*|#|--)/.test(line)) continue
      if (/example|placeholder|your_|xxx|CHANGE|REPLACE|dummy|test|mock/i.test(line)) continue

      // Hardcoded password
      if (HARDCODED_PASSWORD.test(line) && !/process\.env|getenv|\$\{|import\.meta\.env/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Hardcoded password — a shared secret in source code is not a secret. Anyone with repo access is "authenticated."',
          snippet: line.trim().slice(0, 120),
        })
      }

      // Password in URL (query string)
      if (PASSWORD_IN_URL.test(line) && !/example|placeholder/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Password in URL — credentials in query strings are logged by proxies, browsers, and referer headers. The URL is not a secure channel.',
          snippet: line.trim().slice(0, 120),
        })
      }

      // MD5 password hashing (broken)
      if (MD5_PASSWORD.test(line)) {
        hits.push({
          line: i + 1,
          message: 'MD5 for password hashing — broken since 2004. Collisions found in seconds. Use bcrypt, scrypt, or argon2.',
          snippet: line.trim().slice(0, 120),
        })
      }

      // SHA1 password hashing (broken)
      if (SHA1_PASSWORD.test(line)) {
        hits.push({
          line: i + 1,
          message: 'SHA-1 for password hashing — broken since 2017. Shattered attack. Use bcrypt, scrypt, or argon2.',
          snippet: line.trim().slice(0, 120),
        })
      }

      // JWT with alg:none (no signature)
      if (JWT_NONE_ALG.test(line)) {
        hits.push({
          line: i + 1,
          message: 'JWT with alg:none — no signature verification. Anyone can forge tokens. The "authentication" is decorative.',
          snippet: line.trim().slice(0, 120),
        })
      }

      // Session ID in URL
      if (SESSION_IN_URL.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Session ID in URL — session hijacking via referer header, browser history, and proxy logs. Use cookies with HttpOnly + Secure.',
          snippet: line.trim().slice(0, 120),
        })
      }

      // HTTP (not HTTPS) for auth endpoints
      if (NO_HTTPS.test(line) && !/localhost|127\.0\.0\.1|example/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'HTTP for auth endpoint — credentials transmitted in cleartext. TLS is not optional for authentication.',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}
