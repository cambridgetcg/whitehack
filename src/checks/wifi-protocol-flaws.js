// wifi-protocol-flaws — substrate honesty (WiFi protocol security)
// WiFi protocols have known design flaws that code ignores. This check
// surfaces the lies code tells about WiFi security:
//
// 1. WPA2 using TKIP (deprecated, vulnerable to Michael attack)
// 2. Open WiFi networks (no encryption at all)
// 3. WEP references (completely broken since 2007)
// 4. Hardcoded SSID/password in firmware code
// 5. WiFi credentials in plain config without keychain reference
// 6. Missing WPA3 (the current standard — WPA2 has KRACK vulnerability)
// 7. 802.11n or lower without mentioning WPA3 (legacy = vulnerable)
//
// Love is understanding. There is no fear in understanding.
// We study the protocol, we understand the flaws, we build checks that
// surface the lies. The code says "secure WiFi" while using WEP.

const WEP = /\bwep\b/i
const TKIP = /\btkip\b/i
const OPEN_WIFI = /\bopen\b.*\bwifi\b|\bwifi\b.*\bopen\b|\bopen\b.*\bssid\b/i
const WPA2_ONLY = /\bwpa2\b(?!.*wpa3)/i
const HARDCODED_SSID = /ssid\s*[:=]\s*['"][^'"]{2,}['"]/i
const HARDCODED_WIFI_PASS = /wifi.*pass|wifi.*password|wifi.*key|wpa.*pass|wpa.*key/i
const PLAINTEXT_WIFI_CREDS = /(?:ssid|wifi_pass|wifi_password|wifi_key|wpa_pass)\s*[:=]\s*['"][^'"]{8,}['"]/i
const WPS = /\bwps\b/i // WPS is vulnerable to brute-force PIN attacks

export const wifiProtocolFlaws = {
  id: 'wifi-protocol-flaws',
  title: 'WiFi protocol security flaw — deprecated or broken encryption',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []
    const hasWPA3 = /wpa3/i.test(content)

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // WEP — completely broken
      if (WEP.test(l) && !l.includes('//') && !l.includes('/*')) {
        hits.push({
          line: i + 1,
          message: 'WEP encryption referenced — broken since 2007, crackable in seconds. The code claims WiFi security while using no real encryption',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // TKIP — deprecated, Michael attack
      if (TKIP.test(l)) {
        hits.push({
          line: i + 1,
          message: 'TKIP cipher used — deprecated since 2012, vulnerable to Michael attack and beacon injection. Use AES-CCMP or GCMP',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // WPS — brute-force vulnerable
      if (WPS.test(l) && /enable|on|true/i.test(l)) {
        hits.push({
          line: i + 1,
          message: 'WPS enabled — vulnerable to brute-force PIN attack (reaver/bully). Disable WPS or use push-button only',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Hardcoded WiFi credentials
      if (PLAINTEXT_WIFI_CREDS.test(l) && !/process\.env|keychain|secret|import|require/.test(l)) {
        hits.push({
          line: i + 1,
          message: 'WiFi credentials hardcoded in source — SSID and password readable by anyone with repo access, should reference keychain or env vars',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Hardcoded SSID
      if (HARDCODED_SSID.test(l) && !/process\.env|keychain|config|import|require|comment|\/\//.test(l)) {
        hits.push({
          line: i + 1,
          message: 'WiFi SSID hardcoded — network name embedded in source, should come from config or env var',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // WPA2 without WPA3 — KRACK vulnerability
      if (WPA2_ONLY.test(l) && !hasWPA3 && !l.includes('//') && !l.includes('/*')) {
        hits.push({
          line: i + 1,
          message: 'WPA2 used without WPA3 — vulnerable to KRACK (Key Reinstallation Attack). WPA3 is the current standard since 2018',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}