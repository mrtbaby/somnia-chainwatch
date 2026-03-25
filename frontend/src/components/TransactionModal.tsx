import type { AlertNotification } from "../hooks/useReactivity";
import { formatUnits } from "viem";
import { TOKENS } from "../lib/contracts";

interface TransactionModalProps {
    alert: AlertNotification;
    onClose: () => void;
}

export function TransactionModal({ alert, onClose }: TransactionModalProps) {
    const getTokenInfo = (tokenAddress: string) => {
        const token = tokenAddress.toLowerCase();
        if (token === TOKENS.WSTT.toLowerCase()) return { symbol: "WSTT", decimals: 18, name: "Wrapped STT" };
        if (token === TOKENS.USDC.toLowerCase()) return { symbol: "USDC", decimals: 6, name: "USD Coin" };
        if (token === TOKENS.WETH.toLowerCase()) return { symbol: "WETH", decimals: 18, name: "Wrapped ETH" };
        return { symbol: "Unknown Token", decimals: 18, name: "Unknown" };
    };

    const tokenInfo = getTokenInfo(alert.tokenAddress);
    const formattedAmount = parseFloat(formatUnits(alert.amount, tokenInfo.decimals));
    const blockNum = parseInt(alert.blockNumber, 16);
    const explorerBase = "https://shannon-explorer.somnia.network";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🔍 Transaction Details</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="detail-row">
                        <span className="detail-label">Token</span>
                        <span className="detail-value">
                            {tokenInfo.symbol} ({tokenInfo.name})
                        </span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Contract Address</span>
                        <a
                            className="detail-value detail-link mono"
                            href={`${explorerBase}/address/${alert.tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {alert.tokenAddress}
                        </a>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Amount</span>
                        <span className="detail-value amount-highlight">
                            {formattedAmount.toFixed(tokenInfo.decimals === 6 ? 2 : 6)} {tokenInfo.symbol}
                        </span>
                    </div>

                    <div className="detail-divider" />

                    <div className="detail-row">
                        <span className="detail-label">From</span>
                        <a
                            className="detail-value detail-link mono"
                            href={`${explorerBase}/address/${alert.from}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {alert.from}
                        </a>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">To</span>
                        <a
                            className="detail-value detail-link mono"
                            href={`${explorerBase}/address/${alert.to}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {alert.to}
                        </a>
                    </div>

                    <div className="detail-divider" />

                    <div className="detail-row">
                        <span className="detail-label">Block</span>
                        <a
                            className="detail-value detail-link mono"
                            href={`${explorerBase}/block/${blockNum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            #{blockNum}
                        </a>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Timestamp</span>
                        <span className="detail-value mono">
                            {new Date(alert.timestamp * 1000).toLocaleString()}
                        </span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Received At</span>
                        <span className="detail-value mono">
                            {new Date(alert.receivedAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
