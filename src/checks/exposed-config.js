// exposed-config — substrate honesty
// Detects literal credentials embedded in config/source and credential-bearing
// URLs used by code. Ambiguous URL shapes remain advisory-only; ordinary
// variables such as `key=cacheKeyValue` must never become a confident gate.

import { executableLines } from '../source-text.js'
import {
  SENSITIVE_SNIPPET,
  isSensitiveIdentifier,
  looksPlaceholder,
} from '../secret-text.js'

const QUOTED_ASSIGNMENT = /\b([A-Za-z_$][\w$-]*)['"]?\s*([:=])\s*(['"])([^'"\n]{6,})\3/i
const BARE_CONFIG_ASSIGNMENT = /\b([A-Za-z_$][\w$-]*)\s*([:=])\s*([A-Za-z0-9_./+=-]{8,})/i
const URL_LITERAL = /(?:https?|ftp|postgres(?:ql)?|mysql|redis):\/\/[^\s'"]*(?:secret|token|key|password)=([A-Za-z0-9_-]{8,})/i
const URL_USE_CONTEXT = /\b(?:fetch|request|axios\.(?:get|post|put|patch)|new\s+URL)\s*\(|\b[A-Za-z_$][\w$]*(?:url|uri|dsn|endpoint|connectionString)[\w$]*\s*=/i
const CONFIG_LANGS = new Set(['env', 'yaml', 'wifi-config'])
const MASKED = /\*\*\*|redacted/i
const TEST_CODE = /\b(?:expect|assert|mockReq|toBe|toBeNull|toThrow|toEqual|strictEqual)\b/
const KEYBINDING = /\bkey\s*:\s*['"](?:shift|ctrl|cmd|command|alt|option|meta|f\d)\+/i

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

function usableValue(value) {
  return !looksPlaceholder(value) && !MASKED.test(value)
}

export const exposedConfig = {
  id: 'exposed-config',
  title: 'Config file contains embedded credentials',
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
      if (!structural.trim() || TEST_CODE.test(structural) || KEYBINDING.test(line)) continue

      const quoted = executableAssignments(QUOTED_ASSIGNMENT, line, structural)
        .find((match) => isSensitiveIdentifier(match[1]) && usableValue(match[4]))
      if (quoted) {
        hits.push({
          line: i + 1,
          message: 'a config or source field contains what appears to be a literal credential',
          snippet: SENSITIVE_SNIPPET,
        })
        continue
      }

      if (CONFIG_LANGS.has(lang)) {
        const bare = executableAssignments(BARE_CONFIG_ASSIGNMENT, line, structural)
          .find((match) => isSensitiveIdentifier(match[1]) && usableValue(match[3]))
        if (bare) {
          hits.push({
            line: i + 1,
            message: 'a config field contains what appears to be a literal credential',
            snippet: SENSITIVE_SNIPPET,
          })
          continue
        }
      }

      // A credential-shaped URL can be an example or a provider-specific
      // convention. Require a visible sink/binding and keep it non-gating.
      const urlLiteral = line.match(URL_LITERAL)
      if (
        urlLiteral
        && usableValue(urlLiteral[1])
        && URL_USE_CONTEXT.test(structural)
      ) {
        hits.push({
          line: i + 1,
          confidence: 'heuristic',
          message: 'a URL used by code appears to contain a credential — move it to a scoped secret store and avoid query/user-info leakage',
          snippet: SENSITIVE_SNIPPET,
        })
      }
    }
    return hits
  },
}
