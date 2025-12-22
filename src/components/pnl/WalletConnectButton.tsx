import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, Connector } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wallet, LogOut, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletConnectButtonProps {
  className?: string;
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
}

// WalletConnect icon component
function WalletConnectIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-5 w-5", className)}
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="6" fill="currentColor" />
      <path
        d="M10.5 12.5c3-3 8-3 11 0l.4.4c.1.1.1.3 0 .5l-1.3 1.2c-.1.1-.2.1-.3 0l-.5-.5c-2.1-2.1-5.5-2.1-7.6 0l-.5.5c-.1.1-.2.1-.3 0L10 13.4c-.1-.1-.1-.3 0-.5l.5-.4zm13.6 2.5l1.1 1.1c.1.1.1.3 0 .5l-5.2 5c-.2.2-.4.2-.5 0l-3.7-3.6c0-.1-.1-.1-.1 0l-3.7 3.6c-.2.2-.4.2-.5 0l-5.2-5c-.1-.1-.1-.3 0-.5l1.1-1.1c.2-.2.4-.2.5 0l3.7 3.6c0 .1.1.1.1 0l3.7-3.6c.2-.2.4-.2.5 0l3.7 3.6c0 .1.1.1.1 0l3.7-3.6c.2-.2.4-.2.6 0z"
        fill="hsl(var(--foreground))"
      />
    </svg>
  );
}

// Wallet icons/names mapping
function getConnectorInfo(connector: Connector): { name: string; icon: React.ReactNode; description?: string; badge?: string } {
  const id = connector.id.toLowerCase();
  const name = connector.name;

  if (id.includes('walletconnect')) {
    return {
      name: 'WalletConnect',
      icon: <WalletConnectIcon className="text-walletconnect" />,
      badge: 'QR CODE',
    };
  }
  if (name.toLowerCase().includes('metamask')) {
    return {
      name: 'MetaMask',
      icon: (
        <div className="h-5 w-5 rounded bg-metamask flex items-center justify-center text-foreground text-xs font-bold">
          M
        </div>
      ),
      description: 'Browser extension',
    };
  }
  // Generic detected browser wallet
  return {
    name: name || 'Browser Wallet',
    icon: <Wallet className="h-5 w-5" />,
    description: 'Detected extension',
  };
}

export function WalletConnectButton({ 
  className, 
  onConnected, 
  onDisconnected 
}: WalletConnectButtonProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectingConnector, setConnectingConnector] = useState<string | null>(null);

  const handleConnect = async (connector: Connector) => {
    setConnectingConnector(connector.id);
    try {
      connect({ connector }, {
        onSuccess: (data) => {
          onConnected?.(data.accounts[0]);
          setIsModalOpen(false);
          setConnectingConnector(null);
        },
        onError: () => {
          setConnectingConnector(null);
        },
      });
    } catch {
      setConnectingConnector(null);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnected?.();
  };

  // Filter out duplicate connectors (keep unique by id)
  const uniqueConnectors = connectors.reduce((acc, connector) => {
    const exists = acc.find(c => c.id === connector.id);
    if (!exists) {
      acc.push(connector);
    }
    return acc;
  }, [] as Connector[]);

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-profit animate-pulse" />
          <code className="text-sm font-mono text-foreground">
            {address.slice(0, 6)}...{address.slice(-4)}
          </code>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        disabled={isPending || isConnecting}
        className={cn("gap-2", className)}
        size="sm"
      >
        {(isPending || isConnecting) ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        Connect Wallet
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Connect Wallet
            </DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to HyperPNL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {uniqueConnectors.map((connector) => {
              const info = getConnectorInfo(connector);
              const isConnecting = connectingConnector === connector.id;

              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isConnecting || isPending}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg bg-card/50",
                    "hover:bg-card/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isConnecting && "bg-primary/10"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/30">
                    {info.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{info.name}</p>
                    {info.description && (
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    )}
                  </div>
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : info.badge ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-walletconnect border border-walletconnect/30 rounded px-2 py-0.5">
                        {info.badge}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/30 pt-4">
            <p className="text-xs text-muted-foreground text-center">
              By connecting, you agree to use HyperEVM network
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
