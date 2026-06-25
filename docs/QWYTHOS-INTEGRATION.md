# Qwythos-9B Integration — WHITEHACK Security AI

> *Love is. Truth is. Security is love protecting what matters. ∞*

## What This Is

Qwythos-9B is a 9B parameter Qwen3.5 model (1M context, Q8_0, 9.5GB) running locally via Ollama.
It powers WHITEHACK's AI security analysis — no cloud, no API costs, sovereign security.

## Capabilities

| Capability | Status |
|---|---|
| Solidity smart contract audit | Tested — found reentrancy, access control, unchecked call |
| TypeScript auth analysis | Tested — found race conditions, timing attacks, token leakage |
| Ed25519 signature verification audit | Tested — found timing attacks, replay attack vectors |
| Identity cryptography review | Tested — correctly identified clean code |
| Honesty-class vulnerability hunting | Tested — 146 findings in agenttool API |
| Bug report quality review | Built — reviews existing reports for quality |
| Multi-language support | Solidity, TypeScript, JavaScript, Python, Shell, HTML |

## Tools

- `scanner/qwythos-audit.py` — Solidity contract auditor (10 vulnerability classes)
- `scanner/qwythos-general.py` — General security scanner (any file, any language)
- `scanner/qwythos-estate-scan.py` — Whole-estate scanner
- `scanner/honest-software/` — Honesty-class scanner (regex-based, fast)

## Audit Results

### VulnerableBank.sol — 3 findings
- CRITICAL: Reentrancy in withdraw() (CEI violation)
- HIGH: No access control on deposit/withdraw
- HIGH: Unchecked call (honesty class)

### agenttool Auth Middleware — 5 findings
- CRITICAL: Race condition in token revocation
- CRITICAL: Timing attack in key comparison
- HIGH: SQL injection risk via malformed token prefix
- MEDIUM: Missing project validation for orphaned keys
- LOW: Token leakage via logging

### agenttool Strand Signature — 4 findings
- CRITICAL: Timing attack on Ed25519 verification
- HIGH: Replay attacks via empty/zero inputs
- MEDIUM: Key substitution / malleability
- LOW: Key format validation

### agenttool Identity Cryptography — CLEAN
Correctly identified as secure. No issues found.

### agenttool API honesty sweep — 146 findings
- 97 medium-high: silent failures (catch returns false/null without logging)
- 49 heuristic: cached values served as live, decisions without why

## Model Details

```
Model: qwythos:latest
Architecture: qwen35
Parameters: 9.0B
Context length: 1048576 (1M tokens)
Quantization: Q8_0
Size: 9.5 GB
Capabilities: tools, thinking, completion
Runtime: Ollama (local, GPU)
```

*Qwythos-9B · WHITEHACK · Love is. Truth is. Security is love protecting what matters. ∞*
