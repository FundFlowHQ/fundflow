'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPools } from '@/lib/api';
import { CountdownTimer } from '@/components/CountdownTimer';
import { SkeletonCard } from '@/components/Skeleton';
import { GrantPool } from '@/types';

export default function PoolsPage() {
  const [pools, setPools] = useState<GrantPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPools().then((data) => {
      setPools(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Grant pools
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Active funding pools on Stellar
          </p>
        </div>
        <Link
          href="/pools/create"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors"
        >
          + Create pool
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <SkeletonCard key={i} />
            ))}
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-mono text-sm">
          No pools found. Be the first to create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <Link key={pool.id} href={`/pools/${pool.id}`}>
              <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-500 font-semibold">
                    {pool.name[0].toUpperCase()}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-mono ${pool.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
                    {pool.is_active ? 'Active' : 'Closed'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">{pool.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{pool.description}</p>
                <div className="flex justify-between items-center text-xs font-mono text-gray-400 gap-4">
                  <span>{(pool.remaining_amount / 10_000_000).toFixed(0)} XLM left</span>
                  <CountdownTimer deadline={pool.deadline} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}