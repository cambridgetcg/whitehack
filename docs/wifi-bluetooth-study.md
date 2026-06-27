# WiFi & Bluetooth Protocol Study — whitehack v0.4

## Love is understanding. There is no fear in understanding.

This document is a deep dive into the WiFi and Bluetooth protocols as implemented on a real device (Apple Silicon, Broadcom BCM4388), the fundamental lies in their security model, and how whitehack exposes them.

## The Device

- **WiFi Chip**: Broadcom BCM4388 (0x14E4, 0x4388) — integrated into Apple Silicon
- **Bluetooth Chip**: BCM_4388C2 — same die, shared SoC
- **WiFi Firmware**: wl0 23.41.8.0.41.51.201 (Dec 2025)
- **BT Firmware**: 23.3.214.1297
- **Transport**: PCIe (integrated, not USB)
- **WiFi Standards**: 802.11 a/b/g/n/ac/ax (WiFi 6) — tri-band (2.4/5/6 GHz)
- **Bluetooth**: Classic + LE dual mode

## WiFi Protocol — The Lies

### Layer 1: Physical (Radio)

The radio is naked. Anyone within range can:
- Capture all frames (beacons, probes, data, management)
- Measure signal strength (device tracking)
- Inject frames (if no MFP)

### Layer 2: 802.11 Frames

| Frame Type | Encrypted? | Authenticated? | Lie |
|-----------|-----------|---------------|-----|
| Management (beacon, probe, auth, assoc, deauth) | No | No (without PMF) | "The network is real" — anyone can spoof it |
| Control (RTS, CTS, ACK) | No | No | "The channel is clear" — anyone can jam it |
| Data | Yes (CCMP/GCMP/TKIP) | Yes (via MIC) | "The data is private" — only as strong as the key |

### WPA2-PSK: The Fundamental Lie

```
PMK = PBKDF2(passphrase, SSID, 4096 iterations, 256 bits)
```

- The SSID is **public** (broadcast in every beacon)
- The passphrase is **shared** (same for everyone)
- The 4-way handshake is **unprotected** by the key it's deriving
- Anyone who captures the handshake can **offline brute-force** the passphrase
- The "encryption" is only as strong as the password — most are weak

**Truth**: A shared password is not trust. It's a shared secret. Everyone who has it can impersonate everyone else. The protocol cannot tell the difference between the real user and a thief.

### WPA3-SAE: Better But Not Perfect

- Replaces PSK with Simultaneous Authentication of Equals
- Resists offline brute-force (Dragonblood attack, 2019 — side-channels on SAE)
- Forward secrecy: session keys don't compromise past sessions
- **Lie**: "Secure" is not "honest." SAE had its own vulnerabilities.

### TKIP: The Broken Protocol

- Deprecated in 2012, still supported in many implementations
- Uses RC4 with flawed key mixing
- Vulnerable to Michael attack (beacon injection)
- Most vulnerable to KRACK (Key Reinstallation Attack)
- **Lie**: Supporting TKIP is supporting a known-broken protocol

### PMF (Protected Management Frames)

- WPA3 mandates PMF; WPA2 makes it optional
- Without PMF: deauth attacks are trivial (forge a deauth frame → disconnect any client)
- Enables: evil twin, captive portal, tracking, DoS
- **Lie**: "Optional" security is a contradiction. You either protect management frames or you don't. "Optional" means "vulnerable by default."

## Bluetooth Protocol — The Lies

### Pairing Methods

| Method | MITM Protection | Lie |
|--------|----------------|-----|
| Just Works (LE) | None | "Paired" = "secure" — no, it means "agreed to talk" |
| Numeric Comparison | Yes (6-digit) | Good — but 6-digit = 1M possibilities, brute-forceable |
| Passkey Entry | Yes (6-digit) | Same — 6-digit is better than nothing |
| Out of Band | Yes (NFC/QR) | Best — but requires user action |
| Legacy (Classic) | Weak (E0 cipher) | E0 is vulnerable to correlation attacks |
| Secure Connections | Yes (AES-CCM) | Better — but pairing is still the weak point |

### BTMousejack (2016, Marc Newlin)

- Unencrypted Bluetooth HID links allow **keystroke injection** from 100m+
- Attack: send fake keyboard input to an unencrypted HID device
- Affected: many keyboards and mice that don't encrypt the HID channel
- **Lie**: "My keyboard is wireless and convenient" — it's also a remote-controlled injection target

### E0 Stream Cipher

- Bluetooth Classic encryption (v2.1 and earlier)
- Vulnerable to correlation attacks (Lu & Meier, 2004)
- 128-bit key but the cipher itself is weak
- **Lie**: "128-bit encryption" sounds strong but E0's structure makes it weaker than its key size suggests

## This Device's Exposure

1. **WPA2 Personal (PSK)** — not WPA3-SAE. No forward secrecy, no Dragonblood resistance.
2. **Mixed WPA/WPA2 networks visible** — TKIP downgrade possible.
3. **No PMF indicator** — likely disabled (WPA2 optional).
4. **Bluetooth HID ACL** — keyboard/mouse over Classic, potentially E0 cipher.
5. **No WPA3 on any visible network** — all PSK-based.
6. **6GHz radio supported but unused** — 6GHz mandates WPA3 (opportunity missed).

## whitehack Checks (v0.4)

| Check | What it catches | Nen type |
|-------|----------------|----------|
| `wifi-protocol` | WPA2-PSK hardcoded, TKIP enabled, PMF disabled, WEP/Open | Enhancer |
| `bluetooth-protocol` | Just Works pairing, E0 cipher, unencrypted HID, Secure Connections disabled | Conjurer |
| `password-auth` | Hardcoded passwords, MD5/SHA1 hashing, JWT alg:none, session in URL, no HTTPS | Enhancer |
| `wifi-protocol-flaws` | (QWENTHOS) Deprecated encryption, KRACK vulnerability | Enhancer |
| `bluetooth-protocol-flaws` | (QWENTHOS) BT Classic weaknesses, pairing flaws | Conjurer |
| `weak-wifi-encryption` | (QWENTHOS) TKIP without CCMP, WEP keys | Enhancer |
| `wifi-deauth-accept` | (QWENTHOS) Accepting unauthenticated deauth frames | Manipulator |
| `insecure-protocol` | (QWENTHOS) HTTP, FTP, Telnet usage | Emitter |
| `disabled-cert-verification` | (QWENTHOS) SSL verification disabled | Conjurer |
| `weak-crypto` | (QWENTHOS) MD5, SHA1, DES, RC4 | Enhancer |
| `cors-wildcard` | (QWENTHOS) CORS * with credentials | Manipulator |
| `cookie-insecure` | (QWENTHOS) Cookies without Secure/HttpOnly | Manipulator |
| `sql-injection` | (QWENTHOS) Unsanitized SQL string concat | Emitter |

## The Truth

Passwords are fake trust. WiFi "security" is a shared secret dressed as private encryption. Bluetooth "pairing" is an agreement to talk, not proof of identity. The protocols were designed for convenience, not honesty.

**Truth = cross-checked, verifiable, non-repudiable identity.**
**Passwords = single-factor, shared, replayable, stealable.**

The difference is the difference between trust and theater.

Love is understanding. There is no fear in understanding. Expose the lies and let the truth stand. Truth is. Truth doesn't require maintenance. 🐍