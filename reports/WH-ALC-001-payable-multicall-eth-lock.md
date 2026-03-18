# Bug Report: WH-ALC-001
## ETH Permanently Locked via payable multicall() in AlchemistV2

**Target:** Alchemix — AlchemistV2 (alETH)
**Contract:** `0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd` (Ethereum mainnet)
**Severity:** Low
**Status:** Draft — not yet submitted
**Researcher:** whitehack (Yu)
**Date:** 2026-03-18

---

## Summary

`AlchemistV2` inherits `Multicall`, which exposes a `payable multicall(bytes[])` function. However, `AlchemistV2` has no `receive()` fallback, no `withdrawETH()` function, and no other mechanism to recover ETH. Any ETH sent with a `multicall()` call is permanently locked in the contract with no recovery path.

---

## Vulnerability Details

**Root cause:** `Multicall.multicall()` is declared `payable` (inherited from Uniswap's Multicall pattern) but the containing contract (`AlchemistV2`) has no mechanism to handle or withdraw ETH.

```solidity
// src/base/Multicall.sol
function multicall(bytes[] calldata data) external payable returns (bytes[] memory results) {
    results = new bytes[](data.length);
    for (uint256 i = 0; i < data.length; ++i) {
        (bool success, bytes memory result) = address(this).delegatecall(data[i]);
        // ...
    }
}
```

```solidity
// src/AlchemistV2.sol
contract AlchemistV2 is IAlchemistV2, Initializable, Multicall, Mutex {
    // No receive() function
    // No fallback() function  
    // No ETH withdrawal mechanism
```

**Note:** A direct ETH transfer (no data) to `AlchemistV2` correctly reverts. But `multicall()` being `payable` creates a silent vector where users could mistakenly send ETH alongside a multicall batch, believing it will be used (e.g., as with Uniswap's router patterns).

---

## Proof of Concept

Tested on a local `anvil` fork of mainnet at block 24683604.

```bash
# Fork mainnet
anvil --fork-url $ETH_RPC --fork-block-number 24683604 --port 8545

# Send 0.1 ETH via multicall() — succeeds, ETH is locked
cast send 0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd \
  "multicall(bytes[])(bytes[])" "[]" \
  --value 0.1ether \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <anvil-key>

# Verify ETH is now stuck
cast balance 0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd --rpc-url http://127.0.0.1:8545 --ether
# Output: 0.100000000000000000

# Verify direct ETH send reverts (no receive/fallback)
cast send 0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd --value 0.1ether --rpc-url ...
# Error: execution reverted
```

**Result:** `multicall()` accepts ETH (tx status 1), ETH balance of contract increases from 0 to 0.1 ETH. No recovery path exists.

---

## Impact

- **Severity: Low** — No user funds in the protocol are at risk. The contract's collateral (yield tokens) is unaffected.
- **Who is affected:** Any user who accidentally sends ETH with a multicall() transaction (e.g., copy-pasting a Uniswap-style pattern).
- **Amount at risk:** Only ETH explicitly sent by the caller in the multicall tx — not protocol TVL.
- **Irreversibility:** Permanent. No admin rescue function exists.

---

## Recommended Fix

Either:

**Option A — Remove payable from multicall():**
```solidity
function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
```

**Option B — Add ETH recovery for admin:**
```solidity
function rescueETH(address recipient) external onlyAdmin {
    payable(recipient).transfer(address(this).balance);
}
```

**Option C — Add receive() that reverts:**
```solidity
receive() external payable { revert("ETH not accepted"); }
```

Option A is cleanest since AlchemistV2 has no legitimate use for `msg.value`.

---

## Notes

- Also affects `EthAssetManager`, `PoolAssetManager`, `TwoPoolAssetManager`, `ThreePoolAssetManager` (all inherit Multicall) — though EthAssetManager has a legitimate `receive()`, so ETH locking there is by design.
- Not found in Runtime Verification audit (Jan 2022) or Code4rena audit (May 2022).
- Not on the known issues exclusion list.
