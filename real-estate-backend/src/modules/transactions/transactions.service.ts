import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../../schemas/transaction.schema';
import { CommissionsService } from '../commissions/commissions.service';

// Ordered sequence of transaction stages
const STAGE_ORDER = ['agreement', 'earnest_money', 'title_deed', 'completed'];

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
      .populate('listingAgentId', 'name photo')
      .populate('sellingAgentId', 'name photo')
      .exec();
  }

  /**
   * Update transaction status or sellingAgentId.
   * @param id Transaction ID
   * @param payload { status?, sellingAgentId? }
   * @param requesterId The _id of the authenticated user making the request
   */
  async updateStatus(id: string, payload: any, requesterId?: string, isAdmin: boolean = false) {
    const transaction = await this.transactionModel.findById(id);
    if (!transaction) throw new NotFoundException('Transaction not found');

    // ── Ownership check ──────────────────────────────────────────────────────

    // Only the listing agent OR selling agent of this transaction may update it.
    // Admins bypass this check.
    if (!isAdmin && requesterId) {
      const listId = String(transaction.listingAgentId || '');
      const sellId = String(transaction.sellingAgentId || '');
      const reqId = String(requesterId);
      
      const isInvolved = listId === reqId || sellId === reqId;
      
      if (!isInvolved) {
        throw new ForbiddenException(
          `You are not authorized to update this transaction. Requester: ${reqId}, ListingAgent: ${listId}, SellingAgent: ${sellId}`,
        );
      }
    }

    // ── Stage transition validation ───────────────────────────────────────────
    if (payload.status && payload.status !== transaction.status) {
      if (transaction.status === 'completed' || transaction.status === 'canceled') {
        throw new BadRequestException(`Cannot update a ${transaction.status} transaction.`);
      }

      // Allow canceling from any active stage
      if (payload.status === 'canceled') {
        transaction.status = 'canceled';
      } else {
        const currentIndex = STAGE_ORDER.indexOf(transaction.status);
        const nextIndex = STAGE_ORDER.indexOf(payload.status);

        if (nextIndex === -1 || nextIndex <= currentIndex) {
          throw new BadRequestException(
            `Invalid stage transition: "${transaction.status}" → "${payload.status}". You can only move forward in the sequence: ${STAGE_ORDER.join(' → ')}.`,
          );
        }
        transaction.status = payload.status;
      }
    }

    if (payload.hasOwnProperty('sellingAgentId')) {
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
}