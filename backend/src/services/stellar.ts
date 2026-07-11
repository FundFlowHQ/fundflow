import * as StellarSdk from '@stellar/stellar-sdk';

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';

export function getContractId() {
  return process.env.CONTRACT_ID || '';
}

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

export const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
export const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

export async function getPoolCount(): Promise<number> {
  try {
    const contract = new StellarSdk.Contract(getContractId());
    const account = await server.getAccount(process.env.ADMIN_ADDRESS || '');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('pool_count'))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result)) {
      return StellarSdk.scValToNative((result as any).result.retval) as number;
    }
    return 0;
  } catch (e) {
    console.error('getPoolCount error:', e);
    return 0;
  }
}

export async function getPool(poolId: number) {
  try {
    const contract = new StellarSdk.Contract(getContractId());
    const account = await server.getAccount(process.env.ADMIN_ADDRESS || '');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_pool',
          StellarSdk.nativeToScVal(poolId, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    return StellarSdk.scValToNative((result as any).result.retval);
    return null;
  } catch (e) {
    console.error('getPool error:', e);
    return null;
  }
}

export async function buildCreatePoolTransaction(params: {
  name: string;
  description: string;
  amount: number;
  deadline: number;
  creator: string;
}) {
  const cid = getContractId();
  const contract = new StellarSdk.Contract(cid);
  const account = await server.getAccount(params.creator);

  const nativeTokenId = StellarSdk.Asset.native().contractId(NETWORK_PASSPHRASE);
  console.log('nativeTokenId:', nativeTokenId);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'create_pool',
        StellarSdk.nativeToScVal(params.creator, { type: 'address' }),
        StellarSdk.nativeToScVal(params.name, { type: 'string' }),
        StellarSdk.nativeToScVal(params.description, { type: 'string' }),
        StellarSdk.nativeToScVal(nativeTokenId, { type: 'address' }),
        StellarSdk.nativeToScVal(params.amount, { type: 'i128' }),
        StellarSdk.nativeToScVal(params.deadline, { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function getLeaderboard(period: 'all' | 'month' = 'all') {
  try {
    const base = `${HORIZON_URL}/payments?limit=100&order=desc`;
    const url = new URL(base);
    if (period === 'month') {
      const oneMonthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      url.searchParams.set('min_time', String(oneMonthAgo));
    }

    const allPayments: any[] = [];
    let cursor: string | undefined = undefined;
    let currentUrl = url.toString();

    while (currentUrl) {
      const res = await fetch(currentUrl);
      const json = (await res.json()) as any;
      allPayments.push(...(json._embedded?.records || []));
      const nextLink = json._embedded?.records && json._links?.next?.href;
      if (!nextLink) break;
      currentUrl = nextLink.startsWith('http') ? nextLink : `${HORIZON_URL}${nextLink}`;
    }

    const contributions = new Map<string, { totalReceived: number; count: number }>();
    for (const payment of allPayments) {
      if (!payment.to || payment.type !== 'payment') continue;
      const recipient = payment.to;
      const amount = parseFloat(payment.amount || '0');
      const existing = contributions.get(recipient) || { totalReceived: 0, count: 0 };
      contributions.set(recipient, {
        totalReceived: existing.totalReceived + amount,
        count: existing.count + 1,
      });
    }

    return Array.from(contributions.entries())
      .map(([address, entry]) => ({
        address,
        totalReceived: entry.totalReceived,
        grantCount: entry.count,
      }))
      .sort((a, b) => b.totalReceived - a.totalReceived || b.grantCount - a.grantCount);
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return [];
  }
}

export async function getApplication(appId: number) {
  try {
    const contract = new StellarSdk.Contract(getContractId());
    const account = await server.getAccount(process.env.ADMIN_ADDRESS || '');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_application',
          StellarSdk.nativeToScVal(appId, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(result) && (result as any).result) {
      return StellarSdk.scValToNative((result as any).result.retval);
    }
    return null;
  } catch (e) {
    console.error('getApplication error:', e);
    return null;
  }
}