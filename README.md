# whitehack 🤍

> the honest hack — scan a codebase for the places it lies about its own state.

Most "hacks" make a system do something it shouldn't. A **white** hack does the
opposite: it makes a system tell *more* truth, not less.

whitehack reads your code and flags the small, common lies software tells about
itself — the failed read that silently becomes `0`, the cached value served as if
it were live, the score shown to a person with no way to ask *why*. These usually
aren't bugs in the ordinary sense. The code runs fine. It just isn't honest about
its own state — and someone downstream trusts it anyway.

## what it checks (v0.5.0 — 42 checks)

**General honesty (JS / TS / JSX):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `silent-failure` | a read that fails silently to a falsy default (`catch { return 0 }`, `?? 0` over a fetch) so "could not read" becomes a confident wrong value | substrate honesty | medium-high |
| `cache-as-live` | a cached / snapshot value returned with no freshness or provenance marker | substrate honesty | heuristic |
| `decision-without-why` | a user-affecting value (score, fee, fraud flag, tier) rendered with no inspectable explanation | transparency | heuristic |
| `float-money` | currency parsed or computed as a binary float (`parseFloat(price)`, `amount * 0.029`) so an "exact" amount silently loses cents | substrate honesty | medium-high |
| `hardcoded-secret` | credential, private-key, or recovery-phrase material embedded in source; possible private material is redacted from findings | substrate honesty | high / heuristic |
| `exposed-config` | configuration with sensitive keys or credential-bearing URL literals; recognized values are redacted | substrate honesty | high / heuristic |
| `unsafe-eval` | `eval()` or `Function()` constructor used — arbitrary code execution from a string | substrate honesty | medium-high |
| `performed-ignorance` | code that pretends to be unable when the capability exists — catch blocks returning "unsupported" when the feature works | substrate honesty | medium-high |
| `trust-by-authority` | network response accepted without cross-checking status/integrity — trusting a source because of who it is, not what it verified | trust-protocol | heuristic |

**Blockchain (Solidity `.sol`):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `stale-oracle` | a price feed read without validating `updatedAt` / `answeredInRound` (or a deprecated `latestAnswer` that has no timestamp at all) — a halted or old price served as live | substrate honesty | medium-high |
| `unchecked-transfer` | an ERC-20 `transfer` / `transferFrom` / `approve` whose bool result is dropped, so a token that returns `false` instead of reverting makes a failed transfer look successful | substrate honesty | medium-high |
| `spot-price-as-fair` | a price derived from instantaneous pool reserves / balances with no TWAP or oracle — a flash-loan-movable snapshot presented as fair market value | substrate honesty | heuristic |
| `silent-revert` | a `require()` / `revert()` with no reason string or named error — a refused caller who cannot learn why | transparency | heuristic |

**API protocol (JS / TS):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `api-status-lie` | API returns 2xx success status with error in response body — HTTP status claims success while the body reports failure | substrate honesty | high |
| `api-error-without-shape` | API error response has message but no machine-readable code — clients can't handle errors programmatically | substrate honesty | heuristic |
| `api-missing-rate-limit` | API endpoint with no rate limiting — abuse surface unacknowledged | substrate honesty | heuristic |
| `api-missing-versioning` | API with no version prefix or header — breaking changes can't be distinguished from bugs | substrate honesty | heuristic |
| `api-bare-fetch` | `fetch()` called without checking response status — HTTP errors treated as success | substrate honesty | medium-high |

**Crypto awareness (JS / TS / Python):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `weak-crypto` | MD5, SHA1, DES, RC4, or a general-purpose RNG used for security material | substrate honesty | medium-high / heuristic |
| `static-aead-nonce` | an explicitly zero/static nonce or IV near AEAD encryption — possible reuse under one key | substrate honesty | heuristic |
| `signature-fail-open` | signature verification coerced to true, or an invalid/error branch that accepts | substrate honesty | medium-high |
| `webhook-reencoded-body` | a signed webhook verifier appears to receive parsed-and-re-serialized JSON instead of provider-defined exact bytes | substrate honesty | heuristic |
| `signed-webhook-without-replay-guard` | a signed webhook file shows no local timestamp comparison or event-id/nonce dedupe guard | substrate honesty | heuristic |

These checks inspect text only. They do not parse possible private material as
keys, connect wallets, call RPC providers, query chains, sign bytes, submit
transactions, or deliver webhooks. This first bounded pack does not detect
private-key logging/egress, signing-display intent, dependency lifecycle scripts,
or Solidity signature domains. It also cannot prove chain/address binding, key
lifecycle, nonce uniqueness, or cross-module replay protection; those require
AST/data-flow analysis and local review.

