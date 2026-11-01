import { Router, Request, Response } from 'express';
import { getApplication } from '../services/stellar';

const router = Router();

// GET /applications/:id — fetch single application
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const app = await getApplication(Number(req.params.id));
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json(app);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /applications — submit application
router.post('/', async (req: Request, res: Response) => {
  try {
    const { pool_id, applicant, proposal, amount_requested, ipfs_hash } = req.body;

    if (!pool_id || !applicant || !proposal || !amount_requested) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    res.json({
      message: 'Application submission transaction ready',
      data: { pool_id, applicant, proposal, amount_requested, ipfs_hash: ipfs_hash || null },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// POST /applications/:id/vote — vote on application
router.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    const { voter } = req.body;
    const appId = Number(req.params.id);

    if (!voter) {
      return res.status(400).json({ error: 'Voter address required' });
    }

    res.json({
      message: 'Vote transaction ready',
      data: { appId, voter },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /applications/:id/distribute — distribute funds
router.post('/:id/distribute', async (req: Request, res: Response) => {
  try {
    const { caller } = req.body;
    const appId = Number(req.params.id);

    if (!caller) {
      return res.status(400).json({ error: 'Caller address required' });
    }

    res.json({
      message: 'Distribution transaction ready',
      data: { appId, caller },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to distribute' });
  }
});

export default router;