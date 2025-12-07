import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Fast-check setup verification', () => {
  it('should verify fast-check is working with a simple property', () => {
    // Simple property: reversing an array twice returns the original array
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr) => {
          const reversed = [...arr].reverse();
          const doubleReversed = [...reversed].reverse();
          expect(doubleReversed).toEqual(arr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify fast-check can generate numbers', () => {
    // Property: multiplying any number by 1 returns the same number
    fc.assert(
      fc.property(
        fc.float(),
        (num) => {
          const result = num * 1;
          // Use toBeCloseTo for floating point comparison
          if (Number.isFinite(num)) {
            expect(result).toBeCloseTo(num, 10);
          } else {
            expect(result).toBe(num);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
