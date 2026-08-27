'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPool, getApplications } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { CountdownTimer } from '@/components/CountdownTimer';
import PoolAnalytics from '@/components/PoolAnalytics';
import { GrantPool, Application } from '@/types';
import { getIPFSUrl, fetchFromIPFS } from '@/lib/ipfs';
import { GrantPool, Application } from '@/types';

function ProposalContent({ app }: { app: Application }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProposal = useCallback(async () => {
    if (!app.ipfs_hash) return;
    setLoading(true);
    const text = await fetchFromIPFS(app.ipfs_hash);
    setContent(text);
    setLoading(false);
  }, [app.ipfs_hash]);

  if (!app.ipfs_hash) {
    return (
      <p className="text-sm text-gray-500 line-clamp-2">{app.proposal}</p>
    );
  }

  return (
    <div>
      {content ? (
        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {content}
        </div>
      ) : (
        <p className="text-sm text-gray-500 line-clamp-2">{app.proposal}</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        <a
          href={getIPFSUrl(app.ipfs_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-500 hover:underline"
        >
          IPFS: {app.ipfs_hash.slice(0, 16)}...
        </a>
        {!content && !loading && (
          <button
            onClick={loadProposal}
            className="text-xs text-blue-500 hover:underline min-h-[44px]"
          >
            Load full proposal
          </button>
        )}
        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
        )}
      </div>
    </div>
  );
}

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = Number(params.id);
  const { address } = useWallet();
  const [pool, setPool] = useState<GrantPool | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(poolId)) return;

    Promise.all([getPool(poolId), getApplications(poolId)]).then(
      ([poolData, appsData]) => {
        setPool(poolData);
        setApplications(appsData);
        setLoading(false);
      }
    );
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

  const isCreator = address && pool.creator === address;

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

      {isCreator && applications.length > 0 && (
        <PoolAnalytics pool={pool} applications={applications} />
      )}

      {applications.length > 0 && (
        <div className="mt-6 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">
            Applications ({applications.length})
          </h2>
          <div className="flex flex-col gap-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-blue-600 truncate">
                    {app.applicant.slice(0, 6)}...{app.applicant.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {app.proposal}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {(app.amount_requested / 10_000_000).toFixed(0)} XLM
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {app.votes} vote{app.votes !== 1 ? 's' : ''}
                  </span>
                  {app.is_approved && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-mono">
                      Approved
                    </span>
                  )}
                </div>
          <div className="flex flex-col gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-600">
                      {app.applicant.slice(0, 6)}...{app.applicant.slice(-6)}
                    </span>
                    {app.is_approved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-mono">
                        Approved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {(app.amount_requested / 10_000_000).toFixed(0)} XLM
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {app.votes} vote{app.votes !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ProposalContent app={app} />
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div className="mt-6 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-400">No applications yet.</p>
        </div>
      )}
    </div>
  );
}
