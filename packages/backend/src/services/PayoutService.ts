import prisma from '../config/database';
import { ethers } from 'ethers';
import { verifierWallet } from '../config/blockchain';
import logger from '../utils/logger';

const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_CONTRACT_ADDRESS || '';

const FEE_COLLECTOR_ABI = [
  'function executePayouts(uint256[] calldata projectIds, address[][] calldata yappers, uint256[][] calldata points) external',
  'function getBalance() external view returns (uint256)',
  'function currentRoundId() external view returns (uint256)',
  'function minPayoutThreshold() external view returns (uint256)',
  'event YapperPaid(address indexed yapper, uint256 indexed projectId, uint256 indexed roundId, uint256 points, uint256 amount)',
];

export class PayoutService {
  private feeCollector: ethers.Contract;

  constructor() {
    this.feeCollector = new ethers.Contract(
      FEE_COLLECTOR_ADDRESS,
      FEE_COLLECTOR_ABI,
      verifierWallet
    );
  }

  /**
   * Execute weekly payouts to all yappers
   */
  async executeWeeklyPayouts() {
    try {
      logger.info('Starting weekly payout execution...');

      // Check contract balance
      const balance = await this.feeCollector.getBalance();
      const minThreshold = await this.feeCollector.minPayoutThreshold();

      if (balance < minThreshold) {
        logger.warn(`Insufficient balance for payout. Balance: ${ethers.formatEther(balance)} ETH, Threshold: ${ethers.formatEther(minThreshold)} ETH`);
        return {
          success: false,
          message: 'Insufficient balance',
        };
      }

      // Get all active projects
      const projects = await prisma.project.findMany({
        where: { isActive: true },
        include: {
          leaderboard: {
            include: {
              entries: {
                where: {
                  weeklyPoints: {
                    gt: 0,
                  },
                },
                include: {
                  user: true,
                },
                orderBy: {
                  weeklyPoints: 'desc',
                },
              },
            },
          },
        },
      });

      // Prepare data for contract call
      const projectIds: number[] = [];
      const yappers: string[][] = [];
      const points: number[][] = [];

      let totalPoints = 0;
      let totalYappers = 0;

      for (const project of projects) {
        if (!project.leaderboard || project.leaderboard.entries.length === 0) {
          continue;
        }

        const projectYappers: string[] = [];
        const projectPoints: number[] = [];

        for (const entry of project.leaderboard.entries) {
          if (entry.weeklyPoints > 0) {
            projectYappers.push(entry.user.walletAddress);
            projectPoints.push(entry.weeklyPoints);
            totalPoints += entry.weeklyPoints;
            totalYappers++;
          }
        }

        if (projectYappers.length > 0) {
          projectIds.push(project.projectId);
          yappers.push(projectYappers);
          points.push(projectPoints);
        }
      }

      if (totalPoints === 0) {
        logger.info('No points to distribute');
        return {
          success: false,
          message: 'No points to distribute',
        };
      }

      logger.info(`Distributing to ${totalYappers} yappers across ${projectIds.length} projects. Total points: ${totalPoints}`);

      // Execute on-chain payout
      const tx = await this.feeCollector.executePayouts(projectIds, yappers, points);
      logger.info(`Payout transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      logger.info(`Payout transaction confirmed: ${tx.hash}`);

      // Get round ID from contract
      const roundId = await this.feeCollector.currentRoundId();

      // Calculate wei per point
      const weiPerPoint = balance / BigInt(totalPoints);

      // Create payout round in database
      const payoutRound = await prisma.payoutRound.create({
        data: {
          roundId: Number(roundId),
          totalAmount: balance.toString(),
          totalPoints,
          weiPerPoint: weiPerPoint.toString(),
          projectCount: projectIds.length,
          yapperCount: totalYappers,
          executedAt: new Date(),
        },
      });

      // Create individual payout records
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const project = projects.find((p) => p.projectId === projectId);

        if (!project) continue;

        for (let j = 0; j < yappers[i].length; j++) {
          const yapperAddress = yappers[i][j];
          const yapperPoints = points[i][j];
          const amount = BigInt(yapperPoints) * weiPerPoint;

          const user = await prisma.user.findUnique({
            where: { walletAddress: yapperAddress },
          });

          if (user) {
            await prisma.payout.create({
              data: {
                roundId: Number(roundId),
                userId: user.id,
                projectId: project.id,
                points: yapperPoints,
                amount: amount.toString(),
                txHash: tx.hash,
                status: 'COMPLETED',
              },
            });
          }
        }
      }

      // Reset weekly points for all entries
      await this.resetWeeklyPoints();

      logger.info(`Payout round ${roundId} completed successfully`);

      return {
        success: true,
        roundId: Number(roundId),
        totalAmount: ethers.formatEther(balance),
        totalYappers,
        totalPoints,
        txHash: tx.hash,
      };
    } catch (error) {
      logger.error('Error executing payouts:', error);
      throw error;
    }
  }

  /**
   * Reset weekly points for all leaderboard entries
   */
  async resetWeeklyPoints() {
    await prisma.leaderboardEntry.updateMany({
      data: {
        weeklyPoints: 0,
        lastPointsReset: new Date(),
      },
    });

    logger.info('Weekly points reset for all yappers');
  }

  /**
   * Get payout history for a user
   */
  async getUserPayouts(walletAddress: string) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return [];
    }

    return await prisma.payout.findMany({
      where: { userId: user.id },
      include: {
        round: true,
        project: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all payout rounds
   */
  async getPayoutRounds(limit: number = 10) {
    return await prisma.payoutRound.findMany({
      take: limit,
      orderBy: {
        executedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            payouts: true,
          },
        },
      },
    });
  }

  /**
   * Get detailed payout round
   */
  async getPayoutRoundDetails(roundId: number) {
    return await prisma.payoutRound.findUnique({
      where: { roundId },
      include: {
        payouts: {
          include: {
            user: {
              select: {
                walletAddress: true,
                xHandle: true,
                xDisplayName: true,
              },
            },
            project: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
          orderBy: {
            points: 'desc',
          },
        },
      },
    });
  }
}
