// Protocol data, not a view over the moving detector registry. A capsule must
// remain verifiable after checks change, so each scanner identity selects one
// immutable tuple profile: [check, confidence, doctrine, principle].
const V0_9_TUPLES = Object.freeze([
  ['silent-failure', 'medium-high', 'substrate-honesty', 2],
  ['cache-as-live', 'heuristic', 'substrate-honesty', 4],
  ['decision-without-why', 'heuristic', 'transparency', 3],
  ['stale-oracle', 'medium-high', 'substrate-honesty', 4],
  ['unchecked-transfer', 'medium-high', 'substrate-honesty', 2],
  ['spot-price-as-fair', 'heuristic', 'substrate-honesty', 1],
  ['silent-revert', 'heuristic', 'transparency', 3],
  ['float-money', 'medium-high', 'substrate-honesty', 1],
  ['hardcoded-secret', 'high', 'substrate-honesty', 2],
  ['exposed-config', 'high', 'substrate-honesty', 2],
  ['unsafe-eval', 'medium-high', 'substrate-honesty', 2],
  ['performed-ignorance', 'medium-high', 'substrate-honesty', 1],
  ['trust-by-authority', 'heuristic', 'trust-protocol', 3],
  ['api-status-lie', 'high', 'substrate-honesty', 2],
  ['api-missing-versioning', 'heuristic', 'substrate-honesty', 1],
  ['api-error-without-shape', 'heuristic', 'substrate-honesty', 3],
  ['api-missing-rate-limit', 'heuristic', 'substrate-honesty', 4],
  ['api-bare-fetch', 'medium-high', 'substrate-honesty', 2],
  ['wifi-protocol-flaws', 'medium-high', 'substrate-honesty', 2],
  ['bluetooth-protocol-flaws', 'medium-high', 'substrate-honesty', 2],
  ['bluetooth-protocol', 'high', 'substrate-honesty', 2],
  ['insecure-protocol', 'medium-high', 'substrate-honesty', 2],
  ['disabled-cert-verification', 'high', 'substrate-honesty', 2],
  ['weak-crypto', 'medium-high', 'substrate-honesty', 2],
  ['cors-wildcard', 'medium-high', 'substrate-honesty', 2],
  ['cookie-insecure', 'medium-high', 'substrate-honesty', 2],
  ['sql-injection', 'high', 'substrate-honesty', 2],
  ['protocol-surface', 'medium-high', 'substrate-honesty', 2],
  ['dns-plaintext', 'heuristic', 'substrate-honesty', 4],
  ['password-auth', 'high', 'substrate-honesty', 2],
  ['bluetooth-paired-stranger', 'heuristic', 'substrate-honesty', 3],
  ['wpa2-krack', 'medium-high', 'substrate-honesty', 2],
  ['weak-wifi-encryption', 'high', 'substrate-honesty', 1],
  ['wifi-deauth-accept', 'medium-high', 'substrate-honesty', 2],
  ['wifi-evil-twin', 'medium-high', 'substrate-honesty', 5],
  ['wifi-pmk-exposure', 'high', 'substrate-honesty', 1],
  ['wifi-krack-vulnerable', 'medium-high', 'substrate-honesty', 4],
  ['wifi-protocol', 'high', 'substrate-honesty', 2],
  ['static-aead-nonce', 'heuristic', 'substrate-honesty', 1],
  ['signature-fail-open', 'medium-high', 'substrate-honesty', 2],
  ['webhook-reencoded-body', 'heuristic', 'substrate-honesty', 1],
  ['signed-webhook-without-replay-guard', 'heuristic', 'substrate-honesty', 4],
  ['wallet-key-egress', 'medium-high', 'substrate-honesty', 2],
  ['wallet-direct-request-signing', 'heuristic', 'substrate-honesty', 3],
  ['wallet-capability-unbounded', 'heuristic', 'substrate-honesty', 3],
  ['wallet-broadcast-auto-retry', 'heuristic', 'substrate-honesty', 2],
  ['unlimited-token-approval', 'heuristic', 'substrate-honesty', 3],
].map((tuple) => Object.freeze(tuple)))

// The dev scanner intentionally starts from the same 47-tuple protocol
// profile. This is a separate version selection, not a fallback or promotion.
const V0_10_DEV_TUPLES = Object.freeze([...V0_9_TUPLES])

function profile(version, tuples) {
  return Object.freeze({
    version,
    check_count: tuples.length,
    tuples,
    checks: Object.freeze(Object.fromEntries(tuples.map(([id, confidence, doctrine, principle]) => [
      id,
      Object.freeze({ id, confidence, doctrine, principle }),
    ]))),
  })
}

const PROFILES = Object.freeze({
  '0.9.0': profile('0.9.0', V0_9_TUPLES),
  '0.10.0-dev.0': profile('0.10.0-dev.0', V0_10_DEV_TUPLES),
})

export function evidenceCapsuleScannerProfile(version) {
  return PROFILES[version]
}
