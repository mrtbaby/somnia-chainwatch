import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, webSocket } from "viem";
import { somniaTestnet } from "./chains";

// Use WebSocket transport — REQUIRED for Reactivity to work
export const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket("wss://dream-rpc.somnia.network/ws"),
});

export const sdk = new SDK({ public: publicClient });

export { somniaTestnet };
