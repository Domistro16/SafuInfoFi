import prisma from '../config/database';
import logger from '../utils/logger';

export class LeaderboardService {
  async getLeaderboard(projectId: string, limit: number = 100, offset: number = 0) {
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            name: true,
            symbol: true,
            tokenAddress: true,
          },
        },
        entries: {
          take: limit,
          skip: offset,
          orderBy: { rank: 'asc' },
          include: {
            user: {
              select: {
                walletAddress: true,
                xHandle: true,
                xDisplayName: true,
                xProfileImage: true,
                xFollowers: true,
                safuDomain: true,
              },
            },
          },
        },
      },
    });

    return leaderboard;
  }

  async getUserRanking(projectId: string, walletAddress: string) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { projectId },
    });

    if (!leaderboard) {
      return null;
    }

    const entry = await prisma.leaderboardEntry.findUnique({
      where: {
        leaderboardId_userId: {
          leaderboardId: leaderboard.id,
          userId: user.id,
        },
      },
      include: {
        user: {
          select: {
            walletAddress: true,
            xHandle: true,
            xDisplayName: true,
            xProfileImage: true,
          },
        },
      },
    });

    return entry;
  }

  async updateLeaderboard(projectId: string) {
    logger.info(`Updating leaderboard for project ${projectId}...`);

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { projectId },
    });

    if (!leaderboard) {
      throw new Error('Leaderboard not found');
    }

    // Get all posts for this project
    const posts = await prisma.post.findMany({
      where: { projectId },
      include: {
        user: true,
      },
    });

    // Group posts by user and calculate scores
    const userScores = new Map<string, {
      userId: string;
      totalPosts: number;
      totalImpressions: number;
      totalEngagement: number;
      relevanceScore: number;
      engagementScore: number;
    }>();

    for (const post of posts) {
      if (!post.userId) continue;

      const existing = userScores.get(post.userId) || {
        userId: post.userId,
        totalPosts: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        relevanceScore: 0,
        engagementScore: 0,
      };

      existing.totalPosts++;
      existing.totalImpressions += post.impressions;
      existing.totalEngagement += post.likes + post.retweets + post.replies;
      existing.relevanceScore += post.relevanceScore || 0;

      userScores.set(post.userId, existing);
    }

    // Calculate final scores and rank users
    const scoredUsers = Array.from(userScores.values()).map((user) => {
      const avgRelevance = user.relevanceScore / user.totalPosts;
      const avgImpressions = user.totalImpressions / user.totalPosts;

      // Scoring formula:
      // 60% relevance score + 40% normalized impressions
      const normalizedImpressions = Math.log10(avgImpressions + 1) / 10; // Normalize to 0-1 range
      const finalScore = (avgRelevance * 0.6) + (normalizedImpressions * 0.4);

      return {
        ...user,
        engagementScore: normalizedImpressions,
        score: finalScore,
      };
    });

    // Sort by score descending
    scoredUsers.sort((a, b) => b.score - a.score);

    // Delete existing entries
    await prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId: leaderboard.id },
    });

    // Create new entries with ranks
    const entries = scoredUsers.map((user, index) => ({
      leaderboardId: leaderboard.id,
      userId: user.userId,
      rank: index + 1,
      score: user.score,
      totalPosts: user.totalPosts,
      totalImpressions: user.totalImpressions,
      totalEngagement: user.totalEngagement,
      relevanceScore: user.relevanceScore / user.totalPosts,
      engagementScore: user.engagementScore,
      lastCalculated: new Date(),
    }));

    if (entries.length > 0) {
      await prisma.leaderboardEntry.createMany({
        data: entries,
      });
    }

    // Update leaderboard timestamp
    await prisma.leaderboard.update({
      where: { id: leaderboard.id },
      data: { lastUpdated: new Date() },
    });

    logger.info(`Leaderboard updated for project ${projectId}. ${entries.length} users ranked.`);

    return {
      totalUsers: entries.length,
      lastUpdated: new Date(),
    };
  }
}
