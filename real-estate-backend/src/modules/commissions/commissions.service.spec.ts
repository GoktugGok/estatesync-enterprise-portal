import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  let service: CommissionsService;

  beforeEach(() => {
    service = new CommissionsService();
  });

  // ─── Scenario 1: Same Agent ───────────────────────────────────────────────
  describe('Scenario 1 – Listing agent is also the selling agent', () => {
    it('should give 50% agency and 50% to the single agent', () => {
      const result = service.calculate(100000, 'agent-1', 'agent-1');
      expect(result.agencyShare).toBe(50000);
      expect(result.listingAgentShare).toBe(50000);
      expect(result.sellingAgentShare).toBe(0);
      expect(result.totalFee).toBe(100000);
    });

    it('should handle the case where sellingAgentId is empty string', () => {
      const result = service.calculate(200000, 'agent-1', '');
      expect(result.agencyShare).toBe(100000);
      expect(result.listingAgentShare).toBe(100000);
      expect(result.sellingAgentShare).toBe(0);
    });

    it('shares must sum to totalFee for same-agent scenario', () => {
      const total = 75000;
      const result = service.calculate(total, 'a', 'a');
      expect(result.agencyShare + result.listingAgentShare + result.sellingAgentShare).toBe(total);
    });
  });

  // ─── Scenario 2: Different Agents ────────────────────────────────────────
  describe('Scenario 2 – Listing agent and selling agent are different', () => {
    it('should give 50% agency and 25/25 split to both agents', () => {
      const result = service.calculate(100000, 'agent-1', 'agent-2');
      expect(result.agencyShare).toBe(50000);
      expect(result.listingAgentShare).toBe(25000);
      expect(result.sellingAgentShare).toBe(25000);
      expect(result.totalFee).toBe(100000);
    });

    it('should work with decimal fee values', () => {
      const result = service.calculate(99999, 'agent-A', 'agent-B');
      expect(result.agencyShare).toBeCloseTo(49999.5);
      expect(result.listingAgentShare).toBeCloseTo(24999.75);
      expect(result.sellingAgentShare).toBeCloseTo(24999.75);
    });

    it('shares must sum to totalFee for different-agent scenario', () => {
      const total = 150000;
      const result = service.calculate(total, 'a', 'b');
      expect(result.agencyShare + result.listingAgentShare + result.sellingAgentShare).toBe(total);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('should handle zero fee gracefully', () => {
      const result = service.calculate(0, 'agent-1', 'agent-2');
      expect(result.agencyShare).toBe(0);
      expect(result.listingAgentShare).toBe(0);
      expect(result.sellingAgentShare).toBe(0);
    });

    it('agency share is always exactly 50% of totalFee', () => {
      [10000, 500000, 1].forEach((fee) => {
        const result = service.calculate(fee, 'a', 'b');
        expect(result.agencyShare).toBe(fee * 0.5);
      });
    });
  });
});