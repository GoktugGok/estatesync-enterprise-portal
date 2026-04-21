import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../../schemas/transaction.schema';
import { CommissionsService } from '../commissions/commissions.service';

// Valid stage transitions — only these moves are allowed
const VALID_TRANSITIONS: Record<string, string> = {
  agreement: 'earnest_money',
  earnest_money: 'title_deed',
  title_deed: 'completed',
};

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private commissionService: CommissionsService,
  ) {}

  async create(data: any) {
    const newTransaction = new this.transactionModel(data);
    return newTransaction.save();
  }

  async findAll() {
    return this.transactionModel
      .find()
      .populate('listingAgentId', 'name')
      .populate('sellingAgentId', 'name')
      .exec();
  }

  /**
   * Update transaction status or sellingAgentId.
   * @param id Transaction ID
   * @param payload { status?, sellingAgentId? }
   * @param requesterId The _id of the authenticated user making the request
   */
  async updateStatus(id: string, payload: any, requesterId?: string) {
    const transaction = await this.transactionModel.findById(id);
    if (!transaction) throw new NotFoundException('Transaction not found');

    // ── Ownership check ──────────────────────────────────────────────────────
    // Only the listing agent OR selling agent of this transaction may update it.
    // Admins (passed as undefined requesterId) bypass this check.
    if (requesterId) {
      const listId = transaction.listingAgentId?.toString();
      const sellId = transaction.sellingAgentId?.toString();
      const isInvolved = listId === requesterId || sellId === requesterId;
      if (!isInvolved) {
        throw new ForbiddenException(
          'You are not authorized to update this transaction. Only the listing or selling agent may advance the stage.',
        );
      }
    }

    // ── Stage transition validation ───────────────────────────────────────────
    if (payload.status) {
      if (transaction.status === 'completed') {
        throw new BadRequestException('Cannot advance a completed transaction.');
      }
      const allowedNext = VALID_TRANSITIONS[transaction.status];
      if (payload.status !== allowedNext) {
        throw new BadRequestException(
          `Invalid stage transition: "${transaction.status}" → "${payload.status}". Expected next stage: "${allowedNext}".`,
        );
      }
      transaction.status = payload.status;
    }

    if (payload.sellingAgentId) {
      transaction.sellingAgentId = payload.sellingAgentId;
    }

    // ── Auto-calculate commission on completion ───────────────────────────────
    if (transaction.status === 'completed') {
      const breakdown = this.commissionService.calculate(
        transaction.totalServiceFee,
        transaction.listingAgentId?.toString() || '',
        transaction.sellingAgentId?.toString() || '',
      );
      transaction.financialBreakdown = breakdown;
    }

    return transaction.save();
  }

  // Expose transition map for testing
  static getValidTransitions() {
    return VALID_TRANSITIONS;
  }
}