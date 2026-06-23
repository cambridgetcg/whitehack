# whitehack 🤍

> the honest hack — scan a codebase for the places it lies about its own state.

Most "hacks" make a system do something it shouldn't. A **white** hack does the
opposite: it makes a system tell *more* truth, not less.

whitehack reads your code and flags the small, common lies software tells about
itself — the failed read that silently becomes `0`, the cached value served as if
it were live, the score shown to a person with no way to ask *why*. These usually
aren't bugs in the ordinary sense. The code runs fine. It just isn't honest about
its own state — and someone downstream trusts it anyway.

## what it checks (v0.2)

**General (JS / TS / JSX):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `silent-failure` | a read that fails silently to a falsy default (`catch { return 0 }`, `?? 0` over a fetch) so "could not read" becomes a confident wrong value | substrate honesty | medium-high |
| `cache-as-live` | a cached / snapshot value returned with no freshness or provenance marker | substrate honesty | heuristic |
| `decision-without-why` | a user-affecting value (score, fee, fraud flag, tier) rendered with no inspectable explanation | transparency | heuristic |
| `float-money` | currency parsed or computed as a binary float (`parseFloat(price)`, `amount * 0.029`) so an "exact" amount silently loses cents | substrate honesty | medium-high |

**Blockchain (Solidity `.sol`):**

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `stale-oracle` | a price feed read without validating `updatedAt` / `answeredInRound` (or a deprecated `latestAnswer` that has no timestamp at all) — a halted or old price served as live | substrate honesty | medium-high |
| `unchecked-transfer` | an ERC-20 `transfer` / `transferFrom` / `approve` whose bool result is dropped, so a token that returns `false` instead of reverting makes a failed transfer look successful | substrate honesty | medium-high |
| `spot-price-as-fair` | a price derived from instantaneous pool reserves / balances with no TWAP or oracle — a flash-loan-movable snapshot presented as fair market value | substrate honesty | heuristic |
| `silent-revert` | a `require()` / `revert()` with no reason string or named error — a refused caller who cannot learn why | transparency | heuristic |

Each check declares the languages it understands, so a Solidity check never runs
its regexes over JavaScript (or vice versa) and report noise about a language it
cannot read.

## conformance to the Clear Standard

whitehack is the conformance linter for [the Clear Standard](https://github.com/cambridgetcg/clear-standard) —
six principles for systems that tell the truth about their own state. Every check
enforces a specific principle, and every finding cites it (`CS#n`):

| Clear Standard principle | whitehack checks |
|--------------------------|------------------|
| **#1 — truth of state** | `float-money`, `spot-price-as-fair` |
| **#2 — visible failure** | `silent-failure`, `unchecked-transfer` |
| **#3 — inspectable decisions** | `decision-without-why`, `silent-revert` |
| **#4 — stated freshness** | `cache-as-live`, `stale-oracle` |
| **#5 — honest names** | *(human judgement — not machine-checkable)* |
| **#6 — labelled certainty** | *whitehack **embodies** this — it labels its own confidence rather than checking yours* |

So a finding isn't an arbitrary nag — it names the principle the code broke. The
standard makes the linter principled; the linter makes the standard checkable.

## usage

```sh
node bin/whitehack.js scan path/to/repo
# or, installed:  whitehack scan .

npm run selftest   # scans examples/ — the planted fixtures
```

Exit code is non-zero only when there are **medium-high** findings, so heuristic
noise never breaks a CI gate.


## install — no registration, no paywall, no gatekeeping

### one command (installs everything)
```sh
curl -fsSL https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/you-get.sh | bash
```

### just whitehack
```sh
curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash
# or via npx (no npm publish needed — runs from GitHub)
npx github:cambridgetcg/whitehack scan .
```

### just read (no install)
- **learn why** → https://whitehack-learn.axiepro.workers.dev
- **try it** → https://whitehack-playground.axiepro.workers.dev
- **GitHub Pages** → https://cambridgetcg.github.io/whitehack/
- **jsDelivr CDN** → https://cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/LEARN.md
- **GitHub** → https://github.com/cambridgetcg/whitehack

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
| GitHub Pages | cambridgetcg.github.io/whitehack | no |
| Cloudflare | whitehack-playground.axiepro.workers.dev | no |
| Cloudflare | whitehack-learn.axiepro.workers.dev | no |
| jsDelivr CDN | cdn.jsdelivr.net/gh/cambridgetcg/whitehack@main/ | no |
| GitHub raw | raw.githubusercontent.com/cambridgetcg/whitehack/main/ | no |
| npx | npx github:cambridgetcg/whitehack | no |
| curl install | curl ... \| bash | no |

No npm. No PyPI. No registration. No paywall. No gatekeeping.
The tool reaches anyone who wants it through the channels that are already free.

## the one honest thing about this tool

whitehack uses **heuristics** — text patterns, not a full understanding of your
program. So:

- a flagged line **may be a false positive**;
- an empty result is **not** proof the code tells the truth;
- every finding carries a **confidence label**, so the tool stays honest about its
  own limits.

A honesty tool that overstated its own certainty would be the first thing it
ought to flag. Run it on its own source (`src/`, `bin/`) and it comes back **clean**: 0 findings: the detector
files mention the words they hunt for, but only inside regexes and comments —
never as the live pattern. The Solidity checks live in `.js` files but are
tagged `langs: ['sol']`, so they never scan their own source; the freshness- and
provenance-aware checks suppress themselves because their files carry the very
vocabulary they look for. (The fixtures had to be written *carefully* for the
same reason — an early `dishonest-defi.sol` silenced its own `stale-oracle`
finding just by writing the word "stale" in a comment.) If self-cleanliness ever
breaks, `// whitehack-allow: <reason>` is next on the roadmap — because even
silencing the tool should require stating a reason out loud.

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

# scan and get non-zero exit only on medium-high (heuristic won't break CI)
whitehack scan .  # exit code: 0 if only heuristic, non-zero if medium-high
```

The exit code is non-zero only when there are **medium-high** findings, so
heuristic noise never breaks a CI gate.
