/**
 * Property-based tests for PhysicsEngine.reinitialize
 * Tests dynamic particle count adjustment functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PhysicsEngine } from './PhysicsEngine';
import { ShapeType } from '../shapes/ShapeGenerator';

describe('PhysicsEngine.reinitialize Property Tests', () => {
  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine();
  });

  /**
   * Property 2: Physics arrays size matches particle count
   * For any particle count N in range [1000, 32000], after calling
   * PhysicsEngine.reinitialize(N), all particle data arrays (positions,
   * velocities, colors, targetPositions) SHALL have exactly N * 3 elements.
   * 
   * **Feature: dynamic-particle-count, Property 2: Physics arrays size matches particle count**
   * **Validates: Requirements 1.3, 3.1**
   */
  it('Property 2: physics arrays size matches particle count after reinitialization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 32000 }),
        (newCount) => {
          // Initialize with a different count first
          const initialCount = newCount === 16000 ? 8000 : 16000;
          engine.initialize(initialCount);
          
          // Reinitialize with new count
          engine.reinitialize(newCount);
          
          // Verify particle data exists
          const particleData = engine.getParticleData();
          expect(particleData).toBeDefined();
          expect(particleData).not.toBeNull();
          
          if (particleData) {
            // Verify all arrays have correct size
            expect(particleData.positions.length).toBe(newCount * 3);
            expect(particleData.velocities.length).toBe(newCount * 3);
            expect(particleData.colors.length).toBe(newCount * 3);
            expect(particleData.targetPositions.length).toBe(newCount * 3);
            expect(particleData.accelerations.length).toBe(newCount * 3);
            
            // Verify particle count getter
            expect(engine.getParticleCount()).toBe(newCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: PhysicsEngine same count optimization
   * For any PhysicsEngine with current count N, calling reinitialize(N)
   * SHALL NOT create new particle data (particleData reference unchanged).
   * 
   * **Feature: dynamic-particle-count, Property 5: PhysicsEngine same count optimization**
   * **Validates: Requirements 3.4**
   */
  it('Property 5: same count skips reinitialization (no new particle data created)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 32000 }),
        (count) => {
          // Initialize
          engine.initialize(count);
          
          // Get initial particle data reference
          const initialParticleData = engine.getParticleData();
          
          // Reinitialize with same count
          engine.reinitialize(count);
          
          // Verify particle data reference is unchanged
          expect(engine.getParticleData()).toBe(initialParticleData);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Shape type preservation
   * For any shape type T and particle count change from N1 to N2,
   * after reinitialization the current shape type SHALL equal T.
   * 
   * **Feature: dynamic-particle-count, Property 6: Shape type preservation**
   * **Validates: Requirements 1.4, 3.3**
   */
  it('Property 6: shape type is preserved after reinitialization', () => {
    const shapeTypes = [
      ShapeType.PLANET,
      ShapeType.TEXT,
      ShapeType.TORUS,
      ShapeType.STAR,
      ShapeType.HEART,
      ShapeType.ARROW_HEART
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: shapeTypes.length - 1 }),
        fc.integer({ min: 1000, max: 32000 }),
        fc.integer({ min: 1000, max: 32000 }),
        (shapeIndex, initialCount, newCount) => {
          // Skip if counts are the same (optimization case)
          if (initialCount === newCount) {
            return true;
          }

          const shapeType = shapeTypes[shapeIndex];
          
          // Initialize
          engine.initialize(initialCount);
          
          // Set shape type
          engine.setCurrentShapeType(shapeType);
          
          // Verify shape type is set
          expect(engine.getCurrentShapeType()).toBe(shapeType);
          
          // Reinitialize with different count
          engine.reinitialize(newCount);
          
          // Verify shape type is preserved
          expect(engine.getCurrentShapeType()).toBe(shapeType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify getParticleCount returns 0 when not initialized
   */
  it('getParticleCount returns 0 when not initialized', () => {
    const uninitializedEngine = new PhysicsEngine();
    expect(uninitializedEngine.getParticleCount()).toBe(0);
  });

  /**
   * Additional test: Verify default shape type is PLANET
   */
  it('default shape type is PLANET', () => {
    expect(engine.getCurrentShapeType()).toBe(ShapeType.PLANET);
  });
});
