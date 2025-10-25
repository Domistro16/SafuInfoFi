import prisma from '../config/database';
import { registryContract } from '../config/blockchain';
import logger from '../utils/logger';

export class ProjectService {
  async listProjects(options: {
    active?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { active, limit = 50, offset = 0 } = options;

    return await prisma.project.findMany({
      where: active !== undefined ? { isActive: active } : {},
      take: limit,
      skip: offset,
      orderBy: { registeredAt: 'desc' },
      include: {
        leaderboard: {
          select: {
            lastUpdated: true,
            _count: {
              select: { entries: true },
            },
          },
        },
      },
    });
  }

  async getProjectById(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        leaderboard: {
          include: {
            entries: {
              take: 10,
              orderBy: { rank: 'asc' },
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
            },
          },
        },
        keywords: true,
      },
    });
  }

  async syncFromBlockchain() {
    try {
      logger.info('Starting project sync from blockchain...');

      const projectCount = await registryContract.projectCount();
      const syncedProjects = [];

      for (let i = 1; i <= Number(projectCount); i++) {
        const projectData = await registryContract.projects(i);

        const existingProject = await prisma.project.findUnique({
          where: { projectId: i },
        });

        if (existingProject) {
          // Update existing project
          await prisma.project.update({
            where: { projectId: i },
            data: {
              isActive: projectData.isActive,
            },
          });
        } else {
          // Create new project
          const newProject = await prisma.project.create({
            data: {
              projectId: i,
              tokenAddress: projectData.tokenAddress,
              ownerAddress: projectData.ownerAddress,
              name: projectData.name,
              symbol: projectData.symbol,
              metadataURI: projectData.metadataURI,
              registeredAt: new Date(Number(projectData.registeredAt) * 1000),
              isActive: projectData.isActive,
            },
          });

          // Create leaderboard for new project
          await prisma.leaderboard.create({
            data: {
              projectId: newProject.id,
            },
          });

          // Add default keywords
          await this.addDefaultKeywords(newProject.id, projectData.name, projectData.symbol);
        }

        syncedProjects.push(i);
      }

      logger.info(`Synced ${syncedProjects.length} projects from blockchain`);

      return {
        synced: syncedProjects.length,
        projectIds: syncedProjects,
      };
    } catch (error) {
      logger.error('Error syncing projects from blockchain:', error);
      throw error;
    }
  }

  async addDefaultKeywords(projectId: string, name: string, symbol: string) {
    const keywords = [
      { keyword: name.toLowerCase(), weight: 2.0, type: 'PROJECT_NAME' },
      { keyword: symbol.toLowerCase(), weight: 2.5, type: 'TOKEN_SYMBOL' },
      { keyword: `$${symbol.toLowerCase()}`, weight: 3.0, type: 'TOKEN_SYMBOL' },
      { keyword: `#${symbol.toLowerCase()}`, weight: 1.5, type: 'HASHTAG' },
    ];

    await prisma.projectKeyword.createMany({
      data: keywords.map((kw) => ({
        projectId,
        keyword: kw.keyword,
        weight: kw.weight,
        type: kw.type as any,
      })),
      skipDuplicates: true,
    });
  }

  async getProjectStats(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
        leaderboard: {
          include: {
            _count: {
              select: {
                entries: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    const totalImpressions = await prisma.post.aggregate({
      where: { projectId },
      _sum: {
        impressions: true,
        likes: true,
        retweets: true,
      },
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        symbol: project.symbol,
      },
      stats: {
        totalPosts: project._count.posts,
        totalParticipants: project.leaderboard?._count.entries || 0,
        totalImpressions: totalImpressions._sum.impressions || 0,
        totalLikes: totalImpressions._sum.likes || 0,
        totalRetweets: totalImpressions._sum.retweets || 0,
      },
    };
  }
}
