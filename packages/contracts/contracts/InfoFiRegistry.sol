// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title InfoFiRegistry
 * @notice Manages project registration for SafuInfoFi Dashboard
 * @dev Projects register to participate in reward distribution - no recurring fees
 */
contract InfoFiRegistry is Ownable, ReentrancyGuard, Pausable {

    struct Project {
        address tokenAddress;
        address ownerAddress;
        string name;
        string symbol;
        uint256 registeredAt;
        bool isActive;
        string metadataURI; // IPFS link to additional project data
    }

    // One-time registration fee (optional)
    uint256 public registrationFee;

    // Admin wallet to receive registration fees
    address public adminWallet;

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

    event ProjectDeactivated(uint256 indexed projectId, uint256 timestamp);
    event ProjectActivated(uint256 indexed projectId, uint256 timestamp);
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
    event AdminWalletUpdated(address oldWallet, address newWallet);
    event MetadataUpdated(uint256 indexed projectId, string newMetadataURI);

    /**
     * @notice Constructor
     * @param _registrationFee One-time registration fee
     * @param _adminWallet Address to receive fees
     */
    constructor(uint256 _registrationFee, address _adminWallet) Ownable(msg.sender) {
        require(_adminWallet != address(0), "Invalid admin wallet");
        registrationFee = _registrationFee;
        adminWallet = _adminWallet;
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
        require(msg.value >= registrationFee, "Insufficient fee");

        projectCount++;
        uint256 projectId = projectCount;

        projects[projectId] = Project({
            tokenAddress: tokenAddress,
            ownerAddress: msg.sender,
            name: name,
            symbol: symbol,
            registeredAt: block.timestamp,
            isActive: true,
            metadataURI: metadataURI
        });

        tokenToProjectId[tokenAddress] = projectId;

        // Transfer fee to admin wallet
        if (msg.value > 0) {
            (bool success, ) = adminWallet.call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }

        emit ProjectRegistered(projectId, tokenAddress, msg.sender, name, symbol);
    }

    /**
     * @notice Deactivate a project (only owner or project owner)
     * @param projectId ID of the project
     */
    function deactivateProject(uint256 projectId) external {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        Project storage project = projects[projectId];
        require(
            msg.sender == owner() || msg.sender == project.ownerAddress,
            "Not authorized"
        );
        require(project.isActive, "Already inactive");

        project.isActive = false;
        emit ProjectDeactivated(projectId, block.timestamp);
    }

    /**
     * @notice Activate a project (only owner or project owner)
     * @param projectId ID of the project
     */
    function activateProject(uint256 projectId) external {
        require(projectId > 0 && projectId <= projectCount, "Invalid project ID");
        Project storage project = projects[projectId];
        require(
            msg.sender == owner() || msg.sender == project.ownerAddress,
            "Not authorized"
        );
        require(!project.isActive, "Already active");

        project.isActive = true;
        emit ProjectActivated(projectId, block.timestamp);
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
     * @notice Update registration fee (only owner)
     * @param newFee New registration fee amount
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = registrationFee;
        registrationFee = newFee;
        emit RegistrationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update admin wallet address (only owner)
     * @param newWallet New admin wallet address
     */
    function setAdminWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        address oldWallet = adminWallet;
        adminWallet = newWallet;
        emit AdminWalletUpdated(oldWallet, newWallet);
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
