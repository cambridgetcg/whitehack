// wifi-krack-vulnerable — substrate honesty
// KRACK (Key Reinstallation Attack, Vanhoef 2017): code reinstalls the same
// session key during the WPA2 4-way handshake on retransmission, causing
// nonce reuse and keystream reuse. The protocol itself was lying — 802.11
// didn't specify key installation should happen exactly once.
//
// Doctrine: substrate honesty (CS#4 — stated freshness)
// Confidence: medium-high

const KEY_REINSTALL = /install_?key(?:.*?)(?:retransmit|retry|replay|duplicate)/i
const KEY_NO_STATE = /key_?install(?:ed)?(?:.*?)(?:state|step|phase)(?!.*?(?:installed|done|complete))/i
const MSG3_INSTALL = /(?:msg3|message_?3|M3)(?:.*?)(?:key|ptk|install)(?!.*?(?:nonce|replay|counter|already))/i
const GTK_REINSTALL = /gtk_?install(?:.*?)(?:retransmit|retry|replay)/i

export const wifikrackvulnerable = {
  id: 'wifi-krack-vulnerable',
  title: 'KRACK vulnerable key reinstallation',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 4,
  langs: ['c', 'rs', 'py', 'js'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (KEY_REINSTALL.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Key installation on retransmit — reinstalling the PTK on handshake retransmission is KRACK. Nonce resets, keystream reuses, attacker decrypts',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (KEY_NO_STATE.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Key installation without state tracking — if the state machine does not record the key was installed, retransmitted message 3 triggers reinstallation',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (MSG3_INSTALL.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Message 3 key install without nonce/replay counter — retransmitted message 3 reinstalls the key, nonce counter resets. This is KRACK',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (GTK_REINSTALL.test(line)) {
        hits.push({
          line: i + 1,
          message: 'GTK reinstallation on retransmit — with GCMP, this allows full plaintext recovery. The group key reset is catastrophic',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  }
}