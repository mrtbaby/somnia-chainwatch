import { SDK } from "@somnia-chain/reactivity";
import {
    createPublicClient,
    createWalletClient,
    http,
    webSocket,
    defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
dotenv.config();

const somniaTestnet = defineChain({
    id: 50312,
    name: "Somnia Testnet",
    nativeCurrency: { name: "Somnia Token", symbol: "STT", decimals: 18 },
    rpcUrls: {
        default: {
            http: ["https://dream-rpc.somnia.network"],
            webSocket: ["wss://dream-rpc.somnia.network/ws"],
        },
    },
    blockExplorers: {
        default: {
            name: "Somnia Explorer",
            url: "https://shannon-explorer.somnia.network",
        },
    },
});

async function main() {
    const subscriptionIdArg = process.argv[2];
    if (!subscriptionIdArg) {
        console.error("Usage: npx ts-node scripts/cancelSubscription.ts <subscriptionId>");
        process.exit(1);
    }

    const subscriptionId = BigInt(subscriptionIdArg);

    const account = privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}`
    );

    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket("wss://dream-rpc.somnia.network/ws"),
    });

    const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http("https://dream-rpc.somnia.network"),
    });

    const sdk = new SDK({
        public: publicClient,
        wallet: walletClient,
    });

    console.log(`Cancelling subscription ${subscriptionId}...`);

    await sdk.cancelSoliditySubscription(subscriptionId);

    console.log(`✅ Subscription ${subscriptionId} cancelled successfully.`);
}

main().catch(console.error);
