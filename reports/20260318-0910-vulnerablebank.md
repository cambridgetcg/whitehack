# WHITEHACK Scan Report
**Target:** `lab/contracts/VulnerableBank.sol`  
**Scanned:** 2026-03-18 09:10 UTC  
**Findings:** 4 total

## 🔴 High (1)

### 1. reentrancy-eth (confidence: Medium)
> Reentrancy in VulnerableBank.withdraw() (contracts/VulnerableBank.sol#26-38):
	External calls:
	- (success,None) = msg.sender.call{value: amount}() (contracts/VulnerableBank.sol#31)
	State variables written after the call(s):
	- balances[msg.sender] = 0 (contracts/VulnerableBank.sol#35)
	VulnerableBank.balances (contracts/VulnerableBank.sol#15) can be used in cross function reentrancies:
	- Vulner
**Elements:** withdraw, (success,None) = msg.sender.call{value: amount}(), balances[msg.sender] = 0

## 🟠 Low (1)

### 1. reentrancy-events (confidence: Medium)
> Reentrancy in VulnerableBank.withdraw() (contracts/VulnerableBank.sol#26-38):
	External calls:
	- (success,None) = msg.sender.call{value: amount}() (contracts/VulnerableBank.sol#31)
	Event emitted after the call(s):
	- Withdrawal(msg.sender,amount) (contracts/VulnerableBank.sol#37)
**Elements:** withdraw, (success,None) = msg.sender.call{value: amount}(), Withdrawal(msg.sender,amount)

## ℹ️ Informational (2)

### 1. solc-version (confidence: High)
> Version constraint ^0.8.0 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess
	- AbiReencodingHeadOverflowWithStaticArrayCleanup
	- DirtyBytesArrayToStorage
	- DataLocationChangeInInternalOverride
	- NestedCalldataArrayAbiReencodingSizeValidation
	- SignedImmutables
	- ABIDe
**Elements:** ^0.8.0

### 2. low-level-calls (confidence: High)
> Low level call in VulnerableBank.withdraw() (contracts/VulnerableBank.sol#26-38):
	- (success,None) = msg.sender.call{value: amount}() (contracts/VulnerableBank.sol#31)
**Elements:** withdraw, (success,None) = msg.sender.call{value: amount}()
