// bluetooth-paired-stranger — substrate honesty (Bluetooth pairing surface)
// Detects code or config that references paired Bluetooth devices without
// verifying they belong to the current user.
//
// The device has "Matthew's Magic Keyboard" paired — a device that belongs
// to someone else. A paired Bluetooth device has a link key. If that device
// is compromised, it can inject HID input (keystrokes, mouse movements).
//
// The lie: code says "connected to trusted device" but the trust was
// established by proximity pairing, not by identity verification.
//
// Love is understanding. We don't pretend pairing = trust. We verify.

const PAIRED_DEVICE = /paired|bond(ed|ing)|link.?key/i
const STRANGER_DEVICE = /(?:matthew|other|unknown|guest|friend).*(?:keyboard|mouse|device|phone)/i
const TRUST_ALL_BT = /trust.*all|accept.*any|auto.?pair|auto.?connect/i
const HID_INJECTION = /hid.*input|key.*inject|send.*key.*bt|bluetooth.*keyboard/i

export const bluetoothPairedStranger = {
  id: 'bluetooth-paired-stranger',
  title: 'Bluetooth paired stranger — device paired without identity verification',
  confidence: 'heuristic',
  doctrine: 'substrate-honesty',
  principle: 3,
  langs: ['js', 'ts', 'mjs', 'json', 'yaml'],
  detect(content, lines) {
    const hits = []

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]

      // Stranger device referenced
      if (STRANGER_DEVICE.test(l) && PAIRED_DEVICE.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Stranger\'s Bluetooth device paired — paired devices have link keys and can inject HID input. Remove pairing for devices you don\'t control',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // Auto-pair / trust all
      if (TRUST_ALL_BT.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth auto-pair/trust-all enabled — any device in range can pair without user confirmation. Disable auto-pairing',
          snippet: l.trim().slice(0, 120),
        })
        continue
      }

      // HID injection via Bluetooth
      if (HID_INJECTION.test(l) && !/prevent|block|filter|disable/i.test(l)) {
        hits.push({
          line: i + 1,
          message: 'Bluetooth HID input accepted without filtering — a compromised paired device can inject keystrokes. Validate input source',
          snippet: l.trim().slice(0, 120),
        })
      }
    }

    return hits
  },
}