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
  'function projects(uint256) view returns (address tokenAddress, address ownerAddress, string name, string symbol, uint256 registeredAt, uint256 lastFeePaid, bool isActive, string metadataURI)',
  'function projectCount() view returns (uint256)',
  'function getActiveProjects() view returns (uint256[])',
  'function tokenToProjectId(address) view returns (uint256)',
  'event ProjectRegistered(uint256 indexed projectId, address indexed tokenAddress, address indexed owner, string name, string symbol)',
  'event FeePaid(uint256 indexed projectId, address indexed payer, uint256 amount, uint256 timestamp)',
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
