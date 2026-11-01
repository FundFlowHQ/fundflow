const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer/testnet';

interface StellarLinkProps {
  address: string | null;
  type?: 'account' | 'contract' | 'tx';
  children?: React.ReactNode;
  className?: string;
}

function truncateHash(hash: string, prefixLen = 6, suffixLen = 6): string {
  if (hash.length <= prefixLen + suffixLen + 3) return hash;
  return `${hash.slice(0, prefixLen)}...${hash.slice(-suffixLen)}`;
}

export function StellarLink({
  address,
  type = 'account',
  children,
  className = '',
}: StellarLinkProps) {
  if (!address) return null;

  const href = `${STELLAR_EXPERT_BASE}/${type}/${address}`;
  const label = children ?? truncateHash(address);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-600 hover:underline ${className}`}
      title={address}
    >
      {label}
    </a>
  );
}
