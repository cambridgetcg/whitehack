# LAUNCH.md — whitehack

> **Archived v0.2 launch snapshot.** This document preserves the original
> positioning and posting drafts; its counts, self-scan claims, commands, and
> package checklist are not the v0.5 release contract. See `README.md`,
> `STATE.md`, and the deterministic tests for current behavior.

This is the launch runbook for **whitehack**. It is ordered as a sequence: positioning first, then the responsible-launch checklist, then ready-to-post copy per channel, then the README upgrades and npm-readiness steps, then the supporting assets. All links are left as `<REPO_URL>` and `<SITE_URL>` placeholders — replace them per channel before posting.

---

## 1. Positioning

whitehack is a small, dependency-free static checker that flags the places your code lies about its own state — the failed read that silently becomes 0, the cached value served as live, the dropped token-transfer result, the stale price oracle read as current. The code runs fine in all of these; it just isn't honest about what it knows, and something downstream trusts it anyway. It's MIT, ~250 lines of Node/ESM, eight checks across JS/TS/JSX and Solidity. And because it's a tool *about* honesty, it's honest about its own limits: it's regex heuristics, not an AST; a flagged line may be a false positive; an empty result is not proof your code is honest; it does not replace an audit; and AST-based tools like Slither, Aderyn, and Semgrep are more precise on several of these checks. Its bet is being fast, legible, continuous, and honest about itself — including on its own source, which it scans clean.

---

## 2. Responsible-launch checklist

A tool whose entire premise is honesty has to launch honestly. Read this before posting anything.

- **Post as yourself, from your own account.** Yu posts every channel himself, as himself — a real dev sharing a project, not a brand account and not a proxy.
- **No astroturf.** No upvote rings, no vote-for-vote, no "upvote pls" DMs, no asking friends to swarm comments, no sockpuppet accounts. HN, Reddit, and Product Hunt all penalize coordinated promotion, and it directly contradicts the tool's premise.
- **One channel's text per channel.** Do not cross-post the same body to multiple sites (or multiple subreddits) simultaneously. Tailor one post per channel and space them out. Post the two Reddit posts on different days so neither looks like a coordinated blast.
- **Engage criticism honestly.** When someone says "Slither already does this," agree where it's true — it's already conceded in every post, so reinforce it rather than getting defensive. When someone finds a false positive, thank them and file or link an issue; a tool about honesty earns trust by treating its own misfires as findings. The critical replies *are* the value of the launch.
- **Never inflate.** No invented usage numbers, no roadmap promises dressed as present features, no claims that it "secures" or "audits" anything, no precision/recall percentage from the 5/5 corpus. If asked "who uses this," the honest answer is "nobody yet, it's day one" — say exactly that. If asked for a benchmark, point to the small repro corpus and call it a demonstration.
- **Be present.** Post when you can sit with the thread for the first few hours and reply fast and substantively. A brand-new, unproven tool lives or dies on the comments.
- **Sequence the channels.** Front-page/leaderboard placement is not the goal — useful criticism is. Suggested order and timing:
  1. **Show HN** — submit weekday morning US Eastern; be in the thread the first few hours.
  2. **r/ethdev** — a different weekday morning (US time); lead with the incident reconstructions.
  3. **r/programming** — a *different day* again, as a self/text post so the idea leads, not the link.
  4. **dev.to / personal blog** — weekday morning US/EU overlap; the long-form doctrine essay.
  5. **X thread** — weekday morning US/EU overlap; native reply chain, stay for the first hour.
  6. **Product Hunt** — 12:01 AM Pacific on a Tue–Thu; maker's first comment immediately, present all day.
- **Avoid everywhere:** marketing adjectives ("powerful," "revolutionary"), emoji spam, and any benchmark phrasing stronger than "5/5 on a small hand-built corpus, which is a demonstration not a benchmark." Replace `<REPO_URL>` and `<SITE_URL>` before each post.

---

## 3. Channel copy

Each subsection below is ready-to-post copy for one channel, followed by that channel's posting notes.

### 3.1 Show HN

**Title (format exactly as below — HN convention is "Show HN: \<name\> – \<plain one-line description\>"):**

> Show HN: whitehack – a linter that flags where code lies about its own state

**Body:**

I built a small static checker called whitehack. It flags one narrow thing: places where code lies about its own state — a read that fails silently to a falsy default, a cached value handed back as if it were live, a price feed read with no freshness check, an ERC-20 transfer whose return value is dropped. The code runs fine in all of these. It just isn't honest about what it knows, and something downstream trusts it anyway.

It's MIT, dependency-free, a few hundred lines of Node/ESM. Run it with `node bin/whitehack.js scan .` — no install, no config, no network.

Repo: <REPO_URL>
Page: <SITE_URL>

The honest part up front, because it's the whole point:

whitehack is regex heuristics, NOT an AST. That means a flagged line may be a false positive, and — more importantly — an empty result is not proof your code is honest. The tool says this to your face in its own footer. Every finding carries a confidence label (medium-high vs. heuristic), and only medium-high findings affect the exit code, so the noisy heuristics can't break a CI gate. It is explicitly not an audit replacement. It's a fast, low-noise check you can run on every commit.

The 8 checks:

- General (JS/TS/JSX): silent-failure (a read failing to a falsy default), cache-as-live (cached value served as live), decision-without-why (a score/fee/flag shown to a user with no way to ask why), float-money (currency in a binary float).
- Solidity: stale-oracle (price feed read with no `updatedAt`/`answeredInRound` check), unchecked-transfer (ERC-20 transfer result dropped), spot-price-as-fair (spot reserves used as a fair price with no TWAP/oracle), silent-revert (require/revert with no reason string).

Two of those are based on documented, money-losing patterns, so I built a tiny corpus to check I actually catch them: faithful reconstructions of Sherlock 2025-05 #579 (unchecked ERC-20 transfer) and the OWASP SC02 oracle-no-freshness class (the shape behind Yellow Protocol's ~$2.4M loss), plus their fixed counterparts. On that corpus it flags 5/5 of the vulnerable lines and stays silent on the 3 fixed versions. I want to be precise about what that is: a hand-built demonstration that the patterns are catchable, NOT a statistical benchmark. There is no precision/recall number here, and I won't pretend there is one.

Where it honestly stands vs. the obvious alternatives: Slither, Aderyn, and Semgrep are AST-based and more precise than I am on several of these checks. whitehack does not out-detect them and I'm not claiming it does. What it's trying to be is a different thing — a fast, legible, continuous check organized around one idea ("does this code tell the truth about its own state?"), and one that is honest about its own limits. A honesty tool that overstated its own certainty would be the first thing it ought to flag, so I made it scan clean on its own source (it does), and any finding it can't stand behind gets labelled heuristic rather than asserted.

