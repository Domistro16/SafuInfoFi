import { Request, Response } from 'express';
import { LeaderboardService } from '../services/LeaderboardService';
import { AppError } from '../middleware/errorHandler';

export class LeaderboardController {
  private leaderboardService: LeaderboardService;

  constructor() {
    this.leaderboardService = new LeaderboardService();
  }

  async getLeaderboard(req: Request, res: Response) {
    const { projectId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const leaderboard = await this.leaderboardService.getLeaderboard(
      projectId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    if (!leaderboard) {
      throw new AppError('Leaderboard not found', 404);
    }

    res.json({
      data: leaderboard,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  }

  async getUserRanking(req: Request, res: Response) {
    const { projectId, address } = req.params;

    const ranking = await this.leaderboardService.getUserRanking(
      projectId,
      address
    );

    if (!ranking) {
      throw new AppError('User ranking not found', 404);
    }

    res.json({ data: ranking });
  }

  async updateLeaderboard(req: Request, res: Response) {
    const { projectId } = req.params;

    await this.leaderboardService.updateLeaderboard(projectId);

    res.json({
      message: 'Leaderboard update triggered successfully',
    });
  }
}
