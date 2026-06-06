// SPDX-License-Identifier: MIT
// Planted dishonest AMM pricing so whitehack can find the spot-price lie.
// Do NOT "fix" this — it is a fixture. (Kept free of time-averaged-pricing
// vocabulary on purpose, so the spot-price check is not suppressed.)
pragma solidity ^0.8.0;

interface IPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32);
}

contract DishonestAmm {
    IPair pair;

    // spot-price-as-fair: price straight from instantaneous reserves — one
    // flash loan moves this within a block.
    function spotPrice() external view returns (uint256) {
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        return uint256(reserve1) * 1e18 / uint256(reserve0);
    }
}
