// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title VulnerableBank
/// @notice A deliberately vulnerable contract for learning reentrancy.
/// NEVER DEPLOY TO MAINNET. Lab use only.
///
/// Vulnerability: Classic reentrancy in withdraw()
/// The state (balances[msg.sender]) is updated AFTER the external call.
/// An attacker contract can re-enter withdraw() before the balance is zeroed.
///
/// Lesson: Always follow Checks-Effects-Interactions pattern.
/// Fix: Move `balances[msg.sender] = 0` BEFORE the call.
contract VulnerableBank {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice VULNERABLE: state update after external call
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // BUG: external call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // BUG: too late — attacker has already re-entered
        balances[msg.sender] = 0;

        emit Withdrawal(msg.sender, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
