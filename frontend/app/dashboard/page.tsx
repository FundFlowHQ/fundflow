'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import { getPools } from '@/lib/api';
import { CountdownTimer } from '@/components/CountdownTimer';
import { StellarLink } from '@/components/StellarLink';
import { GrantPool } from '@/types';

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const [pools, setPools] = useState<GrantPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    getPools().then((data) => {
      setPools(data.filter((p) => p.creator === address));
      setLoading(false);
    });
  }, [address]);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Connect your wallet to view your dashboard</p>
        <button
          onClick={connect}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Connect Freighter
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            My dashboard
          </h1>
          {address && (
            <p className="text-sm font-mono text-gray-400 mt-1">
              <StellarLink address={address} className="text-gray-400 hover:text-blue-500" />
            </p>
          )}
        </div>
        <Link
          href="/pools/create"
          className="px-4 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
        >
          + New pool
        </Link>
      </div>

      <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">
        My grant pools
      </h2>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-12 text-gray-400 font-mono text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          No pools yet.{' '}
          <Link href="/pools/create" className="text-blue-500 hover:underline">
            Create your first pool →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pools.map((pool) => (
            <Link key={pool.id} href={`/pools/${pool.id}`}>
              <div className="flex items-center justify-between p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{pool.name}</p>
                  <p className="text-sm text-gray-400 font-mono mt-0.5">
                    {(pool.remaining_amount / 10_000_000).toFixed(0)} XLM remaining
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <CountdownTimer deadline={pool.deadline} />
                  <span className={`text-xs px-2 py-1 rounded-full font-mono ${pool.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
                    {pool.is_active ? 'Active' : 'Closed'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}