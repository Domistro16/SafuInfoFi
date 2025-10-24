import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { AppError } from '../middleware/errorHandler';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  async listProjects(req: Request, res: Response) {
    const { active, limit = 50, offset = 0 } = req.query;

    const projects = await this.projectService.listProjects({
      active: active === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      data: projects,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  }

  async getProject(req: Request, res: Response) {
    const { id } = req.params;

    const project = await this.projectService.getProjectById(id);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json({ data: project });
  }

  async syncProjects(req: Request, res: Response) {
    const result = await this.projectService.syncFromBlockchain();

    res.json({
      message: 'Projects synced successfully',
      data: result,
    });
  }

  async getProjectStats(req: Request, res: Response) {
    const { id } = req.params;

    const stats = await this.projectService.getProjectStats(id);

    if (!stats) {
      throw new AppError('Project not found', 404);
    }

    res.json({ data: stats });
  }
}
