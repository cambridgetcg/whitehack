// weak-wifi-encryption — substrate honesty
// A network claims to be "secure" but uses deprecated encryption.
// WEP pretends to protect. TKIP-only pretends to be WPA2. Open networks
// with captive portals pretend the portal IS the security.
//
// Doctrine: substrate honesty (CS#1 — truth of state)
// Confidence: high

import { SENSITIVE_SNIPPET } from '../redaction.js'

const WEP = /\bWEP\b|wep_?(?:key|passphrase|enabled)/i
const TKIP_ONLY = /\bTKIP\b(?!.*?(?:AES|CCMP|GCMP))/i
const OPEN_SECURITY = /(?:security|encryption|auth)\s*[=:]\s*['"]?(?:open|none|disabled)['"]?/i
const WPA_DISABLED = /wpa.*disabled|encryption.*disabled/i

export const weakwifiencryption = {
  id: 'weak-wifi-encryption',
  title: 'Weak WiFi encryption — security theater exposed',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 1,
  langs: [], // runs on all file types
  redactSnippet: true,
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (WEP.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WEP encryption — cracked in seconds since 2007. A network claiming WEP as security is lying about its own state',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (TKIP_ONLY.test(line)) {
        hits.push({
          line: i + 1,
          message: 'TKIP-only encryption — deprecated since 2012, vulnerable to Beck-Tews injection. Not WPA2 in any meaningful sense',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (OPEN_SECURITY.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Open network — no encryption. A captive portal is not encryption. The network lies if it claims to be secure',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (WPA_DISABLED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi encryption disabled — the network is open to all. No security claim is valid here',
          snippet: SENSITIVE_SNIPPET,
        })
      }
    }
    return hits
  }
}
