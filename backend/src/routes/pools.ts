import { Router, Request, Response } from 'express';
import {
  getPool,
  getPoolCount,
  buildCreatePoolTransaction,
  buildWithdrawTransaction,
  getPoolApplications,
  isSupportedToken,
  SUPPORTED_TOKENS,
} from '../services/stellar';

const router = Router();

function serializeBigInts(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// GET /pools — fetch all pools
router.get('/', async (req: Request, res: Response) => {
  try {
    const count = await getPoolCount();
    const pools = [];

    for (let i = 1; i <= count; i++) {
      const pool = await getPool(i);
      if (pool) pools.push(pool);
    }

    res.json(serializeBigInts(pools));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch pools' });
  }
});

// GET /pools/:id — fetch single pool
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool(Number(req.params.id));
    if (!pool) return res.status(404).json({ error: 'Pool not found' });
    res.json(serializeBigInts(pool));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch pool' });
  }
});

// GET /pools/:id/applications — fetch applications for a pool
router.get('/:id/applications', async (req: Request, res: Response) => {
  try {
    const applications = await getPoolApplications(Number(req.params.id));
    res.json(serializeBigInts(applications));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /pools — create pool (returns unsigned tx XDR for frontend to sign)
// Optional body field "token": "XLM" (default) or "USDC"
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, amount, deadline, creator, token } = req.body;

    if (!name || !description || !amount || !deadline || !creator) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const selectedToken = token ?? 'XLM';
    if (!isSupportedToken(selectedToken)) {
      return res.status(400).json({
        error: `Unsupported token. Supported tokens: ${SUPPORTED_TOKENS.join(', ')}`,
      });
    }

    const xdr = await buildCreatePoolTransaction({
      name,
      description,
      amount,
      deadline,
      creator,
      token: selectedToken,
    });

    res.json({ xdr });
  } catch (e) {
    console.error('createPool error:', e);
    res.status(500).json({ error: 'Failed to build create pool transaction' });
  }
});

// POST /pools/:id/withdraw — withdraw unclaimed funds after deadline (returns unsigned tx XDR for frontend to sign)
router.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const { caller } = req.body;
    const poolId = Number(req.params.id);

    if (!caller) {
      return res.status(400).json({ error: 'Missing required field: caller' });
    }

    const xdr = await buildWithdrawTransaction({ poolId, caller });

    res.json({ xdr });
  } catch (e) {
    console.error('withdrawPool error:', e);
    res.status(500).json({ error: 'Failed to build withdraw transaction' });
  }
});

export default router;