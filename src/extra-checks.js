import { insecureProtocol as _insecure_protocol } from './checks/insecure-protocol.js';
import { disabledCertVerification as _disabled_cert_verification } from './checks/disabled-cert-verification.js';
import { weakCrypto as _weak_crypto } from './checks/weak-crypto.js';
import { corsWildcard as _cors_wildcard } from './checks/cors-wildcard.js';
import { cookieInsecure as _cookie_insecure } from './checks/cookie-insecure.js';
import { sqlInjection as _sql_injection } from './checks/sql-injection.js';
import { wifiProtocolFlaws as _wifi_protocol_flaws } from './checks/wifi-protocol-flaws.js';
import { bluetoothProtocolFlaws as _bluetooth_protocol_flaws } from './checks/bluetooth-protocol-flaws.js';
import { check as _weak_wifi_encryption } from './checks/weak-wifi-encryption.js';
import { check as _wifi_deauth_accept } from './checks/wifi-deauth-accept.js';
import { protocolSurface as _protocol_surface } from './checks/protocol-surface.js';

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
];

export default extraChecks;