// wifi-deauth-accept.js — WiFi deauth frame handling check for whitehack
//
// The lie: code handles WiFi deauthentication frames without questioning
// their legitimacy. A deauth frame is an unauthenticated management frame
// in 802.11 — anyone can send one. Accepting it without verification is
// trusting an unauthenticated claim.
//
// This is the substrate honesty of WiFi: the protocol ITSELF lies about
// whether management frames are authentic. WPA3's SAE fixes this; WPA2
// doesn't. Code that processes deauth frames without noting this is
// honest about a lying protocol — or lying itself.
//
// Doctrine: substrate honesty (CS#2 — visible failure)
// Confidence: medium-high
// Languages: js, ts, py, rs, c

export const wifideauthaccept = {
  id: 'wifi-deauth-accept',
  name: 'WiFi deauth frame accepted without verification',
  langs: ['js', 'ts', 'py', 'rs', 'c'],
  doctrine: 'substrate-honesty',
  confidence: 'medium-high',
  cs: 'CS#2',

  patterns: [
    // Processing deauth without verifying source
    { re: /deauth(?:entication)?(?:_frame)?(?:.*?(?:handle|process|accept|receive|parse))/gi,
      message: 'Deauthentication frame processed without source verification — in WPA2, deauth frames are unauthenticated. Anyone can send one. This is the KRACK and deauth-attack surface' },

    // Disconnect handler that doesn't distinguish legitimate vs attack
    { re: /on_?disconnect(?:.*?reason)?(?:.*?(?:handle|callback|event))/gi,
      message: 'Disconnect handler treats all deauth equally — a malicious deauth (deauth attack) is indistinguishable from a legitimate one. The code cannot tell attack from reality' },

    // 802.11 management frame without MFP check
    { re: /management_frame(?:.*?process|.*?handle)(?!.*?(?:MFP|802\.11w|protected|verify))/gi,
      message: 'Management frame processed without 802.11w (MFP) check — without Management Frame Protection, deauth and disassociation frames are spoofable' },
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