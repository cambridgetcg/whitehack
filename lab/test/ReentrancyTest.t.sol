// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../contracts/VulnerableBank.sol";
import "../contracts/FixedBank.sol";
import "../contracts/ReentrancyAttacker.sol";

contract ReentrancyTest is Test {
    VulnerableBank vulnerable;
    FixedBank fixedBank;

    function setUp() public {
        vulnerable = new VulnerableBank();
        fixedBank = new FixedBank();
    }

    function testReentrancyAttack() public {
        vm.deal(address(this), 10 ether);
        vulnerable.deposit{value: 5 ether}();
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(vulnerable));
        vm.deal(address(attacker), 1 ether);
        attacker.attack{value: 1 ether}();
        assertGt(address(attacker).balance, 1 ether, "Reentrancy should steal funds");
        assertEq(address(vulnerable).balance, 0, "Bank should be drained");
    }

    function testFixedBankHolds() public {
        vm.deal(address(this), 10 ether);
        fixedBank.deposit{value: 5 ether}();
        assertEq(address(fixedBank).balance, 5 ether, "Fixed bank should hold funds");
    }
}
