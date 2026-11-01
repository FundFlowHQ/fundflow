export interface GrantPool {
  id: number;
  creator: string;
  name: string;
  description: string;
  total_amount: number;
  remaining_amount: number;
  token: string;
  deadline: number;
  is_active: boolean;
}

export interface Application {
  id: number;
  pool_id: number;
  applicant: string;
  proposal: string;
  votes: number;
  is_approved: boolean;
  amount_requested: number;
  ipfs_hash?: string;
}

export interface LeaderboardEntry {
  address: string;
  totalReceived: number;
  grantCount: number;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}