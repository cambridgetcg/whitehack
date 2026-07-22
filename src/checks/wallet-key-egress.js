// wallet-key-egress — custody boundary awareness
// A wallet can be non-custodial only if signing secrets do not cross its
// output surfaces. This text rule recognises direct log/HTTP/telemetry sinks.
// It does not infer behavior from a function name or trace aliases.

import { executableLines } from '../source-text.js'

const SECRET = /\b(?:private[_-]?key|secret[_-]?key|wallet[_-]?(?:private[_-]?)?key|signing[_-]?(?:private[_-]?)?key|mnemonic|seed[_-]?(?:phrase|words)|recovery[_-]?(?:phrase|share))\b/i
const LOG_OR_TELEMETRY = /\b(?:print|console\.(?:log|info|warn|error|debug)|(?:logger|logging|log|audit)\.(?:log|info|warn|error|debug)|telemetry\.(?:record|emit|track)|span\.setAttribute|process\.stdout\.write)\s*\(/i
const HTTP_RESPONSE = /\b(?:(?:res|response|reply|c)\.(?:json|send|text|body|end)|jsonify)\s*\(/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

export const walletKeyEgress = {
  id: 'wallet-key-egress',
  title: 'Wallet signing secret crosses an output boundary',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const code = executableLines(lines, { maskStrings: true, language: lang })
    for (let i = 0; i < code.length; i++) {
      const line = code[i]
      if (!line.trim()) continue
      const sink = line.match(LOG_OR_TELEMETRY) || line.match(HTTP_RESPONSE)
      if (sink && SECRET.test(line.slice(sink.index))) {
        hits.push({
          line: i + 1,
          message: 'signing or recovery material is passed to a log, telemetry, or response sink — keep raw key material behind a non-exportable signer boundary and treat any real disclosure as compromised',
          snippet: REDACTED_SNIPPET,
          ...(HTTP_RESPONSE.test(line) ? { confidence: 'heuristic' } : {}),
        })
      }
    }
    return hits
  },
}
