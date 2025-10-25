import { ethers } from "hardhat";

async function main() {
  console.log("Deploying SafuInfoFi contracts...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deployment parameters
  const REGISTRATION_FEE = ethers.parseEther("0"); // Free registration (or set a fee)
  const ADMIN_WALLET = process.env.ADMIN_WALLET || deployer.address;
  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS || deployer.address;
  const LAUNCHPAD_ADDRESS = process.env.LAUNCHPAD_ADDRESS || deployer.address;
  const MIN_PAYOUT_THRESHOLD = ethers.parseEther("0.1"); // Minimum 0.1 ETH to trigger payout

  // Deploy InfoFiRegistry first
  console.log("\n1. Deploying InfoFiRegistry...");
  const InfoFiRegistry = await ethers.getContractFactory("InfoFiRegistry");
  const registry = await InfoFiRegistry.deploy(REGISTRATION_FEE, ADMIN_WALLET);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("InfoFiRegistry deployed to:", registryAddress);

  // Deploy FeeCollector (reward distributor)
  console.log("\n2. Deploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(
    deployer.address, // Oracle address (backend)
    LAUNCHPAD_ADDRESS,
    MIN_PAYOUT_THRESHOLD
  );
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log("FeeCollector deployed to:", feeCollectorAddress);

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
  console.log("- InfoFiRegistry:", registryAddress);
  console.log("- FeeCollector:", feeCollectorAddress);
  console.log("- WalletLinker:", walletLinkerAddress);
  console.log("\nConfiguration:");
  console.log("- Registration Fee:", ethers.formatEther(REGISTRATION_FEE), "ETH");
  console.log("- Admin Wallet:", ADMIN_WALLET);
  console.log("- Verifier Address:", VERIFIER_ADDRESS);
  console.log("- Launchpad Address:", LAUNCHPAD_ADDRESS);
  console.log("- Min Payout Threshold:", ethers.formatEther(MIN_PAYOUT_THRESHOLD), "ETH");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      InfoFiRegistry: registryAddress,
      FeeCollector: feeCollectorAddress,
      WalletLinker: walletLinkerAddress,
    },
    config: {
      registrationFee: REGISTRATION_FEE.toString(),
      adminWallet: ADMIN_WALLET,
      verifierAddress: VERIFIER_ADDRESS,
      launchpadAddress: LAUNCHPAD_ADDRESS,
      minPayoutThreshold: MIN_PAYOUT_THRESHOLD.toString(),
    },
  };

  console.log("\nDeployment info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verification instructions
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network <network> ${registryAddress} "${REGISTRATION_FEE}" "${ADMIN_WALLET}"`);
  console.log(`npx hardhat verify --network <network> ${feeCollectorAddress} "${deployer.address}" "${LAUNCHPAD_ADDRESS}" "${MIN_PAYOUT_THRESHOLD}"`);
  console.log(`npx hardhat verify --network <network> ${walletLinkerAddress} "${VERIFIER_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
