// wifi-krack-vulnerable.js — KRACK (Key Reinstallation Attack) vulnerability check
//
// The lie: code reinstalls the same session key during the WPA2 4-way
// handshake, allowing nonce reuse and keystream reuse. This is the
// fundamental KRACK vulnerability (Vanhoef 2017). The code thinks it's
// securing the connection; it's actually resetting the key to a known
// state an attacker can observe.
//
// The protocol itself was lying — 802.11 didn't specify that key
// installation should happen exactly once. Code that reinstalls on
// retransmission is honest about following a lying spec.
//
// Doctrine: substrate honesty (CS#4 — stated freshness)
// Confidence: medium-high
// Languages: c, rs, py, js, ts

export const wifikrackvulnerable = {
  id: 'wifi-krack-vulnerable',
  name: 'KRACK vulnerable key reinstallation',
  langs: ['c', 'rs', 'py', 'js', 'ts'],
  doctrine: 'substrate-honesty',
  confidence: 'medium-high',
  cs: 'CS#4',

  patterns: [
    // Key reinstall on retransmit (the core KRACK bug)
    { re: /install_?key(?:.*?)(?:retransmit|retry|replay|duplicate)/gi,
      message: 'Key installation on retransmit — reinstalling the same PTK on handshake retransmission is the KRACK vulnerability. Nonce resets, keystream reuses, attacker decrypts' },

    // State machine that doesn't track key installation
    { re: /key_?install(?:ed)?(?:.*?)(?:state|step|phase)(?!.*?(?:installed|done|complete))/gi,
      message: 'Key installation without state tracking — if the state machine does not record that the key was already installed, a retransmitted message 3 triggers reinstallation' },

    // Message 3 handling without nonce tracking
    { re: /msg3|message_?3|M3(?:.*?)(?:key|ptk|install)(?!.*?(?:nonce|replay|counter|already))/gi,
      message: 'Message 3 key install without nonce/replay counter — if message 3 is retransmitted and the key is reinstalled, the nonce counter resets. This is KRACK' },

    // GCMP/GTK reinstallation (even worse — full plaintext recovery)
    { re: /gtk_?install(?:.*?)(?:retransmit|retry|replay)/gi,
      message: 'GTK reinstallation on retransmit — with GCMP, this allows full plaintext recovery, not just decryption. The group key reset is catastrophic' },
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