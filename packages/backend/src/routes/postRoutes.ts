import { Router } from 'express';
import { PostController } from '../controllers/PostController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const postController = new PostController();

// GET /api/v1/posts/:projectId - Get posts for a project
router.get('/:projectId', asyncHandler(postController.getProjectPosts.bind(postController)));

// POST /api/v1/posts/sync - Trigger post synchronization
router.post('/sync', asyncHandler(postController.syncPosts.bind(postController)));

// GET /api/v1/posts/:projectId/top - Get top posts by impressions
router.get('/:projectId/top', asyncHandler(postController.getTopPosts.bind(postController)));

export default router;
