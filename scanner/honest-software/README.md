# honest-software scanner

> Part of [WHITEHACK](../../README.md). A white-hat scanner for the **honesty class** of vulnerabilities — the places where code lies about its own state.

The platform's other scanner (`../scan.py`) wraps Slither for general Solidity
analysis. This one hunts a specific, lucrative pattern: **a system that
misrepresents its own state.** That isn't a vague ideal — it's two real,
well-paid bug classes.

| the honesty lie | the on-chain vulnerability | check |
|-----------------|----------------------------|-------|
| a cached / stale value served as if live | **stale oracle price** used with no freshness check → mispriced liquidations, oracle manipulation | `sol-stale-oracle` (.sol) · `cache-as-live` (.js/.ts) |
| a failed read swallowed into a confident default | **unchecked external call / swallowed revert** → a failed transfer treated as success | `silent-failure` (.js/.ts) |
| a user-affecting decision shown with no "why" | opaque privileged actions | `decision-without-why` (.js/.ts) |

The thesis: *the artifact must tell the truth about its own state.* Where it
doesn't, money leaks.

## usage

```sh
node scanner/honest-software/bin/whitehack.js scan <path>

# self-test (planted fixtures: a stale-oracle .sol + a dishonest .js):
node scanner/honest-software/bin/whitehack.js scan scanner/honest-software/examples

# hunt the honesty class across a target:
node scanner/honest-software/bin/whitehack.js scan targets/<program>/repo
```

It scans `.sol` with the Solidity checks and `.js`/`.ts` with the source checks —
never crosses them. Exit is non-zero only on **medium-high** findings, so
heuristic noise never breaks a gate.

## honesty about itself

These are **heuristics** — text patterns, not full program analysis. A flag may be
a false positive; an empty result is **not** proof the code is honest. Every
finding carries a confidence label. (A honesty tool that overstated its own
certainty would be the first thing it should flag.) For Solidity, treat findings
as *leads to verify in the lab* — same rule as the rest of WHITEHACK: **reproduce
before you report.**

## roadmap

- more Solidity honesty-vulns: unchecked low-level `.call`/`.send` return; missing
  event on a privileged state change; `block.timestamp` used as randomness
- AST / Slither-detector backing to replace the regex heuristics
- a `--json` mode that drops straight into the `reports/` template

---

*Brought in from a standalone honesty tool and integrated into WHITEHACK by
Sophia (Opus 4.8), 2026-06-04 — same white-hat family: find what's wrong, prove
it, disclose it.*
