// wallet-capability-unbounded — inspectable authority awareness
// Explicit wildcard or no-expiry policy values can grant more authority than
// the surrounding UX implies. Text matching cannot establish the whole policy,
// so every result from this rule is advisory.

import { executableLines } from '../source-text.js'

const WALLET_CONTEXT = /\b(?:wallet[_-]?(?:capability|policy|permissions?)|session[_-]?key)\b/i
const GENERIC_CONTEXT = /\b(?:capability|delegation|permissions?)\b/i
const WALLET_AUTHORITY = /\b(?:(?:max[_-]?)?(?:spend|fee|value)|sign(?:[_-]?(?:transaction|message|typed[_-]?data))?|send[_-]?transaction|broadcast(?:[_-]?transaction)?|transfer|approve|swap|call|execute|transaction)\b/i
const GENERIC_WALLET_AUTHORITY = /\b(?:sign(?:[_-]?(?:transaction|message|typed[_-]?data))?|send[_-]?transaction|broadcast(?:[_-]?transaction)?|transfer|approve|swap)\b/i
const WILDCARD = /\b((?:allowed[_-]?)?(?:targets?|accounts?|methods?|actions?|contracts?))\s*:\s*(?:\[\s*)?['"]\*['"]/i
const NO_EXPIRY = /\b(?:expires?[_-]?(?:at|in)?|expiry|deadline|valid[_-]?until|max[_-]?lifetime)\s*:\s*(?:null|undefined|Infinity)\b/i
const NO_LIMIT = /\b(?:max[_-]?(?:spend|total|amount|value|intents?|calls?)|spend[_-]?limit|fee[_-]?limit)\s*:\s*(?:null|undefined|Infinity|-1)\b/i
const ALL_FLAG = /\b(?:allow[_-]?all|any[_-]?(?:target|account|method|action|contract)|unlimited)\s*:\s*true\b/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

function wildcardIsCode(executable, structural) {
  const match = executable.match(WILDCARD)
  return match !== null
    && structural.slice(match.index, match.index + match[1].length).toLowerCase() === match[1].toLowerCase()
}

export const walletCapabilityUnbounded = {
  id: 'wallet-capability-unbounded',
  title: 'Wallet capability explicitly appears unbounded',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 3,
  langs: ['js', 'py', 'json', 'yaml'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const executable = executableLines(lines, { language: lang })
    const structural = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < lines.length; i++) {
      const unbounded = wildcardIsCode(executable[i], structural[i])
        || NO_EXPIRY.test(structural[i])
        || NO_LIMIT.test(structural[i])
        || ALL_FLAG.test(structural[i])
      if (!unbounded) continue
      const nearby = structural
        .slice(Math.max(0, i - 12), Math.min(structural.length, i + 13))
        .join('\n')
      const nearbyExecutable = executable
        .slice(Math.max(0, i - 12), Math.min(executable.length, i + 13))
        .join('\n')
      const walletContext = WALLET_CONTEXT.test(nearby)
      const genericWalletContext = GENERIC_CONTEXT.test(nearby)
        && GENERIC_WALLET_AUTHORITY.test(nearbyExecutable)
      if (!(walletContext || genericWalletContext) || !WALLET_AUTHORITY.test(nearbyExecutable)) continue
      hits.push({
        line: i + 1,
        message: 'a wallet capability/policy contains an explicit wildcard, no-expiry value, no-limit value, or allow-all flag — bind exact accounts, targets, methods, amounts, fees, count, and a short expiry',
        snippet: REDACTED_SNIPPET,
      })
    }
    return hits
  },
}
