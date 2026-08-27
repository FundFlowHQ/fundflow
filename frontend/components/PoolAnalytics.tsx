'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Application, GrantPool } from '@/types';

interface PoolAnalyticsProps {
  pool: GrantPool;
  applications: Application[];
}

export default function PoolAnalytics({ pool, applications }: PoolAnalyticsProps) {
  const stats = useMemo(() => {
    const totalApps = applications.length;
    const totalVotes = applications.reduce((sum, a) => sum + a.votes, 0);
    const avgRequested =
      totalApps > 0
        ? applications.reduce((sum, a) => sum + a.amount_requested, 0) / totalApps
        : 0;
    const distributed = pool.total_amount - pool.remaining_amount;
    const pctDistributed =
      pool.total_amount > 0 ? (distributed / pool.total_amount) * 100 : 0;

    return { totalApps, totalVotes, avgRequested, pctDistributed };
  }, [applications, pool]);

  const chartData = useMemo(() => {
    return applications.map((app, idx) => ({
      name: `#${app.id}`,
      amount: app.amount_requested / 10_000_000,
      votes: app.votes,
      approved: app.is_approved,
    }));
  }, [applications]);

  return (
    <div className="mt-6 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">
        Pool analytics
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-xs font-mono text-gray-400 mb-1">Applications</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {stats.totalApps}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-xs font-mono text-gray-400 mb-1">Total votes</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {stats.totalVotes}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-xs font-mono text-gray-400 mb-1">Avg requested</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {stats.avgRequested > 0
              ? `${(stats.avgRequested / 10_000_000).toFixed(0)} XLM`
              : '—'}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-xs font-mono text-gray-400 mb-1">Distributed</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {stats.pctDistributed.toFixed(1)}%
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-mono text-gray-400 mb-3">
            Application amounts (XLM)
          </p>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value} XLM`, 'Amount']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.approved ? '#22c55e' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              Pending
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500" />
              Distributed
            </div>
          </div>
        </div>
      )}

      {chartData.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          No applications yet.
        </p>
      )}
    </div>
  );
}
