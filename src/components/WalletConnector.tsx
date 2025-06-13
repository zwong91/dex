import { ConnectButton } from '@rainbow-me/rainbowkit';

const WalletConnector = () => {
  return (
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

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-gradient-to-r from-[#516AE4] to-[#7c3aed] hover:from-[#4056d6] hover:to-[#6d28d9] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 bg-[#1a1f2a] hover:bg-[#252b36] border border-[#3a4553] text-[#fafafa] px-4 py-2 rounded-lg transition-all duration-200"
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-5 h-5 rounded-full overflow-hidden"
                        style={{
                          background: chain.iconBackground,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-5 h-5"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-3 bg-[#1a1f2a] hover:bg-[#252b36] border border-[#3a4553] text-[#fafafa] px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    {account.ensAvatar && (
                      <img
                        alt={account.ensName ?? 'ENS avatar'}
                        src={account.ensAvatar}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {account.ensName || `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}`}
                      </span>
                      {account.displayBalance && (
                        <span className="text-xs text-[#717A8C]">
                          {account.displayBalance}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default WalletConnector;
