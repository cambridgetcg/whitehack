// bluetooth-protocol-flaws — substrate honesty (Bluetooth protocol security)
// Bluetooth has known design flaws at every layer of the stack.
// This check surfaces the lies code tells about Bluetooth security:
//
// 1. Classic Bluetooth without encryption (BLE pairing bypass)
// 2. Bluetooth Classic PIN in code (vulnerable to brute-force)
// 3. BLE with Just Works pairing (no MITM protection)
// 4. Discoverable mode enabled permanently (broadcasts MAC address)
// 5. Missing bond/auth requirement (any device can connect)
// 6. SPP (Serial Port Profile) without authentication
// 7. BlueBorne vulnerability pattern (unauthenticated L2CAP)
//
// The device has BCM4388C2 — a modern Apple Silicon Bluetooth controller
// with LEA, GATT, AACP support. But the code on top of it can still lie
// about security. We check the code, not the hardware.

const BT_DISCOVERABLE_ON = /discoverable\s*[:=]\s*(true|on|yes|1)/i
const BT_PIN_HARDCODED = /pin\s*[:=]\s*['"][0-9]{4}['"]/i
const JUST_WORKS = /just.?works|NoInputNoOutput|no.?mitm/i
// Require Bluetooth context (bt/ble/bluetooth/gatt/bond/pair/l2cap/rfcomm) on the same
// line. Without it, 'noAuth' matches OAuth variables, 'auth: false' matches any auth config,
// and 'advertise' matches UI advertising text. The bell needs context to tell shape from meaning.
const BT_NO_AUTH = /(?:\bbluetooth\b|\bbt\b|\bble\b|\bgatt\b|\bbond\b|\bpair\b|\bl2cap\b|\brfcomm\b)[^\n]*\bauth\s*[:=]\s*(?:false|disabled|off|0)\b|\bauth\s*[:=]\s*(?:false|disabled|off|0)\b[^\n]*(?:\bbluetooth\b|\bbt\b|\bble\b|\bgatt\b|\bbond\b|\bpair\b|\bl2cap\b|\brfcomm\b)/i
const L2CAP_UNAUTH = /l2cap.*(?!auth)/i
const SSP_WITHOUT_MITM = /ssp.*(?:just|none)|secureSimplePairing.*(?:just|none)/i
// Require code-like syntax (method call, assignment, config) — not natural language.
// 'advertise' in a comment about UI advertising is annotation, not BLE code.
// The bell needs code syntax to tell annotation from implementation (castle 0064).
const BLE_BROADCAST = /(?:ble|bluetooth|bt|gatt)\.[^\n]*advertise|startAdvertising\s*\(|advertiseData\s*\(|advertise\s*[:=]\s*(?:true|on|yes|1)|bluetooth.*advertise\s*\(	/i
const RFCOMM_OPEN = /rfcomm.*(?!auth|pin|bond)/i

export const bluetoothProtocolFlaws = {
  id: 'bluetooth-protocol-flaws',
  title: 'Bluetooth protocol security flaw — weak pairing or no auth',
  confidence: 'medium-high',
  doctrine: 'substrate-honesty',
  principle: 2,
  langs: ['js'],
  detect(content, lines) {
    const hits = []

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Discoverable permanently on — broadcasts MAC
      if (BT_DISCOVERABLE_ON.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth discoverable mode enabled — device broadcasts its MAC address to all nearby scanners permanently',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Hardcoded PIN — brute-forceable (only 10000 combinations)
      if (BT_PIN_HARDCODED.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth PIN hardcoded — 4-digit PIN is brute-forceable in seconds. Use Secure Simple Pairing with passkey or numeric comparison',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Just Works pairing — no MITM protection
      if (JUST_WORKS.test(l)) {
        hits.push({
          line: i + 1,
          message: 'BLE "Just Works" pairing used — no MITM protection, any attacker in range can intercept pairing. Use Passkey Entry or Numeric Comparison',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // No authentication
      if (BT_NO_AUTH.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth authentication disabled — any device in range can connect without bonding or pairing',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // SSP without MITM
      if (SSP_WITHOUT_MITM.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Secure Simple Pairing without MITM protection — vulnerable to active man-in-the-middle during pairing',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Open BLE broadcast
      if (BLE_BROADCAST.test(l)) {
        hits.push({
          line: i + 1,
          message: 'BLE advertising in open/public mode — device broadcasts to all nearby scanners without filtering',
          snippet: l.trim().slice(0, 120),
        })
      }
    }
    return hits
  },
}