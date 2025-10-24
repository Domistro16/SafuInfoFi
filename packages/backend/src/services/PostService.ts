import prisma from '../config/database';
import { TwitterService } from './TwitterService';
import { RelevanceService } from './RelevanceService';
import logger from '../utils/logger';

export class PostService {
  private twitterService: TwitterService;
  private relevanceService: RelevanceService;

  constructor() {
    this.twitterService = new TwitterService();
    this.relevanceService = new RelevanceService();
  }

  async getProjectPosts(
    projectId: string,
    options: {
      limit: number;
      offset: number;
      sortBy: string;
    }
  ) {
    const { limit, offset, sortBy } = options;

    const orderByMap: { [key: string]: any } = {
      createdAt: { createdAt: 'desc' },
      impressions: { impressions: 'desc' },
      relevance: { relevanceScore: 'desc' },
      engagement: { likes: 'desc' },
    };

    return await prisma.post.findMany({
      where: { projectId },
      take: limit,
      skip: offset,
      orderBy: orderByMap[sortBy] || { createdAt: 'desc' },
      include: {
        user: {
          select: {
            xHandle: true,
            xDisplayName: true,
            xProfileImage: true,
            walletAddress: true,
          },
        },
      },
    });
  }

  async syncProjectPosts(projectId: string) {
    logger.info(`Syncing posts for project ${projectId}...`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        keywords: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all linked users
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    let totalNewPosts = 0;

    for (const user of users) {
      try {
        // Fetch recent tweets from X
        const tweets = await this.twitterService.getUserTweets(
          user.xHandle,
          { maxResults: 100 }
        );

        for (const tweet of tweets) {
          // Check if tweet already exists
          const existing = await prisma.post.findUnique({
            where: { tweetId: tweet.id },
          });

          if (existing) {
            // Update metrics
            await prisma.post.update({
              where: { tweetId: tweet.id },
              data: {
                impressions: tweet.public_metrics.impression_count || 0,
                likes: tweet.public_metrics.like_count || 0,
                retweets: tweet.public_metrics.retweet_count || 0,
                replies: tweet.public_metrics.reply_count || 0,
                lastSyncedAt: new Date(),
              },
            });
          } else {
            // Calculate relevance to project
            const relevanceScore = await this.relevanceService.calculateRelevance(
              tweet.text,
              project.keywords.map((k) => ({
                keyword: k.keyword,
                weight: k.weight,
              }))
            );

            // Only save if relevance score > 0.3
            if (relevanceScore > 0.3) {
              await prisma.post.create({
                data: {
                  tweetId: tweet.id,
                  userId: user.id,
                  projectId: project.id,
                  content: tweet.text,
                  xHandle: user.xHandle,
                  createdAt: new Date(tweet.created_at),
                  impressions: tweet.public_metrics.impression_count || 0,
                  likes: tweet.public_metrics.like_count || 0,
                  retweets: tweet.public_metrics.retweet_count || 0,
                  replies: tweet.public_metrics.reply_count || 0,
                  relevanceScore,
                  hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
                  mentions: tweet.entities?.mentions?.map((m: any) => m.username) || [],
                  mediaUrls: tweet.entities?.urls?.map((u: any) => u.expanded_url) || [],
                  isRetweet: tweet.referenced_tweets?.some((ref: any) => ref.type === 'retweeted') || false,
                  isReply: tweet.referenced_tweets?.some((ref: any) => ref.type === 'replied_to') || false,
                  processedAt: new Date(),
                },
              });

              totalNewPosts++;
            }
          }
        }
      } catch (error) {
        logger.error(`Error syncing posts for user ${user.xHandle}:`, error);
      }
    }

    logger.info(`Synced ${totalNewPosts} new posts for project ${projectId}`);

    return {
      newPosts: totalNewPosts,
      project: project.name,
    };
  }

  async getTopPosts(projectId: string, limit: number, timeframe: string) {
    const timeframeMap: { [key: string]: number } = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
    };

    const days = timeframeMap[timeframe] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.post.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
        },
      },
      take: limit,
      orderBy: { impressions: 'desc' },
      include: {
        user: {
          select: {
            xHandle: true,
            xDisplayName: true,
            xProfileImage: true,
          },
        },
      },
    });
  }
}
