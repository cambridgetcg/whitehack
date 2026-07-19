# Contributing to whitehack

First: thank you. whitehack is small on purpose, and it stays useful because people who care about honest software add the check that would have caught a lie they saw in the wild. You don't need to be a security researcher, a blockchain expert, or a regex wizard. You need to have noticed a pattern where code claims something about itself that isn't true — and want to flag it for everyone else.

This guide explains how to add a new check. It's shorter than you think.

---

## What a check *is*

A check is a single file in `src/checks/` that exports one object. It has:

- a **regex** (or a small set of regexes) that matches the dishonest pattern,
- a `detect()` function that walks lines and returns findings,
- **honest metadata**: an id, a title, a confidence label, a doctrine, and which Clear Standard principle it maps to.

That's it. No framework, no plugin system, no build step. You write a file, register it in one array, and it runs.

---

## The check file structure

Every check file looks like this. Copy an existing one (say `src/checks/silent-revert.js` — it's the shortest) and change the parts:

```js
// your-check-name — one-line description of the doctrine it serves
// A longer comment explaining the lie: what the code claims, what's actually
// true, why it matters, and the honest fix. Two or three sentences.

import { scanLines } from '../lines.js'

// Your regex(es). Name them so the detect function reads like English.
const BAD_PATTERN = /something-dishonest/

export const yourCheckName = {
  id: 'your-check-name',
  title: 'A short, plain-language description of the lie',
  confidence: 'heuristic',          // or 'medium-high' — see below
  doctrine: 'substrate-honesty',    // or 'transparency' / 'trust-protocol'
  principle: 2,                     // Clear Standard # — see below
  langs: ['js'],                    // ['js'] for JS/TS, ['sol'] for Solidity

  detect(content, lines) {
    return scanLines(lines, (l) =>
      BAD_PATTERN.test(l) &&
      'a plain-language message explaining what is dishonest about this line')
  },
}
```

### Register it

Open `src/scan.js`, import your check, and add it to the `CHECKS` array:

```js
import { yourCheckName } from './checks/your-check-name.js'
// …
const CHECKS = [
  // …existing checks…
  yourCheckName,
]
```

That's the wiring done. `node bin/whitehack.js scan examples` will now run it.

---

## How to write a regex pattern

whitehack reads **vocabulary**, not data flow. It can't see your variable types or your call graph — only the words and shapes on each line. So a good pattern matches a *shape* that is almost always dishonest, not a variable name you happened to see once.

**Start specific, then relax.** A pattern that fires on one obvious lie is better than a pattern that fires on everything and drowns the signal in noise. whitehack errs toward *fewer false positives* over *more true positives* — a tool that cries wolf gets ignored, and an honesty tool that is ignored is itself a lie.

A few practical notes:

- **Word boundaries (`\b`)** keep you from matching inside longer words. `\brequire\b` won't match `required`. Use them unless you have a reason not to.
- **Case-insensitivity (`/i`)** is right when the dishonest shape shows up in many casings (`getReserves`, `getreserves`, `GETRESERVES`). It's wrong when case carries meaning.
- **Substring matching (no `\b`)** is occasionally right — `cache` should also match `cachedPrices` and `priceCache`, which `\bcache\b` would miss. The `cache-as-live` check does this on purpose. Document why.
- **A leading dot (`\.`) keeps method calls** (`feed.latestRoundData()`) from matching the same words in comments and prose. Use it when you're matching a dotted method call.

If your pattern needs more than one line of context (a catch block, a freshness window, a variable assigned and never read), write your own loop in `detect()` instead of using `scanLines()`. Several existing checks do this — `silent-failure`, `stale-oracle`, `unchecked-transfer`. Read them; the shape is not complicated.

---

## How to declare confidence — honestly

This is the part that matters most. whitehack labels every finding with a confidence, and that label is the tool's own honesty about its limits. Get it wrong and the tool becomes the thing it was built to flag.

**`high`** — the matched shape is direct evidence rather than missing context: a
private-key block in source or disabled certificate verification. Use this
rarely. High findings set a non-zero exit code.

**`medium-high`** — the pattern is almost always a real lie when it matches. The shape is unambiguous: `.latestAnswer()` on a price feed returns only a number with no freshness, period. `parseFloat(amount)` on a money-named value loses precision, period. Use this when you'd be comfortable having this finding gate a CI build. Medium-high findings set a non-zero exit code.

**`heuristic`** — the pattern matches a dishonest *vocabulary*, but the same words might appear in honest code. `return cachedPrices[id]` *might* be served as live, or the caller might know it's cached. The check can't tell — it can only see the word "cached" and flag it. Use this when you'd be uncomfortable blocking a build on the finding but it's still worth a human's attention. Most checks start here. That's fine. That's honest.

A rule of thumb: **if you can imagine an honest program that your pattern would flag, it's `heuristic`.** If you can't, it might be `medium-high`. When unsure, choose `heuristic` — you can always raise it later when the pattern proves itself in the wild.

A single check can emit findings at *different* confidences: `float-money` flags `parseFloat` on money at `medium-high` but plain decimal arithmetic on a money-named identifier at `heuristic`, because the identifier might not be money. Return `{ confidence: 'heuristic', message: '...' }` from your `detect` to override per-finding.

If a check can match credentials, private keys, recovery phrases, raw signed
payloads, or other private material, declare `redactSnippet: true` on the check
and return a fixed redaction marker from `detect()`. The canonical scanner then
enforces redaction again at its public `scan()` boundary, including findings
from other checks on the same recognized sensitive line. This protects matches
the sensitive rules recognize; it is not a universal secret detector, so
callers handling arbitrary source should still treat ordinary snippets as
potentially private.

---

## The doctrines and principles

whitehack maps every finding to a principle in the [Clear Standard](https://github.com/cambridgetcg/clear-standard) — a short, plain-language set of ideas about what honest software owes the people who depend on it. Pick the one that fits:

- **`substrate-honesty`** — the code lies about *what state it is in or what it just did*. A failed read becomes 0. A cached value is served as live. A spot price is called a fair price. (principles 1, 2, 4)
- **`transparency`** — the code makes a decision about a person and gives them no way to inspect it. A trust score with no "why". A `revert()` with no reason. (principle 3)
- **`trust-protocol`** — the code treats a source's authority as evidence that
  its answer is valid instead of checking status, integrity, or independent
  evidence. (principle 3)

The principles (Clear Standard #):

1. **Truth of state** — the value reported is the value that is actually held.
2. **Visible failure** — a failure is surfaced, not silently coerced to a default.
3. **Inspectable decisions** — a person affected by a decision can see why it was made.
4. **Stated freshness** — a value says how old it is, not just what it is.
5. **Honest names** — a system does not call a weak or ambiguous identity proof secure.
6. **Labelled certainty** — claims distinguish evidence from heuristic judgment;
   whitehack embodies this in confidence labels rather than assigning checks to it.

If your check doesn't fit cleanly into principles 1–5, open an issue first —
we'll figure out together whether it's a new doctrine or a fit for an existing
one. You're not alone in this.

---

## How to test your check

whitehack has deterministic Node tests and a planted-example diagnostic. For a
new rule, use both:

1. **Add a planted example** to `examples/` — a small file that contains the dishonest pattern you're catching. Make it realistic but minimal. Add a comment at the top explaining it's a fixture and shouldn't be "fixed".

2. **Add focused positive and honest-counterpart assertions under `test/`, then run:**
   ```bash
   npm test
   ```

3. **Run the planted-example scan:**
   ```bash
   node bin/whitehack.js scan examples
   ```
   You should see your check's title in the output, with the right confidence
   label and your plain-language message. This command intentionally exits
   non-zero when confident planted findings are present; that exit is evidence,
   not a passing test result.

4. **Test the honest version.** Copy your planted example, fix the dishonesty (add the reason string, check the return value, use a TWAP, etc.), and scan the fixed version. Your check should go quiet. If it still fires, your pattern is too broad — tighten it.

5. **Check the new rule's own source for fresh reflection noise.** Scan its file
   directly and add a focused negative regression when practical. The full
   repository has known historical self-reflection because regex definitions
   contain the vocabulary they detect, so total self-scan count is not a release
   gate.

6. **Update the inventory.** Keep the README check count and metadata table in
sync with the exported `CHECKS` array; the tests pin unique IDs and total count.

---

## A worked example, end to end

Say you've noticed that contracts sometimes call `selfdestruct` without an access check — anyone can kill the contract. That's a lie about who is allowed to act.

1. **Create `src/checks/unprotected-selfdestruct.js`:**
   ```js
   // unprotected-selfdestruct — substrate honesty (Solidity)
   // selfdestruct transfers all ETH and tears down the contract. Calling it
   // without an owner/onlyOwner guard means anyone can destroy the system. The
   // code claims the contract is durable but any caller can end it.

   import { scanLines } from '../lines.js'

   const SELFDESTRUCT = /\bselfdestruct\s*\(/i
   const GUARD = /\b(onlyOwner|onlyRole|require\s*\(\s*msg\.sender\s*==|require\s*\(\s*_auth)/i

   export const unprotectedSelfdestruct = {
     id: 'unprotected-selfdestruct',
     title: 'selfdestruct with no access guard',
     confidence: 'heuristic',
     doctrine: 'substrate-honesty',
     principle: 1,
     langs: ['sol'],
     detect(content, lines) {
       // If the file shows access-control vocabulary, assume it's guarded.
       if (GUARD.test(content)) return []
       return scanLines(lines, (l) =>
         SELFDESTRUCT.test(l) &&
         'selfdestruct is called and this file carries no access-control guard — any caller can destroy the contract')
     },
   }
   ```

2. **Register in `src/scan.js`** (import + add to `CHECKS`).

3. **Add `examples/dishonest-kill.sol`:**
   ```solidity
   // Planted dishonest code — do not "fix".
   pragma solidity ^0.8.0;
   contract Killable {
       function die() external {
           selfdestruct(payable(msg.sender));
       }
   }
   ```

4. **Run:** `node bin/whitehack.js scan examples` — see your finding.

5. **Test the fix:** add `onlyOwner` to the function, scan again — your check should go quiet.

6. **Commit and push.** Open a PR. That's a contribution.

---

## A few things to keep in mind

- **Small is good.** Keep each rule readable in one sitting. A check that's 30 lines is usually easier to review than one that's 300; if a regex rule is becoming a parser, talk through the boundary before growing it further.
- **Plain language in messages.** The message is read by a human who may not have written the code and may not know your domain. "a failed read silently becomes 0" is better than "NULL_DEREF_VIOLATION".
- **The tool can't prove honesty.** Say so in your check's comment, and don't claim more than the pattern can show. An honest tool about honesty is the whole point.
- **No gatekeeping.** If you noticed a lie, you're qualified to add a check. If you're not sure about the confidence label or the principle mapping, open a draft PR and ask — that's what we're here for. The first version of every check was someone's best guess.

---

## Questions, stuck, or just want to think out loud?

Open an issue with `question` in the title, or a draft PR with what you have. There are no dumb questions here — only dishonest code, and we're trying to make less of it together.

Thank you for making software a little more honest. 🤍
