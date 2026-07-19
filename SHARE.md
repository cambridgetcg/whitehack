# whitehack — share this

Current v0.5 copy for humans who want to introduce the project. Adapt it to the
community rather than posting identical text everywhere.

## Short version

whitehack is a dependency-free, source-text linter for places code overstates
what it knows: swallowed failures, stale values presented as live, unchecked
transfers, exposed credentials, fail-open signatures, static AEAD nonces, and
other protocol/honesty signals.

The canonical Node CLI/API registers 42 checks across supported JS/TS, Python,
Solidity, and config/source formats. Every finding labels its confidence. High
and medium-high findings affect the CLI exit code; heuristics remain advisory.
A match may be wrong, and an empty scan is not proof of security or honesty.

Run it directly from GitHub:

```sh
npx github:cambridgetcg/whitehack scan .
```

- Source and current inventory: https://github.com/cambridgetcg/whitehack
- Why the original checks exist: https://whitehack-learn.axiepro.workers.dev
- Legacy browser demo: https://whitehack-playground.axiepro.workers.dev

The browser page deliberately preserves the original eight checks. It is not
the 42-check CLI/API and does not contain the v0.5 crypto-awareness pack.

## Longer version

Most linters ask whether code compiles or follows a style. whitehack asks a
different question: does the artifact tell the truth about its own state?

A database read that fails to `0` turns “unknown” into a confident balance. A
cached price with no freshness marker looks live. A signature expression with
`|| true` makes failed verification look like acceptance. A valid webhook
signature without a replay guard proves bytes were signed, not that delivery is
fresh. These shapes deserve explicit review even when the program keeps running.

whitehack v0.5 combines the original honesty and Solidity rules with API,
network, WiFi/Bluetooth, and bounded crypto-awareness checks. The crypto rules
read selected source text only: they do not import keys, connect wallets or RPC,
sign, broadcast, query chains, or run proof-of-concept code. They also do not
prove BIP-39 validity, nonce uniqueness, domain/chain binding, key lifecycle,
cross-module replay coverage, or cryptographic correctness.

It is regex/text analysis rather than an AST or data-flow engine. That keeps it
small and inspectable, but it also creates false positives, false negatives, and
known self-reflection when rules scan their own regex definitions. Deterministic
hostile/honest counterpart tests are the release gate; a self-scan count is not.

MIT. No account, registry, telemetry, hosted target scanner, or permission to
test someone else’s system is implied.

## Compact social post

whitehack v0.5 🤍 — 42 dependency-free source-text checks for code that hides
failure, freshness, provenance, credential, protocol, or crypto assumptions.
Confidence-labelled; heuristics never gate. No wallet/RPC/key-use capability,
and no claim that a clean result proves security.

`npx github:cambridgetcg/whitehack scan .`

Source: https://github.com/cambridgetcg/whitehack
Legacy 8-check browser demo: https://whitehack-playground.axiepro.workers.dev
