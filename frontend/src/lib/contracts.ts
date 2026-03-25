import { parseAbi, keccak256, toHex } from "viem";

export const ALERT_HANDLER_ADDRESS = import.meta.env
    .VITE_ALERT_HANDLER_ADDRESS as `0x${string}`;
export const ALERT_REGISTRY_ADDRESS = import.meta.env
    .VITE_ALERT_REGISTRY_ADDRESS as `0x${string}`;

// AlertTriggered event topic (keccak256 of signature)
export const ALERT_TRIGGERED_TOPIC = keccak256(
    toHex("AlertTriggered(address,address,address,uint256,uint256,uint256)")
) as `0x${string}`;

export const ALERT_TRIGGERED_ABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "tokenAddress",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "timestamp",
                type: "uint256",
            },
        ],
        name: "AlertTriggered",
        type: "event",
    },
];

export const REGISTRY_ABI = parseAbi([
    "struct Alert { uint256 id; address owner; address watchAddress; address tokenAddress; uint256 threshold; uint256 subscriptionId; bool active; uint256 createdAt; }",
    "function registerAlert(address watchAddress, address tokenAddress, uint256 threshold) returns (uint256)",
    "function deleteAlert(uint256 alertId)",
    "function getAlertsByOwner(address owner) view returns (uint256[])",
    "function getAlert(uint256 alertId) view returns (Alert)",
    "function alertCount() view returns (uint256)",
    "event AlertRegistered(uint256 indexed alertId, address indexed owner, address indexed watchAddress, address tokenAddress, uint256 threshold, uint256 subscriptionId)",
]);

// Token Addresses on Somnia Testnet
export const TOKENS = {
    ANY: "0x0000000000000000000000000000000000000000",
    WSTT: "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7",
    USDC: "0xE9CC37904875B459Fa5D0FE37680d36F1ED55e38",
    WETH: "0xd2480162Aa7F02Ead7BF4C127465446150D58452"
} as const;
