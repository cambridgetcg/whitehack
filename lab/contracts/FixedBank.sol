// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title FixedBank
/// @notice The correct implementation — Checks-Effects-Interactions pattern.
/// Compare with VulnerableBank to understand the fix.
contract FixedBank {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice FIXED: state update before external call (CEI pattern)
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // FIXED: zero the balance FIRST (effects before interactions)
        balances[msg.sender] = 0;

        // Now send — even if attacker re-enters, balance is already 0
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
