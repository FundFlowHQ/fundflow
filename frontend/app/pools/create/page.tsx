'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useWallet, signTransaction } from '@/lib/wallet';
import { createPool } from '@/lib/api';

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

export default function CreatePoolPage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    amount: '',
    deadline: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createPool({
        name: form.name,
        description: form.description,
        amount: Number(form.amount) * 10_000_000,
        deadline: Math.floor(new Date(form.deadline).getTime() / 1000),
        creator: address,
      });

      if (!result || !(result as any).xdr) {
        setError('Failed to prepare transaction.');
        setLoading(false);
        return;
      }

      const xdr = (result as any).xdr as string;

      const signResult = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });

      if (!signResult || (signResult as any).error) {
        setError('Transaction signing was cancelled or failed.');
        setLoading(false);
        return;
      }

      const signedXdr = (signResult as any).signedTxXdr || (signResult as any).signedXDR;

      const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

      const sendResult = await server.sendTransaction(signedTx);

      if (sendResult.status === 'ERROR') {
        setError('Transaction failed to submit.');
        setLoading(false);
        return;
      }

      // Poll for confirmation
      let getResult = await server.getTransaction(sendResult.hash);
      let attempts = 0;
      while (getResult.status === 'NOT_FOUND' && attempts < 15) {
        await new Promise((r) => setTimeout(r, 1000));
        getResult = await server.getTransaction(sendResult.hash);
        attempts++;
      }

      if (getResult.status !== 'SUCCESS') {
        setError('Transaction did not complete successfully.');
        setLoading(false);
        return;
      }

      router.push('/pools');
    } catch (err) {
      console.error('Create pool error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Connect your Freighter wallet to create a pool</p>
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
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
        Create a grant pool
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Deposit XLM into a Soroban smart contract and accept contributor applications.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pool name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Stellar Dev Fund Q3"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={3}
            placeholder="What is this grant pool for?"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount (XLM)
          </label>
          <input
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            required
            min="1"
            placeholder="e.g. 1000"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Application deadline
          </label>
          <input
            name="deadline"
            type="date"
            value={form.deadline}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? 'Creating pool...' : 'Create pool'}
        </button>
      </form>
    </div>
  );
}