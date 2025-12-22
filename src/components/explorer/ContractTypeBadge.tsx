import { cn } from '@/lib/utils';
import { Coins, FileCode, Wallet, Building2, ArrowLeftRight, Landmark, PiggyBank, Link } from 'lucide-react';
import { getContractInfo, getContractTypeLabel, getContractTypeColor, detectContractType, type ContractType } from '@/lib/contractTypes';

interface ContractTypeBadgeProps {
  address: string;
  isContract?: boolean;
  contractCode?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-1 text-xs gap-1.5',
  lg: 'px-2.5 py-1.5 text-sm gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

function getContractIcon(type: ContractType) {
  switch (type) {
    case 'erc20_token':
    case 'erc721_nft':
      return Coins;
    case 'dex':
      return ArrowLeftRight;
    case 'lending':
      return Landmark;
    case 'staking':
      return PiggyBank;
    case 'bridge':
      return Link;
    case 'dapp_protocol':
      return Building2;
    case 'system':
    case 'unknown':
      return FileCode;
    default:
      return Wallet;
  }
}

export function ContractTypeBadge({
  address,
  isContract = false,
  contractCode,
  size = 'md',
  className,
}: ContractTypeBadgeProps) {
  let type: ContractType = 'unknown';
  let name: string | undefined;
  
  const knownContract = getContractInfo(address);
  if (knownContract) {
    type = knownContract.type;
    name = knownContract.name;
  } else if (isContract && contractCode) {
    type = detectContractType(contractCode);
  }
  
  // If not a contract, show wallet
  if (!isContract && !knownContract) {
    return (
      <div className={cn(
        "inline-flex items-center font-medium rounded-md",
        "text-info bg-info/10",
        sizeClasses[size],
        className
      )}>
        <Wallet className={iconSizes[size]} />
        <span>Wallet</span>
      </div>
    );
  }
  
  const Icon = getContractIcon(type);
  const label = name || getContractTypeLabel(type);
  const colorClass = getContractTypeColor(type);
  
  return (
    <div className={cn(
      "inline-flex items-center font-medium rounded-md",
      colorClass,
      sizeClasses[size],
      className
    )}>
      <Icon className={iconSizes[size]} />
      <span>{label}</span>
    </div>
  );
}
