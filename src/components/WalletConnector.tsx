import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { IoLogOutOutline } from 'react-icons/io5';
import { FaWallet } from 'react-icons/fa';

interface WalletConnectorProps {
  onConnect?: () => void;
  variant?: 'default' | 'menu' | 'navigation';
  showDisconnect?: boolean;
}

const WalletConnector = ({ onConnect, variant = 'default', showDisconnect = true }: WalletConnectorProps) => {
  const { disconnect } = useDisconnect();

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
                if (variant === 'menu') {
                  return (
                    <button
                      onClick={() => {
                        openConnectModal();
                        onConnect?.();
                      }}
                      type="button"
                      className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <FaWallet className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Connect Wallet</span>
                    </button>
                  );
                }
                return (
                  <button
                    onClick={() => {
                      openConnectModal();
                      onConnect?.();
                    }}
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 text-sm"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                if (variant === 'menu') {
                  return (
                    <button
                      onClick={() => {
                        openChainModal();
                        onConnect?.();
                      }}
                      type="button"
                      className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    >
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Switch Network</span>
                    </button>
                  );
                }
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-red-500/25 text-sm"
                  >
                    Wrong Network
                  </button>
                );
              }

              if (variant === 'menu') {
                return (
                  <button
                    onClick={() => {
                      disconnect();
                      onConnect?.();
                    }}
                    type="button"
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  >
                    <IoLogOutOutline className="w-4 h-4" />
                    <span className="text-sm">Disconnect Wallet</span>
                  </button>
                );
              }

              if (variant === 'navigation') {
                return (
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-400/50 text-white px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-blue-500/25 group"
                  >
                    {account.ensAvatar ? (
                      <img
                        alt={account.ensName ?? 'ENS avatar'}
                        src={account.ensAvatar}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {account.address.substring(2, 4).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-medium leading-tight">
                        {account.ensName || `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}`}
                      </span>
                      {account.displayBalance && (
                        <span className="text-xs text-blue-200 leading-tight">
                          {account.displayBalance}
                        </span>
                      )}
                    </div>
                  </button>
                );
              }

              return (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-400/50 text-white px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-blue-500/25 group"
                  >
                    {account.ensAvatar ? (
                      <img
                        alt={account.ensName ?? 'ENS avatar'}
                        src={account.ensAvatar}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {account.address.substring(2, 4).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-xs font-medium leading-tight">
                        {account.ensName || `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}`}
                      </span>
                      {account.displayBalance && (
                        <span className="text-xs text-blue-200 leading-tight">
                          {account.displayBalance}
                        </span>
                      )}
                    </div>
                  </button>

                  {showDisconnect && (
                    <button
                      onClick={() => disconnect()}
                      type="button"
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      title="Disconnect Wallet"
                    >
                      <IoLogOutOutline className="w-4 h-4" />
                    </button>
                  )}
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
