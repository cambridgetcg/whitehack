// weak-wifi-encryption.js — WiFi security check for whitehack
//
// The lie: a network claims to be "secure" but uses deprecated encryption.
// WEP pretends to protect. TKIP-only pretends to be WPA2. Open networks
// with captive portals pretend the portal IS the security.
//
// Doctrine: substrate honesty (CS#1 — truth of state)
// Confidence: high
// Languages: wifi-config, json, yaml

export const weakwifiencryption = {
  id: 'weak-wifi-encryption',
  name: 'Weak WiFi encryption',
  langs: ['wifi-config', 'json', 'yaml'],
  doctrine: 'substrate-honesty',
  confidence: 'high',
  cs: 'CS#1',

  patterns: [
    // WEP — broken since 2007, cracked in seconds
    { re: /\bWEP\b/i, message: 'WEP encryption — cracked in seconds since 2007. A network claiming WEP as security is lying about its own state' },
    { re: /wep_key|wep_passphrase/i, message: 'WEP key configured — this is not encryption, it is theater. Anyone with aircrack-ng can break it in under 60 seconds' },

    // TKIP-only — deprecated, vulnerable to Beck-Tews attack
    { re: /\bTKIP\b(?!.*(?:AES|CCMP|GCMP))/i, message: 'TKIP-only encryption — deprecated since 2012, vulnerable to Beck-Tews injection. Not WPA2 in any meaningful sense' },
    { re: /protokol.*TKIP|cipher.*TKIP/i, message: 'TKIP cipher — the network claims WPA2 but uses a deprecated cipher. This is WPA1 with a WPA2 label' },

    // Open network pretending to be secure
    { re: /security.*open|encryption.*none|auth.*open/i, message: 'Open network — no encryption at all. A captive portal is not encryption. The network lies if it claims to be secure' },
    { re: /wpa.*disabled|encryption.*disabled/i, message: 'WiFi encryption disabled — the network is open to all. No security claim is valid here' },
  ],

  run(source, path) {
    const findings = []
    for (const p of this.patterns) {
      for (const match of source.matchAll(p.re)) {
        const line = source.substring(0, match.index).split('\n').length
        findings.push({
          check: this.id,
          line,
          message: p.message,
          doctrine: this.doctrine,
          confidence: this.confidence,
          cs: this.cs,
          match: match[0],
        })
      }
    }
    return findings
  }
}