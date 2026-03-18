# WH-C4-CHAIN-001: Missing `minBidUsdValue` Check in `GPV2CompatibleAuction.isValidSignature` Allows Dust Bids via CoW Protocol

## Severity: MEDIUM

## Summary

The `GPV2CompatibleAuction.isValidSignature()` function validates CoW Protocol orders but does not enforce the `minBidUsdValue` check that exists in `BaseAuction.bid()`. This allows CoW solvers to submit arbitrarily small orders that bypass the minimum bid size protection, enabling dust attacks that can prevent early auction termination and degrade auction efficiency.

## Vulnerability Details

### The Check in `bid()`

In `BaseAuction.bid()` (BaseAuction.sol:410-458), there is an explicit minimum bid USD value check:

```solidity
// BaseAuction.sol:429-435
(uint256 assetPrice,,) = _getAssetPrice(asset, true);
uint256 bidUsdValue = (amount * assetPrice) / (10 ** assetParams.decimals);
uint88 minBidUsdValue = s_minBidUsdValue;

if (bidUsdValue < minBidUsdValue) {
    revert BidValueTooLow(bidUsdValue, minBidUsdValue);
}
```

This prevents bids below the configured minimum USD value, which serves two purposes:
1. Prevents dust attacks that keep auction balances just above `minAuctionSizeUsd` to prevent early termination
2. Prevents economically insignificant bids that waste gas and clog the system

### The Missing Check in `isValidSignature()`

In `GPV2CompatibleAuction.isValidSignature()` (GPV2CompatibleAuction.sol:119-176), the function validates many order parameters but **does not check** that the order's sell amount meets the minimum bid USD value:

```solidity
// GPV2CompatibleAuction.sol:141-157
if (order.sellAmount == 0) {
    revert Errors.InvalidZeroAmount();
}
uint256 assetInBalance = order.sellToken.balanceOf(address(this));
if (order.sellAmount > assetInBalance) {
    revert InsufficientAssetInBalance(address(order.sellToken), order.sellAmount, assetInBalance);
}
uint256 elapsedTime = block.timestamp - auctionStart;
AssetParams memory assetParams = s_assetParams[address(order.sellToken)];
if (elapsedTime > assetParams.auctionDuration) {
    revert InvalidAuction(address(order.sellToken));
}
(uint256 sellTokenUsdPrice,,) = _getAssetPrice(address(order.sellToken), true);
uint256 minBuyAmount = _getAssetOutAmount(assetParams, sellTokenUsdPrice, order.sellAmount, elapsedTime, true);
if (order.buyAmount < minBuyAmount) {
    revert InsufficientBuyAmount(order.buyAmount, minBuyAmount);
}
```

The only amount check is `order.sellAmount == 0` (must be non-zero) and `order.sellAmount <= assetInBalance` (must not exceed available balance). There is **no** check equivalent to:

```solidity
uint256 bidUsdValue = (order.sellAmount * sellTokenUsdPrice) / (10 ** assetParams.decimals);
if (bidUsdValue < s_minBidUsdValue) {
    revert BidValueTooLow(bidUsdValue, s_minBidUsdValue);
}
```

### Attack Scenario: Dust-Based Auction Griefing

The `checkUpkeep()` function (BaseAuction.sol:249-253) determines when an auction should end early:

```solidity
if (
    auctionStart + assetParams.auctionDuration < block.timestamp
        || (isPriceValid && assetBalanceUsdValue < assetParams.minAuctionSizeUsd)
) {
    endedAuctions[endedAuctionsIdx++] = asset;
}
```

An attacker can exploit the missing `minBidUsdValue` check to:

1. Submit many tiny CoW orders (e.g., `sellAmount = 1 wei`) that each pass `isValidSignature`
2. These orders are partially-fillable (`order.partiallyFillable` is required to be `true`)
3. CoW solvers batch-settle these orders, slowly draining auction tokens in tiny increments
4. By carefully sizing the orders, the attacker keeps the auction balance just above `minAuctionSizeUsd`, preventing the dust-based early termination
5. The auction runs for its full duration at increasingly favorable prices (for the attacker), while legitimate larger bidders may be outcompeted by the aggregated small orders

## Impact

- **Dust attack prevention bypass**: The `minBidUsdValue` exists specifically to prevent dust attacks. CoW Protocol orders bypass this protection entirely.
- **Auction griefing**: An attacker can manipulate auction ending conditions by making many small bids to keep the balance above the dust threshold.
- **Inconsistent validation**: The two entry points for auction participation (`bid()` and CoW orders) have different validation standards, creating an asymmetry that can be exploited.

## Proof of Concept Steps

1. Deploy `GPV2CompatibleAuction` with `minBidUsdValue = 100e18` ($100 minimum)
2. Start an auction for 10,000 USDC
3. Create a CoW order with `sellAmount = 1` (1 wei of USDC, worth ~$0.000001)
4. Call `isValidSignature()` — it passes (no minBidUsdValue check)
5. The same 1-wei bid via `bid()` would revert with `BidValueTooLow`

## Recommended Fix

Add the `minBidUsdValue` check to `isValidSignature()`:

```solidity
// In GPV2CompatibleAuction.isValidSignature(), after getting sellTokenUsdPrice:
uint256 bidUsdValue = (order.sellAmount * sellTokenUsdPrice) / (10 ** assetParams.decimals);
if (bidUsdValue < s_minBidUsdValue) {
    revert BidValueTooLow(bidUsdValue, s_minBidUsdValue);
}
```

## References

- `BaseAuction.bid()`: BaseAuction.sol:410-458 (has the check)
- `GPV2CompatibleAuction.isValidSignature()`: GPV2CompatibleAuction.sol:119-176 (missing the check)
- `BaseAuction.checkUpkeep()`: BaseAuction.sol:249-253 (dust-based ending condition)
