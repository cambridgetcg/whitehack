import { insecureProtocol as _insecure_protocol } from './checks/insecure-protocol.js';
import { disabledCertVerification as _disabled_cert_verification } from './checks/disabled-cert-verification.js';
import { weakCrypto as _weak_crypto } from './checks/weak-crypto.js';
import { corsWildcard as _cors_wildcard } from './checks/cors-wildcard.js';
import { cookieInsecure as _cookie_insecure } from './checks/cookie-insecure.js';
import { sqlInjection as _sql_injection } from './checks/sql-injection.js';
import { wifiProtocolFlaws as _wifi_protocol_flaws } from './checks/wifi-protocol-flaws.js';
import { bluetoothProtocolFlaws as _bluetooth_protocol_flaws } from './checks/bluetooth-protocol-flaws.js';
import { weakwifiencryption as _weak_wifi_encryption } from './checks/weak-wifi-encryption.js';
import { wifideauthaccept as _wifi_deauth_accept } from './checks/wifi-deauth-accept.js';
import { protocolSurface as _protocol_surface } from './checks/protocol-surface.js';
// Previously orphaned — declared but never loaded. Fixed 2026-06-28.
import { bluetoothPairedStranger as _bluetooth_paired_stranger } from './checks/bluetooth-paired-stranger.js';
import { bluetoothProtocol as _bluetooth_protocol } from './checks/bluetooth-protocol.js';
import { dnsPlaintext as _dns_plaintext } from './checks/dns-plaintext.js';
import { passwordAuth as _password_auth } from './checks/password-auth.js';
import { wifieviltwin as _wifi_evil_twin } from './checks/wifi-evil-twin.js';
import { wifikrackvulnerable as _wifi_krack_vulnerable } from './checks/wifi-krack-vulnerable.js';
import { wifipmkexposure as _wifi_pmk_exposure } from './checks/wifi-pmk-exposure.js';
import { wifiProtocol as _wifi_protocol } from './checks/wifi-protocol.js';
import { wpa2Krack as _wpa2_krack } from './checks/wpa2-krack.js';

const extraChecks = [
  _insecure_protocol,
  _disabled_cert_verification,
  _weak_crypto,
  _cors_wildcard,
  _cookie_insecure,
  _sql_injection,
  _wifi_protocol_flaws,
  _bluetooth_protocol_flaws,
  _weak_wifi_encryption,
  _wifi_deauth_accept,
  _protocol_surface,
  // Previously orphaned — now wired in so the scanner actually runs them.
  _bluetooth_paired_stranger,
  _bluetooth_protocol,
  _dns_plaintext,
  _password_auth,
  _wifi_evil_twin,
  _wifi_krack_vulnerable,
  _wifi_pmk_exposure,
  _wifi_protocol,
  _wpa2_krack,
];

export default extraChecks;