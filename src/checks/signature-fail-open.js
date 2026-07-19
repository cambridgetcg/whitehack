// signature-fail-open — substrate honesty (cryptographic verification)
// A failed signature check must reject. This regex rule stays on one executable
// line: it catches direct true-coercion, an invalid branch returning true on the
// same line, or an explicit option that disables verification. Multiline
// control-flow claims wait for a parser.

import { executableLines } from '../source-text.js'

const DIRECT_VERIFY = /\b(?:verify[_-]?(?:signature|detached|message|typed[_-]?data|token|webhook)|ed25519\.verify|secp256k1\.verify|crypto\.verify|jwt\.verify|timingSafeEqual)\s*\(/i
const GENERIC_VERIFY = /(?:\.|\b)verify\s*\(/i
const CRYPTO_CONTEXT = /\b(?:signature|signed|ed25519|secp256k1|ecdsa|hmac|jwt|public[_-]?key|webhook)\b/i
const OR_TRUE = /(?:\|\||\?\?)\s*true\b|\bor\s+True\b/
const RETURN_TRUE = /\breturn\s+(?:true|True)\b/
const NEGATED_IF = /\bif\s*(?:\(\s*!|not\s+)/
const PROMISE_CATCH_TRUE = /\.catch\s*\([^\n]*=>\s*true\b/
const DISABLED = /\b(?:verify[_-]?signature|verifySignatures?|requireSignature)\s*[:=]\s*(?:false|False)\b|\b(?:ignoreSignature|skipSignatureVerification)\s*[:=]\s*(?:true|True)\b/i
const QUOTED_DISABLED = /['"](?:verify[_-]?signature|verifySignatures?|requireSignature)['"]\s*:\s*(false|False)\b|['"](?:ignoreSignature|skipSignatureVerification)['"]\s*:\s*(true|True)\b/ig
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function typeDeclarationLines(lines) {
  const result = new Set()
  let declaration = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const start = line.match(/^([ \t]*)(?:export\s+)?(interface|type)\s+[A-Za-z_$][\w$]*(?:\s*=)?/)
    if (!declaration && start) {
      declaration = { kind: start[2], indent: start[1].length, depth: 0, sawBrace: false, start: i }
    }

    if (declaration) {
      const trimmed = line.trim()
      const indent = line.match(/^[ \t]*/)[0].length
      const continuation = !trimmed
        || indent > declaration.indent
        || new Set(['|', '&', '{', '}', '[', ']', '(', ')', ',', '?']).has(trimmed[0])

      // A semicolon-free type alias ends when a new top-level statement
      // starts. Reprocess that line as executable code instead of hiding it.
      if (declaration.kind === 'type' && i > declaration.start && declaration.depth === 0 && !continuation && !start) {
        declaration = null
        i--
        continue
      }

      result.add(i)
      const opens = (line.match(/\{/g) || []).length
      const closes = (line.match(/\}/g) || []).length
      if (opens > 0) declaration.sawBrace = true
      declaration.depth = Math.max(0, declaration.depth + opens - closes)

      if (
        (declaration.kind === 'interface' && declaration.sawBrace && declaration.depth === 0)
        || (declaration.kind === 'type' && declaration.depth === 0 && /;\s*$/.test(line) && !/^\s*[|&]/.test(line))
      ) {
        declaration = null
      }
    }
  }
  return result
}

function hasQuotedDisabledOption(executable, structural) {
  for (const match of executable.matchAll(QUOTED_DISABLED)) {
    const value = match[1] || match[2]
    const offset = match[0].lastIndexOf(value)
    const start = match.index + offset
    // In a real object/dict the boolean remains executable. If the whole
    // example is itself quoted, the structural line masks this position.
    if (structural.slice(start, start + value.length).toLowerCase() === value.toLowerCase()) return true
  }
  return false
}

export const signatureFailOpen = {
  id: 'signature-fail-open',
  title: 'Signature verification can fail open',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const executableCode = executableLines(lines, { language: lang })
    const structuralCode = executableLines(lines, { maskStrings: true, language: lang })
    const typeOnly = typeDeclarationLines(structuralCode)
    for (let i = 0; i < lines.length; i++) {
      const executable = executableCode[i]
      const line = structuralCode[i]
      if (!line.trim() || typeOnly.has(i)) continue

      if (DISABLED.test(line) || hasQuotedDisabledOption(executable, line)) {
        hits.push({
          line: i + 1,
          message: 'signature verification is explicitly disabled — unverified input can be accepted as authentic',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      const verifyOnLine = DIRECT_VERIFY.test(line)
        || (GENERIC_VERIFY.test(line) && CRYPTO_CONTEXT.test(line))
      if ((verifyOnLine && OR_TRUE.test(line)) || (verifyOnLine && PROMISE_CATCH_TRUE.test(line))) {
        hits.push({
          line: i + 1,
          message: 'signature verification is coerced to true on a failure path — invalid or unverifiable input can be accepted',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      if (NEGATED_IF.test(line) && verifyOnLine && RETURN_TRUE.test(line)) {
        hits.push({
          line: i + 1,
          message: 'the invalid-signature branch returns true on the same line — failed verification becomes acceptance',
          snippet: REDACTED_SNIPPET,
        })
      }
    }
    return hits
  },
}
