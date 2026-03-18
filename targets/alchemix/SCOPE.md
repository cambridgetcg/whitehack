# Target: Alchemix

**Platform:** Immunefi (Triaged by Immunefi)
**URL:** https://immunefi.com/bug-bounty/alchemix/information/
**Scope confirmed:** ✅
**Max payout:** $300,000 (Critical = 10% of funds at risk)
**Min Critical payout:** $35,000
**KYC required:** No
**PoC required:** Yes (all severities)
**Arbitration:** Enabled
**Added:** 2026-03-18

## In-Scope Contracts

| Contract | Location | Notes |
|----------|----------|-------|
| All files in `src/` | https://github.com/alchemix-finance/v2-foundry/tree/master/src | EXCEPT: external/aave, mocks, test |

Networks: Ethereum mainnet, Arbitrum, Optimism

## Out of Scope

- CrossChainCanonicalBase.sol (except: unauthorized admin access or bridge/L2 token implementation bugs)
- Best practice critiques
- Known issues from C4 2022-05 audit (https://github.com/code-423n4/2022-05-alchemix-findings/issues)
- Known issues from Runtime Verification audit (rv-audit.pdf in this folder)
- Third-party oracle manipulation, governance attacks, Sybil, centralization risks

## Audit Reports Already Read

- [x] Runtime Verification audit (2022-01-13) — rv-audit.pdf — findings A01-A12, B01-B17
- [x] Code4rena 2022-05 — 100 open issues checked, no multicall/payable findings

## Slither Scan Results (2026-03-18)

Run: `slither src/AlchemistV2.sol` — 88 findings total

| Severity | Count | Notes |
|----------|-------|-------|
| High | 1 | delegatecall-loop in Multicall (payable) — needs manual triage |
| Medium | 19 | incorrect-equality (mostly intentional), reentrancy-no-eth, uninitialized-local |
| Low | 40 | shadowing-local, missing-zero-check, calls-in-loop (many duplicates) |
| Informational | 28 | solc version, low-level-calls |

## Findings Under Investigation

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| WH-ALC-001 | Low/Med? | payable multicall() — ETH locked in AlchemistV2, EthAssetManager | Investigating |
| WH-ALC-002 | Informational | Slither false positives (totalShares==0, uninitialized debt via assignment) | Closed — FP |
| WH-ALC-003 | TBD | reentrancy-no-eth in liquidate() — external calls before full state sync? | Investigating |
