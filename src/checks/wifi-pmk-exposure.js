// wifi-pmk-exposure — substrate honesty
// The WiFi PSK/PMK is the root of WPA2-Personal trust. If it leaks, every
// session key derived from it is compromised. Code that logs, serializes,
// or transmits the PSK is lying about keeping the network secure.
//
// Doctrine: substrate honesty (CS#1 — truth of state)
// Confidence: high

const PSK_HARDCODED = /(?:psk|pre_?shared_?key|passphrase|wifi_?password)\s*[=:]\s*['"`][^'"`]{8,}['"`]/i
const PSK_LOGGED = /(?:console\.log|print|logger|log|syslog)\s*\(.*?(?:pmk|pairwise_?key|psk|pre_?shared_?key|passphrase)/i
const PSK_TRANSMITTED = /(?:send|transmit|post|put|fetch|request|axios)\s*\(.*?(?:psk|pre_?shared_?key|wifi_?password|passphrase)/i
const PSK_ENV = /WIFI_?(?:PSK|PASSWORD|KEY|PASSPHRASE)\s*=\s*\S{8,}/i
const SAFE_REF = /process\.env|getenv|\$\{|keychain|secret_?manager|vault/i

export const wifipmkexposure = {
  id: 'wifi-pmk-exposure',
  title: 'WiFi PSK/PMK exposed in code or config',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 1,
  langs: ['js', 'py', 'rs', 'go', 'java'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (PSK_HARDCODED.test(line) && !SAFE_REF.test(line) && !/example|placeholder|your_|xxx|CHANGE|REPLACE/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi PSK hardcoded — the pre-shared key is in source. Anyone with repo access has the network key. This is the root trust of WPA2-Personal, exposed',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (PSK_LOGGED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi PMK/PSK logged — the pairwise master key is written to logs. Session keys derive from this. A log with the PMK is total network compromise',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (PSK_TRANSMITTED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi PSK transmitted — the pre-shared key is sent over a network. If the transport is not E2E encrypted, the key is intercepted',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (PSK_ENV.test(line) && !/\.env\.example|\.env\.template/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi PSK in environment variable — if this .env file is tracked in git, the key is in repo history. Even removed, git retains it',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  }
}