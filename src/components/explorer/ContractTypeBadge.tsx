import { cn } from '@/lib/utils';
import { 
  Coins, 
  Image as ImageIcon, 
  Globe, 
  ArrowLeftRight, 
  Landmark, 
  Layers,
  Settings,
  FileCode
} from 'lucide-react';
import { 
  ContractType, 
  getContractTypeLabel, 
  getContractTypeColor,
  getContractInfo,
  detectContractType
} from '@/lib/contractTypes';

interface ContractTypeBadgeProps {
  address?: string;
  contractCode?: string | null;
  type?: ContractType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const iconMap: Record<ContractType, React.ElementType> = {
  erc20_token: Coins,
  erc721_nft: ImageIcon,
  dapp_protocol: Globe,
  bridge: ArrowLeftRight,
  dex: ArrowLeftRight,
  lending: Landmark,
  staking: Layers,
  system: Settings,
  unknown: FileCode,
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function ContractTypeBadge({ 
  address, 
  contractCode,
  type: propType,
  size = 'md',
  showIcon = true,
  className 
}: ContractTypeBadgeProps) {
  // Determine contract type
  let contractType: ContractType = propType || 'unknown';
  let contractName: string | null = null;
  
  if (address && !propType) {
    const knownInfo = getContractInfo(address);
    if (knownInfo) {
      contractType = knownInfo.type;
      contractName = knownInfo.name;
    } else if (contractCode) {
      contractType = detectContractType(contractCode);
    }
  }
  
  const Icon = iconMap[contractType];
  const label = contractName || getContractTypeLabel(contractType);
  const colorClass = getContractTypeColor(contractType);
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      <span>{label}</span>
    </div>
  );
}

// Utility component for showing multiple badges (e.g., Token + Verified)
interface ContractBadgeStackProps {
  address: string;
  isContract: boolean;
  contractCode?: string | null;
  className?: string;
}

export function ContractBadgeStack({ 
  address, 
  isContract, 
  contractCode,
  className 
}: ContractBadgeStackProps) {
  if (!isContract) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-info/10 text-info", className)}>
        <Settings className="h-3.5 w-3.5" />
        <span>EOA Wallet</span>
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ContractTypeBadge 
        address={address} 
        contractCode={contractCode} 
        size="md"
      />
    </div>
  );
}
