'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getPool, getApplications, withdrawPool } from '@/lib/api';
import { useWallet, signTransaction } from '@/lib/wallet';
import { CountdownTimer } from '@/components/CountdownTimer';
import { SkeletonDetail } from '@/components/Skeleton';
import { StellarLink } from '@/components/StellarLink';
import { CONTRACT_ID } from '@/lib/stellar';
import PoolAnalytics from '@/components/PoolAnalytics';
import { GrantPool, Application } from '@/types';
import { getIPFSUrl, fetchFromIPFS } from '@/lib/ipfs';

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

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = Number(params.id);
  const { address, isConnected, connect } = useWallet();
  const [pool, setPool] = useState<GrantPool | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

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

  async function handleWithdraw() {
    if (!address || !pool) return;
    setWithdrawing(true);
    setWithdrawError(null);

    try {
      const result = await withdrawPool(poolId, address);

      if (!result || !(result as any).xdr) {
        setWithdrawError('Failed to prepare withdraw transaction.');
        setWithdrawing(false);
        return;
      }

      const xdr = (result as any).xdr as string;

      const signResult = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });

      if (!signResult || (signResult as any).error) {
        setWithdrawError('Transaction signing was cancelled or failed.');
        setWithdrawing(false);
        return;
      }

      const signedXdr = (signResult as any).signedTxXdr || (signResult as any).signedXDR;

      const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

      const sendResult = await server.sendTransaction(signedTx);

      if (sendResult.status === 'ERROR') {
        setWithdrawError('Transaction failed to submit.');
        setWithdrawing(false);
        return;
      }

      let getResult = await server.getTransaction(sendResult.hash);
      let attempts = 0;
      while (getResult.status === 'NOT_FOUND' && attempts < 15) {
        await new Promise((r) => setTimeout(r, 1000));
        getResult = await server.getTransaction(sendResult.hash);
        attempts++;
      }

      if (getResult.status !== 'SUCCESS') {
        setWithdrawError('Transaction did not complete successfully.');
        setWithdrawing(false);
        return;
      }

      setWithdrawSuccess(true);
      const refreshed = await getPool(poolId);
      setPool(refreshed);
      setWithdrawing(false);
    } catch (err) {
      console.error('Withdraw error:', err);
      setWithdrawError(err instanceof Error ? err.message : 'Something went wrong.');
      setWithdrawing(false);
    }
  }

  if (loading) {
    return <SkeletonDetail />;
  }

  if (!pool) {
    return (
      <div className="text-center py-20 text-gray-400 font-mono text-sm">
        Pool not found.
      </div>
    );
  }

  const deadlinePassed = Date.now() / 1000 >= pool.deadline;
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

        <div className="flex items-center gap-4 mb-4 text-sm font-mono text-gray-500">
          <span>Creator:</span>
          <StellarLink address={pool.creator} />
          {CONTRACT_ID && (
            <>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <StellarLink address={CONTRACT_ID} type="contract">
                View contract
              </StellarLink>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-mono text-gray-400 mb-1">Remaining amount</p>
            <p className="font-semibold text-gray-900 dark:text-gray-50">
              {(Number(pool.remaining_amount) / 10_000_000).toFixed(0)} XLM
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

        {deadlinePassed && Number(pool.remaining_amount) > 0 && pool.is_active && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            {withdrawError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {withdrawError}
              </div>
            )}

            {withdrawSuccess && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                Funds withdrawn successfully.
              </div>
            )}

            {!isConnected ? (
              <button
                onClick={connect}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Connect Freighter to withdraw
              </button>
            ) : address === pool.creator ? (
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || withdrawSuccess}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw unclaimed funds'}
              </button>
            ) : (
              <p className="text-sm text-gray-400 text-center">
                Only the pool creator can withdraw unclaimed funds after the deadline.
              </p>
            )}
          </div>
        )}
      </div>

      {isCreator && applications.length > 0 && (
        <PoolAnalytics pool={pool} applications={applications} />
      )}

      {applications.length > 0 && (
        <div className="mt-6 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">
            Applications ({applications.length})
          </h2>
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