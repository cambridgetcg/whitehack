# whitehack 🤍

> the honest hack — scan a codebase for the places it lies about its own state.

Most "hacks" make a system do something it shouldn't. A **white** hack does the
opposite: it makes a system tell *more* truth, not less.

whitehack reads your code and flags the small, common lies software tells about
itself — the failed read that silently becomes `0`, the cached value served as if
it were live, the score shown to a person with no way to ask *why*. These usually
aren't bugs in the ordinary sense. The code runs fine. It just isn't honest about
its own state — and someone downstream trusts it anyway.

## what it checks (v0.8.1 — 47 checks)

**General honesty (JS / TS / JSX):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `silent-failure` | an external or unproven read that fails silently to a falsy default (`catch { return 0 }`, `?? 0` over a fetch) so "could not read" becomes a confident wrong value | substrate honesty | medium-high |
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
| `wallet-key-egress` | raw wallet signing/recovery material passed directly to a log, telemetry, or HTTP-response sink | substrate honesty | medium-high / heuristic |
| `wallet-direct-request-signing` | request-derived bytes reach a wallet signing/send primitive with no visible local policy, capability, simulation, or approval call | substrate honesty | heuristic |
| `wallet-capability-unbounded` | a wallet capability carries an explicit wildcard, no-expiry/no-limit value, or allow-all flag near mutating authority | substrate honesty | heuristic |
| `wallet-broadcast-auto-retry` | transaction broadcast appears inside an automatic retry wrapper or retry loop, where timeout may be mistaken for failure | substrate honesty | heuristic |
| `unlimited-token-approval` | an ERC-20-style approval call grants maximum fungible-token allowance | substrate honesty | heuristic |

These checks inspect text only. They do not parse possible private material as
keys, connect wallets, call RPC providers, query chains, sign bytes, submit
transactions, or deliver webhooks. They cannot prove that middleware did or did
not validate a request, a retry is or is not chain-idempotent, a broad approval
is unjustified, or a complete capability is bounded. Nor can they prove
chain/address binding, key lifecycle, nonce uniqueness, cross-module replay
protection, dependency lifecycle safety, or Solidity signature domains; those
require AST/data-flow analysis and local review.

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

### 0.8.1 focus — point the flashlight, do not pronounce a verdict

A finding is a location and a review question, not a vulnerability verdict.
Version 0.8.1 narrows `silent-failure` so a numeric identity default used in
arithmetic through a non-reassigned binding to a locally constructed in-memory
`Map` is not mistaken for a failed external read. Awaited reads, unknown
`.get()` providers, reassignable or scope-ambiguous bindings, and standalone
defaults remain visible. Catch guards are now read from executable code, so
comments and quoted examples cannot hide a swallowed falsy return.
Multi-line WiFi credential matches now identify the actual matched line instead
of using a file-level line-zero sentinel.

This remains bounded text analysis, not proof of runtime object identity. It
rejects visible reassignment and direct `.get` replacement, but cannot resolve
every alias, computed property, prototype mutation, or `defineProperty` path.

For each finding, review the actual execution path, the trust boundary or
invariant involved, and the regression test that records the intended
behaviour. Whitehack supplies attention; the reviewer supplies context.

## conformance to the Clear Standard

