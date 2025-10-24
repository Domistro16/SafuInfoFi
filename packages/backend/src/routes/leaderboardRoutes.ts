import { Router } from 'express';
import { LeaderboardController } from '../controllers/LeaderboardController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const leaderboardController = new LeaderboardController();

// GET /api/v1/leaderboards/:projectId - Get project leaderboard
router.get('/:projectId', asyncHandler(leaderboardController.getLeaderboard.bind(leaderboardController)));

// GET /api/v1/leaderboards/:projectId/user/:address - Get user ranking in project
router.get('/:projectId/user/:address', asyncHandler(leaderboardController.getUserRanking.bind(leaderboardController)));

// POST /api/v1/leaderboards/:projectId/update - Trigger leaderboard update
router.post('/:projectId/update', asyncHandler(leaderboardController.updateLeaderboard.bind(leaderboardController)));

export default router;
