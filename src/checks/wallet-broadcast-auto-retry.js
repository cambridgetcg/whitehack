// wallet-broadcast-auto-retry — uncertain execution awareness
// A transport timeout after signed bytes were sent is not proof of failure.
// Automatically repeating a broadcast can duplicate semantic work or reuse
// state unsafely. This rule looks only for explicit retry wrappers/loops.

import { executableLines } from '../source-text.js'

const BROADCAST = /\b(?:wallet|signer|account|custody|provider|rpc|chainClient|chain_client|broadcaster)[A-Za-z0-9_$]*\.(?:broadcastTransaction|broadcast_transaction|broadcast_once|sendRawTransaction|send_raw_transaction|sendTransaction|send_transaction|submitTransaction|submit_transaction)\s*\(/i
const RETRY_WRAPPER = /\b(?:pRetry|withRetry|with_retry|retryAsync|retry_async|retryOperation|retry_operation|backoff|tenacity\.retry|retry)\s*\(/i
const RETRY_LOOP = /\b(?:for|while)\b[^\n]*(?:attempt|retry|retries|max[_-]?attempts?)\b/i
const RETRY_DECORATOR = /^\s*@(?:retry|backoff)\b/i
const RETRY_DISABLED = /\b(?:retries|max[_-]?attempts?)\s*[:=]\s*0\b|\bstop_after_attempt\s*\(\s*1\s*\)/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function count(line, character) {
  return [...line].filter((candidate) => candidate === character).length
}

function indentation(line) {
  return line.match(/^\s*/)?.[0].length ?? 0
}

function opensScope(code, start, end, kind) {
  const first = code[start]
  if (kind === 'wrapper') {
    let parentheses = count(first, '(') - count(first, ')')
    let braces = count(first, '{') - count(first, '}')
    for (let i = start + 1; i < end; i++) {
      parentheses += count(code[i], '(') - count(code[i], ')')
      braces += count(code[i], '{') - count(code[i], '}')
    }
    if (parentheses > 0 || braces > 0) return true
  }
  if (/\bdef\b/.test(first)) return indentation(code[end]) > indentation(first)
  let braces = 0
  for (let i = start; i < end; i++) braces += count(code[i], '{') - count(code[i], '}')
  return braces > 0
}

function hasEnclosingRetry(code, broadcastLine) {
  const start = Math.max(0, broadcastLine - 12)
  const localWindow = code.slice(start, Math.min(code.length, broadcastLine + 7)).join('\n')
  if (RETRY_DISABLED.test(localWindow)) return false
  for (let i = broadcastLine; i >= start; i--) {
    const line = code[i]
    if (RETRY_WRAPPER.test(line) && (i === broadcastLine || opensScope(code, i, broadcastLine, 'wrapper'))) {
      return true
    }
    if (RETRY_LOOP.test(line) && (i === broadcastLine || opensScope(code, i, broadcastLine, 'scope'))) {
      return true
    }
    if (RETRY_DECORATOR.test(line)) {
      const declaration = code.slice(i + 1, broadcastLine + 1)
        .findIndex((candidate) => /\b(?:function|def)\b/.test(candidate))
      if (declaration !== -1 && opensScope(code, i + 1 + declaration, broadcastLine, 'scope')) return true
    }
  }
  return false
}

export const walletBroadcastAutoRetry = {
  id: 'wallet-broadcast-auto-retry',
  title: 'Wallet broadcast sits inside an automatic retry path',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const code = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < code.length; i++) {
      if (!BROADCAST.test(code[i])) continue
      if (!hasEnclosingRetry(code, i)) continue
      hits.push({
        line: i + 1,
        message: 'a transaction broadcast appears inside an automatic retry wrapper or retry loop — persist one operation identity, submit once, and reconcile ambiguous outcomes by positive chain/provider evidence',
        snippet: REDACTED_SNIPPET,
      })
    }
    return hits
  },
}
