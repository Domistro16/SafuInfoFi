import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Provider
export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Verifier wallet (for signing verification messages)
export const verifierWallet = new ethers.Wallet(
  process.env.VERIFIER_PRIVATE_KEY || '',
  provider
);

// Contract addresses
export const REGISTRY_ADDRESS = process.env.REGISTRY_CONTRACT_ADDRESS || '';
export const WALLET_LINKER_ADDRESS = process.env.WALLET_LINKER_CONTRACT_ADDRESS || '';
export const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_CONTRACT_ADDRESS || '';

// Contract ABIs (simplified - you'll need to import full ABIs from compiled contracts)
export const REGISTRY_ABI = [
  'function projects(uint256) view returns (address tokenAddress, address ownerAddress, string name, string symbol, uint256 registeredAt, bool isActive, string metadataURI)',
  'function projectCount() view returns (uint256)',
  'function getActiveProjects() view returns (uint256[])',
  'function tokenToProjectId(address) view returns (uint256)',
  'event ProjectRegistered(uint256 indexed projectId, address indexed tokenAddress, address indexed owner, string name, string symbol)',
  'event ProjectActivated(uint256 indexed projectId, uint256 timestamp)',
  'event ProjectDeactivated(uint256 indexed projectId, uint256 timestamp)',
];

export const WALLET_LINKER_ABI = [
  'function walletToXHandle(address) view returns (string)',
  'function xHandleToWallet(string) view returns (address)',
  'function walletToSafuDomain(address) view returns (string)',
  'function walletLinks(address) view returns (address walletAddress, string xHandle, string safuDomain, uint256 linkedAt, bool isActive)',
  'function isWalletLinked(address) view returns (bool)',
  'function nonces(address) view returns (uint256)',
  'event WalletLinked(address indexed wallet, string xHandle, string safuDomain, uint256 timestamp)',
];

// Contract instances
export const registryContract = new ethers.Contract(
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  provider
);

export const walletLinkerContract = new ethers.Contract(
  WALLET_LINKER_ADDRESS,
  WALLET_LINKER_ABI,
  provider
);

export const FEE_COLLECTOR_ABI = [
  'function executePayouts(uint256[] calldata projectIds, address[][] calldata yappers, uint256[][] calldata points) external',
  'function getBalance() external view returns (uint256)',
  'function currentRoundId() external view returns (uint256)',
  'function minPayoutThreshold() external view returns (uint256)',
  'function getYapperPayouts(address yapper) external view returns (tuple(uint256 roundId, uint256 projectId, uint256 points, uint256 amount, uint256 timestamp)[])',
  'function payoutRounds(uint256) external view returns (uint256 roundId, uint256 timestamp, uint256 totalAmount, uint256 projectCount, uint256 yapperCount)',
  'function lastPayoutTime() external view returns (uint256)',
  'function timeUntilNextPayout() external view returns (uint256)',
  'event FeesReceived(address indexed from, uint256 amount, uint256 timestamp)',
  'event PayoutExecuted(uint256 indexed roundId, uint256 totalAmount, uint256 projectCount, uint256 yapperCount, uint256 timestamp)',
  'event YapperPaid(address indexed yapper, uint256 indexed projectId, uint256 indexed roundId, uint256 points, uint256 amount)',
];

export const feeCollectorContract = new ethers.Contract(
  FEE_COLLECTOR_ADDRESS,
  FEE_COLLECTOR_ABI,
  provider
);
