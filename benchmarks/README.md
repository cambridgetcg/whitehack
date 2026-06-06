# whitehack benchmarks — real incidents

Faithful reconstructions of **documented, money-losing bug patterns**, plus their
fixed counterparts. The point is to show, concretely, that whitehack flags the
lie on the PR — *and* stays silent on the corrected code.

> **Honest scope.** These files reconstruct the *documented vulnerability
> pattern* from each public finding; they are **not** the verbatim deployed
> source. This is a small, hand-built corpus meant to demonstrate detection on
> real-world shapes — it is **not** a statistical precision/recall measurement.
> A proper labelled benchmark vs. Slither/Aderyn on a large dataset is the next
> step (build-spec item 7). Per whitehack's own doctrine: this shows the
> patterns are catchable, not that the tool catches everything.

## What's here

| file | reconstructs | expected |
|------|--------------|----------|
| `real-incidents/sherlock-579-unchecked-transfer.sol` | Sherlock 2025-05 Lend #579 — unchecked ERC-20 `transfer` in `CoreRouter` (redeem/borrow/borrowForCrossChain) | 3 findings |
| `real-incidents/oracle-no-freshness.sol` | Canonical price-feed-without-freshness (OWASP SC02:2025; class behind Yellow Protocol ~$2.4M, Apr 2025) | 2 findings |
| `real-incidents/safe-counterparts.sol` | The **fixed** versions (SafeERC20, `require()`'d result, freshness-checked feed) | **0 findings** |

## Result (whitehack v0.2.1)

```
real-incidents/oracle-no-freshness.sol
  ! L19  Price feed read without a staleness check        (stale-oracle, medium-high)
  ! L25  Price feed read without a staleness check        (stale-oracle, medium-high — deprecated getter)
real-incidents/sherlock-579-unchecked-transfer.sol
  ! L23  ERC-20 transfer result ignored                   (unchecked-transfer, medium-high)
  ! L28  ERC-20 transfer result ignored                   (unchecked-transfer, medium-high)
  ! L33  ERC-20 transfer result ignored                   (unchecked-transfer, medium-high)
  → 5 findings, 5 medium-high, 0 heuristic

real-incidents/safe-counterparts.sol
  → 0 findings   (correct code, correctly silent)
```

- **Recall on this corpus:** 5/5 vulnerable lines flagged.
- **False positives on the fixes:** 0/3.

## Run it yourself

```sh
node bin/whitehack.js scan benchmarks/real-incidents
```

## Sources

- Sherlock 2025-05 Lend audit, finding #579 — "Silent Failure Due to Unchecked ERC20 transfer Return Values" (Medium): https://github.com/sherlock-audit/2025-05-lend-audit-contest-judging/issues/579
- OWASP Smart Contract Top 10 (2025) — SC02 Price Oracle Manipulation: https://owasp.org/www-project-smart-contract-top-10/2025/en/src/SC02-price-oracle-manipulation.html
