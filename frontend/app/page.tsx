import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <section className="text-center py-20">
        <div className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-6">
          Stellar · Soroban · Web3
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 mb-6">
          Decentralized grant<br />
          <span className="text-blue-500">management on Stellar</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed px-2">
          Create grant pools, accept contributor applications, vote on proposals,
          and distribute funds automatically via Soroban smart contracts.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/pools"
            className="px-6 py-3 min-h-[44px] bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Explore pools
          </Link>
          <Link
            href="/pools/create"
            className="px-6 py-3 min-h-[44px] border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Create a pool →
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[
          {
            icon: '◈',
            title: 'Create grant pools',
            desc: 'Deposit XLM or tokens into a smart contract pool with a deadline and voting rules.',
          },
          {
            icon: '⟳',
            title: 'Apply for funding',
            desc: 'Contributors submit proposals on-chain. Applications are transparent and verifiable.',
          },
          {
            icon: '↗',
            title: 'Automatic distribution',
            desc: 'Funds are distributed directly to approved applicants via the Soroban contract.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950"
          >
            <div className="text-2xl text-blue-500 mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-2">
              {f.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 p-8 rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-1">
              Built on Stellar
            </h2>
            <p className="text-sm text-gray-500">
              ~$0.00001 per transaction · 5 second finality · Soroban smart contracts
            </p>
          </div>
          
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Learn about Stellar</a>
        </div>
      </section>
    </div>
  );
}