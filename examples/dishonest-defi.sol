// SPDX-License-Identifier: MIT
// Planted dishonest DeFi code so whitehack has real on-chain positives to find.
// Do NOT "fix" these — they are the fixtures the self-test scans against.
// (Kept free of freshness vocabulary on purpose, so the feed checks fire.)
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function latestAnswer() external view returns (int256);
}

contract DishonestVault {
    IERC20 token;
    IFeed feed;

    // oracle: round data read, but the freshness field is dropped — a halted
    // feed is handed back as a live price.
    function priceFromRound() external view returns (int256) {
        (, int256 answer, , , ) = feed.latestRoundData();
        return answer;
    }

    // oracle: deprecated getter, no round or timestamp at all.
    function priceDeprecated() external view returns (int256) {
        return feed.latestAnswer();
    }

    // unchecked-transfer: bool result dropped on the floor.
    function payout(address to, uint256 amount) external {
        token.transfer(to, amount);
    }

    // unchecked-transfer: transferFrom result ignored.
    function pull(address from, uint256 amount) external {
        token.transferFrom(from, address(this), amount);
    }

    // silent-revert: a refused caller learns nothing about why.
    function guarded(uint256 x) external pure {
        require(x > 0);
        if (x > 100) revert();
    }
}