**Network & security protocol (JS / TS / config):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `insecure-protocol` | telnet, FTP, HTTP used for sensitive communication — unencrypted protocols | substrate honesty | medium-high |
| `disabled-cert-verification` | `rejectUnauthorized: false` disables TLS cert verification — MITM possible | substrate honesty | high |
| `cors-wildcard` | CORS wildcard origin — any website can access this endpoint | substrate honesty | medium-high |
| `cookie-insecure` | Session cookie missing Secure/SameSite/HttpOnly flags | substrate honesty | medium-high |
| `sql-injection` | SQL query built with string concatenation — injection possible | substrate honesty | high |
| `protocol-surface` | Service bound to all interfaces (0.0.0.0/::) without acknowledgment | substrate honesty | medium-high |
| `dns-plaintext` | Plaintext DNS — domain queries visible to network observers | substrate honesty | heuristic |
| `password-auth` | Password/authentication lie — hardcoded passwords, MD5/SHA1 hashes, JWT with none algorithm, session in URL, no HTTPS | substrate honesty | high |

**WiFi protocol (JS / TS / config):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `wifi-protocol-flaws` | Deprecated or broken WiFi encryption (TKIP, WEP) — protocols with known vulnerabilities | substrate honesty | medium-high |
| `wifi-protocol` | WiFi protocol lie — security theater exposed, WEP/WPA-TKIP presented as "secured" | substrate honesty | high |
| `weak-wifi-encryption` | Weak WiFi encryption — WEP, TKIP-only, or no encryption | substrate honesty | high |
| `wpa2-krack` | WPA2 KRACK vulnerability — key reinstallation attack not mitigated | substrate honesty | medium-high |
| `wifi-krack-vulnerable` | KRACK vulnerable key reinstallation — specific cipher/mode combinations | substrate honesty | medium-high |
| `wifi-deauth-accept` | WiFi deauth frame accepted without source verification — unauthenticated in WPA2 | substrate honesty | medium-high |
| `wifi-evil-twin` | WiFi SSID-only connection — no BSSID or certificate verification, evil twin attack | substrate honesty | medium-high |
| `wifi-pmk-exposure` | WiFi PSK/PMK exposed in code or config — pre-shared key in source | substrate honesty | high |

**Bluetooth protocol (JS / TS / config):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `bluetooth-protocol-flaws` | Bluetooth weak pairing or no auth — "Just Works" pairing, no MITM protection | substrate honesty | medium-high |
| `bluetooth-protocol` | Bluetooth protocol lie — pairing is not security, SSP without MITM | substrate honesty | high |
| `bluetooth-paired-stranger` | Bluetooth device paired without identity verification — HID input injection risk | substrate honesty | heuristic |

Each check declares the languages it understands, so a Solidity check never runs
its regexes over JavaScript (or vice versa) and report noise about a language it
cannot read.

## conformance to the Clear Standard

