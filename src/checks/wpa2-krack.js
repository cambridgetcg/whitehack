// wpa2-krack — substrate honesty (WiFi WPA2 key reinstallation vulnerability)
// KRACK (Key Reinstallation Attack) breaks WPA2 by replaying message 3
// of the 4-way handshake, forcing the victim to reinstall an already-in-use
// key. This resets the nonce and packet counter, allowing the attacker to
// replay, decrypt, and forge frames.
//
// The device is on WPA2 Personal. This check flags code that:
//   1. Configures WPA2 without mentioning KRACK mitigations
//   2. Uses WPA2 TKIP (the most KRACK-vulnerable cipher)
//   3. Claims "secure WiFi" while only using WPA2
//   4. Disables management frame protection (802.11w)
//
// The lie: "WPA2 is secure." WPA2 without KRACK patches is NOT secure.
// The truth: WPA3 (SAE) is the current standard. WPA2 + KRACK patches
// + MFP is acceptable. WPA2 alone is a lie about security.
//
// Love is understanding. There is no fear in understanding.
// We don't hide from KRACK. We understand it. We build checks that expose it.

const WPA2_NO_MFP = /wpa2(?!.*(?:802\.11w|mfp|management.*frame.*protection|pmf))/i
const TKIP_VULNERABLE = /tkip(?!.*ccmp|.*gcmp)/i
const SECURE_WIFI_LIE = /(?:secure|encrypted|protected).*wifi|wifi.*(?:secure|encrypted|protected)/i
const FOUR_WAY_HANDSHAKE = /4.?way|handshake|eapol/i
const DEAUTH_IGNORED = /deauth.*ignore|deauth.*drop|deauth.*filter/i

export const wpa2Krack = {
  id: 'wpa2-krack',
  title: 'WPA2 KRACK vulnerability — key reinstallation attack not mitigated',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'ts', 'mjs', 'py'],
  detect(content, lines) {
    const hits = []
    const hasWPA3 = /wpa3|sae\b/i.test(content)
    const hasMFP = /802\.11w|mfp|pmf|management.*frame.*protection/i.test(content)

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // "Secure WiFi" claim with only WPA2
      if (SECURE_WIFI_LIE.test(l) && WPA2_NO_MFP.test(content) && !hasWPA3 && !hasMFP) {
        hits.push({
          line: i + 1,
          message: 'Code claims "secure WiFi" but only uses WPA2 without Management Frame Protection — vulnerable to KRACK (Key Reinstallation Attack). Use WPA3 or WPA2+MFP',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // TKIP without AES-CCMP fallback
      if (TKIP_VULNERABLE.test(l) && !/ccmp|gcmp|aes/i.test(content)) {
        hits.push({
          line: i + 1,
          message: 'TKIP cipher used without AES-CCMP — TKIP is deprecated and most vulnerable to KRACK. Use AES-CCMP or GCMP',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // 4-way handshake handling without replay protection
      if (FOUR_WAY_HANDSHAKE.test(l) && !/replay.*protect|nonce.*reset|counter.*check/i.test(content)) {
        hits.push({
          line: i + 1,
          message: '4-way handshake handling without replay protection — KRACK replays message 3 to force key reinstallation. Implement replay counter validation',
          snippet: l.trim().slice(0, 120),
        })
      }
    }

    return hits
  },
}