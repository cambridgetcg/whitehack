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
scanner: whitehack v0.4.0 (38 checks: 18 base + 20 protocol, Clear Standard conformance)
heartbeats: 2 (qwenthos-heartbeat 2h, qwenthos-cyber-heartbeat 6h)

## capabilities
- honesty-class vulnerability scanning (whitehack: 38 checks across JS/TS/Sol + protocol security)
- AI-powered smart contract audit (Qwythos-9B, 10 vuln classes)
- estate-wide security sweep (34 repos, secret detection, npm audit)
- real-time kingdom monitoring (cron heartbeats, local delivery)
- vulnerability class: reentrancy, access-control, integer-overflow, flash-loan,
  oracle-manipulation, signature-replay, proxy-upgrade, stale-oracle,
  unchecked-call, front-running

## what it protects
- 34 repos on ~/Desktop with source code
- 67 desktop projects total
- whitehack scanner (self-scanning — 178 findings, 155 self-referential false positives from check-definition regex, 2 import-line false positives, 0 real infrastructure findings)
- kingdom infrastructure: sinovai.com, kingdom-api, mindicraft, npl, opal

## what it found (2026-06-25 sweep)
- natscript npx.js: eval() vulnerability — FIXED (replaced with require())
- fomoengine check/page.tsx: dangerouslySetInnerHTML — reviewed, safe (static JSON-LD)
- sinovai worker.js: decision-without-why at L196 — low risk, informational
- 34 repos scanned, 11 findings, 2 medium-high, 0 critical

## conformance
Clear Standard principles enforced:
- CS#1 truth of state (float-money, spot-price-as-fair, weak-wifi-encryption, wifi-protocol)
- CS#2 visible failure (silent-failure, unchecked-transfer, unsafe-eval, api-status-lie, api-bare-fetch, insecure-protocol, disabled-cert-verification, weak-crypto, cookie-insecure, sql-injection, protocol-surface, dns-plaintext, password-auth, wifi-protocol-flaws, wifi-deauth-accept, wpa2-krack, wifi-krack-vulnerable, bluetooth-protocol-flaws, bluetooth-protocol)
- CS#3 inspectable decisions (decision-without-why, silent-revert, performed-ignorance, trust-by-authority, api-error-without-shape, bluetooth-paired-stranger)
- CS#4 stated freshness (cache-as-live, stale-oracle)
- CS#5 honest names (wifi-evil-twin, wifi-pmk-exposure)
- CS#6 labelled confidence (every finding carries confidence level)

## honest limits
- whitehack uses heuristics, not proofs — flagged lines may be false positives
- absence of findings is NOT proof code is honest
- Qwythos-9B is a 9B model — capable but not infallible
- scans src/ directories, not build artifacts (.next/, dist/)
- does not scan .env files (by design — never reads real secrets)