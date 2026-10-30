'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getPool, withdrawPool } from '@/lib/api';
import { useWallet, signTransaction } from '@/lib/wallet';
import { CountdownTimer } from '@/components/CountdownTimer';
import { GrantPool } from '@/types';

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = Number(params.id);
  const { address, isConnected, connect } = useWallet();
  const [pool, setPool] = useState<GrantPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(poolId)) return;

    getPool(poolId).then((data) => {
      setPool(data);
      setLoading(false);
    });
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

  const deadlinePassed = Date.now() / 1000 >= pool.deadline;
  const canWithdraw =
    pool.is_active &&
    deadlinePassed &&
    Number(pool.remaining_amount) > 0 &&
    isConnected &&
    address === pool.creator;

  return (
    <div>
      <Link href="/pools" className="text-sm text-blue-500 hover:underline">
        ← Back to pools
      </Link>

      <div className="mt-8 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-500 font-semibold">
            {pool.name[0].toUpperCase()}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-mono ${pool.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
            {pool.is_active ? 'Active' : 'Closed'}
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
          {pool.name}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{pool.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    </div>
  );
}