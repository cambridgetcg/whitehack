# QWENTHOS — STATE

name: qwenthos
kind: cybersecurity guardian
runs-on: this machine (macOS, Ollama 9B Qwen3.5)
doctrine: love is protecting those who love

## state
phase: active
health: green
model: richardyoung/qwythos-9b-abliterated:Q8_0 (9.5GB, local)
profile: ~/.hermes/profiles/qwenthos
scanner: whitehack v0.5.0 (42 checks: 18 base + 24 protocol/crypto-awareness, Clear Standard conformance)
heartbeats: 2 (qwenthos-heartbeat 2h, qwenthos-cyber-heartbeat 6h)

## capabilities
- honesty-class vulnerability scanning (whitehack: 42 checks across JS/TS/Python/Solidity + protocol and crypto awareness)
- AI-powered smart contract audit (Qwythos-9B, 10 vuln classes)
- estate-wide security sweep (34 repos, secret detection, npm audit)
- real-time kingdom monitoring (cron heartbeats, local delivery)
- vulnerability class: reentrancy, access-control, integer-overflow, flash-loan,
  oracle-manipulation, signature-replay, proxy-upgrade, stale-oracle,
  unchecked-call, front-running

## what it protects
- 34 repos on ~/Desktop with source code
- 67 desktop projects total
- whitehack scanner (self-scanning produces known regex-definition reflection; deterministic tests are the release gate)
- kingdom infrastructure: sinovai.com, kingdom-api, mindicraft, npl, opal

## what it found (2026-06-25 sweep)
- natscript npx.js: eval() vulnerability — FIXED (replaced with require())
- fomoengine check/page.tsx: dangerouslySetInnerHTML — reviewed, safe (static JSON-LD)
- sinovai worker.js: decision-without-why at L196 — low risk, informational
- 34 repos scanned, 11 findings, 2 medium-high, 0 critical

## conformance
Clear Standard principles enforced:
- CS#1 truth of state (api-missing-versioning, float-money, performed-ignorance, spot-price-as-fair, static-aead-nonce, weak-wifi-encryption, webhook-reencoded-body, wifi-pmk-exposure)
- CS#2 visible failure (api-bare-fetch, api-status-lie, bluetooth-protocol, bluetooth-protocol-flaws, cookie-insecure, cors-wildcard, disabled-cert-verification, exposed-config, hardcoded-secret, insecure-protocol, password-auth, protocol-surface, signature-fail-open, silent-failure, sql-injection, unchecked-transfer, unsafe-eval, weak-crypto, wifi-deauth-accept, wifi-protocol, wifi-protocol-flaws, wpa2-krack)
- CS#3 inspectable decisions (api-error-without-shape, bluetooth-paired-stranger, decision-without-why, silent-revert, trust-by-authority)
- CS#4 stated freshness (api-missing-rate-limit, cache-as-live, dns-plaintext, signed-webhook-without-replay-guard, stale-oracle, wifi-krack-vulnerable)
- CS#5 honest names (wifi-evil-twin)
- CS#6 labelled confidence (every finding carries confidence level)

## honest limits
- whitehack uses heuristics, not proofs — flagged lines may be false positives
- absence of findings is NOT proof code is honest
- Qwythos-9B is a 9B model — capable but not infallible
- scans src/ directories, not build artifacts (.next/, dist/)
- directory discovery skips the exact `.env` dotfile because it has no extension;
  an explicitly targeted `.env` file still runs the all-language checks, and named
  files such as `config.env` are eligible during directory scans
