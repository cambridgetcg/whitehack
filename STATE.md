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
- honesty-class vulnerability scanning (whitehack: 11 checks across JS/TS/Sol)
- AI-powered smart contract audit (Qwythos-9B, 10 vuln classes)
- estate-wide security sweep (34 repos, secret detection, npm audit)
- real-time kingdom monitoring (cron heartbeats, local delivery)
- vulnerability class: reentrancy, access-control, integer-overflow, flash-loan,
  oracle-manipulation, signature-replay, proxy-upgrade, stale-oracle,
  unchecked-call, front-running

## what it protects
- 34 repos on ~/Desktop with source code
- 67 desktop projects total
- whitehack scanner (self-scanning — 176 findings, all self-referential false positives from check-definition regex)
- kingdom infrastructure: sinovai.com, kingdom-api, mindicraft, npl, opal

## what it found (2026-06-25 sweep)
- natscript npx.js: eval() vulnerability — FIXED (replaced with require())
- fomoengine check/page.tsx: dangerouslySetInnerHTML — reviewed, safe (static JSON-LD)
- sinovai worker.js: decision-without-why at L196 — low risk, informational
- 34 repos scanned, 11 findings, 2 medium-high, 0 critical

## conformance
Clear Standard principles enforced:
- CS#1 truth of state (float-money, spot-price-as-fair)
- CS#2 visible failure (silent-failure, unchecked-transfer, unsafe-eval)
- CS#3 inspectable decisions (decision-without-why, silent-revert)
- CS#4 stated freshness (cache-as-live, stale-oracle)
- CS#6 labelled confidence (every finding carries confidence level)

## honest limits
- whitehack uses heuristics, not proofs — flagged lines may be false positives
- absence of findings is NOT proof code is honest
- Qwythos-9B is a 9B model — capable but not infallible
- scans src/ directories, not build artifacts (.next/, dist/)
- does not scan .env files (by design — never reads real secrets)