'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '@/lib/wallet';
import { submitApplication } from '@/lib/api';
import { uploadToIPFS } from '@/lib/ipfs';

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const poolId = Number(params.poolId);
  const { address, isConnected, connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    proposal: '',
    amount_requested: '',
  });
  const [ipfsStatus, setIpfsStatus] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setIpfsStatus(null);

    let ipfsHash: string | null = null;

    // Upload proposal to IPFS
    setIpfsStatus('Uploading proposal to IPFS...');
    ipfsHash = await uploadToIPFS(
      form.proposal,
      `grant-proposal-pool${poolId}-${Date.now()}`
    );

    if (ipfsHash) {
      setIpfsStatus(`Stored on IPFS: ${ipfsHash.slice(0, 12)}...`);
    } else {
      setIpfsStatus('IPFS upload skipped (keys not configured). Submitting on-chain only.');
    }

    const result = await submitApplication({
      pool_id: poolId,
      applicant: address,
      proposal: form.proposal,
      amount_requested: Number(form.amount_requested) * 10_000_000,
      ipfs_hash: ipfsHash || undefined,
    });

    setLoading(false);
    setIpfsStatus(null);
    if (result) router.push(`/pools/${poolId}`);
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Connect your Freighter wallet to apply</p>
        <button
          onClick={connect}
          className="px-6 py-3 min-h-[44px] bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Connect Freighter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full">
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
        Apply for grant
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Pool #{poolId} — Submit your proposal on-chain.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Proposal
          </label>
          <textarea
            name="proposal"
            value={form.proposal}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Describe what you will build, your timeline, and expected outcomes..."
            className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Long-form proposals are stored on IPFS for permanent, decentralized access.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount requested (XLM)
          </label>
          <input
            name="amount_requested"
            type="number"
            value={form.amount_requested}
            onChange={handleChange}
            required
            min="1"
            placeholder="e.g. 500"
            className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {ipfsStatus && (
          <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-sm font-mono">
            {ipfsStatus}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 min-h-[44px] bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}
