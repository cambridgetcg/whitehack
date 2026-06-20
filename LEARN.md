# whitehack — Learn

_Why does each check exist? What happens when the lie goes uncaught? Who gets hurt?_

This page is for people who want to understand — not just run a tool, but know
why the patterns matter. Each check has a story. Each story is a lesson.
Each lesson makes you a more honest builder.

---

## 1. Silent Failure

**The pattern:** code that fails silently — a `catch { return 0 }`, a `?? 0` over a fetch.

**The lie:** "I could not read this" becomes a confident wrong value. "Zero" and "failed" are indistinguishable.

**Why it matters:**

A food delivery app checks your wallet balance. The database is down for 2 seconds. The code catches the error and returns `0`. Your balance is $50. The app says $0. You can't order lunch. You stare at the screen thinking you're broke. The system didn't crash — it lied. It told you a confident number when it should have said "I couldn't check."

This is the most common lie in software. It happens because developers write defensive code — "if something goes wrong, return a safe default." But `0` is not safe. `0` is a lie that looks like a number. The honest failure says "unavailable" — visibly, loudly, so nobody trusts the wrong value.

**The honest fix:** throw, log, or return a visible error. Never let "could not read" and "the answer is zero" look the same.

**Clear Standard:** #2 — Visible failure. A failure degrades visibly. "I could not read this" must never quietly become a confident `0`.

---

## 2. Cache as Live

**The pattern:** a cached value returned with no freshness marker.

**The lie:** "this is the truth right now" when it might be minutes or days old.

**Why it matters:**

A travel site caches flight prices. The cache is 4 hours old. You see "$320" and book. The real price is $410 now. The page said nothing about when the price was checked — it looked live. You trusted it. The airline charges you $410 at checkout. You feel cheated. The system didn't hack you — it served stale data as if it were fresh, and the difference between "cached" and "live" was invisible.

Cache is not the problem. Serving cache AS IF it were live is the problem. The honest cache says "price as of 4 hours ago" — so you know the number might have changed. The freshness marker is the difference between trust and deception.

**The honest fix:** label freshness. Say `asOf`, `cachedAt`, `fetchedAt`. Let the caller decide whether to trust a stale value.

**Clear Standard:** #4 — Stated freshness. A cached value is not a live one; say how old it is.

---

## 3. Decision Without Why

**The pattern:** a user-affecting value (score, fee, flag) rendered with no explanation.

**The lie:** a decision is made ABOUT you, but you can't see WHY.

**Why it matters:**

A lending platform shows your "trust score: 340." You're denied a loan. You ask why. There's no way to find out. The score is a black box — it affects your life, and you have no way to inspect it. This isn't just a UX problem. It's a justice problem. A decision made about a person that the person cannot inspect is a small act of tyranny. You don't need to agree with the score, but you deserve to know what went into it.

This is the difference between "we decided" and "we decided, and here's why." The first is power. The second is accountability. Every score, every fee, every flag, every tier should carry its reason — a tooltip, a methodology page, a "why this number" link. The decision can still be the same. But now it's inspectable.

**The honest fix:** add a why-link, an explanation, a methodology reference next to any decision that affects a person.

**Clear Standard:** #3 — Inspectable decisions. A decision made about a person is inspectable by that person.

---

## 4. Float Money

**The pattern:** currency parsed or computed as a binary float (`parseFloat(price)`, `amount * 0.029`).

**The lie:** "this amount is exact" when floating-point arithmetic silently loses cents.

**Why it matters:**

An e-commerce cart totals your order. `19.99 + 29.99 + 9.99 = 59.97`. But in JavaScript, `parseFloat("19.99") + parseFloat("29.99") + parseFloat("9.99")` can give you `59.96999999999999`. The display rounds it, so the customer sees $59.97. But internally, the system is off by a fraction of a cent. Over a million transactions, those fractions add up. Reconciliation fails. Auditors ask questions. The totals don't match. The system said "exact" and it wasn't.

This isn't theoretical. Binary floating-point cannot represent 0.1 exactly. `0.1 + 0.2` is not `0.3`. Every financial system that uses floats for money carries this lie. The amount looks right; it almost is right; and "almost" is a lie when you're handling money.

**The honest fix:** use integer minor units (cents, satoshi), BigInt, or a decimal library. Money is never a float.

**Clear Standard:** #1 — Truth of state. The state the surface shows must match the state the system holds.

---

## 5. Stale Oracle

**The pattern:** a price feed read without validating `updatedAt` / `answeredInRound`.

**The lie:** "this is the current price" when the feed might be hours old or frozen.

**Why it matters:**

