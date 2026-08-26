import axios from 'axios';
import { GrantPool, Application, LeaderboardEntry } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: API_URL });

export async function getPools(): Promise<GrantPool[]> {
  try {
    const { data } = await api.get('/pools');
    return data;
  } catch {
    return [];
  }
}

export async function getPool(id: number): Promise<GrantPool | null> {
  try {
    const { data } = await api.get(`/pools/${id}`);
    return data;
  } catch {
    return null;
  }
}

export async function getApplications(poolId: number): Promise<Application[]> {
  try {
    const { data } = await api.get(`/pools/${poolId}/applications`);
    return data;
  } catch {
    return [];
  }
}

export async function createPool(payload: {
  name: string;
  description: string;
  amount: number;
  deadline: number;
  creator: string;
}): Promise<{ id: number } | null> {
  try {
    const { data } = await api.post('/pools', payload);
    return data;
  } catch {
    return null;
  }
}

export async function submitApplication(payload: {
  pool_id: number;
  applicant: string;
  proposal: string;
  amount_requested: number;
  ipfs_hash?: string;
}): Promise<{ id: number } | null> {
  try {
    const { data } = await api.post('/applications', payload);
    return data;
  } catch {
    return null;
  }
}

export async function voteOnApplication(
  appId: number,
  voter: string
): Promise<boolean> {
  try {
    await api.post(`/applications/${appId}/vote`, { voter });
    return true;
  } catch {
    return false;
  }
}

export async function getLeaderboard(period: 'all' | 'month' = 'all'): Promise<LeaderboardEntry[]> {
  try {
    const { data } = await api.get('/leaderboard', { params: { period } });
    return data;
  } catch {
    return [];
  }
}