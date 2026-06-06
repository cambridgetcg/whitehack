// SPDX-License-Identifier: MIT
// The CORRECTED versions of the two incidents above. A precise tool must stay
// SILENT here: zero findings. If whitehack flags any of these, it is crying
// wolf on correct code — the false-positive failure that kills trust.
pragma solidity ^0.8.0;

interface IERC20 { function transfer(address to, uint256 amount) external returns (bool); }
interface IERC20Safe { function safeTransfer(address to, uint256 amount) external; }
interface IAggregator { function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80); }

contract Fixed {
    IAggregator priceFeed;
    uint256 constant MAX_AGE = 3600;

    // fix #1: use SafeERC20-style safeTransfer (reverts on failure)
    function redeem(IERC20Safe token, uint256 amount) external {
        token.safeTransfer(msg.sender, amount);
    }

    // fix #2: explicitly require() the bool result
    function borrow(IERC20 token, uint256 amount) external {
        require(token.transfer(msg.sender, amount), "transfer failed");
    }

    // fix #3: validate the feed's freshness window before using the answer
    function getCollateralPrice() external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(block.timestamp - updatedAt < MAX_AGE, "price too old");
        require(answer > 0, "bad price");
        return uint256(answer);
    }
}
