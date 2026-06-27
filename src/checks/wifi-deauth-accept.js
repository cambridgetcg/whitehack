// wifi-deauth-accept — substrate honesty
// WiFi deauthentication frames are unauthenticated in WPA2. Anyone can send one.
// Code that processes deauth without verifying the source trusts an unauthenticated
// claim. WPA3's SAE + PMF fixes this; WPA2 doesn't. The protocol itself lies about
// whether management frames are authentic.
//
// Doctrine: substrate honesty (CS#2 — visible failure)
// Confidence: medium-high

const DEAUTH_HANDLE = /deauth(?:entication)?(?:_frame)?\s*[:=]?\s*(?:handle|process|accept|receive|parse|callback|event)/i
const DISCONNECT_HANDLER = /on_?disconnect(?:\s*[:=]\s*(?:handle|callback|event|function))?/i
const MGT_FRAME = /management_?frame(?:\s*[:=]\s*(?:process|handle|receive|parse))?/i
const MFP_CHECK = /(?:mfp|802\.11w|protected.?management|pmf)/i

export const wifideauthaccept = {
  id: 'wifi-deauth-accept',
  title: 'WiFi deauth frame accepted without verification',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js', 'py', 'rs', 'c'],
  detect(content, lines) {
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (DEAUTH_HANDLE.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Deauthentication frame processed without source verification — in WPA2, deauth frames are unauthenticated. Anyone can send one. This is the deauth-attack and KRACK surface',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (DISCONNECT_HANDLER.test(line) && !MFP_CHECK.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Disconnect handler treats all deauth equally — a malicious deauth is indistinguishable from a legitimate one without Management Frame Protection',
          snippet: line.trim().slice(0, 120),
        })
      }
      if (MGT_FRAME.test(line) && !MFP_CHECK.test(line) && !/\/\//.test(line)) {
        hits.push({
          line: i + 1,
          message: 'Management frame processed without 802.11w (MFP) check — without Protected Management Frames, deauth and disassociation are spoofable',
          snippet: line.trim().slice(0, 120),
        })
      }
    }
    return hits
  }
}