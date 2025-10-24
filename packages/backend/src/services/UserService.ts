import prisma from '../config/database';
import { walletLinkerContract, verifierWallet } from '../config/blockchain';
import { ethers } from 'ethers';
import logger from '../utils/logger';
import axios from 'axios';

export class UserService {
  async createWalletLink(
    walletAddress: string,
    xHandle: string,
    safuDomain: string
  ) {
    // Verify SAFU domain
    const isValidDomain = await this.verifySafuDomain(walletAddress, safuDomain);
    if (!isValidDomain) {
      throw new Error('Invalid SAFU domain for this wallet');
    }

    // Get nonce from contract
    const nonce = await walletLinkerContract.nonces(walletAddress);

    // Create signature for verification
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'string', 'string', 'uint256'],
      [walletAddress, xHandle, safuDomain, nonce]
    );

    const signature = await verifierWallet.signMessage(
      ethers.getBytes(messageHash)
    );

    // Create user in database
    const user = await prisma.user.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        xHandle,
        safuDomain,
        linkedAt: new Date(),
        isActive: true,
      },
    });

    logger.info(`Wallet linked: ${walletAddress} -> @${xHandle}`);

    return {
      user,
      signature,
      nonce: nonce.toString(),
    };
  }

  async getUserByAddress(address: string) {
    return await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      include: {
        _count: {
          select: {
            posts: true,
            rankings: true,
          },
        },
      },
    });
  }

  async verifySafuDomain(
    walletAddress: string,
    safuDomain: string
  ): Promise<boolean> {
    try {
      // Check if domain ends with .safu
      if (!safuDomain.endsWith('.safu')) {
        return false;
      }

      // Call SAFU domain resolver API
      const resolverUrl = process.env.SAFU_DOMAIN_RESOLVER_URL;
      if (!resolverUrl) {
        logger.warn('SAFU_DOMAIN_RESOLVER_URL not configured, skipping verification');
        return true; // Allow in development
      }

      const response = await axios.get(`${resolverUrl}/${safuDomain}`);

      if (response.data && response.data.owner) {
        const domainOwner = response.data.owner.toLowerCase();
        return domainOwner === walletAddress.toLowerCase();
      }

      return false;
    } catch (error) {
      logger.error('Error verifying SAFU domain:', error);
      return false;
    }
  }

  async getUserStats(address: string) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const postStats = await prisma.post.aggregate({
      where: { userId: user.id },
      _sum: {
        impressions: true,
        likes: true,
        retweets: true,
        replies: true,
      },
      _count: true,
    });

    const rankings = await prisma.leaderboardEntry.findMany({
      where: { userId: user.id },
      include: {
        leaderboard: {
          include: {
            project: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    return {
      user: {
        walletAddress: user.walletAddress,
        xHandle: user.xHandle,
        safuDomain: user.safuDomain,
        linkedAt: user.linkedAt,
      },
      stats: {
        totalPosts: postStats._count,
        totalImpressions: postStats._sum.impressions || 0,
        totalLikes: postStats._sum.likes || 0,
        totalRetweets: postStats._sum.retweets || 0,
        totalReplies: postStats._sum.replies || 0,
        participatingProjects: rankings.length,
      },
      rankings: rankings.map((r) => ({
        project: r.leaderboard.project.name,
        symbol: r.leaderboard.project.symbol,
        rank: r.rank,
        score: r.score,
        totalPosts: r.totalPosts,
        totalImpressions: r.totalImpressions,
      })),
    };
  }

  async updateXAccountInfo(userId: string, xData: any) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        xUserId: xData.id,
        xDisplayName: xData.name,
        xProfileImage: xData.profile_image_url,
        xFollowers: xData.public_metrics?.followers_count || 0,
        xVerified: xData.verified || false,
      },
    });
  }
}
