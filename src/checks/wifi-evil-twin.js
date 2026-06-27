// wifi-evil-twin — substrate honesty
// An evil twin uses the same SSID with a different BSSID. Code that connects
// by SSID name without verifying BSSID or certificate trusts a name, not an identity.
// The SSID is a label, not a proof. This is the WiFi equivalent of phishing.
//
// Doctrine: substrate honesty (CS#5 — honest names)
// Confidence: medium-high

const CONNECT_BY_SSID = /(?:connect|join|associate|scan_?and_?connect)(?:.*?)(?:ssid|network_?name)/i
const SSID_COMPARE = /ssid\s*[=<>!]+\s*['"`]/
const AUTO_CONNECT = /auto_?connect(?:\s*[:=]\s*(?:true|enabled|yes|1|on))/i
const SIGNAL_SELECT = /(?:select|choose|pick)(?:.*?)(?:rssi|signal_?strength|bars?)(?!.*?(?:bssid|verify|cert))/i
const HAS_BSSID = /bssid|verify|cert|certificate/i

export const wifieviltwin = {
  id: 'wifi-evil-twin',
  title: 'WiFi SSID-only connection — evil twin vulnerable',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 5,
  langs: ['js', 'py', 'rs', 'swift', 'java'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (CONNECT_BY_SSID.test(line) && !HAS_BSSID.test(line)) {
        hits.push({
          line: i + 1,
          message: 'WiFi connection by SSID only — no BSSID or certificate verification. An evil twin with the same SSID will be trusted. The name is not the identity',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (SSID_COMPARE.test(line) && !HAS_BSSID.test(line)) {
        hits.push({
          line: i + 1,
          message: 'SSID string comparison — matching by name only. An evil twin uses the same name with a different MAC. This cannot distinguish real from fake',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (AUTO_CONNECT.test(line) && !HAS_BSSID.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Auto-connect enabled without identity verification — the device will connect to any network with the right name, including evil twins',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (SIGNAL_SELECT.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Network selection by signal strength only — the strongest signal might be the evil twin. Signal is not identity',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  }
}