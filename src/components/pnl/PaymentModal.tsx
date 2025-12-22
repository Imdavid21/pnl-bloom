import { forwardRef, useState } from 'react';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Wallet, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { type X402PaymentInfo } from '@/lib/x402';
import { WalletConnectButton } from './WalletConnectButton';
import { ChainSelector } from './ChainSelector';
import { SUPPORTED_CHAINS, type SupportedChainKey, TREASURY_ADDRESS, PAYMENT_AMOUNT_DISPLAY } from '@/lib/chains';
import { ERC20_ABI } from '@/lib/wagmi';
import { toast } from 'sonner';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentInfo: X402PaymentInfo | null;
  onPay: (chainKey: SupportedChainKey) => void;
  isPaying: boolean;
  isWaitingForTx: boolean;
  txHash: string | null;
  error: string | null;
}

export const PaymentModal = forwardRef<HTMLDivElement, PaymentModalProps>(
  function PaymentModal({
    open,
    onClose,
    paymentInfo,
    onPay,
    isPaying,
    isWaitingForTx,
    txHash,
    error,
  }, ref) {
    const { address, isConnected, chainId: walletChainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const [selectedChain, setSelectedChain] = useState<SupportedChainKey>('hyperevm');
    const [copied, setCopied] = useState(false);
    const [isSwitchingChain, setIsSwitchingChain] = useState(false);

    const chainConfig = SUPPORTED_CHAINS[selectedChain];
    const isOnCorrectChain = walletChainId === chainConfig.id;

    // Fetch USDC balance for selected chain
    const { data: usdcBalance, isLoading: isLoadingBalance } = useReadContract({
      address: chainConfig.usdcContract,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      chainId: chainConfig.id,
      query: {
        enabled: !!address && open,
      },
    });

    // Format USDC balance (6 decimals)
    const formattedBalance = usdcBalance 
      ? (Number(usdcBalance) / 1_000_000).toFixed(2)
      : '0.00';

    const requiredAmount = parseFloat(PAYMENT_AMOUNT_DISPLAY);
    const hasInsufficientBalance = usdcBalance !== undefined && 
      Number(usdcBalance) / 1_000_000 < requiredAmount;

    const handleCopyRecipient = async () => {
      await navigator.clipboard.writeText(TREASURY_ADDRESS);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    };

    const handlePay = async () => {
      // If not on correct chain, switch first
      if (!isOnCorrectChain) {
        setIsSwitchingChain(true);
        try {
          await switchChainAsync({ chainId: chainConfig.id });
        } catch (err: any) {
          toast.error('Failed to switch network');
          setIsSwitchingChain(false);
          return;
        }
        setIsSwitchingChain(false);
      }
      onPay(selectedChain);
    };

    if (!paymentInfo) return null;

    const purposeLabel = paymentInfo.memo === 'wallet_sync' 
      ? 'Wallet Sync' 
      : 'PnL Recompute';

    const explorerUrl = txHash 
      ? `${chainConfig.explorerUrl}${chainConfig.explorerTxPath}${txHash}`
      : null;

    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent ref={ref} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Required
            </DialogTitle>
            <DialogDescription>
              {purposeLabel} requires a payment of {PAYMENT_AMOUNT_DISPLAY} USDC.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Chain Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Select Network
              </label>
              <ChainSelector
                selectedChain={selectedChain}
                onChainChange={setSelectedChain}
                disabled={isPaying || isWaitingForTx}
              />
            </div>

            {/* USDC Balance */}
            {isConnected && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-bold text-primary">$</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Your USDC on {chainConfig.name}
                    </p>
                    <p className="font-mono font-medium">
                      {isLoadingBalance ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className={hasInsufficientBalance ? 'text-destructive' : 'text-foreground'}>
                          {formattedBalance} USDC
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {hasInsufficientBalance && (
                  <div className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient
                  </div>
                )}
                {!hasInsufficientBalance && usdcBalance !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-profit">
                    <CheckCircle2 className="h-3 w-3" />
                    Sufficient
                  </div>
                )}
              </div>
            )}

            {/* Payment Details */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-medium">{PAYMENT_AMOUNT_DISPLAY} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span className="font-mono">{chainConfig.name}</span>
              </div>
            </div>

            {/* Wallet Connection */}
            {!isConnected && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/50 p-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to make the payment
                </p>
                <WalletConnectButton />
              </div>
            )}

            {/* Wrong Network Warning */}
            {isConnected && !isOnCorrectChain && !isPaying && !isWaitingForTx && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Wrong Network</p>
                  <p className="text-xs opacity-80 mt-1">
                    You'll be prompted to switch to {chainConfig.name} when you pay.
                  </p>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {isConnected && hasInsufficientBalance && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Insufficient USDC Balance</p>
                  <p className="text-xs opacity-80 mt-1">
                    You need {PAYMENT_AMOUNT_DISPLAY} USDC but only have {formattedBalance} USDC on {chainConfig.name}.
                  </p>
                </div>
              </div>
            )}

            {/* Transaction Status */}
            {isWaitingForTx && txHash && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Waiting for confirmation...</p>
                  <div className="flex items-center gap-1">
                    <code className="text-xs text-muted-foreground">
                      {txHash.slice(0, 16)}...
                    </code>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Payment Error</p>
                  <p className="text-xs opacity-80 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={onClose} disabled={isPaying || isWaitingForTx}>
              Cancel
            </Button>
            <Button 
              onClick={handlePay} 
              disabled={!isConnected || isPaying || isWaitingForTx || isSwitchingChain || hasInsufficientBalance}
              className="gap-2"
            >
              {isSwitchingChain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching Network...
                </>
              ) : (isPaying || isWaitingForTx) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isWaitingForTx ? 'Confirming...' : 'Paying...'}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {PAYMENT_AMOUNT_DISPLAY} USDC
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
