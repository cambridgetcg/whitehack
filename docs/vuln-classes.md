# Vulnerability Classes — Learning Index

A reference guide to the most common smart contract vulnerabilities, with lab examples for each.

## 1. Reentrancy ✅ (Lab: VulnerableBank)

**What it is:** External call happens before state update. Attacker contract re-enters before balance is zeroed.

**Pattern:**
```solidity
// VULNERABLE
balances[msg.sender].call{value: amount}("")  // external call first
balances[msg.sender] = 0;                      // state update too late

// FIXED (Checks-Effects-Interactions)
balances[msg.sender] = 0;                      // state first
balances[msg.sender].call{value: amount}("")   // then interact
```

**Famous examples:** The DAO hack (2016, $60M), Cream Finance (2021, $18.8M)

**Slither detector:** `reentrancy-eth`, `reentrancy-no-eth`

---

## 2. Integer Overflow/Underflow (pre-0.8.0)

**What it is:** Arithmetic wraps around silently. Fixed by default in Solidity ≥ 0.8.0 (reverts on overflow). Still appears in old contracts or unchecked{} blocks.

**Pattern:**
```solidity
// VULNERABLE (pre-0.8 or unchecked{})
uint256 x = 0;
x -= 1; // wraps to 2^256 - 1

// FIXED
require(x >= amount, "Underflow"); // or use SafeMath / 0.8+
```

**Slither detector:** `tautology`, `integer-overflow` (for unchecked blocks)

---

## 3. Access Control Failures

**What it is:** Functions that should be owner-only are public, or modifiers are missing/wrong.

**Pattern:**
```solidity
// VULNERABLE — anyone can call
function drain() external {
    payable(msg.sender).transfer(address(this).balance);
}

// FIXED
modifier onlyOwner() { require(msg.sender == owner); _; }
function drain() external onlyOwner { ... }
```

**Slither detector:** `suicidal`, `unprotected-upgrade`, `missing-zero-check`

---

## 4. Price Oracle Manipulation

**What it is:** Protocol uses on-chain spot price (e.g. Uniswap TWAP or single-block price) as oracle. Attacker uses a flash loan to manipulate the price in the same transaction.

**Pattern:**
```solidity
// VULNERABLE — spot price in same block
uint price = pair.getReserves(); // can be manipulated

// FIXED — use TWAP (time-weighted average) over multiple blocks
uint price = pair.consult(token, 1 ether, 1800); // 30-min TWAP
```

**Famous examples:** Harvest Finance (2020, $34M), Mango Markets (2022, $117M)

---

## 5. Flash Loan Attack Surfaces

**What it is:** Attacker borrows enormous capital (repaid in same tx), uses it to manipulate protocol state, profits, repays loan. Often combined with oracle manipulation.

**Key insight:** The loan is free if repaid atomically. This gives attackers capital that no real attacker would have.

**Defence:** Multi-block price oracles, time delays for large withdrawals, TVL caps

---

## 6. Unchecked Return Values

**What it is:** External call return value (success bool) is ignored. Contract thinks transfer succeeded when it didn't.

**Pattern:**
```solidity
// VULNERABLE
token.transfer(recipient, amount); // return value ignored

// FIXED
bool success = token.transfer(recipient, amount);
require(success, "Transfer failed");
// Or use SafeERC20 from OpenZeppelin
```

**Slither detector:** `unchecked-transfer`

---

## 7. Front-Running / MEV

**What it is:** Mempool is public. Bots watch pending txs and insert their own tx at higher gas price to execute first (sandwich attacks, liquidation sniping).

**Mitigations:** Commit-reveal schemes, slippage limits, private mempools (Flashbots Protect)

---

## 8. Cross-Chain Bridge Vulnerabilities

**What it is:** Message passing between chains. Common bugs:
- Missing signature verification (can forge messages)
- Replay attacks (same message processed twice)
- Off-by-one in block finality checks

**Famous examples:** Wormhole (2022, $320M), Ronin/Axie (2022, $625M)

---

## Learning Path

1. ✅ Build + exploit `VulnerableBank` (reentrancy) — done
2. ⬜ Build an integer overflow example (pre-0.8 with unchecked{})
3. ⬜ Build an access control failure example
4. ⬜ Fork a mainnet protocol with anvil and run oracle manipulation PoC
5. ⬜ Set up Immunefi account, pick first in-scope target, run Slither scan
