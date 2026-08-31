import { getLeaderboard } from '@/lib/api';

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const period = resolvedSearchParams.period === 'month' ? 'month' : 'all';
  const entries = await getLeaderboard(period);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Contributor leaderboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Top contributors ranked by total XLM received
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/leaderboard"
            className={`px-3 py-2 min-h-[44px] text-sm rounded-lg border transition-colors inline-flex items-center ${
              period === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            All time
          </a>
          <a
            href="/leaderboard?period=month"
            className={`px-3 py-2 min-h-[44px] text-sm rounded-lg border transition-colors inline-flex items-center ${
              period === 'month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            This month
          </a>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-mono text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          No contributions found yet.
        </div>
      ) : (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-mono uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-900">
            <div className="col-span-1">Rank</div>
            <div className="col-span-6">Address</div>
            <div className="col-span-3 text-right">Total XLM</div>
            <div className="col-span-2 text-right">Grants</div>
          </div>
          {entries.map((entry, idx) => (
            <div
              key={entry.address}
              className={`px-5 py-4 ${
                idx !== entries.length - 1
                  ? 'border-b border-gray-100 dark:border-gray-800'
                  : ''
              }`}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 text-sm font-semibold text-gray-500">
                  #{idx + 1}
                </div>
                <div className="col-span-6">
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${entry.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-blue-600 hover:underline"
                  >
                    {entry.address.slice(0, 6)}...{entry.address.slice(-6)}
                  </a>
                </div>
                <div className="col-span-3 text-right font-mono text-sm text-gray-900 dark:text-gray-100">
                  {entry.totalReceived.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="col-span-2 text-right font-mono text-sm text-gray-500">
                  {entry.grantCount}
                </div>
              </div>
              {/* Mobile row */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${entry.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {entry.address.slice(0, 6)}...{entry.address.slice(-6)}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between pl-5">
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {entry.totalReceived.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} XLM
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {entry.grantCount} grant{entry.grantCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
