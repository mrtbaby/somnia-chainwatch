import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';

import { formatUnits } from 'viem';

export function WalletConnect() {
    const { address } = useAccount();
    const { data: balanceData } = useBalance({ address });

    return (
        <div className="wallet-connect">
            <ConnectButton.Custom>
                {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted,
                }) => {
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected =
                        ready &&
                        account &&
                        chain &&
                        (!authenticationStatus ||
                            authenticationStatus === 'authenticated');

                    if (!ready) {
                        return (
                            <div aria-hidden="true" style={{ opacity: 0, pointerEvents: 'none', userSelect: 'none' }}>
                                <button type="button" className="btn btn-primary" disabled>
                                    Loading...
                                </button>
                            </div>
                        );
                    }

                    if (!connected) {
                        return (
                            <button onClick={openConnectModal} type="button" className="btn btn-primary">
                                Connect Wallet
                            </button>
                        );
                    }

                    if (chain.unsupported) {
                        return (
                            <button onClick={openChainModal} type="button" className="btn btn-primary" style={{ background: 'var(--error)' }}>
                                Wrong network
                            </button>
                        );
                    }

                    const formattedBalance = balanceData
                        ? `${Number(formatUnits(balanceData.value, balanceData.decimals || 18)).toFixed(2)} ${balanceData.symbol}`
                        : '...';

                    return (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={openChainModal}
                                style={{ display: 'flex', alignItems: 'center' }}
                                type="button"
                                className="btn btn-secondary"
                            >
                                {chain.hasIcon && (
                                    <div
                                        style={{
                                            background: chain.iconBackground,
                                            width: 16,
                                            height: 16,
                                            borderRadius: 999,
                                            overflow: 'hidden',
                                            marginRight: 6,
                                        }}
                                    >
                                        {chain.iconUrl && (
                                            <img
                                                alt={chain.name ?? 'Chain icon'}
                                                src={chain.iconUrl}
                                                style={{ width: 16, height: 16 }}
                                            />
                                        )}
                                    </div>
                                )}
                                {chain.name}
                            </button>

                            <button onClick={openAccountModal} type="button" className="btn btn-secondary">
                                {formattedBalance} &nbsp;&bull;&nbsp; {account.displayName}
                            </button>
                        </div>
                    );
                }}
            </ConnectButton.Custom>
        </div>
    );
}
