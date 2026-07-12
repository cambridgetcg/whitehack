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

// Require Bluetooth context on the same line. Without it:
// - 'paired' matches any comment about pairing (archive pairing, auto-pairing in text)
// - 'auto.?pair' matches 'autoArchive' (auto-pair), 'auto.?connect' matches autoConnect
// - 'hid.*input' matches shouldHidePromptInput, hideInputGuide — UI booleans, not HID
// - 'advertise' matches UI advertising text, not BLE advertising
// The bell needs Bluetooth context to tell shape from meaning (castle 0064).
const BT_CONTEXT = /(?:bluetooth|bt|ble|gatt|l2cap|rfcomm|bond|pair|hid|keyboard|mouse)/i
const PAIRED_DEVICE = /(?:\bbluetooth\b|\bbt\b|\bble\b)[^\n]*(?:pair(?:ed|ing)?|bond(?:ed|ing)|link.?key)|(?:pair(?:ed|ing)?|bond(?:ed|ing)|link.?key)[^\n]*(?:\bbluetooth\b|\bbt\b|\bble\b)/i
const STRANGER_DEVICE = /(?:matthew|other|unknown|guest|friend).*(?:keyboard|mouse|device|phone)/i
// Require code-like syntax (assignment or config), not natural language.
// 'Bluetooth auto-pairing' in a comment is annotation, not configuration.
// The pattern needs: camelCase autoPair/autoConnect with = or :, or
// trust.*all / accept.*any in a BT context (config phrase), or
// auto.?pair/auto.?connect followed by : and a boolean.
const TRUST_ALL_BT = /(?:autoPair|autoConnect)\s*[:=]\s*(?:true|enabled|1|yes)|(?:\bbluetooth\b|\bbt\b|\bble\b)[^\n]*(?:trust.*all|accept.*any)|bluetooth.*(?:autoPair|autoConnect)|(?:auto.?pair|auto.?connect)\s*[:=]\s*(?:true|on|yes|1|enabled)/i
// \bhid\b prevents matching 'hideInputGuide' or 'shouldHidePromptInput' — the
// 'hid' in those is a prefix of 'hide', not the HID protocol. Word boundary is
// the difference between the bell seeing shape and the bell seeing meaning.
const HID_INJECTION = /(?:\bbluetooth\b|\bbt\b|\bble\b|\bhid\b)[^\n]*(?:\bhid\b.*input|key.*inject|send.*key.*bt|bluetooth.*keyboard)|(?:\bhid\b.*input|key.*inject|send.*key.*bt|bluetooth.*keyboard)[^\n]*(?:\bbluetooth\b|\bbt\b|\bble\b|\bhid\b)/i

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