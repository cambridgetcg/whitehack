// static-aead-nonce — substrate honesty (cryptographic security)
// AEAD encryption requires a nonce/IV that is unique for every encryption under
// one key. An explicitly zero/static nonce can make ciphertext claim integrity
// and confidentiality it no longer provides. Text matching cannot see key
// lifecycle or test-vector intent, so this remains a heuristic advisory.

import { executableLines } from '../source-text.js'

const ENCRYPTION = /\b(?:AESGCM|ChaCha20Poly1305|subtle\.encrypt|secretbox)\b|createCipheriv\s*\(\s*['"][^'"]*(?:gcm|poly1305|chacha)|\bAES\.new\s*\([^\n]*\bMODE_GCM\b/i
const NONCE_NAME = /\b(?:iv|nonce|counter)\b/i
const ZERO_ALLOC = /\b(?:Buffer\.alloc\s*\(\s*(?:12|16|24)\s*(?:,\s*0\s*)?\)|new\s+Uint8Array\s*\(\s*(?:12|16|24)\s*\)|bytes\s*\(\s*(?:12|16|24)\s*\)|b?['"]\\x00['"]\s*\*\s*(?:12|16|24))/
const ZERO_LITERAL = /['"](?:0x)?0{24,64}['"]/
const FIXED_BYTES = /\b(?:Buffer\.from|bytes\.fromhex)\s*\(\s*['"](?:[a-f0-9]{24}|[a-f0-9]{32}|[a-f0-9]{48})['"](?:\s*,\s*['"]hex['"])?\s*\)/i
const ZERO_ASSIGNMENT = /\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(?:Buffer\.alloc\s*\(\s*(?:12|16|24)\b|new\s+Uint8Array\s*\(\s*(?:12|16|24)\s*\)|bytes\s*\(\s*(?:12|16|24)\s*\))/
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function encryptionNear(executableCode, index) {
  const lo = Math.max(0, index - 12)
  const hi = Math.min(executableCode.length, index + 13)
  for (let i = lo; i < hi; i++) {
    if (ENCRYPTION.test(executableCode[i])) return true
  }
  return false
}

function escaped(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function securelyFilled(executableCode, structuralCode, index, line) {
  if (/\b(?:getRandomValues|randomFill(?:Sync)?)\s*\(/.test(line)) return true
  const assignment = line.match(ZERO_ASSIGNMENT)
  if (!assignment) return false
  const name = escaped(assignment[1])
  const fill = new RegExp(`\\b(?:crypto\\.)?(?:getRandomValues|randomFill(?:Sync)?)\\s*\\(\\s*${name}\\b`)
  const hi = Math.min(executableCode.length, index + 13)
  for (let i = index + 1; i < hi; i++) {
    const candidate = structuralCode[i]
    if (fill.test(candidate)) return true
    if (ENCRYPTION.test(executableCode[i])) return false
  }
  return false
}

export const staticAeadNonce = {
  id: 'static-aead-nonce',
  title: 'AEAD encryption appears to reuse a static nonce or IV',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 1,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const executableCode = executableLines(lines, { language: lang })
    const structuralCode = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < lines.length; i++) {
      const line = executableCode[i]
      if (!structuralCode[i].trim() || !encryptionNear(executableCode, i)) continue
      const isStatic = ZERO_ALLOC.test(line) || ZERO_LITERAL.test(line) || FIXED_BYTES.test(line)
      if (!isStatic || securelyFilled(executableCode, structuralCode, i, line)) continue
      const inlineCipher = ENCRYPTION.test(line)
      const namedStatic = NONCE_NAME.test(line)
      if (!inlineCipher && !namedStatic) continue
      hits.push({
        line: i + 1,
        message: 'an AEAD nonce/IV is explicitly static near encryption — reuse under one key can destroy confidentiality and authenticity; generate a unique nonce and carry it with the ciphertext',
        snippet: REDACTED_SNIPPET,
      })
    }
    return hits
  },
}