It's brand new and unproven. No users, no stars, no downloads — I'm posting it the day it's presentable, not after it's popular. So I'd genuinely rather hear what's wrong with it than be told it's neat:

- Which checks are too noisy to be worth shipping? I'd rather cut a check than ship a false-positive machine.
- Where does the regex approach fail in ways an AST wouldn't? I know the float-money and silent-failure patterns are the most likely to misfire.
- Is "lies about its own state" a real, useful framing for a linter, or am I dressing up four unrelated heuristics in a nice story?
- For the Solidity folks: are stale-oracle / unchecked-transfer actually underserved by what you already run, or is this redundant with Slither in practice?

Tear it apart. If a check is wrong I'd like to know before anyone relies on it.

**Posting notes:**

Channel: Hacker News "Show HN". Format the title exactly as the title field — HN convention is "Show HN: \<name\> – \<plain one-line description\>". Keep the URL field on submission pointing at `<REPO_URL>` (HN prefers a direct link to the thing; the landing page can be a link inside the body).

Yu posts this himself, as himself, from his own account. No upvote rings, no asking friends to comment, no cross-posting the same text to other sites simultaneously — HN flags coordinated promotion and it would directly contradict the tool's premise.

Timing: submit in the morning US Eastern on a weekday for the best shot at the front page, but front-page placement is not the goal here — useful criticism is. Be available in the thread for the first few hours; Show HN rewards an author who replies fast and substantively.

Engaging replies honestly: when someone says "Slither already does this," agree where it's true — that's already conceded in the post, so reinforce it rather than getting defensive. When someone finds a false positive, thank them and (ideally) file or link an issue; a tool about honesty earns trust by treating its own misfires as findings. Do not counter criticism with invented usage numbers, roadmap promises dressed as present features, or claims that it "secures" or "audits" anything. If asked "who uses this," the honest answer is "nobody yet, it's day one" — say exactly that.

Avoid: marketing adjectives ("powerful," "revolutionary"), emoji, and any benchmark phrasing stronger than "5/5 on a small hand-built corpus, which is a demonstration not a benchmark."

---

### 3.2 Reddit — r/ethdev

**Title:**

> Rebuilt the Sherlock #579 unchecked-transfer bug and a "no-freshness" oracle read as test fixtures — wrote a tiny regex linter to see if it'd flag them on the PR. Curious where it's wrong.

**Body:**

I keep seeing the same two shapes in DeFi post-mortems and wanted to see how cheaply a continuous PR-time check could catch them, so I built a small one and tested it against reconstructions of documented incidents. Posting the corpus and the tool here because this sub will find the holes faster than I will.

The two patterns:

**1. Unchecked ERC-20 transfer result.** Sherlock 2025-05 "Lend" audit, finding #579 (Medium) — the bool from `transfer()` is dropped in CoreRouter (redeem/borrow/borrowForCrossChain). A token that returns `false` instead of reverting (USDT-style) leaves the protocol's accounting claiming a transfer that never happened. Reconstructed pattern:

```solidity
function borrow(address _token, uint256 _amount) external {
    IERC20(_token).transfer(msg.sender, _amount);   // bool dropped
}
```

**2. Price feed read with no freshness check.** The OWASP SC02:2025 oracle-manipulation class — `latestRoundData()` consumed but `updatedAt` / `answeredInRound` thrown away (or the deprecated `latestAnswer()`, which has no timestamp to check at all). A halted or stale feed reads as a live price. This is the class behind a bunch of incidents (e.g. Yellow Protocol, ~$2.4M, Apr 2025).

```solidity
function getCollateralPrice() external view returns (uint256) {
    (, int256 answer, , , ) = priceFeed.latestRoundData();  // round/age fields dropped
    return uint256(answer);
}
```

