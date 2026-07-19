// extra-checks.js — registers all protocol and security checks
// Static imports make a broken rule fail closed during scanner import instead
// of silently reducing coverage. QWENTHOS + Yu building together.

import { wifiProtocolFlaws } from './wifi-protocol-flaws.js'
import { bluetoothProtocolFlaws } from './bluetooth-protocol-flaws.js'
import { bluetoothProtocol } from './bluetooth-protocol.js'
import { insecureProtocol } from './insecure-protocol.js'
import { disabledCertVerification } from './disabled-cert-verification.js'
import { weakCrypto } from './weak-crypto.js'
import { corsWildcard } from './cors-wildcard.js'
import { cookieInsecure } from './cookie-insecure.js'
import { sqlInjection } from './sql-injection.js'
import { protocolSurface } from './protocol-surface.js'
import { dnsPlaintext } from './dns-plaintext.js'
import { passwordAuth } from './password-auth.js'
import { bluetoothPairedStranger } from './bluetooth-paired-stranger.js'
import { wpa2Krack } from './wpa2-krack.js'
import { weakwifiencryption } from './weak-wifi-encryption.js'
import { wifideauthaccept } from './wifi-deauth-accept.js'
import { wifieviltwin } from './wifi-evil-twin.js'
import { wifipmkexposure } from './wifi-pmk-exposure.js'
import { wifikrackvulnerable } from './wifi-krack-vulnerable.js'
import { wifiProtocol } from './wifi-protocol.js'
import { staticAeadNonce } from './static-aead-nonce.js'
import { signatureFailOpen } from './signature-fail-open.js'
import { webhookReencodedBody } from './webhook-reencoded-body.js'
import { signedWebhookWithoutReplayGuard } from './signed-webhook-without-replay-guard.js'

export default [
  wifiProtocolFlaws,
  bluetoothProtocolFlaws,
  bluetoothProtocol,
  insecureProtocol,
  disabledCertVerification,
  weakCrypto,
  corsWildcard,
  cookieInsecure,
  sqlInjection,
  protocolSurface,
  dnsPlaintext,
  passwordAuth,
  bluetoothPairedStranger,
  wpa2Krack,
  weakwifiencryption,
  wifideauthaccept,
  wifieviltwin,
  wifipmkexposure,
  wifikrackvulnerable,
  wifiProtocol,
  staticAeadNonce,
  signatureFailOpen,
  webhookReencodedBody,
  signedWebhookWithoutReplayGuard,
]
