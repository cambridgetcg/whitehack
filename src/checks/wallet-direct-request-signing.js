// wallet-direct-request-signing — authority boundary awareness
// Network request bytes must not flow straight into a signing primitive. This
// rule catches direct expressions and short local aliases when no visible
// validation, capability, policy, simulation, or approval call intervenes.

import { executableLines } from '../source-text.js'

const REQUEST_SOURCE = /\b(?:(?:req|request)\.(?:body|params|query|json|data|form|args)|(?:req|request|c\.req|ctx\.req)\.(?:json|text|arrayBuffer|get_json|param|query)\s*\()/i
const SPECIFIC_SIGN = /\b(?:wallet|signer|account|kms|keyProvider|key_provider|custody|provider|rpc|chainClient|chain_client)[A-Za-z0-9_$]*\.(?:signTransaction|sign_transaction|signMessage|sign_message|signTypedData|sign_typed_data|signAndSend|sign_and_send|sendTransaction|send_transaction)\s*\(/i
const GENERIC_SIGN = /\b(?:wallet|signer|account|kms|keyProvider|key_provider|custody)[A-Za-z0-9_$]*\.(?:sign|sign_exact)\s*\(/i
const ASSIGNMENT = /^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(.+)$/
const GUARD = /\b(?:validate|parse|safeParse|authorize|authorise|assert|checkPolicy|check_policy|capability|allowlist|simulate|simulation|verifyApproval|verify_approval|requireConsent|require_consent)[A-Za-z0-9_$]*\s*\(/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function signIndex(line) {
  const specific = line.match(SPECIFIC_SIGN)
  const generic = line.match(GENERIC_SIGN)
  if (!specific) return generic?.index ?? -1
  if (!generic) return specific.index
  return Math.min(specific.index, generic.index)
}

function escaped(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sameLexicalScope(code, sourceLine, signLine) {
  let braces = 0
  const sourceIndent = code[sourceLine].match(/^\s*/)?.[0].length ?? 0
  for (let i = sourceLine; i < signLine; i++) {
    braces += (code[i].match(/\{/g) || []).length
    braces -= (code[i].match(/\}/g) || []).length
    if (braces < 0) return false
    if (
      i > sourceLine
      && /^\s*(?:async\s+def|def)\b/.test(code[i])
      && (code[i].match(/^\s*/)?.[0].length ?? 0) <= sourceIndent
    ) return false
  }
  return true
}

export const walletDirectRequestSigning = {
  id: 'wallet-direct-request-signing',
  title: 'Request-derived bytes flow directly into wallet signing',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 3,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const code = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < code.length; i++) {
      const callAt = signIndex(code[i])
      if (callAt === -1) continue
      const call = code[i].slice(callAt)
      if (REQUEST_SOURCE.test(call)) {
        hits.push({
          line: i + 1,
          message: 'request-derived data is passed directly to a signing/send primitive — decode an exact intent, enforce a bounded capability, simulate, reserve atomically, and only then sign exact bytes',
          snippet: REDACTED_SNIPPET,
        })
        continue
      }

      const start = Math.max(0, i - 12)
      for (let sourceLine = i - 1; sourceLine >= start; sourceLine--) {
        const assignment = code[sourceLine].match(ASSIGNMENT)
        if (!assignment || !REQUEST_SOURCE.test(assignment[2])) continue
        const alias = new RegExp(`\\b${escaped(assignment[1])}\\b`)
        if (!alias.test(call)) continue
        if (!sameLexicalScope(code, sourceLine, i)) break
        const guarded = code.slice(sourceLine + 1, i).some((line) => GUARD.test(line))
        if (!guarded) {
          hits.push({
            line: i + 1,
            message: `request-derived \`${assignment[1]}\` reaches a signing/send primitive with no visible validation, capability, simulation, policy, or approval call in between`,
            snippet: REDACTED_SNIPPET,
          })
        }
        break
      }
    }
    return hits
  },
}
