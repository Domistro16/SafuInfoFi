import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { AppError } from '../middleware/errorHandler';
import Joi from 'joi';

const linkWalletSchema = Joi.object({
  walletAddress: Joi.string().required(),
  xHandle: Joi.string().required(),
  safuDomain: Joi.string().required(),
});

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async linkWallet(req: Request, res: Response) {
    const { error, value } = linkWalletSchema.validate(req.body);

    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { walletAddress, xHandle, safuDomain } = value;

    const result = await this.userService.createWalletLink(
      walletAddress,
      xHandle,
      safuDomain
    );

    res.status(201).json({
      message: 'Wallet linked successfully',
      data: result,
    });
  }

  async getUser(req: Request, res: Response) {
    const { address } = req.params;

    const user = await this.userService.getUserByAddress(address);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ data: user });
  }

  async verifyDomain(req: Request, res: Response) {
    const { walletAddress, safuDomain } = req.body;

    if (!walletAddress || !safuDomain) {
      throw new AppError('Wallet address and SAFU domain required', 400);
    }

    const isValid = await this.userService.verifySafuDomain(
      walletAddress,
      safuDomain
    );

    res.json({
      data: {
        isValid,
        walletAddress,
        safuDomain,
      },
    });
  }

  async getUserStats(req: Request, res: Response) {
    const { address } = req.params;

    const stats = await this.userService.getUserStats(address);

    if (!stats) {
      throw new AppError('User not found', 404);
    }

    res.json({ data: stats });
  }
}
