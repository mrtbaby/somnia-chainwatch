import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balanceBefore), "STT\n");

    if (balanceBefore < ethers.parseEther("36")) {
        console.error("❌ Need at least 36 STT to deploy and fund the Registry with 35 STT.");
        console.error("   Get funds from the Somnia testnet faucet.");
        process.exit(1);
    }

    // 1. Deploy AlertHandler
    console.log("Deploying AlertHandler...");
    const Handler = await ethers.getContractFactory("AlertHandler");
    const handler = await Handler.deploy();
    await handler.waitForDeployment();
    const handlerAddress = await handler.getAddress();
    console.log("✅ AlertHandler deployed to:", handlerAddress);

    // 2. Deploy AlertRegistry with handler address
    console.log("\nDeploying AlertRegistry...");
    const Registry = await ethers.getContractFactory("AlertRegistry");
    const registry = await Registry.deploy(handlerAddress);
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ AlertRegistry deployed to:", registryAddress);

    // 3. Link handler back to registry
    console.log("\nLinking handler to registry...");
    const linkTx = await handler.setRegistry(registryAddress);
    await linkTx.wait();
    console.log("✅ Handler linked to Registry");

    // 4. Fund the AlertRegistry with 33 STT (Reactivity requires > 32 STT balance)
    console.log("\nFunding AlertRegistry with 33 STT...");
    const fundTx = await deployer.sendTransaction({
        to: registryAddress,
        value: ethers.parseEther("33.0"),
    });
    await fundTx.wait();
    console.log("✅ AlertRegistry funded.");

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║       Update your .env files:            ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(`║  ALERT_HANDLER_ADDRESS=${handlerAddress}`);
    console.log(`║  ALERT_REGISTRY_ADDRESS=${registryAddress}`);
    console.log("╚══════════════════════════════════════════╝");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
