# WH-C4-CHAIN-003: `performUpkeep` Does Not Re-Validate Auction End Conditions for `endedAuctions` Parameter

## Severity: MEDIUM

## Summary

The `BaseAuction.performUpkeep()` function accepts an `endedAuctions` array from the caller but only validates that each auction exists (`s_auctionStarts[asset] != 0`). It does **not** re-validate that the auction has actually expired (duration elapsed) or that the balance is below the minimum auction size. This violates the contract's own documentation which states "This data should not be trusted, and should be validated against the contract's current state" (IBaseAuction.sol:24), and allows the AUCTION_WORKER_ROLE to prematurely terminate any live auction.

## Vulnerability Details

### `checkUpkeep` End Conditions (Properly Validated)

The `checkUpkeep()` function (BaseAuction.sol:248-254) identifies auctions to end based on two conditions:

```solidity
// BaseAuction.sol:249-253
if (
    auctionStart + assetParams.auctionDuration < block.timestamp           // Time expired
        || (isPriceValid && assetBalanceUsdValue < assetParams.minAuctionSizeUsd) // Dust remaining
) {
    endedAuctions[endedAuctionsIdx++] = asset;
}
```

### `performUpkeep` End Validation (Insufficient)

However, `performUpkeep()` (BaseAuction.sol:359-369) does **not** re-check either condition:

```solidity
// BaseAuction.sol:359-369
for (uint256 i; i < endedAuctions.length; ++i) {
    address asset = endedAuctions[i];

    if (s_auctionStarts[asset] == 0) {        // @audit: ONLY checks auction exists
        revert InvalidAuction(asset);
    }

    _onAuctionEnd(endedAuctions[i], hasFeeAggregator);
    delete s_auctionStarts[asset];
    emit AuctionEnded(asset);
}
```

The only validation is `s_auctionStarts[asset] == 0`, which simply checks whether an auction is live — not whether it should be ended.

### Contrast with Starting Auctions (Thorough Validation)

For comparison, the **starting auctions** path in `performUpkeep` re-validates extensively:

```solidity
// BaseAuction.sol:324-357
for (uint256 i; i < eligibleAssets.length; ++i) {
    if (s_auctionStarts[asset] != 0) revert LiveAuction();        // Re-validates no live auction
    if (assetDecimals == 0) revert AssetParamsNotSet(asset);       // Re-validates config
    (assetPrice,,) = _getAssetPrice(asset, true);                  // Re-validates price is fresh
    if (availableAssetUsdValue < assetParams.minAuctionSizeUsd)    // Re-validates min size
        revert AmountBelowMinAuctionSize(...);
}
```

This asymmetry — thorough validation for starting but minimal validation for ending — is a design gap.

### Attack Scenario

1. An auction for 100,000 USDC starts with a `startingPriceMultiplier` of 1.10e18 (10% premium) and `auctionDuration` of 3600 seconds (1 hour)
2. A bidder is waiting for the price to reach near `endingPriceMultiplier` of 0.98e18 (2% discount) to get the best deal
3. After 30 minutes, the AUCTION_WORKER calls `performUpkeep` with the USDC auction in `endedAuctions`
4. The auction is terminated at the halfway point. Remaining USDC is returned to the FeeAggregator
5. The bidder's opportunity to bid at the discount is eliminated
6. A new auction cycle starts, resetting the price curve from the 10% premium

This effectively denies the protocol the revenue from legitimate bids at favorable (for bidders) prices, and repeatedly restarts the premium period.

## Impact

- **Premature auction termination**: Any live auction can be ended at any point by the AUCTION_WORKER_ROLE, regardless of duration or balance
- **Revenue loss**: Premature termination resets the price curve, potentially causing the protocol to repeatedly sell at premium prices only (if bidders only buy at discounts, the protocol never sells)
- **Griefing**: A compromised worker can prevent any auction from reaching its discount phase, disrupting normal auction operations
- **Violation of documented invariants**: The IBaseAuction interface documentation explicitly states performUpkeep data "should not be trusted, and should be validated against the contract's current state"

## Proof of Concept Steps

1. Deploy `GPV2CompatibleAuction` with USDC auction configured (duration: 3600s)
2. Call `performUpkeep` to start a USDC auction
3. Wait 10 seconds (auction just started, not expired)
4. Call `performUpkeep` with `endedAuctions = [USDC_ADDRESS]` and empty `eligibleAssets`
5. Observe: auction ends successfully despite only 10 seconds having elapsed
6. Verify: `getAuctionStart(USDC) == 0` (auction was deleted)

## Recommended Fix

Add re-validation of end conditions in `performUpkeep`:

```solidity
for (uint256 i; i < endedAuctions.length; ++i) {
    address asset = endedAuctions[i];
    uint256 auctionStart = s_auctionStarts[asset];

    if (auctionStart == 0) {
        revert InvalidAuction(asset);
    }

    AssetParams memory assetParams = s_assetParams[asset];

    // Re-validate: auction must have expired or balance must be below minimum
    bool timeExpired = auctionStart + assetParams.auctionDuration < block.timestamp;
    if (!timeExpired) {
        (uint256 assetPrice,, bool isPriceValid) = _getAssetPrice(asset, false);
        uint256 assetBalance = IERC20(asset).balanceOf(address(this));
        uint256 assetBalanceUsdValue = (assetBalance * assetPrice) / (10 ** assetParams.decimals);
        if (!(isPriceValid && assetBalanceUsdValue < assetParams.minAuctionSizeUsd)) {
            revert InvalidAuction(asset);  // Auction has not ended
        }
    }

    _onAuctionEnd(asset, hasFeeAggregator);
    delete s_auctionStarts[asset];
    emit AuctionEnded(asset);
}
```

## References

- `BaseAuction.performUpkeep()`: BaseAuction.sol:305-370 (minimal end validation)
- `BaseAuction.checkUpkeep()`: BaseAuction.sol:248-254 (proper end conditions)
- `IBaseAuction.performUpkeep()`: IBaseAuction.sol:24 ("This data should not be trusted")
- `BaseAuction.performUpkeep()`: BaseAuction.sol:324-357 (thorough start validation for contrast)
