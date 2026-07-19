// webhook-reencoded-body — substrate honesty (signed transport integrity)
// Many webhook schemes sign the exact HTTP body bytes. Parsing and then
// serializing the body creates different bytes, so a verifier can reject valid
// deliveries or encourage a dangerous verification bypass. Some providers do
// define canonical JSON, so the rule is heuristic rather than a gate.

import { executableLines } from '../source-text.js'

const WEBHOOK_CONTEXT = /\b(?:webhook|stripe|coinbase|svix|x-signature|webhook-signature)\b/i
const VERIFIER = /\b(?:construct[_-]?event|verify[_-]?(?:webhook|signature)|webhooks?\.verify|signature\.verify)\s*\(/i
const REENCODED_JS = /\b(?:construct[_-]?event|verify[_-]?(?:webhook|signature)|webhooks?\.verify|signature\.verify)\s*\(\s*JSON\.stringify\s*\(\s*(?:req(?:uest)?\.body|await\s+req(?:uest)?\.json\s*\(\s*\)|body|payload)\s*\)/i
const REENCODED_PY = /\b(?:construct[_-]?event|verify[_-]?(?:webhook|signature)|webhooks?\.verify|signature\.verify)\s*\(\s*json\.dumps\s*\(\s*(?:request\.(?:json|get_json\s*\(\s*\))|body|payload)\s*\)/i
const REDACTED_SNIPPET = '[redacted: crypto-awareness match]'

export const webhookReencodedBody = {
  id: 'webhook-reencoded-body',
  title: 'Webhook verifier appears to receive re-encoded JSON',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 1,
  langs: ['js', 'py'],
  redactSnippet: true,
  detect(content, lines, { lang } = {}) {
    const hits = []
    const structuralLines = executableLines(lines, { maskStrings: true, language: lang })
    const structuralContent = structuralLines.join('\n')
    if (!WEBHOOK_CONTEXT.test(structuralContent)) return hits
    for (let i = 0; i < lines.length; i++) {
      const line = structuralLines[i]
      if (!line.trim() || !VERIFIER.test(line)) continue
      const window = structuralLines.slice(i, i + 8).join(' ')
      if (!REENCODED_JS.test(window) && !REENCODED_PY.test(window)) continue
      hits.push({
        line: i + 1,
        message: 'a signed webhook body is parsed and serialized again near verification — verify the provider-defined exact raw bytes unless its protocol explicitly defines canonical JSON',
        snippet: REDACTED_SNIPPET,
      })
    }
    return hits
  },
}
