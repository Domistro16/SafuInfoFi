// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title FeeCollector
 * @notice Automated fee collection for SafuInfoFi using Chainlink Automation
 * @dev Executes fee collection every Sunday at 1am UTC
 */
contract FeeCollector is Ownable, ReentrancyGuard, AutomationCompatibleInterface {

    // Target execution time: Sunday 1am UTC
    uint256 public constant TARGET_DAY = 0; // Sunday (0 = Sunday in timestamp calculations)
    uint256 public constant TARGET_HOUR = 1; // 1am UTC

    // Execution window (1 hour)
    uint256 public constant EXECUTION_WINDOW = 1 hours;

    // Last execution timestamp
    uint256 public lastExecutionTime;

    // Minimum time between executions (6.5 days to ensure weekly execution)
    uint256 public constant MIN_INTERVAL = 6.5 days;

    // Fee recipient address
    address public feeRecipient;

    // Total fees collected
    uint256 public totalFeesCollected;

    // Events
    event FeesCollected(uint256 amount, uint256 timestamp);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event ManualWithdrawal(address recipient, uint256 amount, uint256 timestamp);

    /**
     * @notice Constructor
     * @param _feeRecipient Address to receive collected fees
     */
    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid recipient");
        feeRecipient = _feeRecipient;
        lastExecutionTime = 0;
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {
        // Fees received
    }

    /**
     * @notice Chainlink Automation check function
     * @dev Called by Chainlink nodes to check if upkeep is needed
     * @return upkeepNeeded True if it's time to execute
     * @return performData Empty bytes (not used)
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = _shouldExecute();
        performData = "";
    }

    /**
     * @notice Chainlink Automation perform function
     * @dev Called by Chainlink nodes when upkeep is needed
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        require(_shouldExecute(), "Not time to execute");

        _collectFees();
    }

    /**
     * @notice Manual fee collection (only owner, emergency use)
     */
    function manualCollectFees() external onlyOwner {
        _collectFees();
    }

    /**
     * @notice Withdraw accumulated fees to recipient
     */
    function _collectFees() private nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to collect");

        lastExecutionTime = block.timestamp;
        totalFeesCollected += balance;

        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Fee transfer failed");

        emit FeesCollected(balance, block.timestamp);
    }

    /**
     * @notice Check if it's time to execute fee collection
     * @return bool True if conditions are met
     */
    function _shouldExecute() private view returns (bool) {
        // Don't execute if not enough time has passed
        if (block.timestamp < lastExecutionTime + MIN_INTERVAL) {
            return false;
        }

        // Get current timestamp components
        uint256 timestamp = block.timestamp;
        uint256 dayOfWeek = ((timestamp / 1 days) + 4) % 7; // +4 to adjust epoch (Jan 1 1970 was Thursday)
        uint256 hourOfDay = (timestamp % 1 days) / 1 hours;

        // Check if it's Sunday (day 0) and between 1am-2am UTC
        bool isTargetDay = dayOfWeek == TARGET_DAY;
        bool isTargetHour = hourOfDay == TARGET_HOUR;

        return isTargetDay && isTargetHour && address(this).balance > 0;
    }

    /**
     * @notice Get time until next execution window
     * @return uint256 Seconds until next valid execution window
     */
    function timeUntilNextExecution() external view returns (uint256) {
        uint256 timestamp = block.timestamp;
        uint256 dayOfWeek = ((timestamp / 1 days) + 4) % 7;
        uint256 hourOfDay = (timestamp % 1 days) / 1 hours;

        // Calculate days until next Sunday
        uint256 daysUntilSunday = dayOfWeek == 0 ? 7 : (7 - dayOfWeek);

        // Calculate next Sunday 1am UTC
        uint256 nextExecution = timestamp +
            (daysUntilSunday * 1 days) -
            (hourOfDay * 1 hours) +
            (TARGET_HOUR * 1 hours);

        // If we're past 1am today and it's Sunday, wait until next Sunday
        if (dayOfWeek == 0 && hourOfDay >= TARGET_HOUR + 1) {
            nextExecution += 7 days;
        }

        return nextExecution > timestamp ? nextExecution - timestamp : 0;
    }

    /**
     * @notice Update fee recipient (only owner)
     * @param newRecipient New recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Get current contract balance
     * @return uint256 Current balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Emergency withdrawal (only owner)
     * @dev For emergency use only
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");

        emit ManualWithdrawal(owner(), balance, block.timestamp);
    }
}
