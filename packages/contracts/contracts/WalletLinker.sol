// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title WalletLinker
 * @notice Links Ethereum wallets to X (Twitter) accounts with SAFU domain verification
 * @dev Uses signature verification to prove ownership of both wallet and X account
 */
contract WalletLinker is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct WalletLink {
        address walletAddress;
        string xHandle;
        string safuDomain;
        uint256 linkedAt;
        bool isActive;
    }

    // Mapping from wallet address to X handle
    mapping(address => string) public walletToXHandle;

    // Mapping from X handle to wallet address
    mapping(string => address) public xHandleToWallet;

    // Mapping from wallet address to SAFU domain
    mapping(address => string) public walletToSafuDomain;

    // Mapping to track verified links
    mapping(address => WalletLink) public walletLinks;

    // Backend verifier address (signs verification messages)
    address public verifierAddress;

    // Nonce tracking to prevent replay attacks
    mapping(address => uint256) public nonces;

    // Events
    event WalletLinked(
        address indexed wallet,
        string xHandle,
        string safuDomain,
        uint256 timestamp
    );

    event WalletUnlinked(
        address indexed wallet,
        string xHandle,
        uint256 timestamp
    );

    event VerifierUpdated(address oldVerifier, address newVerifier);

    /**
     * @notice Constructor
     * @param _verifierAddress Address authorized to sign verification messages
     */
    constructor(address _verifierAddress) Ownable(msg.sender) {
        require(_verifierAddress != address(0), "Invalid verifier address");
        verifierAddress = _verifierAddress;
    }

    /**
     * @notice Link wallet to X account with SAFU domain verification
     * @param xHandle X (Twitter) handle
     * @param safuDomain SAFU domain name (e.g., "username.safu")
     * @param signature Backend signature verifying X account ownership and domain
     */
    function linkWallet(
        string memory xHandle,
        string memory safuDomain,
        bytes memory signature
    ) external {
        require(bytes(xHandle).length > 0, "X handle required");
        require(bytes(safuDomain).length > 0, "SAFU domain required");
        require(_endsWithSafu(safuDomain), "Must be a .safu domain");

        // Check if wallet or handle is already linked
        require(
            bytes(walletToXHandle[msg.sender]).length == 0,
            "Wallet already linked"
        );
        require(
            xHandleToWallet[xHandle] == address(0),
            "X handle already linked"
        );

        // Verify signature from backend
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                xHandle,
                safuDomain,
                nonces[msg.sender]
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredAddress = ethSignedMessageHash.recover(signature);

        require(
            recoveredAddress == verifierAddress,
            "Invalid verification signature"
        );

        // Create link
        walletToXHandle[msg.sender] = xHandle;
        xHandleToWallet[xHandle] = msg.sender;
        walletToSafuDomain[msg.sender] = safuDomain;

        walletLinks[msg.sender] = WalletLink({
            walletAddress: msg.sender,
            xHandle: xHandle,
            safuDomain: safuDomain,
            linkedAt: block.timestamp,
            isActive: true
        });

        // Increment nonce
        nonces[msg.sender]++;

        emit WalletLinked(msg.sender, xHandle, safuDomain, block.timestamp);
    }

    /**
     * @notice Unlink wallet from X account
     */
    function unlinkWallet() external {
        string memory xHandle = walletToXHandle[msg.sender];
        require(bytes(xHandle).length > 0, "Wallet not linked");

        // Remove mappings
        delete xHandleToWallet[xHandle];
        delete walletToXHandle[msg.sender];
        delete walletToSafuDomain[msg.sender];

        walletLinks[msg.sender].isActive = false;

        emit WalletUnlinked(msg.sender, xHandle, block.timestamp);
    }

    /**
     * @notice Check if a wallet is linked and verified
     * @param wallet Address to check
     * @return bool True if wallet is linked and active
     */
    function isWalletLinked(address wallet) external view returns (bool) {
        return bytes(walletToXHandle[wallet]).length > 0 &&
               walletLinks[wallet].isActive;
    }

    /**
     * @notice Get complete wallet link information
     * @param wallet Address to query
     * @return WalletLink struct with all link data
     */
    function getWalletLink(address wallet) external view returns (WalletLink memory) {
        return walletLinks[wallet];
    }

    /**
     * @notice Get X handle for a wallet
     * @param wallet Address to query
     * @return string X handle
     */
    function getXHandle(address wallet) external view returns (string memory) {
        return walletToXHandle[wallet];
    }

    /**
     * @notice Get wallet for an X handle
     * @param xHandle X handle to query
     * @return address Linked wallet address
     */
    function getWallet(string memory xHandle) external view returns (address) {
        return xHandleToWallet[xHandle];
    }

    /**
     * @notice Update verifier address (only owner)
     * @param newVerifier New verifier address
     */
    function setVerifierAddress(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "Invalid address");
        address oldVerifier = verifierAddress;
        verifierAddress = newVerifier;
        emit VerifierUpdated(oldVerifier, newVerifier);
    }

    /**
     * @notice Check if domain ends with .safu
     * @param domain Domain to check
     * @return bool True if domain ends with .safu
     */
    function _endsWithSafu(string memory domain) private pure returns (bool) {
        bytes memory domainBytes = bytes(domain);
        bytes memory suffix = bytes(".safu");

        if (domainBytes.length < suffix.length) {
            return false;
        }

        for (uint256 i = 0; i < suffix.length; i++) {
            if (
                domainBytes[domainBytes.length - suffix.length + i] !=
                suffix[i]
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Generate message hash for verification
     * @param wallet Wallet address
     * @param xHandle X handle
     * @param safuDomain SAFU domain
     * @param nonce Current nonce
     * @return bytes32 Message hash
     */
    function getMessageHash(
        address wallet,
        string memory xHandle,
        string memory safuDomain,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(wallet, xHandle, safuDomain, nonce));
    }
}
