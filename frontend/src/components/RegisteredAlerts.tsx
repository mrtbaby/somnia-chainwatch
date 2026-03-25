import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { createPublicClient, http } from "viem";
import { somniaTestnet } from "../lib/chains";
import { ALERT_REGISTRY_ADDRESS, REGISTRY_ABI, TOKENS } from "../lib/contracts";

interface AlertData {
    id: bigint;
    owner: string;
    watchAddress: string;
    tokenAddress: string;
    threshold: bigint;
    subscriptionId: bigint;
    active: boolean;
    createdAt: bigint;
}

function getTokenLabel(tokenAddress: string): string {
    const addr = tokenAddress.toLowerCase();
    if (addr === TOKENS.ANY.toLowerCase()) return "All Tokens";
    if (addr === TOKENS.WSTT.toLowerCase()) return "WSTT";
    if (addr === TOKENS.USDC.toLowerCase()) return "USDC";
    if (addr === TOKENS.WETH.toLowerCase()) return "WETH";
    return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
}

export function RegisteredAlerts() {
    const { address, isConnected } = useAccount();
    const [alertDetails, setAlertDetails] = useState<AlertData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch alert IDs owned by this wallet
    const { data: alertIds, refetch } = useReadContract({
        address: ALERT_REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "getAlertsByOwner",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Fetch details for each alert ID
    useEffect(() => {
        if (!alertIds || (alertIds as bigint[]).length === 0) {
            setAlertDetails([]);
            return;
        }

        const ids = alertIds as bigint[];
        setIsLoading(true);

        const fetchAlertDetails = async () => {
            try {
                const client = createPublicClient({
                    chain: somniaTestnet,
                    transport: http(),
                });

                const details: AlertData[] = [];
                for (const id of ids) {
                    try {
                        const alert = await client.readContract({
                            address: ALERT_REGISTRY_ADDRESS,
                            abi: REGISTRY_ABI,
                            functionName: "getAlert",
                            args: [id],
                        }) as any;

                        details.push({
                            id: alert.id,
                            owner: alert.owner,
                            watchAddress: alert.watchAddress,
                            tokenAddress: alert.tokenAddress,
                            threshold: alert.threshold,
                            subscriptionId: alert.subscriptionId,
                            active: alert.active,
                            createdAt: alert.createdAt,
                        });
                    } catch (e) {
                        console.error(`Failed to fetch alert #${id}:`, e);
                    }
                }
                setAlertDetails(details);
            } catch (e) {
                console.error("Failed to fetch alert details:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlertDetails();
    }, [alertIds]);

    if (!isConnected) return null;

    const activeAlerts = alertDetails.filter((a) => a.active);

    return (
        <div className="card registered-alerts card--black">
            <div className="card-header">
                <div className="feed-title">
                    <span className="card-icon">📋</span>
                    <h2>My Registered Alerts</h2>
                </div>
                <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => refetch()}>
                    Refresh
                </button>
            </div>

            {isLoading ? (
                <div className="empty-state">
                    <p>Loading alerts...</p>
                </div>
            ) : activeAlerts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No registered alerts yet.</p>
                    <p className="empty-hint">
                        Register an alert above to start watching a wallet.
                    </p>
                </div>
            ) : (
                <ul className="registered-list">
                    {activeAlerts.map((alert) => (
                        <li key={alert.id.toString()} className="registered-item">
                            <div className="registered-item-header">
                                <span className="registered-badge">Alert #{alert.id.toString()}</span>
                                <span className={`registered-status ${alert.active ? "active" : "inactive"}`}>
                                    {alert.active ? "● Active" : "○ Inactive"}
                                </span>
                            </div>
                            <div className="registered-item-body">
                                <div className="registered-detail">
                                    <span className="registered-label">Watching</span>
                                    <span className="address" title={alert.watchAddress}>
                                        {alert.watchAddress.slice(0, 6)}...{alert.watchAddress.slice(-4)}
                                    </span>
                                </div>
                                <div className="registered-detail">
                                    <span className="registered-label">Token</span>
                                    <span className="registered-token-badge">
                                        {getTokenLabel(alert.tokenAddress)}
                                    </span>
                                </div>
                                <div className="registered-detail">
                                    <span className="registered-label">Subscription ID</span>
                                    <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                        {alert.subscriptionId.toString()}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {activeAlerts.length > 0 && (
                <div className="registered-summary" style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
}
