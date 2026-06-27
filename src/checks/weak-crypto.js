// weak-crypto — substrate honesty (cryptographic security)
// Using weak or broken cryptographic algorithms is a lie about protection.
// MD5, SHA1, DES, RC4 — the code says "this is encrypted/hashed" but
// the algorithm is broken. A hash that can be collision-attacked, a cipher
// that can be brute-forced in minutes, a random number generator that
// produces predictable output. The security claim is false.

const MD5 = /\bmd5\b/i
const SHA1 = /\bsha1\b|\bsha-1\b/i
const DES = /\bdes\b|\b3des\b/i
const RC4 = /\brc4\b/i
const MATH_RANDOM_FOR_SECURITY = /Math\.random\(\)/

// Context: only flag when used in a security context (hashing, crypto, token, password, key)
const SECURITY_CONTEXT = /\b(hash|crypt|sign|token|password|secret|key|auth|session|verify|random|salt|hmac)\b/i

export const weakCrypto = {
  id: 'weak-crypto',
  title: 'Weak or broken cryptography used for security',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // MD5 used in security context
      if (MD5.test(l) && SECURITY_CONTEXT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'MD5 used in a security context — collision-vulnerable, not suitable for hashing or signing',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // SHA1 used in security context
      if (SHA1.test(l) && SECURITY_CONTEXT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'SHA-1 used in a security context — broken for collision resistance, use SHA-256+',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // DES/3DES
      if (DES.test(l) && SECURITY_CONTEXT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'DES/3DES encryption used — deprecated, use AES-256',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // RC4
      if (RC4.test(l)) {
        hits.push({
          line: i + 1,
          message: 'RC4 cipher used — completely broken, never use for any purpose',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Math.random() used in security context
      if (MATH_RANDOM_FOR_SECURITY.test(l) && SECURITY_CONTEXT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Math.random() used for security — not cryptographically secure, use crypto.randomBytes() or crypto.getRandomValues()',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}