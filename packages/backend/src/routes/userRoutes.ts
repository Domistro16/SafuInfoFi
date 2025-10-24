import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const userController = new UserController();

// POST /api/v1/users/link-wallet - Link wallet to X account
router.post('/link-wallet', asyncHandler(userController.linkWallet.bind(userController)));

// GET /api/v1/users/:address - Get user profile
router.get('/:address', asyncHandler(userController.getUser.bind(userController)));

// POST /api/v1/users/verify-domain - Verify SAFU domain ownership
router.post('/verify-domain', asyncHandler(userController.verifyDomain.bind(userController)));

// GET /api/v1/users/:address/stats - Get user statistics
router.get('/:address/stats', asyncHandler(userController.getUserStats.bind(userController)));

export default router;
