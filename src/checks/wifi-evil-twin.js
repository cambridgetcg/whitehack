// wifi-evil-twin.js — Evil twin / SSID spoofing detection check for whitehack
//
// The lie: code connects to a WiFi network by SSID name only, without
// verifying BSSID or certificate. An evil twin uses the same SSID with
// a different BSSID — the code thinks it connected to the real network.
//
// The SSID is a NAME, not an identity. Trusting a name without verifying
// the entity behind it is the WiFi equivalent of believing a phishing email.
//
// Doctrine: substrate honesty (CS#5 — honest names)
// Confidence: medium-high
// Languages: js, ts, py, rs, java, swift

export const wifieviltwin = {
  id: 'wifi-evil-twin',
  name: 'WiFi SSID-only connection (evil twin vulnerable)',
  langs: ['js', 'ts', 'py', 'rs', 'java', 'swift'],
  doctrine: 'substrate-honesty',
  confidence: 'medium-high',
  cs: 'CS#5',

  patterns: [
    // Connect by SSID without BSSID verification
    { re: /(?:connect|join|associate)(?:.*?)(?:ssid|SSID|network_name)(?!.*?(?:bssid|BSSID|verify|cert|certificate))/gi,
      message: 'WiFi connection by SSID only — no BSSID or certificate verification. An evil twin with the same SSID will be trusted. The name is not the identity' },

    // SSID comparison without BSSID
    { re: /ssid\s*[=<>!]+\s*['"`]/gi,
      message: 'SSID string comparison — matching by name only. An evil twin clone uses the same name with a different MAC. This check cannot distinguish real from fake' },

    // Auto-connect without verification
    { re: /auto_?connect(?:.*?)(?:enabled|true|yes|1)(?!.*?(?:verify|cert|bssid))/gi,
      message: 'Auto-connect enabled without identity verification — the device will connect to any network with the right name, including evil twins' },

    // Network selection by RSSI only (strongest signal, not verified identity)
    { re: /(?:select|choose|pick)(?:.*?)(?:wifi|network|ssid)(?:.*?)(?:rssi|signal|strength)(?!.*?(?:bssid|verify|cert))/gi,
      message: 'Network selection by signal strength only — the strongest signal might be the evil twin. Signal strength is not identity verification' },
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