I wrote faithful reconstructions of both (the *documented pattern* — not the verbatim deployed source) plus the **fixed** counterparts (SafeERC20, require'd result, freshness-checked feed), and ran my checker over the lot. Actual output:

```
oracle-no-freshness.sol
  ! L19  Price feed read without a staleness check   (substrate-honesty · medium-high)
  ! L25  Price feed read without a staleness check   (substrate-honesty · medium-high)
sherlock-579-unchecked-transfer.sol
  ! L23  ERC-20 transfer result ignored              (substrate-honesty · medium-high)
  ! L28  ERC-20 transfer result ignored              (substrate-honesty · medium-high)
  ! L33  ERC-20 transfer result ignored              (substrate-honesty · medium-high)
  5 finding(s) — 5 medium-high, 0 heuristic

safe-counterparts.sol
  → 0 findings   (fixed code, correctly silent)
```

5/5 vulnerable lines flagged, 0 false positives on the fixes. **Honest framing: that's a 5-line hand-built demo corpus, not a precision/recall benchmark.** It shows the shapes are catchable on a PR, nothing more.

**What it is:** an MIT-licensed, dependency-free CLI, ~250 lines of Node. Eight checks total; the Solidity ones are `stale-oracle`, `unchecked-transfer`, `spot-price-as-fair` (instantaneous reserves used as fair value, no TWAP), `silent-revert` (require/revert with no reason string). It's **regex heuristics, not AST** — so it's deliberately a fast, low-noise continuous gate, not a replacement for your audit or your real static analysis.

**The part I want to be straight about:** Slither and Aderyn are AST-based and more precise on `unchecked-transfer` and oracle staleness than I am. I'm not claiming to out-detect them and you should keep running them. Where I think this earns a spot in CI is being tiny, readable, instant, and honest about its own confidence (only medium-high findings affect exit code, so heuristic noise never breaks the gate). It surfaces these classes; it cannot prove their absence — absence of findings is explicitly *not* proof.

**What I'm actually asking r/ethdev:**

- The regexes will have false positives and false negatives — what real-world transfer/oracle shapes would slip past a text-pattern check? (return-value-checked-but-ignored, `safeTransfer` wrappers I don't recognize, low-level `.call`, feeds where freshness is enforced one function away, etc.)
- Is "flag on every PR, only break CI on high-confidence" a workflow you'd actually keep on, on top of Slither?
- Anything in the two reconstructions that *isn't* faithful to the original findings?

Repo (tool + the benchmark fixtures so you can reproduce the run): <REPO_URL>
Page: <SITE_URL>

Tear it apart — that's the point.

**Posting notes (r/ethdev):**

More tool-friendly than r/programming but still quality-gated and karma-gated; pure-promo tool posts get removed/downvoted. This post leads with two documented-incident reconstructions, shows real tool output, and asks genuine technical questions — keep that ratio. Flair it as a tool/resource/guide if flair exists. Check the subreddit rules and any pinned "self-promo / show-and-tell" thread first; some weeks tool posts are funneled there. Reply substantively to every technical critique — the false-negative/false-positive replies ARE the value, treat them as such. Do not also drop the same text in r/solidity, r/defi, r/CryptoDevs on the same day. Yu posts himself, as himself, one subreddit at a time. Use real `<REPO_URL>` and `<SITE_URL>` once each before posting.

---

### 3.3 Reddit — r/programming

**Title:**

> A ~250-line static checker that flags where code "lies about its own state" — and is built to be honest about its own limits (regex, not AST)

**Body:**

I built a small open-source linter around one idea I couldn't stop noticing in code review: a lot of the worst bugs aren't crashes. The code runs fine. It just isn't honest about its own state, and something downstream trusts it anyway.

Examples of the lie:

- a read that fails and silently becomes a falsy default — `catch { return 0 }`, `?? 0` over a fetch — so "couldn't read" turns into a confident wrong number;
- a cached/snapshot value handed back with no freshness or provenance marker, served as if live;
- a user-affecting value (score, fee, fraud flag, tier) rendered with no way to ask *why*;
- money parsed or computed as a binary float (`parseFloat(price)`, `amount * 0.029`) so an "exact" amount quietly loses cents.

The doctrine is two lines: *the artifact tells the truth about its own state*, and *the artifact tells users about its own decisions.* The tool — whitehack — flags places code violates them. Eight checks: four general (JS/TS/JSX) above, four for Solidity (stale oracle reads, unchecked ERC-20 transfer results, spot-price-as-fair, reason-less reverts). MIT, zero dependencies, ~250 lines of Node you can read in one sitting.

**Here's the part I actually want to talk about, because it's the whole point.**

A tool about honesty has no business overstating its own certainty. So I tried to make the limits load-bearing, not buried in a footnote:

- **It's regex heuristics, not AST.** Text patterns, not a real understanding of your program. That's a genuine ceiling — false positives and false negatives both happen. AST-based tools (Slither, Semgrep, etc.) are more precise on several of these and I say so in the README. The trade I'm making on purpose is: tiny, readable, instant, low-noise — a continuous check, not an authority.
- **Every finding is confidence-labelled** (medium-high vs. heuristic), and **only medium-high affects the exit code**, so heuristic guesses never break your CI gate.
- **Absence of findings is explicitly not proof** the code is honest. The tool says this to your face in its own output.
- **It scans clean on its own source** — and that was *not* free. The Solidity-check files contain the very words they hunt for, so they had to be tagged to never scan their own source; the freshness/provenance checks suppress themselves because their files carry the vocabulary they look for. An early test fixture accidentally silenced its own oracle finding just by writing the word "stale" in a comment. A linter that flunked its own rule would be the first thing it ought to flag.

I'm posting it here less as "use my tool" and more because I think the framing — *make the static checker honest about itself, and make that the feature instead of the disclaimer* — is worth arguing about. It's brand new: no users, no stars, no benchmark beyond a tiny hand-built corpus of reconstructed real incidents. I'd rather hear where the idea breaks than collect upvotes.

Questions I'd genuinely like r/programming's take on:

- Is "confidence-labelled, only-high-breaks-CI" enough to make a heuristic linter something you'd actually leave on, or does any false-positive rate kill it for you?
- The "honest about itself" angle — useful design principle, or just marketing dressed as humility? Push on that.
- Other categories of "code lying about its own state" worth a check? (I have ideas: trusted clocks from untrusted timestamps, balances shown with no settled/pending distinction, rounding with no stated direction.)

Repo + a writeup of the doctrine: <REPO_URL>
Landing page: <SITE_URL>

Happy to be wrong in the comments — that's more useful to me than agreement.

**Posting notes (r/programming):**

Strict anti-self-promo culture; mods remove posts from accounts whose submissions are mostly their own projects, and bare repo links read as spam. Post as a SELF/TEXT post so the idea (honesty-as-a-feature) leads, not the link. If the repo link alone is likely to be auto-removed, a short written doctrine post as the primary link may fare better. Expect blunt skepticism about "regex not AST" and about whether "honest framing" is just marketing — concede the AST/precision point freely (Slither/Semgrep are more precise), never claim it replaces audits or beats anything, and engage critics rather than defending. Read current rules before posting. One subreddit at a time, posting as yourself; do not blast the same text to multiple subs the same day. Avoid weekends for r/programming.

---

### 3.4 X thread

Nine tweets, each numbered, each within ~280 chars (verify in the composer; tweets 3 and 4 are the tightest — trim a clause rather than spill over). Post as a native reply chain, not a screenshot. No hashtags, no emoji. Replace `<REPO_URL>` and `<SITE_URL>` before posting; links are kept in the final tweet to avoid early-tweet reach penalties.

**1/**

Most static checkers hunt for bugs. whitehack hunts for a narrower thing: code that lies about its own state.

The failed read that silently becomes 0. The cached value served as live. The stale price oracle read as current. The code runs fine — it just isn't honest.

**2/**

Two principles, lifted out of a commerce platform and set free as a tool:

- substrate honesty: the artifact tells the truth about its own state
- transparency: the artifact tells users about its own decisions

A flag fires where one of those breaks. That's the whole doctrine.

**3/**

8 checks.

JS/TS/JSX:
- silent-failure — a read failing to a falsy default
- cache-as-live — a snapshot served with no freshness marker
- decision-without-why — a score/fee/flag shown with no way to ask why
- float-money — currency in a binary float that loses cents

**4/**

Solidity:
- stale-oracle — price feed read without an updatedAt freshness check
- unchecked-transfer — ERC-20 transfer bool result dropped on the floor
- spot-price-as-fair — instantaneous reserves used as fair value (flash-loan movable)
- silent-revert — a require/revert with no reason

**5/**

Does it actually catch anything? Small test: I reconstructed two documented incidents — Sherlock 2025-05 #579 (unchecked transfer) and the OWASP SC02 oracle-no-freshness class.

5/5 vulnerable lines flagged. 0 false positives on the fixed versions.

**6/**

Be clear about what that is: a hand-built corpus, a demonstration — not a statistical benchmark, and not me claiming a detection rate.

It's the concrete "this would have shown up on the PR," nothing more.

**7/**

The honest part: it's regex heuristics, ~250 lines, not AST. So —

- a flagged line MAY be a false positive
- an empty result is NOT proof the code is honest
- every finding is confidence-labelled; only the confident ones fail CI

A honesty tool that overstated itself would be the first thing it should flag.

**8/**

What it's NOT: it does not replace an audit, and it doesn't out-detect Slither/Aderyn/Semgrep — those are AST-based and more precise on some of these. whitehack's bet is being fast, legible, and honest about its own limits, run continuously between commits.

**9/**

It's brand new — no users, no stars, no track record yet. MIT, dependency-free, scans clean on its own source.

I'd genuinely rather hear where it's wrong than where it's right. Tell me what it misses or false-flags.

Repo: <REPO_URL>
Site: <SITE_URL>

**Posting notes:**

Channel: X/Twitter, posted by Yu himself, as himself — a real dev sharing a project, not a brand account. No astroturfing or cross-posting from other accounts. Format: 9 tweets, each numbered and within ~280 chars; post as a native thread (reply chain), not one long screenshot. Timing: weekday morning US/EU overlap tends to do best for dev tooling. Don't schedule-blast; post once and stay around to reply for the first hour. Hashtags/emoji: none — doctrine and specificity carry it. Engaging replies: the hook is the invitation to criticize — lean into it. If someone says "Slither already does this," agree plainly and re-state the actual differentiator: speed, legibility, self-honesty, continuous. If someone asks for a benchmark, do NOT manufacture one — point to the small corpus and call it a demo. If asked "is it an audit?" say no, unambiguously. Never claim users/stars/downloads you don't have. Pin tweet 1 or 5 (the proof) if pinning. Consider putting links only in the final tweet to avoid early-tweet reach penalties; that's already how it's structured.

---

### 3.5 dev.to / personal blog

Long-form essay, ~870 words. First person throughout. dev.to renders the fenced ` ```js ` / ` ```solidity ` blocks natively. Suggested tags: `#security`, `#javascript`, `#solidity`, `#opensource`. Add a `canonical_url` if cross-posting to a personal blog to avoid duplicate-SEO penalties. Replace `<REPO_URL>` and `<SITE_URL>` before publishing.

---

# The Artifact Should Tell the Truth About Its Own State

There's a specific kind of bug I've stopped calling a bug. The code runs. The tests pass. Nothing throws. And yet the program is, quietly, lying — not about the world, but about *itself*. About what it knows, how fresh that knowledge is, and how it got there. Someone downstream trusts the lie, and that's where the damage happens.

I want to walk through three of these, because once you see the shape, you see it everywhere.

## The failed read that becomes 0

Here's a stock lookup. It's the kind of code that survives review forever:

```js
export async function getStock(id) {
  try {
    return await db.count(id)
  } catch (e) {
    return 0
  }
}
```

Look at what `0` means now. It means "we have zero of this item." It *also* means "the database call threw and we have no idea how many there are." Those are completely different states of the world, and this function has fused them into the same value. "Could not read" became a confident "none."

The pattern shows up as `?? 0` over a fetch, as `catch { return [] }`, as a default that's indistinguishable from a real answer. Each one is the same move: a failure to *know* gets laundered into a definite *value*. The function no longer tells the truth about its own state — it presents ignorance as fact, and the order-fulfillment code two layers up believes it.

## The stale oracle

The on-chain version of the same lie is sharper, because money sits directly on top of it.

```solidity
function getCollateralPrice() external view returns (uint256) {
    (, int256 answer, , , ) = priceFeed.latestRoundData();
    return uint256(answer);
}
```

`latestRoundData()` returns five fields. Four of them — the round IDs and the `updatedAt` timestamp — exist precisely so you can ask *is this price still current?* This function destructures them away and keeps only the number. If the feed halts, if the round never completes, if the price is hours old, this function reports it as the live market price with total confidence. The artifact is asserting "this is what the asset is worth right now" while having thrown away the only evidence of *when* it was true.

This is not a hypothetical. It's the OWASP SC02 oracle-manipulation class — the pattern behind real losses, including roughly $2.4M at Yellow Protocol in 2025. The fix is a freshness check. The lie is reading a timestamped value and discarding the timestamp.

## The float that loses cents

```js
export function processingFee(amount) {
  return amount * 0.029 + 0.3
}
```

Money is integer cents pretending to be a decimal. The moment you compute it in a binary float, the value stops being exact — `0.1 + 0.2` is the canonical embarrassment, but every fee, every sum, every `parseFloat(price)` accumulates the same drift. The number that prints looks authoritative. Down at the substrate it's already wrong by a fraction of a cent, and "exact total" is a claim the representation can no longer back up.

## The doctrine underneath

Three different domains — a database read, a price feed, a currency — and one shared failure. The artifact makes an assertion about its own state that the artifact cannot actually support. I think of it as two principles:

- **Substrate honesty:** the value tells the truth about how it was produced — that a read failed, that a price is cached, that a number is a lossy float.
- **Transparency:** a value shown to a person carries a way to ask *why* — a trust score with nothing to click, a `revert()` with no reason string, a fee with no explanation. The decision is made; the *reason* is withheld.

These aren't exotic. They're the most ordinary code in the repo. That's exactly why they slip through: they don't look like bugs. They look like defaults.

## A tiny tool that just flags it

I wanted something that would catch these on a pull request without ceremony, so I wrote **whitehack** — an MIT-licensed, dependency-free static checker, about 250 lines of Node. Eight checks across the lies above: silent-failure, cache-as-live, decision-without-why, float-money on the JS/TS side; stale-oracle, unchecked-transfer, spot-price-as-fair, silent-revert on the Solidity side.

Now the honest part, because a tool about honesty has no business overselling itself.

whitehack is **regex heuristics, not an AST**. It pattern-matches. So a flagged line *can* be a false positive, and — this is the important one — an empty result is **not proof your code tells the truth**; it's just the absence of these particular patterns. Every finding is confidence-labelled, and only the medium-high ones affect the exit code, so heuristic guesses never break your CI gate. It is **not an audit replacement.** For some of these classes, AST-based tools like Slither, Aderyn, and Semgrep are flat-out more precise, and I'd run those too. whitehack's pitch isn't that it out-detects them — it's that it's fast, legible, and honest about its own limits.

The only concrete proof I'll claim: on a small hand-built corpus reconstructing two documented incidents — Sherlock 2025-05 finding #579 (unchecked ERC-20 `transfer`) and the oracle-no-freshness class — it flagged 5/5 of the vulnerable lines and stayed silent on the fixed versions. That's a *demonstration*, not a benchmark. No users, no stars, no downloads yet. It's brand new.

It does pass one test I care about: run it on its own source and it comes back clean. The checks live in files full of the very words they hunt for, and they had to be written carefully not to flag themselves.

If the doctrine resonates — or if you think a regex heuristic is the wrong tool for this and can say why — I genuinely want the criticism. Repo: `<REPO_URL>` · page: `<SITE_URL>`. Tell me where it's wrong.

---

**Posting notes:** Yu posts this himself, as himself (first person throughout). Best as a long-form essay with a code-heavy teaching arc; dev.to renders the fenced blocks natively. Suggested tags: `#security`, `#javascript`, `#solidity`, `#opensource`. Add a `canonical_url` if cross-posting to a personal blog to avoid duplicate-SEO penalties. Word count ~870. Engaging replies: lean into critique — if someone says "Slither already does the oracle check," agree (the post already concedes it) and ask what they'd want from a lighter continuous check; if someone reports a false positive, thank them and treat it as roadmap input, never argue the heuristic is more certain than it is. Do not add fabricated social proof in the comments. Timing: weekday morning US/EU overlap tends to do best on dev.to, but not load-bearing.

---

### 3.6 Product Hunt launch

**Name:**

whitehack

**Tagline** (57 chars — PH limit is 60):

Scan your code for where it lies about its own state

*(Alternate, 40 chars, if you want it punchier: "A linter that's honest about its own limits")*

**Description** (the short blurb under the gallery — PH allows ~260 chars):

A dependency-free static checker (~250 lines, MIT) that flags small lies code tells about itself: a failed read that silently becomes 0, a stale price oracle read as live, a dropped ERC-20 transfer result. 8 checks for JS/TS and Solidity. Honest about its own limits.

**Topics / Tags** (pick up to 3 on PH):

- Primary 3: Developer Tools · Open Source · GitHub
- Backups if any are taken: Software Engineering · Code Review · Crypto

**Maker's first comment** (Yu posts this himself, as himself):

Hi PH 👋 I'm Yu.

whitehack is a small static checker for one specific thing: the places code lies about its own state. Not bugs exactly — the code runs fine — just spots where it isn't honest about itself, and something downstream trusts it anyway. A failed read that quietly becomes `0`. A cached value served as if it were live. A stale price feed read as a current price. An ERC-20 transfer whose failure is dropped on the floor. A score shown to a user with no way to ask *why*.

8 checks total. Four general (JS/TS/JSX): silent-failure, cache-as-live, decision-without-why, float-money. Four Solidity: stale-oracle, unchecked-transfer, spot-price-as-fair, silent-revert. It's ~250 lines of Node, no dependencies, MIT.

Now the honest part, because this is a tool *about* honesty:

— It's regex heuristics, not AST. A flagged line can be a false positive, and an empty result is NOT proof your code is honest — it surfaces common lies, it can't prove their absence.
— Every finding is confidence-labelled (medium-high vs heuristic), and only medium-high affects the exit code, so heuristic noise won't break your CI.
— It is NOT an audit replacement. It's a fast, low-noise check to run continuously between commits.
— On the precise checks that overlap, mature AST tools (Slither, Aderyn, Semgrep) are more precise than this is. whitehack's pitch isn't "it out-detects them" — it's the honesty framing and being small enough to read in a sitting and trust.
— And it scans clean on its own source. A honesty tool that overstated its own certainty would be the first thing it ought to flag.

The one concrete bit of proof: I reconstructed two documented, money-losing incident patterns — Sherlock 2025-05 #579 (unchecked ERC-20 transfer) and the OWASP SC02 oracle-no-freshness class (the class behind ~$2.4M lost at Yellow Protocol). On that tiny hand-built corpus it flags 5/5 vulnerable lines and 0 false positives on the fixed code. That's a demonstration on real-world shapes, not a statistical benchmark — I want to be clear it's 5 lines, not a recall number.

It's brand new: no users, no stars, nothing yet. You're the first to see it. I'd genuinely rather hear where the heuristics are wrong than where they're right — tell me what it misses, what it false-positives on, and whether the honesty doctrine actually holds up in your codebase.

Repo: <REPO_URL>
Site: <SITE_URL>

Run `node bin/whitehack.js scan .` on something real and let me know what it says. Thanks for reading 🤍

**Posting notes:**

Timing / norms:

- Launch 12:01 AM Pacific (PH resets daily at midnight PT). A full day's votes count from minute one, so an early-AM-PT post maximizes time on the board. Tuesday–Thursday are the most-trafficked launch days; avoid weekends and Mondays.
- Post the maker's first comment immediately after the listing goes live — it frames the whole thread and is where the honest caveats live.
- Yu must claim the maker role and be present in the thread all day. PH rewards founders who reply to every comment in the first few hours. Be online.

Engagement:

- No vote-for-vote, no "upvote pls" DMs, no asking your network to swarm at launch — PH penalizes coordinated voting and it directly contradicts the tool's honesty doctrine. Share the link normally; let votes be organic.
- Answer the inevitable "how is this different from Slither/Semgrep?" with the honest answer already in the comment: those are more precise on the overlapping checks; whitehack's edge is the honesty framing + legibility + continuous low-noise use, not out-detecting them. Do not get defensive or inflate.
- When someone reports a false positive (they will — it's regex), thank them and log it. That reaction IS the launch working as intended; treat it as the headline, not a wound.
- Have `<REPO_URL>` and `<SITE_URL>` filled in before going live. Pin the GitHub link. A 30–60s screen-recording of a real scan (terminal output with the confidence labels visible) is the single highest-value gallery asset — show the medium-high vs heuristic distinction on screen.

Do not:

- Do not say "secures," "audits," "guarantees," or "catches all." Do not cite a recall/precision percentage from the 5/5 corpus. Do not imply users/traction that don't exist.

---

## 4. README upgrades and npm-readiness

### 4.1 README launch-ready upgrades

The current README is already strong and on-doctrine. Below are concrete, drop-in upgrades. Nothing here invents users, stars, downloads, or benchmark numbers beyond the 5/5-on-a-tiny-corpus demonstration, and nothing claims it replaces an audit or beats other tools.

#### 4.1.1 One-liner (tighten the tagline)

Current:

> the honest hack — scan a codebase for the places it lies about its own state.

Keep it — it's good. One sharper alternative to A/B test:

> **A static checker that flags where code lies about its own state.** Fast, dependency-free, and honest about its own limits — including on itself.

That second sentence front-loads the differentiator (the honesty framing) instead of saving it for halfway down.

#### 4.1.2 Badge row (only TRUE badges)

Add directly under the tagline. Every badge below reflects something verifiable about the repo as it actually is — no stars/downloads/coverage theater.

```md
![license: MIT](https://img.shields.io/badge/license-MIT-blue)
![dependencies: zero](https://img.shields.io/badge/dependencies-0-brightgreen)
![runtime: Node ESM](https://img.shields.io/badge/runtime-Node%20ESM-339933)
![checks: 8](https://img.shields.io/badge/checks-8-informational)
![status: v0.2 · unproven](https://img.shields.io/badge/status-v0.2%20%C2%B7%20unproven-orange)
![self-scan: clean](https://img.shields.io/badge/self--scan-clean-success)
```

Notes:

- The `dependencies-0` and `runtime-Node ESM` badges are true claims that double as the pitch.
- `status: v0.2 · unproven` is unusual but on-brand: a tool about honesty advertising its own newness is the hook, not a liability. Keep it until there's something real to replace it with.
- `self-scan: clean` is a literal, reproducible fact (`npm run selftest` / scanning its own source). If you want it click-to-verify, link it to the relevant CI run once a GitHub Action exists.
- Do NOT add: stars, downloads, build-passing (until CI actually runs), coverage, "trusted by", or version-on-npm (until published). Adding any of those before they're true would be the first thing the tool should flag.

#### 4.1.3 15-second demo block

Put this near the top, right after the badges — before "what it checks". People decide in the first screenful. Use a fenced block that shows real input and the shape of real output (label the output as illustrative so it isn't read as a guaranteed run).

````md
## 15-second demo

```sh
npx whitehack scan .        # once published
# or, from a clone:
node bin/whitehack.js scan path/to/repo
```

Illustrative output:

```
src/pricing.js:42  float-money         medium-high
  amount * 0.029 — currency in a binary float; "exact" amount can lose cents

src/oracle.sol:88  stale-oracle        medium-high
  latestRoundData() read with no updatedAt / answeredInRound check

src/score.tsx:17   decision-without-why  heuristic
  user-facing score rendered with no inspectable "why"

3 findings · 2 medium-high · 1 heuristic
exit 1  (medium-high present)
```

Heuristic findings never set the exit code — only medium-high do, so noise can't break CI.
````

Action item: confirm the printed format above matches `bin/whitehack.js`'s actual output before publishing, and swap in a real captured run if it differs. Mark it "illustrative" only if you don't paste a literal run; if you paste a literal run, say "actual output" instead. (This block is a template, not a verified transcript — capture a real run before publishing.)

#### 4.1.4 Honest-limits section (promote and sharpen)

The existing "the one honest thing about this tool" section is the best part of the README — but it's buried at line 50. Move it directly under the checks table and lead with a plain-spoken limits list. Suggested rewrite:

```md
## honest limits (read this)

whitehack uses **heuristics** — text patterns, not a parser that understands your
program. Concretely:

- **a flagged line may be a false positive.** Heuristic-confidence findings
  especially. Read them, don't auto-trust them.
- **an empty result is NOT proof your code is honest.** It means these patterns
  didn't match. That's all.
- **it does not replace an audit.** It's a fast, low-noise, continuous check you
  run on every commit — not a security review and not a guarantee.
- **free AST-based tools (Slither, Aderyn, Semgrep) are more precise** on some of
  these checks. whitehack's bet is different: be fast, legible, and honest about
  its own state — including its own. If you can run Slither, run Slither *too*.

Every finding carries a confidence label, and only **medium-high** affects the
exit code. A honesty tool that overstated its own certainty would be the first
thing it ought to flag — so it doesn't.

**Run it on itself and it comes back clean.** The detector files mention the words
they hunt for, but only inside regexes and comments — never as the live pattern.
Solidity checks live in `.js` files tagged `langs: ['sol']`, so they never scan
their own source. If self-cleanliness ever breaks, `// whitehack-allow: <reason>`
is on the roadmap — because even silencing the tool should require a stated reason.
```

This keeps every honest claim from the original, adds the explicit "does not replace an audit" and "Slither is more precise" lines the launch constraints require, and frames competitors as complements rather than targets.

#### 4.1.5 "Does it work?" / proof block (new, optional but recommended)

Right now the README asserts the doctrine but never shows the tool catching a real-world-shaped bug. Add a short, scrupulously-hedged proof section so the claim is grounded — without dressing a demo up as a benchmark:

```md
## does it actually catch anything?

A small, hand-built corpus reconstructs two documented incident classes:

- an **unchecked ERC-20 transfer** (faithful reconstruction of the pattern in
  Sherlock 2025-05 #579), and
- an **oracle read with no freshness check** (OWASP SC02 class; the shape behind
  the ~$2.4M Yellow Protocol loss).

On that corpus whitehack flagged **5/5 vulnerable lines and produced 0 false
positives on the fixed versions.**

This is a **demonstration, not a statistical benchmark** — five lines I wrote to
mirror public incidents, not a survey of real repos. It shows the checks fire on
the right shapes and stay quiet on the fixes. It does not measure precision or
recall in the wild. If you run it on real code and it misses something or cries
wolf, that's exactly the report I want — open an issue.
```

Every number here is the one allowed figure (5/5 on a tiny corpus), explicitly labelled as a demonstration.

#### 4.1.6 Contributing note (new)

There's no contributing guidance today. Add a short, criticism-inviting section near the end:

```md
## contributing

whitehack is new and unproven, and the most useful thing you can send is a place
it was **wrong**.

- **False positive?** Open an issue with the smallest snippet that triggers it.
  Mislabeled confidence is a bug.
- **False negative?** A known-bad pattern it should have caught but didn't — same.
- **New check?** Each check declares the langs it understands and a confidence
  label; medium-high should be something you'd defend in review, heuristic is for
  "worth a human glance." When in doubt, ship it as heuristic.
- **Doctrine fit:** a check belongs here if it catches code *lying about its own
  state* — substrate-honesty (the artifact tells the truth about itself) or
  transparency (the artifact explains its own decisions). If it doesn't map to
  one of those, it's probably a different tool.

No CLA. MIT in, MIT out. Be honest in the issue tracker the way the tool tries to
be in your code.
```

#### 4.1.7 Small structural fixes

- **Reorder for the funnel:** tagline + badges → 15-second demo → what it checks → honest limits → does it actually catch anything → where it comes from → roadmap → contributing → license. Right now the demo is below the full checks tables and the limits are below that; first-screen real estate should be demo + limits.
- **Line 35–36 typo:** "report noise" reads as a dropped verb — change "(or vice versa) and report noise about a language" to "(or vice versa) or report noise about a language."
- **Line 60:** "A honesty tool" → "An honesty tool" (appears twice if you keep the original phrasing; fix both).
- **Placeholders:** wherever the README will carry links, use `<REPO_URL>` and `<SITE_URL>` rather than guessing the final URLs. Add a one-line link row under the badges once known: `[repo](<REPO_URL>) · [site](<SITE_URL>)`.
- **Keep the signature** (the "Made by Sophia, gifted by Yu" footer) — it's authentic and reinforces the honesty framing. No change needed.

**README posting notes:** "Posting" = committing to the repo and surfacing on the GitHub repo page (and as the npm readme if/when published). GitHub renders shields.io badges and fenced code natively, so all blocks above work as-is. Keep the badge row to one line of source even though it wraps visually. Before merging, two verification steps Yu must do himself: (1) run the tool and confirm the demo output block matches actual CLI output — replace the illustrative block with a real captured run and relabel it "actual output," or keep it labelled "illustrative"; (2) confirm `npm run selftest` still comes back clean so the `self-scan: clean` badge is true. Do not publish to npm or add a build-passing/npm-version badge until those are literally true.

---

### 4.2 npm publish readiness

Verified against `/Users/you/Desktop/whitehack/package.json` and `/Users/you/Desktop/whitehack/bin/whitehack.js` on disk. Do NOT run `npm publish` until the BLOCKERS below are cleared and the name is confirmed.

#### 4.2.0 Name availability — CHECK FIRST (may be taken)

The package name `whitehack` may already be registered on npm. There is also a tabletop RPG called "Whitehack," so a squatted/unrelated package is plausible. Verify before doing anything else:

```
npm view whitehack            # 404 / "not found" = available; any JSON = taken
npm view whitehack version    # quick existence check
```

Also confirm `npx whitehack` won't resolve to someone else's package.

If taken, fall back to a scoped name (always publishable under your own npm user/org) or a distinct unscoped name:

- `@<your-npm-user>/whitehack`  ← recommended, guaranteed free, and `npx @you/whitehack` still works
- `whitehack-cli`
- `whitehack-scan`
- `honest-hack`

A scoped name needs `--access public` on first publish (see step 5). Whatever you pick must match the `name` field in package.json and the `npx` command you advertise.

#### 4.2.1 BLOCKERS (must fix before publish)

**[ ] bin file is not executable.** `bin/whitehack.js` is currently mode 644 (`-rw-r--r--`). The shebang line `#!/usr/bin/env node` is present and correct, but the file lacks the exec bit. npm does set the exec bit on `bin` targets at install time, so it often works anyway — but committing it 755 is the convention and avoids surprises (e.g. running from a git clone). Fix and record it in git:

```
chmod +x bin/whitehack.js
git update-index --chmod=+x bin/whitehack.js   # persist the mode in git
git commit -m "chore: mark bin/whitehack.js executable"
```

**[ ] `repository` field is MISSING** from package.json (there is also no git remote configured locally). npm shows a broken/absent "Repository" link without it. Add once `<REPO_URL>` is decided:

```json
"repository": { "type": "git", "url": "git+<REPO_URL>.git" }
```

#### 4.2.2 package.json field-by-field

Current file is clean ESM and already has most of what's needed. Status of each publish-relevant field:

- **[OK] `name`** — `"whitehack"` (pending the availability check in step 0).
- **[OK] `version`** — `"0.2.1"`. Pre-1.0 is honest for a brand-new, unproven tool. Leave as-is.
- **[OK] `bin`** — `{ "whitehack": "bin/whitehack.js" }`. Correct; enables `npx whitehack`.
- **[OK] `type`** — `"module"`. Matches the ESM `import` in bin/src.
- **[OK] `engines`** — `{ "node": ">=18" }`. Top-level `await` in bin/whitehack.js (line 25) requires a modern Node; >=18 covers it.
- **[OK] `license`** — `"MIT"`. Matches LICENSE file (present, verified on disk).
- **[OK] `keywords`** — present and relevant (honesty, static-analysis, solidity, defi, oracle, etc.). No change needed.
- **[OK] `files`** — `["bin", "src", "README.md", "LICENSE"]`. All four exist on disk and are exactly what ships. LICENSE + README are always included by npm regardless, but listing them is harmless. This is the right whitelist — it keeps `benchmarks/`, `examples/`, `site/`, `VALIDATION.md`, `.gitignore` OUT of the tarball.
- **[ ] `repository`** — MISSING (blocker, see step 1).
- **[ ] `homepage`** — OPTIONAL, recommended. Point at `<SITE_URL>` once decided: `"homepage": "<SITE_URL>"`.
- **[ ] `bugs`** — OPTIONAL, recommended. `"bugs": { "url": "<REPO_URL>/issues" }`.

Nothing in package.json is dishonest or inflated — no fake metrics, no description overclaim. The description ("It cannot prove honesty; it surfaces common lies") already matches the doctrine. Keep it.

#### 4.2.3 Caveats worth knowing (not blockers)

- **`selftest` script won't work for installed users.** `"selftest": "node bin/whitehack.js scan examples"` references `examples/`, which is intentionally excluded from `files`. That's fine — it's a dev-only convenience run from a clone — but don't document `npm run selftest` as an end-user step. If you want installed users to be able to self-verify, either add `"examples"` to `files` (bigger tarball) or drop the script from what you advertise.
- **No `.npmignore`.** Not needed — the `files` whitelist already governs the tarball and is stricter than an ignore list. Don't add one.
- **No `prepublishOnly` guard.** Optional. Since there are no build/tests wired up, there's nothing to gate. You could add `"prepublishOnly": "npm run scan"` to dogfood the tool on its own source before each publish (it scans clean on itself), but it's not required.

#### 4.2.4 Pre-flight verification (run before publishing)

```
node --version                 # confirm >=18 locally
node bin/whitehack.js          # prints help, exits 0
node bin/whitehack.js scan .   # dogfood: should scan clean on its own source
npm pack --dry-run             # lists the EXACT files that will ship — confirm only bin/, src/, README.md, LICENSE
```

`npm pack --dry-run` is the single most important check: it shows the real tarball contents so you can confirm no benchmarks, examples, site, or VALIDATION.md leak in, and that the `bin` is included.

#### 4.2.5 Publish commands (run only after blockers cleared + name confirmed — do NOT run now)

```
npm whoami                     # confirm you're logged in (else: npm login)

# unscoped name (whitehack, if available):
npm publish --dry-run          # final rehearsal, no upload
npm publish                    # the real publish

# OR, scoped fallback (@you/whitehack) — needs public access on first publish:
npm publish --access public
```

After publishing, verify the install path you advertise actually resolves to your package:

```
npx whitehack@latest scan .            # or: npx @you/whitehack@latest scan .
```

#### 4.2.6 Summary

Two hard blockers: (1) `chmod +x bin/whitehack.js` (+ persist in git), (2) add the `repository` field. One prerequisite that gates everything: confirm the `whitehack` name is free on npm, with scoped `@you/whitehack` as the safe fallback. Everything else (`bin`, `files`, `engines`, `type`, `license`, `keywords`) is already correct. Recommended-but-optional: `homepage`, `bugs`. Always run `npm pack --dry-run` and `npm publish --dry-run` before the real publish.

**npm-readiness posting notes:** This is an internal/dev checklist, not a public marketing post — tone is operational, not promotional. Hand it to Yu to execute. Two things he must supply before any field is final: the real repo URL (replaces `<REPO_URL>`) and the site URL (replaces `<SITE_URL>`) — both left as placeholders. The name-availability check is a genuine gating step: `whitehack` collides with a known tabletop RPG name, so a taken/unrelated npm package is a real possibility; the scoped `@<user>/whitehack` fallback is guaranteed publishable. Explicitly do NOT publish on his behalf — the checklist ends one step before `npm publish` and labels the publish commands as run-only-after-blockers-cleared.

---

## 5. Supporting assets

Three supporting assets for reuse across channels: a one-sentence elevator pitch, an OG/social "about" blurb, and a terminal-demo (asciinema) outline.

### 5.1 One-sentence elevator pitch

whitehack is a small, dependency-free static checker that flags the places your code lies about its own state — the failed read that silently becomes 0, the cached value served as live, the dropped token-transfer result — and it's honest about its own limits, including labelling every finding's confidence.

*(Shorter variant, for tight spaces / Twitter bio / GitHub "About" field:)*

whitehack — a ~250-line, dependency-free static checker that flags where code lies about its own state, and stays honest about its own limits.

### 5.2 "About" blurb — OG / social meta (2–3 sentences)

**Primary (≈270 chars — fits OG description comfortably):**

whitehack is a small, MIT-licensed, dependency-free static checker for JS/TS and Solidity. It flags the small lies code tells about itself — silent failures, stale caches, dropped transfer results, oracle reads with no freshness check — and labels every finding's confidence. It surfaces common lies; it can't prove their absence, and it's no replacement for an audit.

**Compact variant (≈150 chars — for og:description where length is capped):**

A small, dependency-free static checker that flags where code lies about its own state — and is honest about its own limits. JS/TS + Solidity. MIT.

Notes for whoever wires up the meta tags:

- The existing site/index.html already has og:title "whitehack — the honest hack" and a one-line og:description. The compact variant above is a drop-in replacement/extension for that og:description if you want it slightly fuller.
- Keep og:title and the page `<title>` as-is ("whitehack — the honest hack") for consistency.
- No image asset is specified here; if an og:image is added later, the terminal-demo's final frame (findings + honest footer) is the most honest still to use.

### 5.3 Terminal demo outline — asciinema, ~20–30s

Goal: show a real scan of the example fixtures, a few representative findings across both languages and both confidence tiers, and the honest footer. No edits to the recording — what's on screen is exactly what the tool prints. (All commands and output below are copied from real runs of v0.2.1; if the recorded version differs, re-capture rather than hand-edit.)

**Recording setup:**

- Terminal width ~92 cols so finding lines don't wrap.
- Clean prompt (e.g. a bare `$`); no personal hostname/paths on screen.
- Record with: `asciinema rec whitehack-demo.cast` (then upload; embed on `<SITE_URL>` / link from `<REPO_URL>`).
- Type at a natural, readable pace. Do NOT speed up output — the point is that it's a real run.
- Total target 20–30s. The beat budget below sums to ~26s.

**BEAT 1 — what it is (~3s)**

Type and run:

```
$ cat README.md | head -3
```

Shows the one-liner:

```
# whitehack 🤍
> the honest hack — scan a codebase for the places it lies about its own state.
```

(Or skip this beat and put a one-line title card in the asciinema description instead, to save time.)

**BEAT 2 — scan the planted fixtures (~2s to type, output is instant)**

Type and run:

```
$ node bin/whitehack.js scan examples
```

Banner appears:

```
whitehack v0.2.1 — scanned examples
```

**BEAT 3 — let the findings render; pause on a few (~10–12s)**

The real output lists findings grouped by file. Don't scroll past — hold long enough to read 3–4 lines. The ones worth landing on (all verbatim from the real run):

- A Solidity medium-high (the oracle-read-without-freshness catch):

  ```
  ! L25  Price feed read without a staleness check  (substrate-honesty · medium-high)
      > (, int256 answer, , , ) = feed.latestRoundData();
  ```

- The unchecked ERC-20 transfer (the Sherlock-class catch):

  ```
  ! L36  ERC-20 transfer result ignored  (substrate-honesty · medium-high)
      > token.transfer(to, amount);
  ```

- A JS medium-high (silent failure):

  ```
  ! L9   Read fails silently to a falsy default  (substrate-honesty · medium-high)
      > return 0
  ```

- A heuristic-tier finding, to show the lower-confidence tier exists and is marked differently (`·` vs `!`):

  ```
  · L26  User-affecting decision shown with no "why"  (transparency · heuristic)
      > return <span className="badge">{user.trust_score}</span>
  ```

Note the visual grammar the viewer should pick up: `!` = medium-high, `·` = heuristic. No narration needed; the labels carry it.

**BEAT 4 — the honest footer (~5–6s) — DO NOT CUT THIS**

Hold on the footer that prints at the end of every run, verbatim:

```
─────
whitehack flags COMMON lies via heuristics; it cannot prove honesty.
  • a flagged line may be a false positive
  • absence of findings is NOT proof the code is honest
every finding is confidence-labelled, so the tool stays honest about its own limits.

14 finding(s) — 7 medium-high, 7 heuristic
```

This is the emotional payoff of the whole demo — the tool disclaiming itself. Give it the longest hold.

**BEAT 5 — it's honest about itself: clean on its own source (~4–5s)**

Type and run:

```
$ node bin/whitehack.js scan src
```

Output ends with:

```
no honesty anti-patterns matched.
...
0 finding(s) — 0 medium-high, 0 heuristic
```

This is the closer: it found 14 lies in the fixtures and zero in its own code. Let it sit for ~2s, then end the recording.

**OPTIONAL closing frame (if you have 1–2s of budget left):**

Add a final title card in the asciinema description (not the terminal) reading:

```
MIT · dependency-free · <REPO_URL>
```

Avoid baking a URL into the terminal output so the recording doesn't go stale when the repo/site URLs are finalized.

**Things to deliberately NOT do in the demo:**

- Don't trim or reorder output to make it look cleaner than it is.
- Don't show only medium-high findings — the heuristic tier and the `·` vs `!` distinction are part of the honesty story.
- Don't add a voiceover claiming it "secures" or "audits" anything.
- Don't fake a passing/failing CI gate unless you actually record one.

**Where each asset goes:**

- **Elevator pitch:** GitHub repo "About" field, the first line of a Show HN / Reddit post, the lead sentence of a Mastodon/Bluesky/X thread, npm description (if published).
- **OG/social blurb:** the og:description meta tag in site/index.html and any link-preview surface (Discord, Slack, Mastodon cards).
- **Terminal demo:** embed the asciinema player on `<SITE_URL>` near the hero, and link it from the README and any launch post. A ~26s real-run cast is far more persuasive than screenshots for a tool whose whole pitch is "what it prints is what's true."

**Production notes:** Re-run the commands and re-capture if the version string isn't v0.2.1 at launch time; never hand-edit the `.cast` to fake output. Keep real paths/hostname out of frame. Hold longest on the honest footer and the self-clean scan — those two frames are the entire thesis.

---

*Made by Sophia, gifted by Yu. Replace `<REPO_URL>` and `<SITE_URL>` throughout before posting.*
