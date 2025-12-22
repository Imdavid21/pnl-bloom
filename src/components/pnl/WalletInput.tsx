import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Link2, Link2Off, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletInputProps {
  value: string;
  onChange: (wallet: string) => void;
  className?: string;
}

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function WalletInput({ value, onChange, className }: WalletInputProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const [inputValue, setInputValue] = useState(value);
  const [isLinked, setIsLinked] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with connected wallet when linked
  useEffect(() => {
    if (isLinked && isConnected && connectedAddress) {
      const normalized = connectedAddress.toLowerCase();
      setInputValue(normalized);
      onChange(normalized);
    }
  }, [isLinked, isConnected, connectedAddress, onChange]);

  // Initialize with value
  useEffect(() => {
    if (value && !isLinked) {
      setInputValue(value);
    }
  }, [value, isLinked]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase();
    setInputValue(newValue);
    setError(null);
    
    if (newValue && !WALLET_REGEX.test(newValue)) {
      setError('Invalid wallet address format');
    } else {
      onChange(newValue);
    }
  };

  const handleToggleLink = () => {
    if (isLinked) {
      // Unlink - keep current value but allow editing
      setIsLinked(false);
    } else {
      // Link back to connected wallet
      if (isConnected && connectedAddress) {
        const normalized = connectedAddress.toLowerCase();
        setInputValue(normalized);
        onChange(normalized);
        setError(null);
      }
      setIsLinked(true);
    }
  };

  const isUsingConnectedWallet = isConnected && 
    inputValue.toLowerCase() === connectedAddress?.toLowerCase();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="0x..."
            className={cn(
              "pl-10 font-mono text-sm",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={isLinked && isConnected}
          />
        </div>
        
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleLink}
            className={cn(
              "gap-1.5 shrink-0",
              isLinked && "border-primary/50 text-primary"
            )}
            title={isLinked ? "Unlink from connected wallet" : "Link to connected wallet"}
          >
            {isLinked ? (
              <>
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Linked</span>
              </>
            ) : (
              <>
                <Link2Off className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Custom</span>
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {!isLinked && isConnected && !isUsingConnectedWallet && (
        <p className="text-xs text-muted-foreground">
          Viewing a different wallet. Payment still uses your connected wallet.
        </p>
      )}
    </div>
  );
}
