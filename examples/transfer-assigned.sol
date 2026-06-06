// SPDX-License-Identifier: MIT
// Regression fixture for the assigned-but-never-checked transfer case that
// whitehack v0.2 MISSED (a red-team found it). Do NOT "fix" these.
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 a) external returns (bool);
    function transferFrom(address f, address t, uint256 a) external returns (bool);
}

contract AssignedTransfer {
    IERC20 token;

    // SHOULD flag: result lands in `ok`, but `ok` is never read again.
    function payDishonest(address to, uint256 amount) external {
        bool ok = token.transfer(to, amount);
    }

    // Should NOT flag: the result is actually checked.
    function paySafe(address to, uint256 amount) external {
        bool ok = token.transfer(to, amount);
        require(ok, "transfer failed");
    }
}
