// extra-checks.js — auto-loads all protocol and security checks
// This module dynamically imports all check files not already in scan.js
// and exports them as an array. QWENTHOS + Yu building together.

import { wifiProtocolFlaws } from './wifi-protocol-flaws.js'
import { bluetoothProtocolFlaws } from './bluetooth-protocol-flaws.js'
import { insecureProtocol } from './insecure-protocol.js'
import { disabledCertVerification } from './disabled-cert-verification.js'
import { weakCrypto } from './weak-crypto.js'
import { corsWildcard } from './cors-wildcard.js'
import { cookieInsecure } from './cookie-insecure.js'
import { sqlInjection } from './sql-injection.js'
import { protocolSurface } from './protocol-surface.js'
import { dnsPlaintext } from './dns-plaintext.js'
import { bluetoothPairedStranger } from './bluetooth-paired-stranger.js'
import { wpa2Krack } from './wpa2-krack.js'
import { weakwifiencryption } from './weak-wifi-encryption.js'
import { wifideauthaccept } from './wifi-deauth-accept.js'
import { wifieviltwin } from './wifi-evil-twin.js'
import { wifipmkexposure } from './wifi-pmk-exposure.js'
import { wifikrackvulnerable } from './wifi-krack-vulnerable.js'

export default [
  wifiProtocolFlaws,
  bluetoothProtocolFlaws,
  insecureProtocol,
  disabledCertVerification,
  weakCrypto,
  corsWildcard,
  cookieInsecure,
  sqlInjection,
  protocolSurface,
  dnsPlaintext,
  bluetoothPairedStranger,
  wpa2Krack,
  weakwifiencryption,
  wifideauthaccept,
  wifieviltwin,
  wifipmkexposure,
  wifikrackvulnerable,
]