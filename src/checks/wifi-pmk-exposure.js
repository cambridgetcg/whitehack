// wifi-pmk-exposure.js — PMK/pre-shared-key exposure check for whitehack
//
// The lie: a WiFi pre-shared key (PSK/PMK) is stored or transmitted in a
// way that exposes it. The PSK is the root of WPA2-Personal trust — if it
// leaks, every session key derived from it is compromised. Code that
// logs, serializes, or transmits the PSK is lying about keeping the
// network secure.
//
// Doctrine: substrate honesty (CS#1 — truth of state)
// Confidence: high
// Languages: js, ts, py, rs, java, go, yaml, json

export const wifipmkexposure = {
  id: 'wifi-pmk-exposure',
  name: 'WiFi PSK/PMK exposed in code or config',
  langs: ['js', 'ts', 'py', 'rs', 'java', 'go', 'yaml', 'json'],
  doctrine: 'substrate-honesty',
  confidence: 'high',
  cs: 'CS#1',

  patterns: [
    // Hardcoded PSK
    { re: /(?:psk|pre_?shared_?key|passphrase|wifi_?password)\s*[=:]\s*['"`][^'"`]{8,}['"`]/gi,
      message: 'WiFi PSK hardcoded — the pre-shared key is in source. Anyone with repo access has the network key. This is the root trust of WPA2-Personal, exposed' },

    // PMK in memory dump / log
    { re: /(?:console\.log|print|logger|log)\s*\(.*?(?:pmk|pairwise_?key|psk|pre_?shared_?key)/gi,
      message: 'WiFi PMK/PSK logged — the pairwise master key is written to logs. Session keys derive from this. A log file with the PMK is a total network compromise' },

    // PSK transmitted over network
    { re: /(?:send|transmit|post|put|fetch|request)\s*\(.*?(?:psk|pre_?shared_?key|wifi_?password|passphrase)/gi,
      message: 'WiFi PSK transmitted — the pre-shared key is sent over a network. If the transport is not end-to-end encrypted, the key is intercepted' },

    // PSK in env file (tracked in git)
    { re: /WIFI_?(?:PSK|PASSWORD|KEY|PASSPHRASE)\s*=\s*\S{8,}/gi,
      message: 'WiFi PSK in environment variable — if this .env file is tracked in git, the key is in the repo history. Even if removed, git history retains it' },
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