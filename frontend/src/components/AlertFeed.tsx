import { useState } from "react";
import { useReactivity } from "../hooks/useReactivity";
import type { AlertNotification } from "../hooks/useReactivity";
import { formatUnits } from "viem";
import { TOKENS } from "../lib/contracts";
import { useAccount } from "wagmi";
import { TransactionModal } from "./TransactionModal";

export function AlertFeed() {
    const { address: userAddress } = useAccount();
    const { alerts, isConnected, clearAlerts } = useReactivity(userAddress);
    const [selectedAlert, setSelectedAlert] = useState<AlertNotification | null>(null);

    const formatAmount = (amount: bigint, tokenAddress: string) => {
        let decimals = 18;
        let symbol = "STT";

        const token = tokenAddress.toLowerCase();

        if (token === TOKENS.WSTT.toLowerCase()) {
            decimals = 18;
            symbol = "WSTT";
        } else if (token === TOKENS.USDC.toLowerCase()) {
            decimals = 6;
            symbol = "USDC";
        } else if (token === TOKENS.WETH.toLowerCase()) {
            decimals = 18;
            symbol = "WETH";
        } else if (token === TOKENS.ANY.toLowerCase()) {
            symbol = "Tokens";
        }

        return `${parseFloat(formatUnits(amount, decimals)).toFixed(2)} ${symbol}`;
    };

    return (
        <div className="card alert-feed">
            <div className="card-header">
                <div className="feed-title">
                    <span className="card-icon">⚡</span>
                    <h2>Live Alert Feed</h2>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {alerts.length > 0 && (
                        <button
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            onClick={clearAlerts}
                        >
                            Clear Feed
                        </button>
                    )}
                    <span
                        className={`status-badge ${isConnected ? "status-connected" : "status-disconnected"}`}
                    >
                        <span className="status-dot" />
                        {isConnected ? "Connected (Push)" : "Disconnected"}
                    </span>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📡</div>
                    <p>No alerts triggered yet.</p>
                    <p className="empty-hint">
                        Register an alert and watch this update in real-time — zero polling.
                    </p>
                </div>
            ) : (
                <ul className="feed-list">
                    {alerts.map((alert) => (
                        <li
                            key={alert.id}
                            className="feed-item feed-item-clickable"
                            onClick={() => setSelectedAlert(alert)}
                        >
                            <div className="feed-item-header">
                                <span className="alert-badge">🚨 ALERT</span>
                                <span className="alert-time">
                                    {new Date(alert.receivedAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="feed-item-addresses">
                                <span className="address" title={alert.from}>
                                    {alert.from.slice(0, 6)}...{alert.from.slice(-4)}
                                </span>
                                <span className="arrow">→</span>
                                <span className="address" title={alert.to}>
                                    {alert.to.slice(0, 6)}...{alert.to.slice(-4)}
                                </span>
                            </div>
                            <div className="feed-item-amount">
                                {formatAmount(alert.amount, alert.tokenAddress)}
                            </div>
                            <div className="feed-item-meta">
                                Block #{parseInt(alert.blockNumber, 16)}
                                <span className="click-hint">Click for details →</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {selectedAlert && (
                <TransactionModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </div>
    );
}