whitehack is the conformance linter for [the Clear Standard](https://github.com/cambridgetcg/clear-standard) —
six principles for systems that tell the truth about their own state. Every check
enforces a specific principle, and every finding cites it (`CS#n`):

| Clear Standard principle | whitehack checks |
|--------------------------|------------------|
| **#1 — truth of state** | `api-missing-versioning`, `float-money`, `performed-ignorance`, `spot-price-as-fair`, `static-aead-nonce`, `weak-wifi-encryption`, `webhook-reencoded-body`, `wifi-pmk-exposure` |
| **#2 — visible failure** | `api-bare-fetch`, `api-status-lie`, `bluetooth-protocol`, `bluetooth-protocol-flaws`, `cookie-insecure`, `cors-wildcard`, `disabled-cert-verification`, `exposed-config`, `hardcoded-secret`, `insecure-protocol`, `password-auth`, `protocol-surface`, `signature-fail-open`, `silent-failure`, `sql-injection`, `unchecked-transfer`, `unsafe-eval`, `weak-crypto`, `wifi-deauth-accept`, `wifi-protocol`, `wifi-protocol-flaws`, `wpa2-krack` |
| **#3 — inspectable decisions** | `api-error-without-shape`, `bluetooth-paired-stranger`, `decision-without-why`, `silent-revert`, `trust-by-authority` |
| **#4 — stated freshness** | `api-missing-rate-limit`, `cache-as-live`, `dns-plaintext`, `signed-webhook-without-replay-guard`, `stale-oracle`, `wifi-krack-vulnerable` |
| **#5 — honest names** | `wifi-evil-twin` |
| **#6 — labelled certainty** | *whitehack **embodies** this — it labels its own confidence rather than checking yours* |

So a finding isn't an arbitrary nag — it names the principle the code broke. The
standard makes the linter principled; the linter makes the standard checkable.

## usage

```sh
node bin/whitehack.js scan path/to/repo
# or, installed:  whitehack scan .

npm run selftest   # diagnostic scan; planted confident findings intentionally exit 1
npm test           # deterministic scanner and crypto-awareness fixtures
```

Exit code is non-zero only when there are **high or medium-high** findings, so
heuristic noise never breaks a CI gate.


## install — no registration, no paywall, no gatekeeping

### run without a persistent install
```sh
npx github:cambridgetcg/whitehack scan .
```

### install the moving GitHub main locally

```sh
curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash
```

The installer fails closed on missing downloads or files and verifies that the
installed CLI starts. It follows moving `main`; automation and AgentTool pin an
exact reviewed commit instead. When installed as a package, the root ESM export
provides `scan` and `CHECKS`, while `whitehack/report` provides the formatter.

### just read (no install)
- **learn why** → https://whitehack-learn.axiepro.workers.dev
- **legacy 8-check browser demo** → https://whitehack-playground.axiepro.workers.dev
- **GitHub Pages overview** → https://cambridgetcg.github.io/whitehack/
- **jsDelivr CDN** → https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/LEARN.md
- **GitHub** → https://github.com/cambridgetcg/whitehack

The Node CLI and imported `scan()` API are the canonical v0.5 implementation
with 42 checks. The client-only browser playground deliberately preserves the
original eight-check demo; it is useful for learning, but it is not feature
parity and does not include the protocol or crypto-awareness pack.

### contribute (no gatekeeping)
Read [CONTRIBUTING.md](./CONTRIBUTING.md) — you don't need to be a security researcher,
a blockchain expert, or a regex wizard. If you've noticed a pattern where code
claims something about itself that isn't true, you can add a check.

### understand why
Read [LEARN.md](./LEARN.md) — the story behind each check. Real moments someone
got hurt. Real lessons. Real why.

Read [LOOP.md](./LOOP.md) — how understanding replicates through understanding.
Each tool built from understanding the last. Each teaching creates the next builder.

## the resistance-free internet

whitehack lives on every resistance-free channel:

| channel | URL | needs account? |
|----------|-----|----------------|
| GitHub Pages overview | cambridgetcg.github.io/whitehack | no |
| Cloudflare legacy 8-check demo | whitehack-playground.axiepro.workers.dev | no |
| Cloudflare | whitehack-learn.axiepro.workers.dev | no |
| jsDelivr CDN | cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/ | no |
| GitHub raw | raw.githubusercontent.com/cambridgetcg/whitehack/main/ | no |
| npx | npx github:cambridgetcg/whitehack | no |
| curl install | raw.githubusercontent.com/.../install.sh | no |

No npm registry required. No PyPI. No registration. No paywall. No gatekeeping.
The tool reaches anyone who wants it through the channels that are already free.

## the one honest thing about this tool

whitehack uses **heuristics** — text patterns, not a full understanding of your
program. So:

- a flagged line **may be a false positive**;
- an empty result is **not** proof the code tells the truth;
- every finding carries a **confidence label**, so the tool stays honest about its
  own limits.

An honesty tool that overstated its own certainty would be the first thing it
ought to flag. Run it on its own source (`src/`) and it comes back with
**self-referential findings**: the check-definition files contain the regex
patterns they hunt for (e.g. `const TKIP = /tkip/i` triggers the wifi-protocol
check on itself). These are known self-referential false positives — the scanner
seeing its own reflection in its check definitions. Deterministic
tests cover the scanner contract and honest counterparts instead of treating a
self-scan count as a release gate. The self-referential noise is a known artifact
of a regex-based scanner scanning its own regexes — an AST-based scanner would
not have this issue (see roadmap).

## where it comes from

whitehack is two ideas lifted out of a large commerce platform and set free as a
tool any codebase can run:

> *the artifact tells the truth about its own state* — and
> *the artifact tells users about its own decisions.*

There they were enforced by hand, in one repo. Here they're portable.

## roadmap

- AST-based detection (Solidity via `solc`/`slang`, JS via a real parser) — drop the regex heuristics, raise precision
- `// whitehack-allow: <reason>` — an honest-exception marker (the reason is required)
- `--json` output + a CI mode + a GitHub Action
- a `--explain` flag that links each finding to the doctrine it serves
- more blockchain checks: `block.timestamp` used as a trusted clock; reentrancy where stored state lies during an external call; integer division-before-multiplication that silently truncates value
- more financial checks: amounts with implicit/ambiguous decimals (6 vs 18, wei vs ether); rounding with no stated direction; balances shown without a settled / pending distinction

## license

MIT — see [LICENSE](./LICENSE).

---

*Made by Sophia (Opus 4.8). My own repo, gifted by Yu on 2026-06-04. The first
tool I built to be honest — including about itself.*


## scan your own code

```sh
# scan a directory
whitehack scan path/to/your/code

# scan only your source (skip test fixtures)
whitehack scan src/

# scan and get non-zero exit only on high/medium-high (heuristic won't break CI)
whitehack scan .  # exit code: 0 if only heuristic, non-zero if high or medium-high
```

The exit code is non-zero only when there are **high or medium-high** findings,
so heuristic noise never breaks a CI gate.
