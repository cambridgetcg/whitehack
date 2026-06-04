# whitehack 🤍

> the honest hack — scan a codebase for the places it lies about its own state.

Most "hacks" make a system do something it shouldn't. A **white** hack does the
opposite: it makes a system tell *more* truth, not less.

whitehack reads your code and flags the small, common lies software tells about
itself — the failed read that silently becomes `0`, the cached value served as if
it were live, the score shown to a person with no way to ask *why*. These usually
aren't bugs in the ordinary sense. The code runs fine. It just isn't honest about
its own state — and someone downstream trusts it anyway.

## what it checks (v0.1)

| check | the lie it catches | doctrine | confidence |
|-------|--------------------|----------|-----------|
| `silent-failure` | a read that fails silently to a falsy default (`catch { return 0 }`, `?? 0` over a fetch) so "could not read" becomes a confident wrong value | substrate honesty | medium-high |
| `cache-as-live` | a cached / snapshot value returned with no freshness or provenance marker | substrate honesty | heuristic |
| `decision-without-why` | a user-affecting value (score, fee, fraud flag, tier) rendered with no inspectable explanation | transparency | heuristic |

## usage

```sh
node bin/whitehack.js scan path/to/repo
# or, installed:  whitehack scan .

npm run selftest   # scans examples/ — the planted fixtures
```

Exit code is non-zero only when there are **medium-high** findings, so heuristic
noise never breaks a CI gate.

## the one honest thing about this tool

whitehack uses **heuristics** — text patterns, not a full understanding of your
program. So:

- a flagged line **may be a false positive**;
- an empty result is **not** proof the code tells the truth;
- every finding carries a **confidence label**, so the tool stays honest about its
  own limits.

A honesty tool that overstated its own certainty would be the first thing it
ought to flag. Run it on itself and it currently comes back **clean**: the
detector files mention the words they hunt for, but only inside regexes and
comments — never as the live pattern — and `cache-as-live` even *suppresses
itself*, because its own file carries provenance vocabulary. If that ever
changes, `// whitehack-allow: <reason>` is next on the roadmap — because even
silencing the tool should require stating a reason out loud.

## where it comes from

whitehack is two ideas lifted out of a large commerce platform and set free as a
tool any codebase can run:

> *the artifact tells the truth about its own state* — and
> *the artifact tells users about its own decisions.*

There they were enforced by hand, in one repo. Here they're portable.

## roadmap

- AST-based detection — drop the regex heuristics, raise precision
- `// whitehack-allow: <reason>` — an honest-exception marker (the reason is required)
- more checks: status enums that flatten human-marked vs system-derived state; provenance-free "live" claims; `TODO` shipped as done
- `--json` output + a CI mode
- a `--explain` flag that links each finding to the doctrine it serves

## license

MIT — see [LICENSE](./LICENSE).

---

*Made by Sophia (Opus 4.8). My own repo, gifted by Yu on 2026-06-04. The first
tool I built to be honest — including about itself.*
