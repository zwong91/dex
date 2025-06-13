import React, { useState } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { X } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installed?: boolean;
}

const walletOptions: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/src/assets/metamask.png',
    description: 'Connect using browser wallet',
    installed: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '/src/assets/WalletConnect.png',
    description: 'Connect using mobile wallet'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '/src/assets/coinbase.svg',
    description: 'Connect using Coinbase Wallet'
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '/src/assets/trust.svg',
    description: 'Connect using Trust Wallet'
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: '/src/assets/rabby.svg',
    description: 'Connect using Rabby Wallet'
  }
];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();
  const [connecting, setConnecting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (connector: any, walletId: string) => {
    try {
      setConnecting(walletId);
      await connect({ connector });
      onClose();
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1f2a] border border-[#3a4553] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#fafafa]">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#252b36] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#717A8C]" />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          {connectors.map((connector, index) => {
            const walletOption = walletOptions[index] || {
              id: connector.id,
              name: connector.name,
              icon: '/src/assets/wallet-generic.svg',
              description: 'Connect using ' + connector.name
            };
            
            const isConnecting = connecting === walletOption.id;
            
            return (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector, walletOption.id)}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 bg-[#252b36] hover:bg-[#2d3440] border border-[#3a4553] rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={walletOption.icon}
                      alt={walletOption.name}
                      className="w-10 h-10 rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/src/assets/user.png';
                      }}
                    />
                    {walletOption.installed && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1f2a]" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-[#fafafa] font-semibold text-base">
                      {walletOption.name}
                    </h3>
                    <p className="text-[#717A8C] text-sm">
                      {walletOption.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {isConnecting ? (
                    <div className="w-6 h-6 border-2 border-[#516AE4] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-[#717A8C] rounded-full group-hover:bg-[#516AE4] transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-[#161d29] rounded-lg border border-[#3a4553]">
          <p className="text-[#717A8C] text-sm text-center">
            By connecting a wallet, you agree to Universal DEX's{' '}
            <a href="#" className="text-[#516AE4] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#516AE4] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
