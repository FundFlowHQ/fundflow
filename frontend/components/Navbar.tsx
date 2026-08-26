'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/lib/wallet';
import { getXLMBalance } from '@/lib/stellar';

export default function Navbar() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['xlm-balance', address],
    queryFn: () => (address ? getXLMBalance(address) : null),
    enabled: !!address,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, refetchBalance]);

  // Close mobile menu on route change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const short = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            ◈ FundFlow
          </Link>
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-6 text-sm text-gray-500">
            <Link href="/pools" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Pools
            </Link>
            <Link href="/leaderboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Leaderboard
            </Link>
            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Wallet connection status indicator */}
          <div className="relative group flex items-center justify-center w-3 h-3">
            {isConnecting && (
              <span className="absolute inline-block w-3 h-3 rounded-full bg-yellow-400 animate-ping opacity-75" />
            )}
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full transition-colors ${
                isConnecting
                  ? 'bg-yellow-400'
                  : isConnected
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              }`}
            />
            {isConnected && address && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-900 text-white text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {address}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>

          {/* Desktop wallet controls */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected ? (
              <>
                <span className="text-sm font-mono text-gray-500">{short}</span>
                {balanceLoading ? (
                  <span className="text-sm font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded animate-pulse">
                    ···
                  </span>
                ) : (
                  <span className="text-sm font-mono text-blue-600">
                    {balance ? `${balance} XLM` : '0 XLM'}
                  </span>
                )}
                <button
                  onClick={disconnect}
                  className="text-sm px-3 py-1.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="text-sm px-4 py-2 min-h-[44px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Freighter'}
              </button>
            )}
          </div>

          {/* Hamburger menu button (mobile only) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center w-11 h-11 min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="px-4 py-4 flex flex-col gap-3">
            <Link
              href="/pools"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 min-h-[44px] flex items-center"
            >
              Pools
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 min-h-[44px] flex items-center"
            >
              Leaderboard
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 min-h-[44px] flex items-center"
            >
              Dashboard
            </Link>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm font-mono text-gray-500">{short}</span>
                  {balanceLoading ? (
                    <span className="text-sm font-mono text-gray-400 animate-pulse">···</span>
                  ) : (
                    <span className="text-sm font-mono text-blue-600">
                      {balance ? `${balance} XLM` : '0 XLM'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { disconnect(); setMenuOpen(false); }}
                  className="w-full text-sm text-left px-3 py-2.5 min-h-[44px] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => { connect(); setMenuOpen(false); }}
                disabled={isConnecting}
                className="w-full text-sm px-4 py-2.5 min-h-[44px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Freighter'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
