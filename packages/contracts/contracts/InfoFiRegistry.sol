// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title InfoFiRegistry
 * @notice Manages project registration and fee payments for SafuInfoFi Dashboard
 * @dev Projects must pay weekly fees to remain active on the platform
 */
contract InfoFiRegistry is Ownable, ReentrancyGuard, Pausable {

    struct Project {
        address tokenAddress;
        address ownerAddress;
        string name;
        string symbol;
        uint256 registeredAt;
        uint256 lastFeePaid;
        bool isActive;
        string metadataURI; // IPFS link to additional project data
    }

    // Weekly fee in wei
    uint256 public weeklyFee;

    // Grace period before deactivation (in seconds)
    uint256 public constant GRACE_PERIOD = 3 days;

    // Fee collection address
    address public feeCollector;

    // Mapping from project ID to Project
    mapping(uint256 => Project) public projects;

    // Mapping from token address to project ID
    mapping(address => uint256) public tokenToProjectId;

    // Total number of projects
    uint256 public projectCount;

    // Events
    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed tokenAddress,
        address indexed owner,
        string name,
        string symbol
    );

    event FeePaid(
        uint256 indexed projectId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    event ProjectDeactivated(uint256 indexed projectId, uint256 timestamp);
    event ProjectReactivated(uint256 indexed projectId, uint256 timestamp);
    event WeeklyFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event MetadataUpdated(uint256 indexed projectId, string newMetadataURI);

    /**
     * @notice Constructor
     * @param _weeklyFee Initial weekly fee amount
     * @param _feeCollector Address to collect fees
     */
    constructor(uint256 _weeklyFee, address _feeCollector) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Invalid fee collector");
        weeklyFee = _weeklyFee;
        feeCollector = _feeCollector;
    }

    /**
     * @notice Register a new project
     * @param tokenAddress Address of the project token
     * @param name Project name
     * @param symbol Token symbol
     * @param metadataURI IPFS URI for additional metadata
     */
    function registerProject(
        address tokenAddress,
        string memory name,
        string memory symbol,
        string memory metadataURI
    ) external payable nonReentrant whenNotPaused {
        require(tokenAddress != address(0), "Invalid token address");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(tokenToProjectId[tokenAddress] == 0, "Project already registered");
        require(msg.value >= weeklyFee, "Insufficient fee");

        projectCount++;
        uint256 projectId = projectCount;

        projects[projectId] = Project({
            tokenAddress: tokenAddress,
            ownerAddress: msg.sender,
            name: name,
            symbol: symbol,
            registeredAt: block.timestamp,
            lastFeePaid: block.timestamp,
            isActive: true,
            metadataURI: metadataURI
        });

        tokenToProjectId[tokenAddress] = projectId;

        // Transfer fee to collector
        (bool success, ) = feeCollector.call{value: msg.value}("");
        require(success, "Fee transfer failed");

        emit ProjectRegistered(projectId, tokenAddress, msg.sender, name, symbol);
        emit FeePaid(projectId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Pay weekly fee for a project
     * @param projectId ID of the project
     */
    function payFee(uint256 projectId) external payable nonReentrant whenNotPaused {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        require(msg.value >= weeklyFee, "Insufficient fee");

        Project storage project = projects[projectId];
        require(project.tokenAddress != address(0), "Project does not exist");

        project.lastFeePaid = block.timestamp;

        if (!project.isActive) {
            project.isActive = true;
            emit ProjectReactivated(projectId, block.timestamp);
        }

        // Transfer fee to collector
        (bool success, ) = feeCollector.call{value: msg.value}("");
        require(success, "Fee transfer failed");

        emit FeePaid(projectId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Check if a project's fee is due
     * @param projectId ID of the project
     * @return bool True if fee is due
     */
    function isFeeDue(uint256 projectId) public view returns (bool) {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        Project memory project = projects[projectId];

        // Fee is due if more than 1 week has passed since last payment
        return block.timestamp > project.lastFeePaid + 1 weeks;
    }

    /**
     * @notice Check if a project should be deactivated
     * @param projectId ID of the project
     * @return bool True if project should be deactivated
     */
    function shouldDeactivate(uint256 projectId) public view returns (bool) {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        Project memory project = projects[projectId];

        // Deactivate if grace period has passed without payment
        return project.isActive &&
               block.timestamp > project.lastFeePaid + 1 weeks + GRACE_PERIOD;
    }

    /**
     * @notice Deactivate projects with overdue fees (callable by anyone)
     * @param projectIds Array of project IDs to check and deactivate
     */
    function deactivateOverdueProjects(uint256[] calldata projectIds) external {
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            if (shouldDeactivate(projectId)) {
                projects[projectId].isActive = false;
                emit ProjectDeactivated(projectId, block.timestamp);
            }
        }
    }

    /**
     * @notice Update project metadata URI
     * @param projectId ID of the project
     * @param newMetadataURI New metadata URI
     */
    function updateMetadata(uint256 projectId, string memory newMetadataURI) external {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        Project storage project = projects[projectId];
        require(project.ownerAddress == msg.sender, "Not project owner");

        project.metadataURI = newMetadataURI;
        emit MetadataUpdated(projectId, newMetadataURI);
    }

    /**
     * @notice Get all active projects
     * @return uint256[] Array of active project IDs
     */
    function getActiveProjects() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active projects
        for (uint256 i = 1; i <= projectCount; i++) {
            if (projects[i].isActive) {
                activeCount++;
            }
        }

        // Fill array with active project IDs
        uint256[] memory activeProjectIds = new uint256[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= projectCount; i++) {
            if (projects[i].isActive) {
                activeProjectIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return activeProjectIds;
    }

    /**
     * @notice Update weekly fee (only owner)
     * @param newFee New weekly fee amount
     */
    function setWeeklyFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = weeklyFee;
        weeklyFee = newFee;
        emit WeeklyFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update fee collector address (only owner)
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        address oldCollector = feeCollector;
        feeCollector = newCollector;
        emit FeeCollectorUpdated(oldCollector, newCollector);
    }

    /**
     * @notice Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
