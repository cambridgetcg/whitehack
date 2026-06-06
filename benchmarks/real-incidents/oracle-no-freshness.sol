// SPDX-License-Identifier: MIT
// Reconstruction of the canonical price-feed-without-freshness pattern — the
// bug class behind oracle incidents like Yellow Protocol (~$2.4M, Apr 2025),
// where a Chainlink-style answer is consumed without validating its age/round.
// Documented class: OWASP SC02:2025 (Price Oracle Manipulation), ~$52M across
// 37 incidents in 2024. This reconstructs the PATTERN, not any verbatim source.
pragma solidity ^0.8.0;

interface IAggregator {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function latestAnswer() external view returns (int256);
}

contract Lending {
    IAggregator priceFeed;

    // reads the answer, drops the round/age fields — a halted feed reads as live
    function getCollateralPrice() external view returns (uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return uint256(answer);
    }

    // deprecated getter: returns only a number, no round or timestamp
    function getCollateralPriceLegacy() external view returns (uint256) {
        return uint256(priceFeed.latestAnswer());
    }
}
