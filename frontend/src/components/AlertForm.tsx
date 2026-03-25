import { useState } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { ALERT_REGISTRY_ADDRESS, REGISTRY_ABI, TOKENS } from "../lib/contracts";

export function AlertForm() {
    const { isConnected } = useAccount();
    const [watchAddress, setWatchAddress] = useState("");
    const [tokenAddress, setTokenAddress] = useState<string>(TOKENS.ANY);
    const [thresholdEther, setThresholdEther] = useState("10");

    const [status, setStatus] = useState<
        "idle" | "pending" | "success" | "error"
    >("idle");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const handleCopy = (symbol: string, address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedToken(symbol);
        setTimeout(() => setCopiedToken(null), 1500);
    };

    const { writeContractAsync } = useWriteContract();

    const handleSubmit = async () => {
        if (!isConnected || !watchAddress) return;

        setStatus("pending");
        try {
            // Need to apply different decimal parsing based on token
            let decimals = 18;
            if (tokenAddress === TOKENS.USDC) {
                decimals = 6;
            }

            // Manually parse threshold based on token decimals
            let parsedThreshold;
            try {
                // simple math to parse input considering decimals (viem parseEther defaults to 18)
                parsedThreshold = BigInt(Math.floor(parseFloat(thresholdEther) * Math.pow(10, decimals)));
            } catch {
                parsedThreshold = BigInt(0);
            }


            const tx = await writeContractAsync({
                address: ALERT_REGISTRY_ADDRESS,
                abi: REGISTRY_ABI,
                functionName: "registerAlert",
                args: [watchAddress as `0x${string}`, tokenAddress as `0x${string}`, parsedThreshold],
            });
            console.log("Alert registered! Tx:", tx);
            setStatus("success");
            setWatchAddress("");
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    return (
        <div className="card alert-form card--white">
            <div className="card-header">
                <span className="card-icon">🔔</span>
                <h2>Register Alert</h2>
            </div>
            <div className="card-description">
                Watch any wallet for specific test tokens.
                <br /><br />
                <span className="text-muted text-sm">
                    <strong>Need test tokens?</strong> Swap on <a href="https://dapp.quickswap.exchange/swap/" target="_blank" rel="noreferrer">QuickSwap (Somnia Testnet)</a>.
                    <br />
                    <strong>Note:</strong> Only QuickSwap test tokens are supported. Native STT transfers are not monitored (no EVM logs emitted).
                </span>

                <div className="supported-tokens mt-3">
                    <strong>Supported Tokens</strong>
                    <ul className="token-list">
                        <li className="token-list-item" onClick={() => handleCopy("USDC", TOKENS.USDC)}>
                            USDC <span className="mono">{TOKENS.USDC}</span>
                        </li>
                        <li className="token-list-item" onClick={() => handleCopy("WSTT", TOKENS.WSTT)}>
                            WSTT <span className="mono">{TOKENS.WSTT}</span>
                        </li>
                        <li className="token-list-item" onClick={() => handleCopy("WETH", TOKENS.WETH)}>
                            WETH <span className="mono">{TOKENS.WETH}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Toast Notification */}
            <div className={`toast ${copiedToken ? "show" : ""}`}>
                {copiedToken} token address copied
            </div>

            <div className="form-group">
                <label htmlFor="watchAddress">Wallet to Watch</label>
                <input
                    id="watchAddress"
                    type="text"
                    placeholder="0x..."
                    value={watchAddress}
                    onChange={(e) => setWatchAddress(e.target.value)}
                    className="input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="tokenSelect">Token to Monitor</label>
                <select
                    id="tokenSelect"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="input"
                    style={{ appearance: "auto" }}
                >
                    <option value={TOKENS.ANY}>All ERC20 Tokens</option>
                    <option value={TOKENS.WSTT}>WSTT</option>
                    <option value={TOKENS.USDC}>USDC</option>
                    <option value={TOKENS.WETH}>WETH</option>
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="threshold">Min Token Threshold</label>
                <input
                    id="threshold"
                    type="number"
                    placeholder="10"
                    value={thresholdEther}
                    onChange={(e) => setThresholdEther(e.target.value)}
                    className="input"
                />
            </div>

            <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!isConnected || status === "pending" || !watchAddress}
            >
                {!isConnected
                    ? "Connect Wallet First"
                    : status === "pending"
                        ? "Registering..."
                        : "Register Alert On-Chain"}
            </button>

            {status === "success" && (
                <div className="alert alert-success">
                    <span>✅</span> Alert registered! A Reactivity subscription is now
                    watching this wallet on-chain.
                </div>
            )}

            {status === "error" && (
                <div className="alert alert-error">
                    <span>❌</span> Failed to register alert. Check console for details.
                </div>
            )}
        </div>
    );
}
