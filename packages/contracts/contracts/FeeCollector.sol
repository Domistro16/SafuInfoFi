// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title FeeCollector
 * @notice Receives fees from launchpad and distributes rewards to yappers based on leaderboard points
 * @dev Automated distribution every Sunday at 1am UTC via Chainlink Automation
 */
contract FeeCollector is Ownable, ReentrancyGuard, AutomationCompatibleInterface {

    // Payout configuration
    uint256 public constant TARGET_DAY = 0; // Sunday
    uint256 public constant TARGET_HOUR = 1; // 1am UTC
    uint256 public constant EXECUTION_WINDOW = 1 hours;
    uint256 public constant MIN_INTERVAL = 6.5 days;

    // Last payout timestamp
    uint256 public lastPayoutTime;

    // Backend oracle address (provides leaderboard data)
    address public oracleAddress;

    // Launchpad address (only address that can deposit fees)
    address public launchpadAddress;

    // Total fees received and distributed
    uint256 public totalFeesReceived;
    uint256 public totalFeesDistributed;

    // Minimum balance required to trigger payout
    uint256 public minPayoutThreshold;

    // Payout history
    struct PayoutRound {
        uint256 roundId;
        uint256 timestamp;
        uint256 totalAmount;
        uint256 projectCount;
        uint256 yapperCount;
    }

    mapping(uint256 => PayoutRound) public payoutRounds;
    uint256 public currentRoundId;

    // Yapper payout history
    struct YapperPayout {
        uint256 roundId;
        uint256 projectId;
        uint256 points;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => YapperPayout[]) public yapperPayoutHistory;

    // Events
    event FeesReceived(address indexed from, uint256 amount, uint256 timestamp);
    event PayoutExecuted(
        uint256 indexed roundId,
        uint256 totalAmount,
        uint256 projectCount,
        uint256 yapperCount,
        uint256 timestamp
    );
    event YapperPaid(
        address indexed yapper,
        uint256 indexed projectId,
        uint256 indexed roundId,
        uint256 points,
        uint256 amount
    );
    event OracleUpdated(address oldOracle, address newOracle);
    event LaunchpadUpdated(address oldLaunchpad, address newLaunchpad);

    /**
     * @notice Constructor
     * @param _oracleAddress Backend oracle that provides leaderboard data
     * @param _launchpadAddress Address of the launchpad contract
     * @param _minPayoutThreshold Minimum balance to trigger payout
     */
    constructor(
        address _oracleAddress,
        address _launchpadAddress,
        uint256 _minPayoutThreshold
    ) Ownable(msg.sender) {
        require(_oracleAddress != address(0), "Invalid oracle");
        require(_launchpadAddress != address(0), "Invalid launchpad");

        oracleAddress = _oracleAddress;
        launchpadAddress = _launchpadAddress;
        minPayoutThreshold = _minPayoutThreshold;
        lastPayoutTime = 0;
        currentRoundId = 0;
    }

    /**
     * @notice Receive fees from launchpad
     */
    receive() external payable {
        require(msg.sender == launchpadAddress, "Only launchpad can deposit");
        totalFeesReceived += msg.value;
        emit FeesReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Fallback to receive ETH
     */
    fallback() external payable {
        require(msg.sender == launchpadAddress, "Only launchpad can deposit");
        totalFeesReceived += msg.value;
        emit FeesReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Chainlink Automation check
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = _shouldExecutePayout();
        performData = "";
    }

    /**
     * @notice Chainlink Automation perform
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        require(_shouldExecutePayout(), "Not time to execute");
        // Note: Actual distribution happens via backend calling executePayouts
        // This just marks that it's time for payout
        lastPayoutTime = block.timestamp;
    }

    /**
     * @notice Execute payouts to yappers (called by backend/oracle)
     * @param projectIds Array of project IDs
     * @param yappers 2D array of yapper addresses for each project
     * @param points 2D array of points for each yapper
     */
    function executePayouts(
        uint256[] calldata projectIds,
        address[][] calldata yappers,
        uint256[][] calldata points
    ) external nonReentrant {
        require(msg.sender == oracleAddress || msg.sender == owner(), "Only oracle or owner");
        require(projectIds.length == yappers.length, "Length mismatch");
        require(yappers.length == points.length, "Length mismatch");
        require(_shouldExecutePayout(), "Not payout time");

        uint256 availableBalance = address(this).balance;
        require(availableBalance >= minPayoutThreshold, "Insufficient balance");

        currentRoundId++;
        uint256 totalYappers = 0;
        uint256 totalPointsAllProjects = 0;

        // Calculate total points across all projects
        for (uint256 i = 0; i < points.length; i++) {
            for (uint256 j = 0; j < points[i].length; j++) {
                totalPointsAllProjects += points[i][j];
                totalYappers++;
            }
        }

        require(totalPointsAllProjects > 0, "No points to distribute");

        // Calculate ETH per point
        uint256 weiPerPoint = availableBalance / totalPointsAllProjects;
        uint256 totalDistributed = 0;

        // Distribute to each yapper
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            address[] calldata projectYappers = yappers[i];
            uint256[] calldata projectPoints = points[i];

            require(projectYappers.length == projectPoints.length, "Yapper/points mismatch");

            for (uint256 j = 0; j < projectYappers.length; j++) {
                address yapper = projectYappers[j];
                uint256 yapperPoints = projectPoints[j];

                if (yapperPoints == 0) continue;

                uint256 payoutAmount = yapperPoints * weiPerPoint;

                // Transfer to yapper
                (bool success, ) = yapper.call{value: payoutAmount}("");
                require(success, "Transfer failed");

                totalDistributed += payoutAmount;

                // Record payout
                yapperPayoutHistory[yapper].push(YapperPayout({
                    roundId: currentRoundId,
                    projectId: projectId,
                    points: yapperPoints,
                    amount: payoutAmount,
                    timestamp: block.timestamp
                }));

                emit YapperPaid(yapper, projectId, currentRoundId, yapperPoints, payoutAmount);
            }
        }

        // Update stats
        totalFeesDistributed += totalDistributed;
        lastPayoutTime = block.timestamp;

        // Record payout round
        payoutRounds[currentRoundId] = PayoutRound({
            roundId: currentRoundId,
            timestamp: block.timestamp,
            totalAmount: totalDistributed,
            projectCount: projectIds.length,
            yapperCount: totalYappers
        });

        emit PayoutExecuted(
            currentRoundId,
            totalDistributed,
            projectIds.length,
            totalYappers,
            block.timestamp
        );
    }

    /**
     * @notice Check if it's time to execute payout
     */
    function _shouldExecutePayout() private view returns (bool) {
        if (block.timestamp < lastPayoutTime + MIN_INTERVAL) {
            return false;
        }

        if (address(this).balance < minPayoutThreshold) {
            return false;
        }

        uint256 timestamp = block.timestamp;
        uint256 dayOfWeek = ((timestamp / 1 days) + 4) % 7;
        uint256 hourOfDay = (timestamp % 1 days) / 1 hours;

        bool isTargetDay = dayOfWeek == TARGET_DAY;
        bool isTargetHour = hourOfDay == TARGET_HOUR;

        return isTargetDay && isTargetHour;
    }

    /**
     * @notice Get yapper payout history
     */
    function getYapperPayouts(address yapper) external view returns (YapperPayout[] memory) {
        return yapperPayoutHistory[yapper];
    }

    /**
     * @notice Get time until next payout
     */
    function timeUntilNextPayout() external view returns (uint256) {
        uint256 timestamp = block.timestamp;
        uint256 dayOfWeek = ((timestamp / 1 days) + 4) % 7;
        uint256 hourOfDay = (timestamp % 1 days) / 1 hours;

        uint256 daysUntilSunday = dayOfWeek == 0 ? 7 : (7 - dayOfWeek);
        uint256 nextPayout = timestamp +
            (daysUntilSunday * 1 days) -
            (hourOfDay * 1 hours) +
            (TARGET_HOUR * 1 hours);

        if (dayOfWeek == 0 && hourOfDay >= TARGET_HOUR + 1) {
            nextPayout += 7 days;
        }

        return nextPayout > timestamp ? nextPayout - timestamp : 0;
    }

    /**
     * @notice Update oracle address
     */
    function setOracleAddress(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid address");
        address oldOracle = oracleAddress;
        oracleAddress = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Update launchpad address
     */
    function setLaunchpadAddress(address newLaunchpad) external onlyOwner {
        require(newLaunchpad != address(0), "Invalid address");
        address oldLaunchpad = launchpadAddress;
        launchpadAddress = newLaunchpad;
        emit LaunchpadUpdated(oldLaunchpad, newLaunchpad);
    }

    /**
     * @notice Update minimum payout threshold
     */
    function setMinPayoutThreshold(uint256 newThreshold) external onlyOwner {
        minPayoutThreshold = newThreshold;
    }

    /**
     * @notice Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
