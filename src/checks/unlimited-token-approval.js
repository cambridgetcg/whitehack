// unlimited-token-approval — bounded authority awareness
// A maximum ERC-20 allowance grants authority far beyond one intended
// transfer. There are legitimate designs, but the scope deserves
// an explicit review and a visible revocation/expiry story.

import { executableLines } from '../source-text.js'

const MAX = String.raw`(?:type\s*\(\s*uint(?:256)?\s*\)\.max|uint256\s*\(\s*-1\s*\)|(?:ethers\.)?(?:constants\.)?MaxUint256|MAX_UINT256|2\s*\*\*\s*256\s*-\s*1|0x[fF]{64})`
const MAX_APPROVAL = new RegExp(
  String.raw`\.(?:approve|safeApprove|forceApprove)\s*\(\s*[^,]{1,240},\s*${MAX}\s*\)`,
  'i',
)
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

export const unlimitedTokenApproval = {
  id: 'unlimited-token-approval',
  title: 'Fungible-token approval grants maximum allowance',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 3,
  langs: ['js', 'py', 'sol'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const code = executableLines(lines, { maskStrings: true, language: lang })
    let consumedThrough = -1
    for (let i = 0; i < code.length; i++) {
      if (i <= consumedThrough) continue
      const end = Math.min(code.length, i + 7)
      const window = code.slice(i, end).join('\n')
      const match = window.match(MAX_APPROVAL)
      if (!match) continue
      const prefix = window.slice(0, match.index)
      const offset = prefix.split('\n').length - 1
      const line = Math.min(i + offset, end - 1)
      hits.push({
        line: line + 1,
        message: 'this call grants a maximum fungible-token allowance — prefer an exact amount/scope and make any deliberate standing authority, expiry, and revocation path inspectable',
        snippet: REDACTED_SNIPPET,
      })
      consumedThrough = line
    }
    return hits
  },
}
