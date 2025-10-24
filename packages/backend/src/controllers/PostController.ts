import { Request, Response } from 'express';
import { PostService } from '../services/PostService';
import { AppError } from '../middleware/errorHandler';

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  async getProjectPosts(req: Request, res: Response) {
    const { projectId } = req.params;
    const { limit = 50, offset = 0, sortBy = 'createdAt' } = req.query;

    const posts = await this.postService.getProjectPosts(
      projectId,
      {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
      }
    );

    res.json({
      data: posts,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  }

  async syncPosts(req: Request, res: Response) {
    const { projectId } = req.body;

    if (!projectId) {
      throw new AppError('Project ID required', 400);
    }

    await this.postService.syncProjectPosts(projectId);

    res.json({
      message: 'Post synchronization triggered successfully',
    });
  }

  async getTopPosts(req: Request, res: Response) {
    const { projectId } = req.params;
    const { limit = 10, timeframe = '7d' } = req.query;

    const posts = await this.postService.getTopPosts(
      projectId,
      parseInt(limit as string),
      timeframe as string
    );

    res.json({ data: posts });
  }
}
