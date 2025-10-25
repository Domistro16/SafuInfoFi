import { Request, Response } from 'express';
import { PayoutService } from '../services/PayoutService';
import { AppError } from '../middleware/errorHandler';

export class PayoutController {
  private payoutService: PayoutService;

  constructor() {
    this.payoutService = new PayoutService();
  }

  async getUserPayouts(req: Request, res: Response) {
    const { address } = req.params;

    const payouts = await this.payoutService.getUserPayouts(address);

    res.json({ data: payouts });
  }

  async getPayoutRounds(req: Request, res: Response) {
    const { limit = 10 } = req.query;

    const rounds = await this.payoutService.getPayoutRounds(parseInt(limit as string));

    res.json({ data: rounds });
  }

  async getPayoutRoundDetails(req: Request, res: Response) {
    const { roundId } = req.params;

    const round = await this.payoutService.getPayoutRoundDetails(parseInt(roundId));

    if (!round) {
      throw new AppError('Payout round not found', 404);
    }

    res.json({ data: round });
  }

  async triggerPayout(req: Request, res: Response) {
    // Only allow admin to manually trigger payouts
    const result = await this.payoutService.executeWeeklyPayouts();

    res.json({
      message: result.success ? 'Payout executed successfully' : 'Payout failed',
      data: result,
    });
  }
}
