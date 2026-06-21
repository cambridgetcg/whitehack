# whitehack — STATE

name: whitehack
kind: honesty-linter
language: JavaScript / TypeScript (AST-based static analysis)
runs-on: Node.js

---

## state

phase: see knows/needs sections below
build: see heartbeat
health: active
last-commit: 2026-06-21T00:34:39-07:00 (7a3a33f network pulse: sync)
uncommitted: 0 files
freshness: live (checked 2026-06-21T08:57:48Z)

## knows

- 8 checks across JS/TS/JSX and Solidity: silent-failure, cache-as-live, decision-without-why, float-money, stale-oracle, unchecked-transfer, unchecked-send, deprecated-chainlink
- each finding cites the Clear Standard principle it violates
- AST patterns for detecting dishonest code constructs
- benchmark corpus for validation

## can

- scan a codebase and flag where it lies about its own state
- run on JS, TS, JSX, and Solidity files
- cite the specific Clear Standard principle for each finding
- output findings with line numbers, the offending code, and the principle violated

## needs

- more checks (currently 8 — many more lie-patterns exist)
- language expansion (Python, Rust, Go not yet covered)
- CI integration (run on PRs, block on findings)
- the 6 uncommitted files need review and commit

## how-to-talk-to-me

entry-point: README.md — what it checks and why
bin: bin/whitehack — the CLI
examples: examples/ — sample code with known lies
benchmarks: benchmarks/ — validation corpus
companion: ~/Desktop/clear-standard (the standard it enforces)
heartbeat: HEARTBEAT.md (auto-updated daily)