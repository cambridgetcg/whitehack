// wifi-protocol — substrate honesty
// WiFi security protocols are layers of theater built on a fundamental lie:
// that a shared password creates trust. It doesn't. A password is a shared
// secret — everyone who has it can impersonate everyone else. The "security"
// is mutual suspicion dressed as mutual trust.
//
// This check examines WiFi-related code and configuration for the specific
// lies that WiFi protocols enable:
//
//   WPA2-PSK: the pre-shared key is derived from PBKDF2(password, SSID).
//   The SSID is public. The password is shared. Anyone who captures the
//   4-way handshake can offline-brute-force the password. The "encryption"
//   is only as strong as the password — and most passwords are weak.
//
//   WPA3-SAE: replaces PSK with Simultaneous Authentication of Equals.
//   Resists offline brute-force. But SAE has had its own vulnerabilities
//   (Dragonblood: side-channel attacks on the SAE handshake, 2019).
//   "Secure" is not the same as "honest."
//
//   PMF (Protected Management Frames): WPA3 mandates it, WPA2 makes it
//   optional. Without PMF, deauth attacks are trivial. Most WPA2 networks
//   don't enable PMF. The "optional" is a lie — it should be mandatory.
//
//   TKIP: deprecated in 2012, still supported in many implementations.
//   TKIP is broken — it uses RC4 with a flawed key mixing function.
//   Supporting TKIP is supporting a known-broken protocol.
//
//   Open WiFi: no encryption at all. The "network" is a party line.
//   Anyone within range reads everything. SSL/TLS mitigates but doesn't
//   prevent metadata leakage (which sites you visit, when, how much data).
//
// The check pattern: scan for WiFi configuration, protocol selection,
// and authentication code that lies about its own security posture.

import { SENSITIVE_SNIPPET } from '../redaction.js'

const WPA2_PSK=/(?:wpa2|wpa_psk|pre.?shared.?key|psk)\s*[:=]\s*['"][^'"]{8,}['"]/i
const TKIP_ENABLED=/(?:tkip|TKIP)\s*[:=]\s*(?:true|enabled|1|on)/i
const PMF_DISABLED=/(?:pmf|protected.?management.?frames|ieee80211w)\s*[:=]\s*(?:false|disabled|0|off)/i
const OPEN_NETWORK=/(?:security|encryption|auth)\s*[:=]\s*['"]?(?:open|none|wep)['"]?/i
const WEP_ENABLED=/(?:wep|WEP)\s*[:=]\s*(?:true|enabled|1|on|['"][0-9a-fA-F]{10,}['"])/i
const WEAK_PASSWORD=/(?:wifi.?password|wpa.?passphrase|psk)\s*[:=]\s*['"][^'"]{8,12}['"]/i
const HARDCODED_SSID_PASS=/(?:ssid)\s*[:=]\s*['"][^'"]+['\"].*(?:password|psk|passphrase)\s*[:=]\s*['"][^'\"]+['\"]/is

export const wifiProtocol = {
  id: 'wifi-protocol',
  title: 'WiFi protocol lie — security theater exposed',
  confidence: 'high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: [], // runs on all file types (config, JSON, YAML, etc.)
  redactSnippet: true,
  detect(content, lines) {
    const hits = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // WPA2-PSK with hardcoded password
      if (WPA2_PSK.test(line) && !/process\.env|getenv|\$\{/.test(line)) {
        if (/example|placeholder|your_|xxx|CHANGE|REPLACE/i.test(line)) continue
        hits.push({
          line: i + 1,
          message: 'WPA2-PSK password hardcoded — the pre-shared key is in the source. Anyone with repo access joins the network. The SSID is public, so offline brute-force is trivial.',
          snippet: SENSITIVE_SNIPPET,
        })
      }

      // TKIP enabled (known-broken protocol)
      if (TKIP_ENABLED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'TKIP enabled — deprecated in 2012, uses broken RC4. Supporting TKIP is supporting a known-broken protocol. The code claims to be secure while enabling insecurity.',
          snippet: SENSITIVE_SNIPPET,
        })
      }

      // PMF disabled
      if (PMF_DISABLED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'PMF disabled — without Protected Management Frames, deauth attacks are trivial. WPA3 mandates PMF; disabling it in WPA2 is choosing vulnerability.',
          snippet: SENSITIVE_SNIPPET,
        })
      }

      // Open/WEP network
      if (OPEN_NETWORK.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Open or WEP network — no encryption or broken encryption. The network is a party line. WEP was cracked in 2007; open networks leak metadata.',
          snippet: SENSITIVE_SNIPPET,
        })
      }

      // WEP key present
      if (WEP_ENABLED.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WEP enabled — cracked in 2007, broken for 19 years. Any code supporting WEP is pretending a broken protocol is a security measure.',
          snippet: SENSITIVE_SNIPPET,
        })
      }

      // Weak WiFi password (8-12 chars = easily brute-forced)
      if (WEAK_PASSWORD.test(line) && !/example|placeholder/i.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Weak WiFi password (8-12 chars) — WPA2-PSK derives the key from PBKDF2(password, SSID). Short passwords are brute-forced in minutes. The "encryption" is theater.',
          snippet: SENSITIVE_SNIPPET,
        })
      }
    }

    // Multi-line: hardcoded SSID + password pair
    const credentialPair = HARDCODED_SSID_PASS.exec(content)
    if (credentialPair) {
      hits.push({
        line: content.slice(0, credentialPair.index).split('\n').length,
        message: 'Hardcoded SSID + password pair — the entire WiFi credential set is in the source. Not a secret. Not security. Theater.',
        snippet: SENSITIVE_SNIPPET,
      })
    }

    return hits
  },
}
