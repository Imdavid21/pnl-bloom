export type InputType = 'evm_address' | 'tx_hash' | 'block_number' | 'unknown';

export function detectInputType(input: string): InputType {
    const cleanInput = input.trim().toLowerCase();

    // EVM Address: 42 chars, starts with 0x
    if (/^0x[a-f0-9]{40}$/.test(cleanInput)) {
        return 'evm_address';
    }

    // Transaction Hash: 66 chars, starts with 0x
    if (/^0x[a-f0-9]{64}$/.test(cleanInput)) {
        return 'tx_hash';
    }

    // Block Number: numeric
    if (/^\d+$/.test(cleanInput)) {
        return 'block_number';
    }

    return 'unknown';
}

export function guessDomain(inputType: InputType): 'hyperevm' | 'hypercore' | 'both' {
    switch (inputType) {
        case 'evm_address':
            // Ambiguous - could be EVM wallet or Hypercore format (though HC usually dedicated)
            // For now, prioritize probing both as 0x addresses are standard in Hyperliquid
            return 'both';
        case 'tx_hash':
            // Tx hashes look same on both
            return 'both';
        case 'block_number':
            // Block numbers exist on both
            return 'both';
        default:
            return 'both'; // Fallback to search both
    }
}
