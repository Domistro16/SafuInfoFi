import logger from '../utils/logger';

interface Keyword {
  keyword: string;
  weight: number;
}

export class RelevanceService {
  /**
   * Calculate relevance score of a post to a project based on keywords
   * @param text Post text
   * @param keywords Project keywords with weights
   * @returns Relevance score (0-1)
   */
  async calculateRelevance(text: string, keywords: Keyword[]): Promise<number> {
    try {
      const lowerText = text.toLowerCase();
      let totalScore = 0;
      let maxPossibleScore = 0;

      for (const { keyword, weight } of keywords) {
        maxPossibleScore += weight;

        // Check for exact match
        if (lowerText.includes(keyword.toLowerCase())) {
          totalScore += weight;
        }
      }

      // Normalize to 0-1 range
      const normalizedScore = maxPossibleScore > 0
        ? totalScore / maxPossibleScore
        : 0;

      return Math.min(normalizedScore, 1);
    } catch (error) {
      logger.error('Error calculating relevance:', error);
      return 0;
    }
  }

  /**
   * Enhanced relevance calculation with sentiment and context analysis
   * Can be extended with AI/NLP services like OpenAI
   */
  async calculateAdvancedRelevance(
    text: string,
    keywords: Keyword[],
    projectContext?: string
  ): Promise<{
    score: number;
    sentiment: number;
    matchedKeywords: string[];
  }> {
    // Basic keyword matching
    const basicScore = await this.calculateRelevance(text, keywords);

    const lowerText = text.toLowerCase();
    const matchedKeywords = keywords
      .filter((kw) => lowerText.includes(kw.keyword.toLowerCase()))
      .map((kw) => kw.keyword);

    // Sentiment analysis (basic implementation)
    const sentiment = this.analyzeSentiment(text);

    // TODO: Integrate with OpenAI or other NLP service for advanced analysis
    // Example:
    // if (process.env.OPENAI_API_KEY) {
    //   const aiScore = await this.getAIRelevanceScore(text, projectContext);
    //   return {
    //     score: (basicScore + aiScore) / 2,
    //     sentiment,
    //     matchedKeywords,
    //   };
    // }

    return {
      score: basicScore,
      sentiment,
      matchedKeywords,
    };
  }

  /**
   * Basic sentiment analysis
   * Returns a score from -1 (negative) to 1 (positive)
   */
  private analyzeSentiment(text: string): number {
    const positiveWords = [
      'good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'best',
      'bullish', 'moon', 'pump', 'gain', 'profit', 'winner', 'success',
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'scam',
      'bearish', 'dump', 'loss', 'rug', 'fail', 'crash',
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 1;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 1;
    });

    // Normalize to -1 to 1 range
    const maxScore = Math.max(positiveWords.length, negativeWords.length);
    return Math.max(-1, Math.min(1, score / maxScore));
  }

  /**
   * Extract topics from text
   */
  extractTopics(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    const mentions = text.match(/@\w+/g) || [];

    return [...hashtags, ...mentions].map((t) => t.toLowerCase());
  }
}
