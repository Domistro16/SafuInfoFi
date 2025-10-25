import cron from 'node-cron';
import { PostService } from '../services/PostService';
import { LeaderboardService } from '../services/LeaderboardService';
import { ProjectService } from '../services/ProjectService';
import { PayoutService } from '../services/PayoutService';
import prisma from '../config/database';
import logger from '../utils/logger';

export class JobScheduler {
  private postService: PostService;
  private leaderboardService: LeaderboardService;
  private projectService: ProjectService;
  private payoutService: PayoutService;

  constructor() {
    this.postService = new PostService();
    this.leaderboardService = new LeaderboardService();
    this.projectService = new ProjectService();
    this.payoutService = new PayoutService();
  }

  start() {
    if (process.env.ENABLE_JOBS !== 'true') {
      logger.info('Job scheduler is disabled');
      return;
    }

    logger.info('Starting job scheduler...');

    // Sync posts every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      logger.info('Running post synchronization job...');
      await this.syncAllProjectPosts();
    });

    // Update leaderboards every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      logger.info('Running leaderboard update job...');
      await this.updateAllLeaderboards();
    });

    // Sync projects from blockchain every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Running project sync job...');
      await this.projectService.syncFromBlockchain();
    });

    // Sunday at 1:00 AM UTC - Execute payouts
    cron.schedule('0 1 * * 0', async () => {
      logger.info('Running Sunday payout execution...');
      await this.executePayouts();
    }, {
      timezone: 'UTC'
    });

    logger.info('Job scheduler started successfully');
  }

  private async syncAllProjectPosts() {
    try {
      const projects = await prisma.project.findMany({
        where: { isActive: true },
      });

      for (const project of projects) {
        try {
          await this.postService.syncProjectPosts(project.id);
        } catch (error) {
          logger.error(`Error syncing posts for project ${project.id}:`, error);
        }
      }

      logger.info('Post synchronization completed');
    } catch (error) {
      logger.error('Error in post synchronization job:', error);
    }
  }

  private async updateAllLeaderboards() {
    try {
      const leaderboards = await prisma.leaderboard.findMany({
        include: {
          project: {
            select: {
              isActive: true,
            },
          },
        },
      });

      for (const leaderboard of leaderboards) {
        if (!leaderboard.project.isActive) continue;

        try {
          await this.leaderboardService.updateLeaderboard(leaderboard.projectId);
        } catch (error) {
          logger.error(`Error updating leaderboard ${leaderboard.id}:`, error);
        }
      }

      logger.info('Leaderboard updates completed');
    } catch (error) {
      logger.error('Error in leaderboard update job:', error);
    }
  }

  private async executePayouts() {
    try {
      const result = await this.payoutService.executeWeeklyPayouts();

      if (result.success) {
        logger.info(`Payout round ${result.roundId} completed. Distributed ${result.totalAmount} ETH to ${result.totalYappers} yappers`);
      } else {
        logger.warn(`Payout execution failed: ${result.message}`);
      }
    } catch (error) {
      logger.error('Error in payout execution:', error);
    }
  }
}
