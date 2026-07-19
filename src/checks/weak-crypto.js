// weak-crypto — substrate honesty (cryptographic security)
// Using weak or broken cryptographic algorithms is a lie about protection.
// MD5, SHA1, DES, RC4 — the code says "this is encrypted/hashed" but
// the algorithm is broken. A hash that can be collision-attacked, a cipher
// that can be brute-forced in minutes, a random number generator that
// produces predictable output. The security claim is false.

import { executableLines } from '../source-text.js'

// Keep confident findings tied to an actual crypto API call or algorithm
// option. Merely discussing "MD5" in a log message or migration note is not
// evidence that the program uses it.
const MD5_USAGE = /\bcreateHash\s*\(\s*['"]md5['"]|\bhashlib\.new\s*\(\s*['"]md5['"]|\b(?:hashlib|CryptoJS)\.md5\s*\(|\bmd5\s*\([^)]*\b(?:password|secret|token|signature|payload|digest|hash)\b/i
const SHA1_USAGE = /\bcreateHash\s*\(\s*['"]sha-?1['"]|\b(?:subtle\.digest|hashlib\.new)\s*\(\s*['"]sha-?1['"]|\b(?:hashlib|CryptoJS)\.sha1\s*\(|\bsha-?1\s*\([^)]*\b(?:password|secret|token|signature|payload|digest|hash)\b/i
const LEGACY_HMAC_USAGE = /\bcreateHmac\s*\(\s*['"](md5|sha-?1)['"]/i
const DES_USAGE = /\bcreateCipher(?:iv)?\s*\(\s*['"][^'"]*(?:3des|des-ede|des-cbc|des-ecb)[^'"]*['"]|\b(?:TripleDES|DES)\.new\s*\(|\b(?:algorithms\.)?TripleDES\s*\(|\bCryptoJS\.(?:TripleDES|DES)\.(?:encrypt|decrypt)\s*\(/i
const RC4_USAGE = /\bcreateCipher(?:iv)?\s*\(\s*['"][^'"]*rc4[^'"]*['"]|\b(?:ARC4|RC4)\.new\s*\(|\b(?:algorithms\.)?ARC4\s*\(|\bCryptoJS\.RC4\.(?:encrypt|decrypt)\s*\(/i
const MATH_RANDOM_FOR_SECURITY = /Math\.random\(\)/
const PY_RANDOM_FOR_SECURITY = /\b([A-Za-z_]\w*)\.(?:random|randint|randrange|choice|choices|getrandbits|randbytes)\s*\(/
const PY_SYSTEM_RANDOM = /\b([A-Za-z_]\w*)\s*=\s*secrets\.SystemRandom\s*\(/

// Context: only flag when used in a security context (hashing, crypto, token, password, key)
// Removed 'random' from the list — it was self-referential with Math.random(), causing every
// Math.random() call to match its own security context. A jitter function using Math.random()
// is not crypto just because the word 'random' appears. The bell needs crypto-specific
// context, not the word 'random' pointing at itself (castle 0064).
const SECURITY_RANDOM_TARGET = /\b(?:token|password|secret|nonce|salt|mnemonic|iv|(?:private|signing|wallet|secret|auth|access|refresh|reset|csrf|session)[_-]?(?:key|token|nonce|secret|id)|recovery[_-]?phrase)\b/i
const SECURITY_RANDOM_SINK = /\b(?:sign|encrypt|hmac|deriveKey|generateKey|createSecretKey)\w*\s*\(/i
const SECURITY_DIGEST_CONTEXT = /\b(?:password|secret|token|signature|signed|auth|credential|session|jwt|integrity|public[_-]?key|private[_-]?key)\w*/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function hasExecutableUse(pattern, executable, structural) {
  const matcher = new RegExp(pattern.source, `${pattern.flags}g`)
  for (const match of executable.matchAll(matcher)) {
    const token = match[0].match(/^[A-Za-z][A-Za-z0-9_.]*/)?.[0]
    if (token && structural.slice(match.index, match.index + token.length).trim()) return true
  }
  return false
}

export const weakCrypto = {
  id: 'weak-crypto',
  title: 'Weak or broken cryptography used for security',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const executableCode = executableLines(lines, { language: lang })
    const structuralCode = executableLines(lines, { maskStrings: true, language: lang })
    const securePythonAliases = new Set()
    for (const line of structuralCode) {
      const alias = line.match(PY_SYSTEM_RANDOM)
      if (alias) securePythonAliases.add(alias[1])
    }
    for (let i = 0; i < lines.length; i++) {
      const executable = executableCode[i]
      const structural = structuralCode[i]
      if (!structural.trim()) continue

      if (hasExecutableUse(LEGACY_HMAC_USAGE, executable, structural)) {
        hits.push({
          line: i + 1,
          message: 'HMAC uses a legacy MD5/SHA-1 digest — collision attacks do not directly break HMAC, and protocols such as HOTP may require SHA-1; review compatibility and migration rather than treating this as proof of failure',
          snippet: REDACTED_SNIPPET,
          confidence: 'heuristic',
        })
        continue
      }

      if (
        hasExecutableUse(MD5_USAGE, executable, structural)
        && SECURITY_DIGEST_CONTEXT.test(structural)
      ) {
        hits.push({
          line: i + 1,
          message: 'MD5 used in a security context — collision-vulnerable, not suitable for hashing or signing',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      // SHA1 used in security context
      if (
        hasExecutableUse(SHA1_USAGE, executable, structural)
        && SECURITY_DIGEST_CONTEXT.test(structural)
      ) {
        hits.push({
          line: i + 1,
          message: 'SHA-1 used in a security context — broken for collision resistance, use SHA-256+',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      // DES/3DES
      if (hasExecutableUse(DES_USAGE, executable, structural)) {
        hits.push({
          line: i + 1,
          message: 'DES/3DES encryption used — deprecated, use AES-256',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      // RC4
      if (hasExecutableUse(RC4_USAGE, executable, structural)) {
        hits.push({
          line: i + 1,
          message: 'RC4 cipher used — completely broken, never use for any purpose',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      // Math.random() used in security context — skip comment-only lines
      // (annotation text mentioning 'crypto' is not crypto usage; castle 0064)
      const pythonRandom = structural.match(PY_RANDOM_FOR_SECURITY)
      if (
        (MATH_RANDOM_FOR_SECURITY.test(structural) || (pythonRandom && !securePythonAliases.has(pythonRandom[1])))
        && (SECURITY_RANDOM_TARGET.test(structural) || SECURITY_RANDOM_SINK.test(structural))
      ) {
        hits.push({
          line: i + 1,
          message: 'a general-purpose pseudo-random generator is used for security material — use the platform cryptographic RNG',
          snippet: REDACTED_SNIPPET,
          confidence: 'heuristic',
        })
      }
    }
    return hits
  },
}
