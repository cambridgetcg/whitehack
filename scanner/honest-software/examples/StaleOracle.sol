// SPDX-License-Identifier: MIT
// Planted fixture: reads a Chainlink price with NO staleness check.
// `sol-stale-oracle` should flag the call site (and NOT the interface declaration).
pragma solidity ^0.8.19;

interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract Lending {
    IAggregatorV3 public feed;

    /// VULN: returns the raw oracle answer, unchecked.
    function collateralValue(uint256 amount) external view returns (uint256) {
        (, int256 answer, , , ) = feed.latestRoundData();
        return amount * uint256(answer);
    }
}
