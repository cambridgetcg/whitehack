// bluetooth-protocol — substrate honesty
// Bluetooth is a tower of legacy compromises. Classic BT uses E0 stream
// cipher (vulnerable to correlation attacks). BLE uses AES-CCM but the
// pairing methods determine MITM resistance. "Just Works" pairing has
// NO MITM protection — any attacker between the devices during pairing
// becomes a relay. BTMousejack (2016) showed that unencrypted HID links
// allow keystroke injection from 100m+.
//
// The lie: "paired" does not mean "secure." It means "the devices agreed
// to talk." Whether anyone was eavesdropping during that agreement is
// a question the protocol doesn't answer.

import { SENSITIVE_SNIPPET } from '../redaction.js'

const JUST_WORKS=/(?:just.?works|no.?mitm|pairing.?method\s*[:=]\s*['"]?just)/i
const LEGACY_PAIRING=/(?:legacy.?pairing|pin.?code|e0\s+stream|stream.?cipher)\s*[:=]/i
const BT_HID_UNENCRYPTED=/(?:hid|keyboard|mouse)\s*[:=].*(?:unencrypted|none|off|disabled)/i
const BT_CLASSIC_E0=/(?:e0\s*(?:stream|cipher|classic)|classic.*e0|e0.*encrypt|encrypt.*e0|br.?edr.*e0)/i
const SECURE_CONN_DISABLED=/(?:secure.?connections)\s*[:=]\s*(?:false|disabled|0|off)/i

export const bluetoothProtocol = {
  id: 'bluetooth-protocol',
  title: 'Bluetooth protocol lie — pairing is not security',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: [],
  redactSnippet: true,
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (JUST_WORKS.test(line)) {
        if (/example|placeholder|comment/i.test(line) && /\/\//.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'Just Works pairing — no MITM protection. Any attacker between devices during pairing becomes a relay. "Paired" does not mean "secure."',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (LEGACY_PAIRING.test(line) && !/secure|aes|ccm/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Legacy Bluetooth pairing with E0 stream cipher — E0 is vulnerable to correlation attacks. Keystrokes over E0 can be recovered.',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (BT_HID_UNENCRYPTED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Unencrypted Bluetooth HID — BTMousejack (2016) allows keystroke injection from 100m+. The keyboard you trust is an open microphone.',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (BT_CLASSIC_E0.test(line) && !/replace|upgrade|deprecated/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth Classic E0 cipher — vulnerable to correlation attacks. Use Secure Connections (AES-CCM) instead.',
          snippet: SENSITIVE_SNIPPET,
        })
      }
      if (SECURE_CONN_DISABLED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Secure Connections disabled — Bluetooth drops from AES-CCM to E0. Downgrading security is choosing vulnerability.',
          snippet: SENSITIVE_SNIPPET,
        })
      }
    }
    return hits
  },
}
