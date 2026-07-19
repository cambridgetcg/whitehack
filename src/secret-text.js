// Shared, deliberately small helpers for credential-shaped source text.
// Identifier matching uses components rather than suffix substrings, so a
// name such as `monkey` is not treated as a key while `stripeApiKey` is.

export { SENSITIVE_SNIPPET } from './redaction.js'

const STRONG_NAMES = [
  'password', 'passwd', 'secret', 'api_key', 'client_secret',
  'access_token', 'auth_token', 'private_key', 'signing_key',
  'wallet_key', 'secret_key', 'mnemonic', 'seed_phrase', 'recovery_phrase',
]
const PRIVATE_KEY_NAMES = ['private_key', 'signing_key', 'wallet_key', 'secret_key']
const RECOVERY_NAMES = ['mnemonic', 'seed_phrase', 'recovery_phrase']
const PLACEHOLDER = /(?:example|placeholder|your[_-]|dummy|replace[_-]?me|redacted|x{4,})/i
const DOCUMENTATION_NAME = /(?:^|_)(?:example|sample|docs?|documentation)(?:_|$)/

export function normalizeIdentifier(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function endsWithShape(name, shapes) {
  const normalized = normalizeIdentifier(name)
  const compact = normalized.replaceAll('_', '')
  return shapes.some((shape) => (
    normalized === shape
    || normalized.endsWith(`_${shape}`)
    || compact === shape.replaceAll('_', '')
    || compact.endsWith(shape.replaceAll('_', ''))
  ))
}

export function isSensitiveIdentifier(name) {
  return endsWithShape(name, STRONG_NAMES)
}

export function isPrivateKeyIdentifier(name) {
  return endsWithShape(name, PRIVATE_KEY_NAMES)
}

export function isRecoveryIdentifier(name) {
  return endsWithShape(name, RECOVERY_NAMES)
}

export function isPemContainerIdentifier(name) {
  const normalized = normalizeIdentifier(name)
  if (DOCUMENTATION_NAME.test(normalized)) return false
  return isPrivateKeyIdentifier(name) || /(?:^|_)pem(?:_|$)/.test(normalized)
}

export function looksPlaceholder(value) {
  return PLACEHOLDER.test(value)
}
