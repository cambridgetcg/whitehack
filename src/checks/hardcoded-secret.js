// hardcoded-secret — substrate honesty
// Finds literal credentials, 32-byte private keys, recovery-phrase shapes, and
// PEM blocks. It never parses or validates them as keys and never returns the
// matched material in a finding.

import { executableLines } from '../source-text.js'
import { SENSITIVE_SNIPPET, isPemContainerIdentifier, isPrivateKeyIdentifier, isRecoveryIdentifier, isSensitiveIdentifier, looksPlaceholder } from '../secret-text.js'

const TYPE_ANNOTATION = String.raw`(?:\s*:\s*[A-Za-z_$][A-Za-z0-9_$<>,.\[\]\s|&?]*)?`
const SECRET_ASSIGN = new RegExp(
  String.raw`\b([A-Za-z_$][\w$-]*)['"]?${TYPE_ANNOTATION}\s*([:=])\s*(`
    + String.raw`\x60|'''|"""|'|")([^\n]{6,}?)\3`,
  'i',
)
const MULTILINE_ASSIGN = new RegExp(
  String.raw`\b([A-Za-z_$][\w$-]*)${TYPE_ANNOTATION}\s*([:=])\s*(\x60|'''|""")`,
  'i',
)
const BCRYPT_HASH = /\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}/
const HASH_SYNC = /\b(hashSync)\s*\(\s*(['"])([^'"]{3,})\2/
const PRIVATE_KEY_HEX = /^(?:0x)?[a-f0-9]{64}$/i
const RECOVERY_PHRASE = /^(?:[a-z]+[ \t]+){11,23}[a-z]+$/i
const PRIVATE_KEY_PEM = /^\s*-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\s*$/
const PRIVATE_KEY_PEM_END = /^\s*-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\s*$/
const ENCRYPTED_PRIVATE_KEY_PEM = /^\s*-----BEGIN ENCRYPTED PRIVATE KEY-----\s*$/
const ENCRYPTED_PRIVATE_KEY_PEM_END = /^\s*-----END ENCRYPTED PRIVATE KEY-----\s*$/

function finding(line, message, confidence) {
  return {
    line,
    message,
    snippet: SENSITIVE_SNIPPET,
    ...(confidence ? { confidence } : {}),
  }
}

function executableAssignments(pattern, line, structural) {
  const matcher = new RegExp(pattern.source, `${pattern.flags}g`)
  const matches = []
  for (const match of line.matchAll(matcher)) {
    const separatorOffset = match[0].indexOf(match[2], match[1].length)
    if (separatorOffset !== -1 && structural[match.index + separatorOffset] === match[2]) {
      matches.push(match)
    }
  }
  return matches
}

function executableCalls(pattern, line, structural) {
  const matcher = new RegExp(pattern.source, `${pattern.flags}g`)
  const matches = []
  for (const match of line.matchAll(matcher)) {
    if (structural.slice(match.index, match.index + match[1].length) === match[1]) matches.push(match)
  }
  return matches
}

function hasPemEnd(structuralLines, begin, pattern) {
  return structuralLines.slice(begin + 1).some((line) => pattern.test(line))
}

function assignedMultilineFinding(lines, structuralLines, begin) {
  const assignment = executableAssignments(MULTILINE_ASSIGN, lines[begin], structuralLines[begin])
    .find((match) => (
      (isSensitiveIdentifier(match[1]) || isPemContainerIdentifier(match[1]))
      && !/(?:example|sample|docs?|documentation)/i.test(match[1])
    ))
  if (!assignment) return null

  const delimiter = assignment[3]
  const opening = lines[begin].indexOf(delimiter, assignment.index)
  const tail = lines[begin].slice(opening + delimiter.length)
  const inlineClosing = tail.indexOf(delimiter)
  const block = [{
    text: inlineClosing === -1 ? tail : tail.slice(0, inlineClosing),
    index: begin,
  }]
  let closed = inlineClosing !== -1
  for (let i = begin + 1; !closed && i < lines.length; i++) {
    const closing = lines[i].indexOf(delimiter)
    block.push({ text: closing === -1 ? lines[i] : lines[i].slice(0, closing), index: i })
    closed = closing !== -1
  }
  if (!closed) return null

  const privateBegin = block.findIndex(({ text }) => PRIVATE_KEY_PEM.test(text))
  const encryptedBegin = block.findIndex(({ text }) => ENCRYPTED_PRIVATE_KEY_PEM.test(text))
  if (
    privateBegin !== -1
    && block.slice(privateBegin + 1).some(({ text }) => PRIVATE_KEY_PEM_END.test(text))
  ) {
    return finding(
      block[privateBegin].index + 1,
      'a private-key PEM block is embedded in source — move the key to a scoped secret store and rotate any exposed material',
    )
  }
  if (
    encryptedBegin !== -1
    && block.slice(encryptedBegin + 1).some(({ text }) => ENCRYPTED_PRIVATE_KEY_PEM_END.test(text))
  ) {
    return finding(
      block[encryptedBegin].index + 1,
      'an encrypted private-key PEM block is embedded in source — confirm its passphrase, distribution, and rotation boundary',
      'heuristic',
    )
  }

  const literal = block.map(({ text }) => text.trim()).filter(Boolean).join(' ').trim()
  if (!literal || looksPlaceholder(literal) || /\$\{/.test(literal)) return null
  const firstContent = block.find(({ text }) => text.trim())?.index ?? begin
  if (isPrivateKeyIdentifier(assignment[1]) && PRIVATE_KEY_HEX.test(literal)) {
    return finding(
      firstContent + 1,
      'a signing/private key is assigned a 32-byte literal — repository readers can impersonate its holder; move and rotate it',
    )
  }
  if (isRecoveryIdentifier(assignment[1]) && RECOVERY_PHRASE.test(literal)) {
    return finding(
      firstContent + 1,
      'a mnemonic-shaped or recovery-phrase-shaped literal is assigned inline — verify BIP-39 validity locally and move real material to a scoped secret store',
      'heuristic',
    )
  }
  if (isSensitiveIdentifier(assignment[1]) && literal.length >= 6) {
    return finding(
      firstContent + 1,
      'a credential is assigned to a multiline literal — anyone with repository access can read it',
    )
  }
  return null
}

export const hardcodedSecret = {
  id: 'hardcoded-secret',
  title: 'Hardcoded secret in source — credential readable from the repo',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: [],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const structuralLines = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const structural = structuralLines[i]
      if (!structural.trim()) continue

      const multiline = assignedMultilineFinding(lines, structuralLines, i)
      if (multiline) {
        hits.push(multiline)
        continue
      }
      if (PRIVATE_KEY_PEM.test(structural) && hasPemEnd(structuralLines, i, PRIVATE_KEY_PEM_END)) {
        hits.push(finding(
          i + 1,
          'a private-key PEM block is embedded in source — move the key to a scoped secret store and rotate any exposed material',
        ))
        continue
      }
      if (ENCRYPTED_PRIVATE_KEY_PEM.test(structural) && hasPemEnd(structuralLines, i, ENCRYPTED_PRIVATE_KEY_PEM_END)) {
        hits.push(finding(
          i + 1,
          'an encrypted private-key PEM block is embedded in source — confirm its passphrase, distribution, and rotation boundary',
          'heuristic',
        ))
        continue
      }

      const assignments = executableAssignments(SECRET_ASSIGN, line, structural)
        .filter((match) => isSensitiveIdentifier(match[1]))
      const privateKey = assignments.find((match) => (
        isPrivateKeyIdentifier(match[1])
        && PRIVATE_KEY_HEX.test(match[4])
        && !looksPlaceholder(match[4])
      ))
      if (privateKey) {
        hits.push(finding(
          i + 1,
          'a signing/private key is assigned a 32-byte literal — repository readers can impersonate its holder; move and rotate it',
        ))
        continue
      }
      const recoveryPhrase = assignments.find((match) => (
        isRecoveryIdentifier(match[1])
        && RECOVERY_PHRASE.test(match[4])
        && !looksPlaceholder(match[4])
      ))
      if (recoveryPhrase) {
        hits.push(finding(
          i + 1,
          'a mnemonic-shaped or recovery-phrase-shaped literal is assigned inline — verify BIP-39 validity locally and move real material to a scoped secret store',
          'heuristic',
        ))
        continue
      }
      const assigned = assignments.find((match) => (
        !looksPlaceholder(match[4])
        && !BCRYPT_HASH.test(match[4])
        && !/\$\{/.test(match[4])
      ))
      if (assigned) {
        hits.push(finding(
          i + 1,
          'a credential is assigned to a literal string — anyone with repository access can read it',
        ))
      }

      const hashed = executableCalls(HASH_SYNC, line, structural)
        .find((match) => !looksPlaceholder(match[3]))
      if (hashed) {
        hits.push(finding(
          i + 1,
          'a plaintext password is hashed inline — the plaintext remains in source, so the hash does not protect it',
        ))
      }
    }
    return hits
  },
}
