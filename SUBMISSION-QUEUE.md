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

## WAVE 1 MULTI-PLATFORM SCAN RESULTS (2026-03-18 PM)

### HackerOne Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| Uniswap v4-core | $2.25M | 323 slither findings, all FPs (FullMath/BitMath assembly). Manual review: flash accounting, hooks, ERC6909 — all sound. 5 prior audits. | No exploitable bug |
| Account Abstraction (ERC-4337) | $250k | Hardhat compilation issues, manual review done. Gas accounting discrepancy in postOpReverted path, EIP-7702 init replay (documented as "by design"). | No reportable bug |

### HackenProof Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| Citrea Bridge | $250k | Rust ZK rollup. 43 Solidity files (Bridge.sol, BitcoinLightClient.sol). N-of-N Schnorr trust model is sound. No critical at Solidity level. | No reportable bug |
| DeltaPrime v2 | $250k | Diamond pattern lending. **2 valid findings**: WH-DELTA-001 (Medium: PRIME debt liquidation underflow), WH-DELTA-002 (Low: liquidation div-by-zero) | **2 reports drafted** |
| 1inch cross-chain-swap | $500k | Escrow-based cross-chain swaps. Time-separated phases prevent exploitation. No reentrancy vector (balance depletion + phase separation). | No reportable bug |

### Bugcrowd Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| Coinbase SmartWallet | TBD | ERC-4337 wallet. Cross-chain upgrade replay risk (Medium but likely known). Factory msg.value stranding (Low). | Borderline — not submitting |

### Repos Cloned
- ~/Desktop/whitehack/targets/uniswap-v4/repo (Uniswap v4-core)
- ~/Desktop/whitehack/targets/account-abstraction/repo (ERC-4337 AA)
- ~/Desktop/whitehack/targets/citrea/repo (Citrea Bitcoin ZK rollup)
- ~/Desktop/whitehack/targets/deltaprime/repo (DeltaPrime contracts-v2)
- ~/Desktop/whitehack/targets/1inch-limit-order/repo (1inch limit-order-protocol)
- ~/Desktop/whitehack/targets/1inch-cross-chain/repo (1inch cross-chain-swap)
- ~/Desktop/whitehack/targets/coinbase-smart-wallet/repo (Coinbase SmartWallet)

## WAVE 2 DEEP SCAN RESULTS (2026-03-18 evening)

### HackerOne Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| Uniswap v4-core (deep) | $2.25M | Full manual review: PoolManager, Pool.sol, Hooks.sol, Position.sol, ERC6909, ProtocolFees, transient storage libs. Delta accounting invariant + NonzeroDeltaCount is rock-solid. Hook deltas properly isolated per pool. settleFor griefing is by design. | **Confirmed: No exploitable bug** |
| Account Abstraction v0.9 (deep) | $250k | Full manual review: EntryPoint, StakeManager, NonceManager, SenderCreator, UserOperationLib. nonReentrant blocks EIP-7702 bundlers (by design). Paymaster magic-byte collision 1/2^64 (informational). Gas penalty system correct. | **Confirmed: No reportable bug** |

### HackenProof Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| 1inch Limit Order Protocol v4 | $500k | Full manual review: OrderMixin._fill, OrderLib, all 17 extensions, FeeTaker, PermitAndCall. CEI followed consistently. Reentrancy via permit detected for remaining orders. Extension hash binding (160-bit) sound. 80-bit address truncation still 2^80 brute-force. | **No exploitable bug** |

### Bugcrowd Targets
| Target | Max Bounty | Scan Result | Verdict |
|--------|-----------|-------------|---------|
| Coinbase SmartWallet (deep) | TBD | Full manual review: CoinbaseSmartWallet, MultiOwnable, ERC1271, Factory. address(0) owner blocked by Solady ecrecover guard. Cross-chain TOCTOU non-exploitable post-Dencun. removeLastOwner by design. 4 prior audits (Cantina x2, Certora, C4) — 0 findings. | **Confirmed: No exploitable bug** |

### Additional Repos Cloned (Wave 2)
- ~/Desktop/whitehack/targets/1inch-lop/repo (1inch limit-order-protocol v4)
- ~/Desktop/whitehack/targets/coinbase-wallet/repo (Coinbase smart-wallet)

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

## HACKENPROOF QUEUE (no rate limit — submit now)

| # | Report | Severity | Platform | Est. Payout | Ready? |
|---|--------|---------|---------|------------|--------|
| 1 | WH-DELTA-001 DeltaPrime debt underflow (blocks liquidation) | Medium | HackenProof | $4k-10k | ✅ YES |
| 2 | WH-DELTA-002 DeltaPrime division by zero (liquidator disincentive) | Low | HackenProof | $1k-2k | ✅ YES |
