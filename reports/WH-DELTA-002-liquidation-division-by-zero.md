# WH-DELTA-002: Division by Zero in Non-Emergency Liquidation When `currentTotalValue == 0`

**Platform**: HackenProof
**Program**: DeltaPrime Smart Contracts
**Severity**: Low
**Target**: `SmartLoanLiquidationFacet.sol`

---

## Summary

When a Prime Account's total asset value is exactly zero after debt repayment during non-emergency liquidation, a division-by-zero error causes the liquidation to revert. This forces liquidators to use the emergency mode path which provides zero fee, disincentivizing liquidation of zero-value accounts.

## Vulnerability Details

**File**: `contracts/facets/SmartLoanLiquidationFacet.sol:168`

```solidity
function liquidate(bool _emergencyMode) external nonReentrant ...{
    // ... debt repayment at line 156 ...

    uint256 currentTotalValue = ...;  // line 164

    if (!_emergencyMode) {
        // BUG: division by zero when currentTotalValue == 0
        uint256 percentageToTake = actualLiquidationFee * 1e18 / currentTotalValue;
    }
}
```

After `_repayAllDebts()` at line 156, if the account's remaining total value equals zero (all assets were consumed to repay debt), `currentTotalValue` at line 164 is zero. The subsequent division at line 168 reverts.

## Impact

- Non-emergency liquidation reverts for zero-value accounts
- Liquidators must use `_emergencyMode = true`, which provides zero fee incentive
- Accounts at the boundary of insolvency (debt ≈ assets) are hardest to liquidate, which is when liquidation matters most

## Recommended Fix

```solidity
if (!_emergencyMode) {
    if (currentTotalValue == 0) {
        // Nothing to distribute as liquidation fee
        return;
    }
    uint256 percentageToTake = actualLiquidationFee * 1e18 / currentTotalValue;
    // ...
}
```
