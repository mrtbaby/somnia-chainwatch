import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { LiquidMetalButton } from './LiquidMetalButton';

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
                            <LiquidMetalButton 
                                onClick={openConnectModal} 
                                label="Connect Wallet" 
                            />
                        );
                    }

                    if (chain.unsupported) {
                        return (
                            <LiquidMetalButton 
                                onClick={openChainModal} 
                                style={{ border: '1px solid var(--error)' }}
                                label="Wrong network"
                            />
                        );
                    }

                    const formattedBalance = balanceData
                        ? `${Number(formatUnits(balanceData.value, balanceData.decimals || 18)).toFixed(2)} ${balanceData.symbol}`
                        : '...';

                    return (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <LiquidMetalButton
                                onClick={openChainModal}
                                width={160}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {chain.hasIcon && (
                                        <div
                                            style={{
                                                background: chain.iconBackground,
                                                width: 16,
                                                height: 16,
                                                borderRadius: 999,
                                                overflow: 'hidden',
                                                marginRight: 8,
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
                                </div>
                            </LiquidMetalButton>

                            <LiquidMetalButton 
                                onClick={openAccountModal} 
                                label={`${formattedBalance} • ${account.displayName}`}
                                width={220}
                            />
                        </div>
                    );
                }}
            </ConnectButton.Custom>
        </div>
    );
}
