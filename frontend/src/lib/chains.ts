import { defineChain } from "viem";

export const somniaTestnet = defineChain({
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
