import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CommissionsService } from '../commissions/commissions.service';
import { Transaction } from '../../schemas/transaction.schema';

// ─── Mock factory helpers ────────────────────────────────────────────────────

const makeSaveableMock = (fields: any) => ({
  ...fields,
  save: jest.fn().mockResolvedValue({ ...fields }),
});

const makeModelMock = (transaction: any) => ({
  findById: jest.fn().mockResolvedValue(transaction),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TransactionsService – Stage Transitions', () => {
  let service: TransactionsService;
  let transactionModel: any;

  const commissionServiceMock = {
    calculate: jest.fn().mockReturnValue({
      agencyShare: 50000,
      listingAgentShare: 50000,
      sellingAgentShare: 0,
      totalFee: 100000,
    }),
  };

  const buildService = async (txData: any) => {
    transactionModel = makeModelMock(makeSaveableMock(txData));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getModelToken(Transaction.name), useValue: transactionModel },
        { provide: CommissionsService, useValue: commissionServiceMock },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
  };

  // ── Valid transitions ──────────────────────────────────────────────────────
  it('should allow agreement → earnest_money', async () => {
    await buildService({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: { toString: () => 'agent-1' },
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'earnest_money' }, 'agent-1'),
    ).resolves.toBeDefined();
  });

  it('should allow earnest_money → title_deed', async () => {
    await buildService({
      _id: 'tx1',
      status: 'earnest_money',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: null,
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'title_deed' }, 'agent-1'),
    ).resolves.toBeDefined();
  });

  it('should allow title_deed → completed and calculate commission', async () => {
    await buildService({
      _id: 'tx1',
      status: 'title_deed',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: { toString: () => 'agent-1' },
      financialBreakdown: null,
    });
    await service.updateStatus('tx1', { status: 'completed' }, 'agent-1');
    expect(commissionServiceMock.calculate).toHaveBeenCalledWith(100000, 'agent-1', 'agent-1');
  });

  // ── Invalid transitions ────────────────────────────────────────────────────
  it('should throw BadRequestException for invalid transition: agreement → title_deed', async () => {
    await buildService({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: null,
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'title_deed' }, 'agent-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for invalid transition: agreement → completed', async () => {
    await buildService({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: null,
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'completed' }, 'agent-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when trying to advance a completed transaction', async () => {
    await buildService({
      _id: 'tx1',
      status: 'completed',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-1' },
      sellingAgentId: null,
      financialBreakdown: {},
    });
    await expect(
      service.updateStatus('tx1', { status: 'completed' }, 'agent-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Not found ─────────────────────────────────────────────────────────────
  it('should throw NotFoundException when transaction does not exist', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getModelToken(Transaction.name), useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: CommissionsService, useValue: commissionServiceMock },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
    await expect(
      service.updateStatus('nonexistent', { status: 'earnest_money' }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── 403 Ownership Guard Tests ───────────────────────────────────────────────

describe('TransactionsService – Ownership / 403 Guard', () => {
  let service: TransactionsService;

  const commissionServiceMock = {
    calculate: jest.fn().mockReturnValue({ agencyShare: 0, listingAgentShare: 0, sellingAgentShare: 0, totalFee: 0 }),
  };

  const buildServiceWithTx = async (txData: any) => {
    const modelMock = makeModelMock(makeSaveableMock(txData));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getModelToken(Transaction.name), useValue: modelMock },
        { provide: CommissionsService, useValue: commissionServiceMock },
      ],
    }).compile();
    return module.get<TransactionsService>(TransactionsService);
  };

  it('should allow listing agent to update the transaction', async () => {
    service = await buildServiceWithTx({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'listing-agent' },
      sellingAgentId: null,
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'earnest_money' }, 'listing-agent'),
    ).resolves.toBeDefined();
  });

  it('should allow selling agent to update the transaction', async () => {
    service = await buildServiceWithTx({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'listing-agent' },
      sellingAgentId: { toString: () => 'selling-agent' },
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'earnest_money' }, 'selling-agent'),
    ).resolves.toBeDefined();
  });

  it('should throw ForbiddenException (403) when an unrelated agent tries to update the transaction', async () => {
    service = await buildServiceWithTx({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'listing-agent' },
      sellingAgentId: { toString: () => 'selling-agent' },
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'earnest_money' }, 'completely-different-agent'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow update without requesterId (admin / unauthenticated bypass)', async () => {
    service = await buildServiceWithTx({
      _id: 'tx1',
      status: 'agreement',
      totalServiceFee: 100000,
      listingAgentId: { toString: () => 'agent-X' },
      sellingAgentId: null,
      financialBreakdown: null,
    });
    await expect(
      service.updateStatus('tx1', { status: 'earnest_money' }, undefined),
    ).resolves.toBeDefined();
  });
});