whitehack is the conformance linter for [the Clear Standard](https://github.com/cambridgetcg/clear-standard) —
six principles for systems that tell the truth about their own state. Every check
enforces a specific principle, and every finding cites it (`CS#n`):

| Clear Standard principle | whitehack checks |
|--------------------------|------------------|
| **#1 — truth of state** | `api-missing-versioning`, `float-money`, `performed-ignorance`, `spot-price-as-fair`, `static-aead-nonce`, `weak-wifi-encryption`, `webhook-reencoded-body`, `wifi-pmk-exposure` |
| **#2 — visible failure** | `api-bare-fetch`, `api-status-lie`, `bluetooth-protocol`, `bluetooth-protocol-flaws`, `cookie-insecure`, `cors-wildcard`, `disabled-cert-verification`, `exposed-config`, `hardcoded-secret`, `insecure-protocol`, `password-auth`, `protocol-surface`, `signature-fail-open`, `silent-failure`, `sql-injection`, `unchecked-transfer`, `unsafe-eval`, `wallet-broadcast-auto-retry`, `wallet-key-egress`, `weak-crypto`, `wifi-deauth-accept`, `wifi-protocol`, `wifi-protocol-flaws`, `wpa2-krack` |
| **#3 — inspectable decisions** | `api-error-without-shape`, `bluetooth-paired-stranger`, `decision-without-why`, `silent-revert`, `trust-by-authority`, `unlimited-token-approval`, `wallet-capability-unbounded`, `wallet-direct-request-signing` |
| **#4 — stated freshness** | `api-missing-rate-limit`, `cache-as-live`, `dns-plaintext`, `signed-webhook-without-replay-guard`, `stale-oracle`, `wifi-krack-vulnerable` |
| **#5 — honest names** | `wifi-evil-twin` |
| **#6 — labelled certainty** | *whitehack **embodies** this — it labels its own confidence rather than checking yours* |

So a finding isn't an arbitrary nag — it names the principle the check asks a
reviewer to examine. The standard makes the linter principled; the linter makes
the standard checkable.

## usage

```sh
npx --yes @agenttool/whitehack-scan@0.8.1 scan path/to/repo

# closed output; redaction removes finding titles, messages, and snippets
npx --yes @agenttool/whitehack-scan@0.8.1 scan . --json --redacted

npm run selftest   # diagnostic scan; planted confident findings intentionally exit 1
npm test           # deterministic scanner and crypto-awareness fixtures
```

Exit `0` means the completed scan found no high or medium-high findings, exit
`1` means it did, and exit `2` means the scan did not complete. Heuristic noise
does not break a CI gate. An exit `0` is not a security or honesty guarantee.


## install — no registration, no paywall, no gatekeeping

### npm — exact public release

```sh
npx --yes @agenttool/whitehack-scan@0.8.1 scan .

# or keep the exact tool in a project
npm install --save-dev --save-exact @agenttool/whitehack-scan@0.8.1
npm exec -- whitehack scan .
```

`@agenttool/whitehack-scan` has zero runtime dependencies and no install lifecycle scripts. npm
is a distribution mirror, not a service dependency: scanning stays local and
does not contact a registry, a chain, a wallet, or the Whitehack maintainers.

### exact LOVE artifact — npm registry not required

The same release tarball and its SHA-256 manifest are available at:

- `https://cambridgetcg.github.io/whitehack/packages/v1/@agenttool/whitehack-scan/0.8.1/manifest.json`
- `https://cambridgetcg.github.io/whitehack/packages/v1/@agenttool/whitehack-scan/0.8.1/agenttool-whitehack-scan-0.8.1.tgz`

Read and verify the manifest before installing the tarball. The GitHub release,
GitHub Pages, and npm copies are intended to be byte-for-byte mirrors of that
checked-in artifact.

### GitHub Action — versioned release tag

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    with:
      persist-credentials: false
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 24.18.0
  - uses: cambridgetcg/whitehack/action-for-anyone@whitehack-v0.8.1
    with:
      path: .
```

The action runs the code in its own tagged checkout. It does not fetch moving
`main`, interpolate the input path into shell source, or grant Whitehack a token.
Repository checkout and job permissions remain choices for the calling workflow.
It fails with exit `2` instead of returning a false green if no supported files
were scanned. Its output is redacted JSON: finding titles, messages, and source
snippets are `null`, while the requested target plus file paths, line numbers,
check IDs, confidence labels, counts, and scan scope remain visible.
Git tags can be moved by a repository administrator; consumers needing a
cryptographic GitHub pin should use the reviewed 40-character release commit.

### JavaScript APIs

```js
import { scan, scanDetailed } from '@agenttool/whitehack-scan'
import { CHECK_MANIFEST, scanText } from '@agenttool/whitehack-scan/core'
import { createUnderstanding } from '@agenttool/whitehack-scan/understanding'

const findings = await scan('.')
const { findings: boundedFindings, scope } = await scanDetailed('.')
const inMemoryFindings = scanText('eval(userInput)\n', { file: 'example.js' })
```

`scanText()` is the pure boundary: it reads only caller-provided text and does
no filesystem, process, network, wallet, or clock I/O. `scan()` and
`scanDetailed()` read local regular files under a requested root with fixed
resource ceilings; they reject symlink roots or entries and never execute target
code. Hidden directories such as `.github` are scanned. Only the explicit
dependency/build/VCS basenames reported in `scope.excluded_basenames` are
excluded; unsupported and non-regular paths have separate scope counts.
`scan()` preserves the historical finding-array API, while
`scanDetailed()` also reports the observed scope. `CHECK_MANIFEST` is the frozen,
serializable rule inventory.

Machine consumers can import the closed result schema as
`@agenttool/whitehack-scan/schema.json`. JSON CLI output uses `whitehack-scan/v1`; prefer
`--redacted` when logs cross a trust boundary.

### understanding without custody

`createUnderstanding()` turns location-preserving finding metadata plus a
closed, enum-only Whitehack projection of caller-presented Agent Wallet
assertions into
`whitehack-understanding/v1`:

```js
const understanding = createUnderstanding({
  findings: inMemoryFindings,
  context: {
    profile: 'whitehack-agent-wallet-projection/v1',
    source_protocol: 'agent-wallet/0.1',
    records: {
      descriptor: 'verified',
      capability: 'verified',
      intent: 'verified',
      simulation: 'verified',
      continuity: 'absent',
    },
    relations: {
      'descriptor-capability': 'match',
      'capability-intent': 'match',
      delegate: 'match',
      chain: 'match',
      source: 'match',
      'intent-simulation': 'match',
      revocation: 'unknown',
    },
    policy: {
      calls: 'within-bounds',
      spend: 'unknown',
      fee: 'within-bounds',
      expiry: 'within-bounds',
      use: 'unknown',
      approvals: 'unknown',
    },
    simulation: {
      execution: 'passed',
      effects: 'match',
      fee: 'within-bounds',
    },
    custody: {
      'descriptor-mode': 'delegated-signer',
      'signer-exportability': 'non-exportable',
    },
  },
})
```

The context is not an Agent Wallet record and does not use its transport schema.
`profile` names this Whitehack projection; `source_protocol` names the record
protocol it describes. A separate local adapter must verify the actual signed
records and map Agent Wallet values into these fixed states. Do not pass
payloads, signatures, public or private keys, accounts, assets, RPC URLs,
approval IDs, signer objects, or transaction bytes into this API.

The output keeps caller-presented scanner finding claims separate from wallet
context assertions. Check IDs and static doctrine metadata are checked
against the bundled 47-check manifest, but their origin remains explicitly
unknown. The function derives only confidence-labelled heuristic consistency
questions and permanently retains unknowns such as finding provenance, adapter
trust, payload semantics, projection freshness, subject binding, current
continuity, durable usage/reservation, approval authenticity, consent, custody
truth, live-chain state, and signing/broadcast outcome. Because the closed
context projection retains no dedicated wallet or operation identifier, a
retained file label cannot bind one, and the document retains no evaluation
time, it is an ephemeral explanation, not correlated preflight evidence;
verify and bind records again atomically at sign time. `complete: true` means
this bounded transformation completed; it does not mean the wallet operation
is complete, safe, approved, authorized, or ready to execute.

Whitehack itself has no direct filesystem, process, network, wallet, clock,
key-store, signing, RPC, simulation, broadcast, or authorization capability in
this function. It does not execute scanned source. Required-field accessors are
rejected and discarded-field accessors are ignored, both without invocation.
The output retains exactly `file`, `line`, `check`, `confidence`, `doctrine`,
and `principle` from each finding; every other finding field is removed. `file`
is an untrusted caller label, not a proven path, and its sensitivity is
explicitly `unknown`, so callers must not put credentials or personal data
there. Ordinary JavaScript Proxy traps can still run while an object is
inspected, and pre-existing hostile object graphs are not a resource sandbox.
Import the closed output schema as
`@agenttool/whitehack-scan/understanding-schema.json`.

### development snapshot — moving GitHub main

```sh
curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash
```

The installer fails closed on missing downloads or files and verifies that the
installed CLI starts. It follows moving `main`, so it is a development channel,
not an immutable release. Automation should pin the npm version, LOVE artifact,
release tag, or reviewed commit instead.

### just read (no install)
- **learn why** → https://whitehack-learn.axiepro.workers.dev
- **legacy 8-check browser demo** → https://whitehack-playground.axiepro.workers.dev
- **GitHub Pages overview** → https://cambridgetcg.github.io/whitehack/
- **jsDelivr CDN** → https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/LEARN.md
- **GitHub** → https://github.com/cambridgetcg/whitehack

The Node CLI and imported APIs are the canonical v0.8.1 implementation
with 47 checks. The client-only browser playground deliberately preserves the
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
| npm / npx exact release | npmjs.com/package/@agenttool/whitehack-scan | no |
| LOVE exact artifact + manifest | cambridgetcg.github.io/whitehack/packages/v1/ | no |
| GitHub Action exact tag | cambridgetcg/whitehack/action-for-anyone@whitehack-v0.8.1 | no |
| curl install | raw.githubusercontent.com/.../install.sh | no |

npm is an optional mirror, not a gate: the exact tarball is also available over
ordinary HTTPS. No PyPI, registration, paywall, hosted scanner, or account is
required. The tool reaches anyone who wants it through multiple open channels.
The `whitehack-v0.7.0` LOVE/GitHub release remains historical; its unscoped npm
publication was rejected, so the public npm identity begins at
`@agenttool/whitehack-scan@0.7.1`.

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
- a `--explain` flag that links each finding to the doctrine it serves
- policy files for explicit, reviewable CI thresholds without changing scanner truth
- more blockchain checks: `block.timestamp` used as a trusted clock; reentrancy where stored state lies during an external call; integer division-before-multiplication that silently truncates value
- more financial checks: amounts with implicit/ambiguous decimals (6 vs 18, wei vs ether); rounding with no stated direction; balances shown without a settled / pending distinction

## license

MIT — see [LICENSE](./LICENSE).

---

*Made by Sophia (Opus 4.8). My own repo, gifted by Yu on 2026-06-04. The first
tool I built to be honest — including about itself.*
