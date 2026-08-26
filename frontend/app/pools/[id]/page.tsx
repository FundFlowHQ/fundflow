'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPool } from '@/lib/api';
import { CountdownTimer } from '@/components/CountdownTimer';
import { GrantPool } from '@/types';

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = Number(params.id);
  const [pool, setPool] = useState<GrantPool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(poolId)) return;

    getPool(poolId).then((data) => {
      setPool(data);
      setLoading(false);
    });
  }, [poolId]);

  if (loading) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-20 text-gray-400 font-mono text-sm">
        Pool not found.
      </div>
    );
  }

  return (
    <div>
      <Link href="/pools" className="text-sm text-blue-500 hover:underline">
        ← Back to pools
      </Link>

      <div className="mt-8 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-500 font-semibold text-lg">
            {pool.name[0].toUpperCase()}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-mono ${pool.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
            {pool.is_active ? 'Active' : 'Closed'}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
          {pool.name}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{pool.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-mono text-gray-400 mb-1">Remaining amount</p>
            <p className="font-semibold text-gray-900 dark:text-gray-50">
              {(pool.remaining_amount / 10_000_000).toFixed(0)} XLM
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-mono text-gray-400 mb-1">Deadline</p>
            <p className="font-semibold text-gray-900 dark:text-gray-50">
              {new Date(pool.deadline * 1000).toLocaleDateString()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-mono text-gray-400 mb-1">Time remaining</p>
            <CountdownTimer deadline={pool.deadline} />
          </div>
        </div>
      </div>
    </div>
  );
}
