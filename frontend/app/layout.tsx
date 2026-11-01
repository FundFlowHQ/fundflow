import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FundFlow — Decentralized Grant Management on Stellar',
  description: 'Create and manage grant pools, apply for funding, and distribute grants via Soroban smart contracts on Stellar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}