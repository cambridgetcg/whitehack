# WH-DELTA-001: Arithmetic Underflow in `shouldLiquidatePrimeDebt()` Blocks PRIME Debt Liquidation

**Platform**: HackenProof
**Program**: DeltaPrime Smart Contracts
**Severity**: Medium
**Target**: `PrimeLeverageFacet.sol`

---

## Summary

An arithmetic underflow in `shouldLiquidatePrimeDebt()` causes the function to revert instead of returning `true` when the weekly PRIME debt accrual rate exceeds the current accumulated PRIME debt. This blocks PRIME debt liquidation for affected accounts, preventing whitelisted liquidators from calling `liquidatePrimeDebt()`, potentially leading to protocol insolvency from unliquidatable positions.

## Vulnerability Details

**File**: `contracts/facets/PrimeLeverageFacet.sol:277`

```solidity
function shouldLiquidatePrimeDebt() public view returns (bool) {
    uint256 totalBorrowedValue = _getTotalBorrowedValueInUSDOnlyFromPoolsFacet();
    uint256 primeDebtRatio = DeploymentConstants.getTokenManager().getPrimeDebtRatio();

    uint256 weeklyAccrualAtCurrentBorrow = (totalBorrowedValue * primeDebtRatio * 7 days) / (100 * 365 days);
    uint256 primeDebt = DiamondStorageLib.getPrimeDebt();

    // BUG: underflows when weeklyAccrualAtCurrentBorrow > primeDebt
    if (primeDebt - weeklyAccrualAtCurrentBorrow > stakedPrime) {  // <-- REVERTS
        return true;
    }
    return false;
}
```

The subtraction `primeDebt - weeklyAccrualAtCurrentBorrow` on line 277 uses Solidity 0.8.17's default checked arithmetic. When `weeklyAccrualAtCurrentBorrow > primeDebt`, the subtraction underflows and reverts instead of returning a meaningful result.

**When does this happen?**

A user who borrows a large amount but whose PRIME debt hasn't had time to accrue will have:
- `weeklyAccrualAtCurrentBorrow` = large (proportional to current total borrow value)
- `primeDebt` = small (just started accruing, or debt snapshot not yet updated)

The intent of the code (per comments at lines 275-276) is to give the user a "buffer" — liquidation should only trigger when `primeDebt` exceeds `stakedPrime` by more than one week's accrual. But the implementation fails when the buffer is larger than the debt.

## Impact

1. **Blocked liquidation**: `liquidatePrimeDebt()` at line 288-289 requires `shouldLiquidatePrimeDebt()` to return `true`. When it reverts, liquidation is blocked.
2. **Protocol insolvency risk**: Accounts in this state cannot be liquidated for PRIME debt, meaning their PRIME debt grows unbounded while staked PRIME may be insufficient to cover it.
3. **Economic griefing**: A sophisticated attacker could deliberately create positions that trigger this condition, knowing their PRIME debt cannot be liquidated during the vulnerable window.

**Affected accounts**: Any account where `weeklyAccrualAtCurrentBorrow > primeDebt`, which includes:
- Newly created positions with large borrows
- Accounts that just increased their borrow significantly
- Accounts where `_updatePrimeDebtSnapshot()` hasn't been called recently

## Proof of Concept

```solidity
// On anvil fork of Avalanche mainnet
// 1. Create a Prime Account
// 2. Borrow a large amount (e.g., $100k) to create high weeklyAccrual
// 3. Immediately check shouldLiquidatePrimeDebt()
// 4. The function reverts instead of returning false/true

// Pseudocode:
uint256 totalBorrowed = 100_000e8; // $100k in 8-decimal USD
uint256 primeDebtRatio = 5; // 5% assumed
uint256 weeklyAccrual = (totalBorrowed * primeDebtRatio * 7 days) / (100 * 365 days);
// weeklyAccrual ≈ 958e8 (≈$958 worth of PRIME per week)

uint256 primeDebt = 0; // Just borrowed, no debt accrued yet

// primeDebt - weeklyAccrual = 0 - 958e8 → UNDERFLOW → REVERT
```

## Recommended Fix

Replace the unchecked subtraction with a safe comparison:

```solidity
// Before (buggy):
if (primeDebt - weeklyAccrualAtCurrentBorrow > stakedPrime) {

// After (fixed):
if (primeDebt > weeklyAccrualAtCurrentBorrow + stakedPrime) {
```

Or equivalently:
```solidity
if (primeDebt > stakedPrime && primeDebt - stakedPrime > weeklyAccrualAtCurrentBorrow) {
```

This preserves the original intent (liquidate when debt exceeds staked + one week buffer) without risking underflow.
