import { createPublicClient, http, parseAbi } from "viem";
const somniaTestnet = {
    id: 50312,
    name: "Somnia Testnet",
    nativeCurrency: { name: "Somnia Token", symbol: "STT", decimals: 18 },
    rpcUrls: { default: { http: ["https://dream-rpc.somnia.network"] } },
} as const;
import * as dotenv from "dotenv";
dotenv.config();

const PRECOMPILE_ABI = parseAbi([
    "struct SubscriptionData { bytes32[4] eventTopics; address origin; address caller; address emitter; address handlerContractAddress; bytes4 handlerFunctionSelector; uint64 priorityFeePerGas; uint64 maxFeePerGas; uint64 gasLimit; bool isGuaranteed; bool isCoalesced; }",
    "function getSubscriptionInfo(uint256 subscriptionId) view returns (SubscriptionData subscriptionData, address owner)"
]);

async function main() {
    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(),
    });

    const registryAddress = process.env.ALERT_REGISTRY_ADDRESS as `0x${string}`;

    // Check Registry STT balance
    const registryBalance = await publicClient.getBalance({ address: registryAddress });
    console.log(`AlertRegistry STT Balance: ${Number(registryBalance) / 1e18} STT`);

    // Let's get the latest subscription ID. Assuming the user just made one, it's likely sub 1 or 2, 
    // but we can query the Registry directly.
    const REGISTRY_ABI = parseAbi([
        "struct Alert { uint256 id; address owner; address watchAddress; address tokenAddress; uint256 threshold; uint256 subscriptionId; bool active; uint256 createdAt; }",
        "function getAlert(uint256 alertId) view returns (Alert)",
        "function alertCount() view returns (uint256)"
    ]);

    const count = await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: "alertCount"
    }) as bigint;
    console.log(`Total alerts in Registry: ${count}`);

    if (count > 0n) {
        const alert = await publicClient.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "getAlert",
            args: [count],
        }) as any;

        console.log(`Latest Alert [${alert.id}] targeting ${alert.watchAddress} has Subscription ID: ${alert.subscriptionId}`);

        try {
            const result = await publicClient.readContract({
                address: "0x0000000000000000000000000000000000000100", // Precompile
                abi: PRECOMPILE_ABI,
                functionName: "getSubscriptionInfo",
                args: [alert.subscriptionId],
            }) as any;

            console.log(`\nSubscription ${alert.subscriptionId} Owner: ${result[1]}`);

            const ownerBalance = await publicClient.getBalance({ address: result[1] });
            console.log(`Subscription Owner Balance: ${Number(ownerBalance) / 1e18} STT`);

            if (Number(ownerBalance) / 1e18 < 32) {
                console.log(`\n❌ ERROR: The subscription owner does NOT have the required 32 STT minimum balance!`);
                console.log(`Because of this, Somnia validators will NOT execute the reactive callbacks.`);
            } else {
                console.log(`\n✅ Subscription is fully funded.`);
            }

        } catch (err) {
            console.error("Failed to fetch subscription info:", err);
        }
    }
}

main().catch(console.error);
