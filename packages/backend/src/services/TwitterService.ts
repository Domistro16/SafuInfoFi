import { TwitterApi } from 'twitter-api-v2';
import logger from '../utils/logger';

export class TwitterService {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    });
  }

  async getUserTweets(username: string, options: { maxResults?: number } = {}) {
    try {
      const { maxResults = 100 } = options;

      // Get user by username
      const user = await this.client.v2.userByUsername(username);

      if (!user.data) {
        logger.warn(`User not found: @${username}`);
        return [];
      }

      // Get user's tweets
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'entities',
          'referenced_tweets',
        ],
        exclude: ['retweets'], // Optional: exclude retweets
      });

      return tweets.data.data || [];
    } catch (error) {
      logger.error(`Error fetching tweets for @${username}:`, error);
      return [];
    }
  }

  async searchTweets(query: string, options: { maxResults?: number } = {}) {
    try {
      const { maxResults = 100 } = options;

      const tweets = await this.client.v2.search(query, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'entities',
          'author_id',
        ],
      });

      return tweets.data.data || [];
    } catch (error) {
      logger.error(`Error searching tweets with query "${query}":`, error);
      return [];
    }
  }

  async getUserInfo(username: string) {
    try {
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': [
          'created_at',
          'description',
          'public_metrics',
          'profile_image_url',
          'verified',
        ],
      });

      return user.data;
    } catch (error) {
      logger.error(`Error fetching user info for @${username}:`, error);
      return null;
    }
  }
}
