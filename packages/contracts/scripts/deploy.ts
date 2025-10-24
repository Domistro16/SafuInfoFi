import { ethers } from "hardhat";

async function main() {
  console.log("Deploying SafuInfoFi contracts...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deployment parameters
  const WEEKLY_FEE = ethers.parseEther("0.01"); // 0.01 ETH per week
  const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS || deployer.address;

  // Deploy FeeCollector first
  console.log("\n1. Deploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(FEE_COLLECTOR_ADDRESS);
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log("FeeCollector deployed to:", feeCollectorAddress);

  // Deploy InfoFiRegistry
  console.log("\n2. Deploying InfoFiRegistry...");
  const InfoFiRegistry = await ethers.getContractFactory("InfoFiRegistry");
  const registry = await InfoFiRegistry.deploy(WEEKLY_FEE, feeCollectorAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("InfoFiRegistry deployed to:", registryAddress);

  // Deploy WalletLinker
  console.log("\n3. Deploying WalletLinker...");
  const WalletLinker = await ethers.getContractFactory("WalletLinker");
  const walletLinker = await WalletLinker.deploy(VERIFIER_ADDRESS);
  await walletLinker.waitForDeployment();
  const walletLinkerAddress = await walletLinker.getAddress();
  console.log("WalletLinker deployed to:", walletLinkerAddress);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("- FeeCollector:", feeCollectorAddress);
  console.log("- InfoFiRegistry:", registryAddress);
  console.log("- WalletLinker:", walletLinkerAddress);
  console.log("\nConfiguration:");
  console.log("- Weekly Fee:", ethers.formatEther(WEEKLY_FEE), "ETH");
  console.log("- Fee Recipient:", FEE_COLLECTOR_ADDRESS);
  console.log("- Verifier Address:", VERIFIER_ADDRESS);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      FeeCollector: feeCollectorAddress,
      InfoFiRegistry: registryAddress,
      WalletLinker: walletLinkerAddress,
    },
    config: {
      weeklyFee: WEEKLY_FEE.toString(),
      feeRecipient: FEE_COLLECTOR_ADDRESS,
      verifierAddress: VERIFIER_ADDRESS,
    },
  };

  console.log("\nDeployment info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verification instructions
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network <network> ${feeCollectorAddress} "${FEE_COLLECTOR_ADDRESS}"`);
  console.log(`npx hardhat verify --network <network> ${registryAddress} "${WEEKLY_FEE}" "${feeCollectorAddress}"`);
  console.log(`npx hardhat verify --network <network> ${walletLinkerAddress} "${VERIFIER_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
