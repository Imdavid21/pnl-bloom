import { useState, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { 
  SUPPORTED_CHAINS, 
  TREASURY_ADDRESS, 
  PAYMENT_AMOUNT,
  type SupportedChainKey,
  getChainById,
  getWagmiChain,
} from '@/lib/chains';
import { ERC20_ABI } from '@/lib/wagmi';
import { syncWalletWithPayment, recomputePnlWithPayment, type X402PaymentInfo } from '@/lib/x402';
import { toast } from 'sonner';

type PaymentPurpose = 'wallet_sync' | 'pnl_recompute';

interface UseX402PaymentReturn {
  // State
  isPaying: boolean;
  isWaitingForTx: boolean;
  paymentRequired: X402PaymentInfo | null;
  txHash: string | null;
  error: string | null;
  
  // Actions
  initiateSync: (wallet: string) => Promise<void>;
  initiateRecompute: (wallet: string) => Promise<void>;
  executePayment: (chainKey: SupportedChainKey) => Promise<void>;
  reset: () => void;
}

// Error message mapping for user-friendly messages
function getReadableError(error: string): string {
  if (error.includes('User rejected') || error.includes('user rejected')) {
    return 'Transaction was cancelled';
  }
  if (error.includes('insufficient funds') || error.includes('Insufficient')) {
    return 'Insufficient USDC balance for payment';
  }
  if (error.includes('network') || error.includes('Network')) {
    return 'Network error. Please check your connection and try again';
  }
  if (error.includes('timeout') || error.includes('Timeout')) {
    return 'Request timed out. Please try again';
  }
  if (error.includes('Payment verification failed')) {
    return 'Payment could not be verified. Please wait a moment and try again';
  }
  // Truncate very long error messages
  if (error.length > 100) {
    return error.substring(0, 100) + '...';
  }
  return error;
}

export function useX402Payment(onSuccess?: () => void): UseX402PaymentReturn {
  const { address, isConnected } = useAccount();
  const [isPaying, setIsPaying] = useState(false);
  const [isWaitingForTx, setIsWaitingForTx] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState<X402PaymentInfo | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: PaymentPurpose; wallet: string } | null>(null);
  const [selectedChainKey, setSelectedChainKey] = useState<SupportedChainKey>('hyperevm');

  const { writeContractAsync } = useWriteContract();

  const reset = useCallback(() => {
    setIsPaying(false);
    setIsWaitingForTx(false);
    setPaymentRequired(null);
    setTxHash(null);
    setError(null);
    setPendingAction(null);
  }, []);

  const setReadableError = useCallback((err: string) => {
    const readable = getReadableError(err);
    setError(readable);
    return readable;
  }, []);

  const retryWithPayment = useCallback(async (hash: string, chainKey: SupportedChainKey) => {
    if (!pendingAction) return;

    setIsWaitingForTx(false);
    setIsPaying(true);
    setError(null);

    // Include chain info in the payment header
    const paymentHeader = `${hash}:${chainKey}`;

    try {
      const result = pendingAction.type === 'wallet_sync'
        ? await syncWalletWithPayment(pendingAction.wallet, paymentHeader)
        : await recomputePnlWithPayment(pendingAction.wallet, paymentHeader);

      if (result.error) {
        const readable = setReadableError(result.error);
        toast.error(readable);
        return;
      }

      if (result.paymentRequired) {
        setReadableError('Payment verification failed. The transaction may still be processing.');
        toast.error('Payment verification failed. Please wait and try again.');
        return;
      }

      toast.success(pendingAction.type === 'wallet_sync' 
        ? 'Wallet synced successfully!' 
        : 'PnL recomputed successfully!');
      reset();
      onSuccess?.();
    } catch (err: any) {
      const readable = setReadableError(err.message || 'Failed to complete action');
      toast.error(readable);
    } finally {
      setIsPaying(false);
    }
  }, [pendingAction, reset, onSuccess, setReadableError]);

  const executePayment = useCallback(async (chainKey: SupportedChainKey) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const chainConfig = SUPPORTED_CHAINS[chainKey];
    if (!chainConfig) {
      toast.error('Invalid chain selected');
      return;
    }

    setSelectedChainKey(chainKey);
    setIsPaying(true);
    setError(null);

    try {
      const wagmiChain = getWagmiChain(chainKey);
      const hash = await writeContractAsync({
        address: chainConfig.usdcContract,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, PAYMENT_AMOUNT],
        chain: wagmiChain,
        account: address,
      });

      setTxHash(hash);
      setIsWaitingForTx(true);
      toast.info('Transaction submitted, waiting for confirmation...');

      // Wait for transaction and retry with proper error handling
      const checkReceipt = async () => {
        const maxAttempts = 30;
        let lastError: string | null = null;

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const response = await fetch(chainConfig.rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [hash],
                id: 1,
              }),
            });
            
            if (!response.ok) {
              lastError = `RPC error: ${response.status}`;
              continue;
            }

            const data = await response.json();
            
            if (data.error) {
              lastError = data.error.message || 'RPC returned an error';
              continue;
            }

            if (data.result && data.result.status === '0x1') {
              toast.success('Payment confirmed!');
              await retryWithPayment(hash, chainKey);
              return;
            } else if (data.result && data.result.status === '0x0') {
              setReadableError('Transaction reverted on-chain');
              setIsWaitingForTx(false);
              setIsPaying(false);
              toast.error('Transaction failed on-chain');
              return;
            }
            // Receipt not yet available, continue polling
          } catch (e: any) {
            lastError = e.message || 'Network error while checking transaction';
            // Continue polling
          }
        }
        
        // Timeout reached
        const timeoutError = lastError 
          ? `Transaction confirmation timeout: ${lastError}`
          : 'Transaction confirmation timeout. The transaction may still be processing.';
        setReadableError(timeoutError);
        setIsWaitingForTx(false);
        setIsPaying(false);
        toast.error('Confirmation timeout. Check your wallet for status.');
      };

      checkReceipt();
    } catch (err: any) {
      const readable = setReadableError(err.message || 'Payment failed');
      toast.error(readable);
      setIsPaying(false);
      setIsWaitingForTx(false);
    }
  }, [isConnected, address, writeContractAsync, retryWithPayment, setReadableError]);

  const initiateSync = useCallback(async (wallet: string) => {
    setIsPaying(true);
    setError(null);
    setPendingAction({ type: 'wallet_sync', wallet });

    try {
      const result = await syncWalletWithPayment(wallet);

      if (result.paymentRequired) {
        setPaymentRequired(result.paymentRequired);
        setIsPaying(false);
        // This is expected - not an error, just needs payment
        return;
      }

      if (result.error) {
        const readable = setReadableError(result.error);
        toast.error(readable);
        setIsPaying(false);
        return;
      }

      // Success without payment (rare but possible if already paid)
      toast.success('Wallet synced successfully!');
      reset();
      onSuccess?.();
    } catch (err: any) {
      const readable = setReadableError(err.message || 'Sync failed');
      toast.error(readable);
      setIsPaying(false);
    }
  }, [reset, onSuccess, setReadableError]);

  const initiateRecompute = useCallback(async (wallet: string) => {
    setIsPaying(true);
    setError(null);
    setPendingAction({ type: 'pnl_recompute', wallet });

    try {
      const result = await recomputePnlWithPayment(wallet);

      if (result.paymentRequired) {
        setPaymentRequired(result.paymentRequired);
        setIsPaying(false);
        return;
      }

      if (result.error) {
        const readable = setReadableError(result.error);
        toast.error(readable);
        setIsPaying(false);
        return;
      }

      toast.success('PnL recomputed successfully!');
      reset();
      onSuccess?.();
    } catch (err: any) {
      const readable = setReadableError(err.message || 'Recompute failed');
      toast.error(readable);
      setIsPaying(false);
    }
  }, [reset, onSuccess, setReadableError]);

  return {
    isPaying,
    isWaitingForTx,
    paymentRequired,
    txHash,
    error,
    initiateSync,
    initiateRecompute,
    executePayment,
    reset,
  };
}
