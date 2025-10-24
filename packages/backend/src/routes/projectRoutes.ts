import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const projectController = new ProjectController();

// GET /api/v1/projects - List all projects
router.get('/', asyncHandler(projectController.listProjects.bind(projectController)));

// GET /api/v1/projects/:id - Get project by ID
router.get('/:id', asyncHandler(projectController.getProject.bind(projectController)));

// POST /api/v1/projects/sync - Sync projects from blockchain
router.post('/sync', asyncHandler(projectController.syncProjects.bind(projectController)));

// GET /api/v1/projects/:id/stats - Get project statistics
router.get('/:id/stats', asyncHandler(projectController.getProjectStats.bind(projectController)));

export default router;
