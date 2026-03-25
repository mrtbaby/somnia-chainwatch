import { useEffect, useRef, useState, useCallback } from "react";
import { sdk } from "../lib/sdk";
import {
    ALERT_HANDLER_ADDRESS,
    ALERT_TRIGGERED_TOPIC,
} from "../lib/contracts";

export interface AlertNotification {
    id: string;
    dedupKey: string;      // Composite key for deduplication
    watchedWallet: string; // The specific ERC20 token address now, due to our contract change
    tokenAddress: string;  // Added for clarity
    from: string;
    to: string;
    amount: bigint;
    blockNumber: string;
    timestamp: number;
    receivedAt: number;
}

export function useReactivity(userAddress?: string) {
    const [alerts, setAlerts] = useState<AlertNotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    // Load initial alerts from localStorage when user connects
    useEffect(() => {
        if (userAddress) {
            const saved = localStorage.getItem(`chainwatch_alerts_${userAddress}`);
            if (saved) {
                try {
                    // BigInts need to be parsed from strings
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const parsed = JSON.parse(saved, (_key, value) =>
                        typeof value === "string" && /^\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value
                    );
                    setAlerts(parsed);
                } catch (e) {
                    console.error("Failed to parse local alerts", e);
                }
            } else {
                setAlerts([]); // Clear if switching to a wallet with no history
            }
        } else {
            setAlerts([]); // Clear when disconnected
        }
    }, [userAddress]);

    // Save alerts to localStorage whenever they change
    useEffect(() => {
        if (userAddress && alerts.length > 0) {
            // BigInt cannot be directly JSON stringified
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const serialized = JSON.stringify(alerts, (_key, value) =>
                typeof value === "bigint" ? value.toString() + "n" : value
            );
            localStorage.setItem(`chainwatch_alerts_${userAddress}`, serialized);
        }
    }, [alerts, userAddress]);

    const startListening = useCallback(async () => {
        if (subscriptionRef.current) return; // Already subscribed

        try {
            // Subscribe to AlertTriggered events from AlertHandler contract
            const subscription = await sdk.subscribe({
                ethCalls: [],
                eventContractSources: [ALERT_HANDLER_ADDRESS],
                topicOverrides: [ALERT_TRIGGERED_TOPIC],
                onlyPushChanges: false,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onData: (data: any) => {
                    // Parse the AlertTriggered event
                    // event AlertTriggered(address tokenAddress, address from, address to, uint256 amount, uint256 blockNumber, uint256 timestamp)
                    const topics = data.result.topics;
                    const rawData = data.result.data;

                    const tokenAddress = `0x${topics[1]?.slice(26)}`;
                    const from = `0x${topics[2]?.slice(26)}`;
                    const to = `0x${topics[3]?.slice(26)}`;

                    // Decode non-indexed data: amount, blockNumber, timestamp
                    // Each is 32 bytes = 64 hex chars
                    const amount = BigInt(`0x${rawData.slice(2, 66)}`);
                    const blockNumber = `0x${rawData.slice(66, 130)}`;
                    const timestamp = Number(
                        BigInt(`0x${rawData.slice(130, 194)}`)
                    );

                    // Deterministic key for deduplication:
                    // Same block + same token + same from + same to + same amount = same transfer
                    const dedupKey = `${blockNumber}-${tokenAddress}-${from}-${to}-${amount}`;

                    const notification: AlertNotification = {
                        id: `${blockNumber}-${from}-${Date.now()}`,
                        dedupKey,
                        watchedWallet: tokenAddress,
                        tokenAddress,
                        from,
                        to,
                        amount,
                        blockNumber,
                        timestamp,
                        receivedAt: Date.now(),
                    };

                    setAlerts((prev) => {
                        // Skip duplicate: if we already have an alert with the same dedupKey
                        if (prev.some((a) => a.dedupKey === dedupKey)) return prev;
                        return [notification, ...prev].slice(0, 50);
                    });

                    // Browser notification (if permission granted)
                    if (Notification.permission === "granted") {
                        new Notification("🚨 ChainWatch Alert", {
                            body: `${from.slice(0, 6)}...${from.slice(-4)} moved tokens`,
                        });
                    }
                },
                onError: (error: Error) => {
                    console.error("Reactivity subscription error:", error);
                    setIsConnected(false);
                },
            });

            if (subscription instanceof Error) {
                throw subscription;
            }

            subscriptionRef.current = subscription as { unsubscribe: () => void };
            setIsConnected(true);
            console.log("Reactivity WebSocket subscription active ✅");
        } catch (err) {
            console.error("Failed to start Reactivity subscription:", err);
            setIsConnected(false);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
            setIsConnected(false);
        }
    }, []);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
        if (userAddress) {
            localStorage.removeItem(`chainwatch_alerts_${userAddress}`);
        }
    }, [userAddress]);

    // Auto-start on mount, cleanup on unmount
    useEffect(() => {
        startListening();
        return () => stopListening();
    }, [startListening, stopListening]);

    return { alerts, isConnected, startListening, stopListening, clearAlerts };
}
