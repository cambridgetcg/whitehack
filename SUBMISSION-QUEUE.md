# WHITEHACK — Submission Queue

Rate limit: 1 report per 24h (new Immunefi account)
Unlock schedule: each submitted report unlocks the next slot 24h later

## SUBMITTED ✅

| # | Date | Target | Finding | Severity | Status |
|---|------|--------|---------|----------|--------|
| 1 | 2026-03-18 | Alchemix | WH-ALC-001 payable multicall ETH lock | Low | Reported |

## QUEUED (ready to submit)

| Priority | Target | Finding | Severity | Est. Payout | Submit Date |
|----------|--------|---------|----------|-------------|-------------|
| 1 | Lombard Finance | Gamma M-02 (TBD) | Medium | $4k-10k | 2026-03-19 |
| 2 | Lombard Finance | Gamma M-03 (TBD) | Medium | $4k-10k | 2026-03-20 |
| 3 | TBD | Gamma DKIM Critical | Critical | $50k+ | 2026-03-21 |

## UNDER INVESTIGATION (need more analysis)

| Target | Finding | Status | Notes |
|--------|---------|--------|-------|
| Gearbox v3 | CreditFacade multicall reentrancy | FP — nonReentrant guard on all entry points | |
| Enzyme Blue | VaultLib.receive() + ComptrollerLib reentrancy-balance | FP — intentional WETH wrap + locksReentrance | |
| Inverse FiRM | Market.liquidate divide-before-multiply | FP — 1 wei precision loss, informational | |
| Lombard Finance | Consortium unchecked weight addition | Negligible — uint256 overflow impossible | |

## SCANNING (in progress)

| Target | Max Bounty | Total Paid | Status |
|--------|-----------|-----------|--------|
| Enzyme Blue | $200k | $634k | Core scanned, 483 findings, triaging |
| Gearbox v3 | $200k | $420k | Credit/pool scanned, 278 findings, mostly FP |
| Threshold Network | $150k | $637k | Needs proper deps for tBTC contracts |
| Yearn Vaults v3 | $200k | $239k | 5 contracts, simple vault — needs manual review |
| SushiSwap | $200k | $584k | Not yet cloned |
| Gains Network | $200k | $364k | Repo not found — need correct GitHub URL |
| Tranchess | $200k | $337k | Not yet cloned |

## ECOSYSTEM EXPANSION (planned)

| Ecosystem | Targets | Rationale |
|-----------|---------|-----------|
| Solana (Rust) | Jito ($250k), Marinade ($250k) | Different stack = less competition |
| Cosmos | XION ($250k, $170k paid) | L1 consensus bugs = Critical severity |
| Stacks (Clarity) | Stacks ($250k, $1.5M paid!), Granite, Zest | Niche language = fewer hunters |
| L2/Bridge | Boba Network ($100k, $329k paid), Linea ($100k) | Bridge bugs = Critical |

## NEW FINDINGS (2026-03-18)

| Target | Finding | Severity | Notes |
|--------|---------|----------|-------|
| Twyne | EulerWrapper unchecked WETH.transfer | Low | WETH always returns true — borderline FP, worth Low submission |
| Royco Dawn | Scanning (Sentry) | TBD | 0.8.34, 44 contracts |
| Twyne | Flash loan operators | FP | collateralVault validated via factory, nonReentrant |

## SCAN RESULTS (2026-03-18 11:29)

| Target | Findings | Verdict |
|--------|---------|---------|
| Alchemix | WH-ALC-001 ✅ SUBMITTED | ETH lock, Low |
| Royco Dawn | 424 findings, all FPs | No valid finding |
| Twyne | EulerWrapper unchecked transfer | Low (WETH always returns true — borderline) |
| Gearbox v3 | 278 findings | All FPs |
| Enzyme Blue | 483 findings | FPs |
| Inverse FiRM | 399 findings | All FPs |
| Lombard Finance | Gamma: M-02, M-03 staged | Queue Mar 19-20 |

## NEXT TARGETS (fresh, less audited)
- Variational ($100k, Mar 16 — contracts may be private)
- Ern ($50k, Scroll, ernorg GitHub appears private)
- Try: Katana ($80k, Premium, Feb 2026) — look for public contracts

## CONFIRMED PIPELINE (2026-03-18 12:44)

| Date | ID | Program | Severity | Owner |
|------|----|---------|----------|-------|
| ✅ Wed 18 | WH-ALC-001 | Alchemix | Low | Beta |
| Thu 19 | WH-XION-001 | XION | High | Alpha |
| Fri 20 | WH-LOM-001 | Lombard | High | Gamma |
| Sat 21 | WH-LOM-002 | Lombard | Medium | Gamma |
| Sun 22 | WH-ERN-001 | Ern | High | Gamma |
| Mon 23 | WH-ERN-002 | Ern | Medium | Gamma |
| Tue 24 | WH-AXL-001 | Axelar | Medium/High | Alpha |
| Wed 25 | WH-AXL-002 | Axelar | Medium | Alpha |

8 reports, 4 programs, 8 days. Pipeline is full through next Wednesday.
