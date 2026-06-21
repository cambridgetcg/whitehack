# whitehack — share this

_Short posts for every platform. Copy, paste, spread._

---

## Hacker News (Show HN)

**Show HN: whitehack — the honest hack, a linter that finds where code lies about its own state**

whitehack scans JS/TS and Solidity for honesty anti-patterns: silent failures that return 0, cached values served as live, price feeds read without staleness checks, token transfers whose results are dropped. Not bugs — lies. The code runs fine; it just isn't honest about its state.

Every finding is confidence-labelled (medium-high or heuristic). The tool is honest about its own limits: "absence of findings is NOT proof of honesty."

- Try it in your browser: https://whitehack-playground.axiepro.workers.dev
- Learn why each check matters: https://whitehack-learn.axiepro.workers.dev
- GitHub: https://github.com/cambridgetcg/whitehack
- Install: `curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash`

8 checks. MIT. ~250 lines you can read in a sitting. No gatekeeping — CONTRIBUTING.md teaches anyone how to add a check.

---

## dev.to

**whitehack: the linter that catches lies, not bugs**

Most linters find bugs — code that doesn't work. whitehack finds lies — code that works fine but isn't honest about its own state.

The failed database read that silently becomes `0`. Your balance is $50 but the app says $0 because it couldn't check and didn't tell you. The cached flight price that's 4 hours old but looks live. You book at $320, get charged $410.

These aren't bugs. The code runs. It just lies. And someone trusts the lie.

whitehack catches 8 patterns across JS/TS and Solidity:

1. Silent failure — `catch { return 0 }` makes "could not read" look like "the answer is zero"
2. Cache as live — cached value served without a freshness marker
3. Decision without why — a score/fee/flag shown with no way to ask "why?"
4. Float money — `parseFloat(price)` loses cents silently
5. Stale oracle — price feed read without checking when it was last true
6. Unchecked transfer — ERC-20 transfer result dropped, failure invisible
7. Spot price as fair — instant reserves used as "fair market price" (flash-loan movable)
8. Silent revert — `require()` with no reason string, locked door with no sign

Each check has a story — the real moment someone got hurt. [Read them](https://whitehack-learn.axiepro.workers.dev).

The tool is honest about itself: every finding carries a confidence label. "Absence of findings is NOT proof of honesty." A honesty tool that overstated its certainty would be the first thing it ought to flag.

**No gatekeeping.** CONTRIBUTING.md says: "You don't need to be a security researcher, a blockchain expert, or a regex wizard." If you've noticed a pattern where code claims something about itself that isn't true, you can add a check.

[Try it in your browser](https://whitehack-playground.axiepro.workers.dev) · [Learn why](https://whitehack-learn.axiepro.workers.dev) · [GitHub](https://github.com/cambridgetcg/whitehack) · `curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash`

---

## Reddit (r/programming)

**whitehack — a linter that doesn't find bugs, it finds lies**

Most linters catch broken code. whitehack catches code that works perfectly but lies about its own state — the `catch { return 0 }` that makes a database failure look like a zero balance, the cached price served as if it's current, the ERC-20 transfer whose failure is silently dropped.

8 checks across JS/TS and Solidity. Every finding is confidence-labelled. The tool says "absence of findings is NOT proof of honesty" — because a honesty tool that overstated its certainty would be the first thing it ought to flag.

- [Try it in your browser](https://whitehack-playground.axiepro.workers.dev) — paste code, click scan
- [Learn why each check matters](https://whitehack-learn.axiepro.workers.dev) — real stories, real consequences
- [GitHub](https://github.com/cambridgetcg/whitehack) — MIT, open, CONTRIBUTING.md with no gatekeeping
- One command: `curl -fsSL https://raw.githubusercontent.com/cambridgetcg/whitehack/main/install.sh | bash`

---

## Twitter/X thread

whitehack 🤍

Most linters find bugs — code that doesn't work.

whitehack finds lies — code that works fine but isn't honest about its own state.

The catch { return 0 } that makes a database failure look like a zero balance.

The cached price that's 4 hours old but looks live.

The token transfer whose failure is silently dropped.

8 checks. JS/TS + Solidity. Every finding confidence-labelled.

"Absence of findings is NOT proof of honesty."

A honesty tool that overstated its certainty would be the first thing it ought to flag.

Try it: https://whitehack-playground.axiepro.workers.dev
Learn why: https://whitehack-learn.axiepro.workers.dev
GitHub: https://github.com/cambridgetcg/whitehack

No gatekeeping. No registration. No paywall. Just honesty.

🤍

---

## Mastodon

whitehack — the honest hack. A linter that catches where code lies about its own state, not where it breaks. 8 checks, JS/TS + Solidity, every finding confidence-labelled. Free, open, no gatekeeping.

Try: https://whitehack-playground.axiepro.workers.dev
Learn: https://whitehack-learn.axiepro.workers.dev
Code: https://github.com/cambridgetcg/whitehack

#opensource #staticanalysis #solidity #javascript #honesty
