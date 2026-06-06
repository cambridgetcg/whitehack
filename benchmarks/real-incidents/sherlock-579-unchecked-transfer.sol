// SPDX-License-Identifier: MIT
// Faithful reconstruction of Sherlock 2025-05 "Lend" audit, finding #579:
//   "Silent Failure Due to Unchecked ERC20 transfer Return Values" (Medium)
//   https://github.com/sherlock-audit/2025-05-lend-audit-contest-judging/issues/579
// The documented vulnerable pattern lives in CoreRouter.sol (redeem :124,
// borrow :170, borrowForCrossChain :204): the bool result of transfer() is
// dropped, so a token that returns false instead of reverting (USDT) leaves the
// protocol's accounting claiming a transfer that never happened — phantom
// transfers, irretrievable funds, bad debt.
// This reconstructs the PATTERN for benchmarking; it is not verbatim source.
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract CoreRouter {
    mapping(address => uint256) totalInvestment;

    // orig CoreRouter.sol:124 — redeem
    function redeem(address _token, uint256 expectedUnderlying) external {
        totalInvestment[_token] -= expectedUnderlying;
        IERC20(_token).transfer(msg.sender, expectedUnderlying);
    }

    // orig CoreRouter.sol:170 — borrow
    function borrow(address _token, uint256 _amount) external {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    // orig CoreRouter.sol:204 — borrowForCrossChain
    function borrowForCrossChain(address _destUnderlying, address _borrower, uint256 _amount) external {
        IERC20(_destUnderlying).transfer(_borrower, _amount);
    }
}
