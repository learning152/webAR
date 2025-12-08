import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ShapeGenerator, Color } from './ShapeGenerator';

describe('ShapeGenerator Particle Variations Property-Based Tests', () => {
  /**
   * Feature: solid-3d-shapes, Property 6: 粒子大小多样性
   * Validates: Requirements 2.1
   * 
   * For any shape generation with particle count N >= 100, the generated particles
   * SHALL have at least 5 distinct size values.
   */
  it('Property 6: Particle size variety', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // particle count >= 100
        (count) => {
          const generator = new ShapeGenerator() as any; // Cast to access private methods
          
          // Generate size variations
          const sizes: number[] = [];
          for (let i = 0; i < count; i++) {
            sizes.push(generator.generateSizeVariation());
          }
          
          // Count unique sizes (with tolerance for floating-point comparison)
          const uniqueSizes = new Set(sizes.map(s => Math.round(s * 100) / 100));
          
          // Verify at least 5 distinct sizes
          expect(uniqueSizes.size).toBeGreaterThanOrEqual(5);
          
          // Verify all sizes are in valid range [0.5, 2.0]
          for (const size of sizes) {
            expect(size).toBeGreaterThanOrEqual(0.5);
            expect(size).toBeLessThanOrEqual(2.0);
            expect(Number.isFinite(size)).toBe(true);
          }
          
          // Verify sizes are from the expected set
          const expectedSizes = [0.5, 0.75, 1.0, 1.5, 2.0];
          for (const size of sizes) {
            expect(expectedSizes).toContain(size);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: solid-3d-shapes, Property 7: 粒子形状多样性
   * Validates: Requirements 2.2
   * 
   * For any shape generation with particle count N >= 100, the generated particles
   * SHALL have at least 5 distinct shapeType values.
   */
  it('Property 7: Particle shape variety', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // particle count >= 100
        (count) => {
          const generator = new ShapeGenerator() as any; // Cast to access private methods
          
          // Generate shape type variations
          const shapeTypes: number[] = [];
          for (let i = 0; i < count; i++) {
            shapeTypes.push(generator.generateShapeTypeVariation());
          }
          
          // Count unique shape types
          const uniqueShapeTypes = new Set(shapeTypes);
          
          // Verify at least 5 distinct shape types
          expect(uniqueShapeTypes.size).toBeGreaterThanOrEqual(5);
          
          // Verify all shape types are in valid range [0, 4]
          for (const shapeType of shapeTypes) {
            expect(shapeType).toBeGreaterThanOrEqual(0);
            expect(shapeType).toBeLessThanOrEqual(4);
            expect(Number.isInteger(shapeType)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: solid-3d-shapes, Property 8: 粒子颜色多样性
   * Validates: Requirements 2.3
   * 
   * For any shape generation with particle count N >= 100, the generated particles
   * SHALL have at least 5 distinct color values.
   */
  it('Property 8: Particle color variety', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // particle count >= 100
        fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true })
        }), // base color
        (count, baseColor) => {
          const generator = new ShapeGenerator() as any; // Cast to access private methods
          
          // Generate color variations
          const colors: Color[] = [];
          for (let i = 0; i < count; i++) {
            colors.push(generator.generateColorVariation(baseColor));
          }
          
          // Count unique colors (with tolerance for floating-point comparison)
          const uniqueColors = new Set(
            colors.map(c => 
              `${Math.round(c.r * 100)},${Math.round(c.g * 100)},${Math.round(c.b * 100)}`
            )
          );
          
          // Verify at least 5 distinct colors
          expect(uniqueColors.size).toBeGreaterThanOrEqual(5);
          
          // Verify all colors are in valid range [0, 1]
          for (const color of colors) {
            expect(color.r).toBeGreaterThanOrEqual(0);
            expect(color.r).toBeLessThanOrEqual(1);
            expect(color.g).toBeGreaterThanOrEqual(0);
            expect(color.g).toBeLessThanOrEqual(1);
            expect(color.b).toBeGreaterThanOrEqual(0);
            expect(color.b).toBeLessThanOrEqual(1);
            
            expect(Number.isFinite(color.r)).toBe(true);
            expect(Number.isFinite(color.g)).toBe(true);
            expect(Number.isFinite(color.b)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
