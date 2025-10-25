import { Router } from 'express';
import { PayoutController } from '../controllers/PayoutController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const payoutController = new PayoutController();

// GET /api/v1/payouts/rounds - List payout rounds
router.get('/rounds', asyncHandler(payoutController.getPayoutRounds.bind(payoutController)));

// GET /api/v1/payouts/rounds/:roundId - Get payout round details
router.get('/rounds/:roundId', asyncHandler(payoutController.getPayoutRoundDetails.bind(payoutController)));

// GET /api/v1/payouts/user/:address - Get user payouts
router.get('/user/:address', asyncHandler(payoutController.getUserPayouts.bind(payoutController)));

// POST /api/v1/payouts/trigger - Manually trigger payout (admin only)
router.post('/trigger', asyncHandler(payoutController.triggerPayout.bind(payoutController)));

export default router;