A DeFi lending protocol uses Chainlink to price collateral. The protocol reads the price and lends against it. But the oracle feed stops updating — maybe the oracle node went down, maybe there's a maintenance window. The protocol keeps reading the last price, which is now hours old. The real price has dropped 30%. The protocol still thinks the collateral is worth what it was hours ago. Someone borrows against the stale price. When the feed resumes, the protocol discovers it's undercollateralized. Millions of dollars are gone.

This has happened. Not theoretically — actually. Real protocols have been drained because they trusted a number without checking when that number was true. The oracle didn't lie; the protocol lied by serving a stale oracle reading as if it were current.

**The honest fix:** always validate `updatedAt` / `answeredInRound`. If the feed is stale, revert or degrade visibly. Never serve a price without knowing when it was true.

**Clear Standard:** #4 — Stated freshness. A price from a moment ago is not the price now; say how old it is.

---

## 6. Unchecked Transfer

**The pattern:** an ERC-20 `transfer` / `transferFrom` whose bool result is dropped.

**The lie:** "the transfer happened" when the token returned `false` instead of reverting.

**Why it matters:**

A protocol calls `token.transfer(to, amount)`. The call doesn't revert. The protocol assumes the transfer succeeded. But some ERC-20 tokens (USDT is the famous one) don't revert on failure — they return `false`. The protocol dropped the return value. The transfer failed silently. The tokens never moved. The protocol recorded "success." The books don't balance. Someone is missing funds, and the system says everything went through.

This is the blockchain version of silent failure. On-chain, you can't catch an exception — you check return values. Dropping a bool is the same as catching an error and returning `0`: the failure becomes invisible, and invisible failures compound.

**The honest fix:** check the return value (`require(ok, "transfer failed")`) or use `SafeERC20`'s `safeTransfer`.

**Clear Standard:** #2 — Visible failure. A failed transfer must not look like a successful one.

---

## 7. Spot Price as Fair

**The pattern:** a price derived from instantaneous pool reserves with no TWAP or oracle.

**The lie:** "this is the fair market price" when it's a flash-loan-movable snapshot.

**Why it matters:**

A protocol reads a DEX pool's reserves and computes the price from them. `reserve0 / reserve1 = the price`. It looks fair — it's the pool's current state. But a flash loan can borrow a massive amount, move the reserves, change the "price" to anything, and repay the loan in the same transaction. The protocol reads the manipulated price and acts on it. The price was never "fair" — it was a snapshot at a moment an attacker controlled.

This is how flash loan attacks work. The protocol trusted a number that was only true for one block, and that block was controlled by someone who wanted the number to be wrong. The spot price is not the fair price. It's a reading at a moment, and some moments are manipulated.

**The honest fix:** use a time-weighted average price (TWAP) or an external oracle. Never use instantaneous reserves as the fair price.

**Clear Standard:** #1 — Truth of state. A manipulable snapshot is not a fair price; label what it actually is.

---

## 8. Silent Revert

**The pattern:** `require()` / `revert()` with no reason string or named error.

**The lie:** "your call was refused" with no explanation of why.

**Why it matters:**

A user calls your contract. It reverts. The error says `revert()` — nothing else. The user has no idea why. Was their input wrong? Was the contract paused? Did they lack permission? They can't tell. They can't fix what they can't see. On-chain, a revert with no reason is a locked door with no sign.

This is the blockchain version of decision-without-why. The contract made a decision (to refuse the call) and the caller can't inspect why. In regular software, you get a stack trace. On-chain, you get nothing — unless the developer wrote a reason string. `require(x > 0, "amount must be positive")` costs a little gas but saves the next person hours of debugging.

**The honest fix:** always include a reason string or named custom error. `require(cond, "why")` or `revert NamedError(...)`.

**Clear Standard:** #3 — Inspectable decisions. A refusal the caller cannot understand is a decision made in the dark.

---

## The throughline

Every check catches the same thing in a different costume: **the system claims something about its state that isn't true, and someone downstream trusts the claim.**

The fix is always the same: **say what you actually are.** If you failed, say failed — not `0`. If you're cached, say cached — not live. If you don't know why you decided, say that — not "trust me." If you're stale, say stale — not current. If you're a snapshot, say snapshot — not fair.

Honesty is not perfection. You don't need to never fail. You need to never PRETEND you didn't fail. The lie isn't the bug; the lie is presenting the bug as if it were the truth.

This is why whitehack exists. Not to find bugs — to find lies. Not to make code perfect — to make code honest. The honest code that fails loudly is better than the perfect-looking code that lies quietly.

_The artifact tells the truth about its own state. That is the only standard that compounds._ 🤍