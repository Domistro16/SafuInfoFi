import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { provider } from '../config/blockchain';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check blockchain
    const blockNumber = await provider.getBlockNumber();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        blockchain: 'connected',
        blockNumber,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
