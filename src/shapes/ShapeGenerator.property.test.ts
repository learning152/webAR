import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ShapeGenerator } from './ShapeGenerator';

describe('ShapeGenerator Property-Based Tests', () => {
  /**
   * Feature: webar-particle-interaction, Property 6: 行星形状生成
   * Validates: Requirements 4.1
   * 
   * For any particle count n, the generated planet sphere positions should contain
   * exactly n points, and all points should be approximately equidistant from the
   * sphere center (on the sphere surface).
   */
  it('Property 6: planet shape generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // particle count
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }), // radius
        (count, radius) => {
          const generator = new ShapeGenerator();
          const result = generator.generatePlanet(count, radius);
          
          // Verify the correct number of positions generated
          expect(result.positions.length).toBe(count);
          
          // Verify all points are on the sphere surface (distance from origin ≈ radius)
          for (let i = 0; i < count; i++) {
            const pos = result.positions[i];
            
            // Calculate distance from origin
            const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            
            // Verify distance is approximately equal to radius
            // Allow small tolerance due to floating point arithmetic
            expect(distance).toBeCloseTo(radius, 5);
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 7: 行星金蓝渐变着色
   * Validates: Requirements 4.2
   * 
   * For any particle in planet state, its color should be a gradient between
   * gold and blue colors.
   */
  it('Property 7: planet gold-blue gradient coloring', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // particle count
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }), // radius
        (count, radius) => {
          const generator = new ShapeGenerator();
          const result = generator.generatePlanet(count, radius);
          
          // Verify the correct number of colors generated
          expect(result.colors.length).toBe(count);
          
          // Gold color: (1.0, 0.84, 0.0)
          // Blue color: (0.0, 0.5, 1.0)
          
          for (let i = 0; i < count; i++) {
            const color = result.colors[i];
            const pos = result.positions[i];
            
            // Verify all color components are in valid range [0, 1]
            expect(color.r).toBeGreaterThanOrEqual(0);
            expect(color.r).toBeLessThanOrEqual(1);
            expect(color.g).toBeGreaterThanOrEqual(0);
            expect(color.g).toBeLessThanOrEqual(1);
            expect(color.b).toBeGreaterThanOrEqual(0);
            expect(color.b).toBeLessThanOrEqual(1);
            
            // Verify all color components are finite
            expect(Number.isFinite(color.r)).toBe(true);
            expect(Number.isFinite(color.g)).toBe(true);
            expect(Number.isFinite(color.b)).toBe(true);
            
            // Calculate expected color based on height (optimized values)
            const heightRatio = (pos.z + radius) / (2 * radius);
            
            // Verify color is interpolated between gold and blue (optimized colors)
            // Gold: (1.0, 0.88, 0.1), Blue: (0.0, 0.6, 1.0)
            const expectedR = 1.0 * (1 - heightRatio) + 0.0 * heightRatio;
            const expectedG = 0.88 * (1 - heightRatio) + 0.6 * heightRatio;
            const expectedB = 0.1 * (1 - heightRatio) + 1.0 * heightRatio;
            
            expect(color.r).toBeCloseTo(expectedR, 5);
            expect(color.g).toBeCloseTo(expectedG, 5);
            expect(color.b).toBeCloseTo(expectedB, 5);
            
            // Verify gradient property: colors should be between gold and blue (optimized)
            // Red should be between 0 (blue) and 1 (gold)
            // Green should be between 0.6 (blue) and 0.88 (gold)
            // Blue should be between 0.1 (gold) and 1 (blue)
            expect(color.r).toBeGreaterThanOrEqual(0);
            expect(color.r).toBeLessThanOrEqual(1);
            expect(color.g).toBeGreaterThanOrEqual(0.6);
            expect(color.g).toBeLessThanOrEqual(0.88);
            expect(color.b).toBeGreaterThanOrEqual(0.1);
            expect(color.b).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 10: 文字形状粒子分配
   * Validates: Requirements 5.2
   * 
   * For any text pixel data and particle count, all particles should be
   * assigned to valid sampling points on the text shape.
   * Note: Text now has 3D extrusion effect with z-depth for visual enhancement.
   */
  it('Property 10: text shape particle distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // particle count
        fc.constantFrom('我是ai', 'AI', 'Test', '测试', 'Hello'), // various text samples
        (count, text) => {
          const generator = new ShapeGenerator();
          const positions = generator.generateText(text, count);
          
          // Verify the correct number of positions generated
          expect(positions.length).toBe(count);
          
          // Verify all positions are valid Vector3 objects with finite coordinates
          for (let i = 0; i < count; i++) {
            const pos = positions[i];
            
            // Verify position has x, y, z properties
            expect(pos).toHaveProperty('x');
            expect(pos).toHaveProperty('y');
            expect(pos).toHaveProperty('z');
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            // Verify z coordinate is within 3D extrusion depth range (text has depth for 3D effect)
            // Text extrusion depth is 0.4, so z should be within [-0.2, 0.2]
            expect(Math.abs(pos.z)).toBeLessThanOrEqual(0.25);
          }
          
          // Verify particles are distributed (not all at the same position)
          // Check that there's variation in x and y coordinates
          // Only check for distribution when we have enough particles
          if (count > 10) {
            const uniqueX = new Set(positions.map(p => Math.round(p.x * 100)));
            const uniqueY = new Set(positions.map(p => Math.round(p.y * 100)));
            
            // For any reasonable text with enough particles, we should have multiple unique positions
            expect(uniqueX.size).toBeGreaterThan(1);
            expect(uniqueY.size).toBeGreaterThan(1);
          }
          
          // Verify positions are within reasonable bounds for text rendering
          // Text is scaled down by /50, so canvas 512x256 becomes ~10.24 x 5.12
          for (let i = 0; i < count; i++) {
            const pos = positions[i];
            expect(Math.abs(pos.x)).toBeLessThan(15); // Allow some margin
            expect(Math.abs(pos.y)).toBeLessThan(10); // Allow some margin
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 15: 比心粉色着色
   * Validates: Requirements 9.1
   * 
   * For any particle in finger heart state, its color should be changed to pink.
   * Note: Arrow heart now has 3D depth for visual enhancement.
   */
  it('Property 15: finger heart pink coloring', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // particle count
        fc.float({ min: Math.fround(0.5), max: Math.fround(5.0), noNaN: true }), // scale
        (count, scale) => {
          const generator = new ShapeGenerator();
          const result = generator.generateArrowHeart(count, scale);
          
          // Verify the correct number of positions and colors generated
          expect(result.positions.length).toBe(count);
          expect(result.colors.length).toBe(count);
          
          // Pink color should be (1.0, 0.5, 0.75) - optimized for better visibility
          const expectedPink = { r: 1.0, g: 0.5, b: 0.75 };
          
          // Verify all particles have pink color
          for (let i = 0; i < count; i++) {
            const color = result.colors[i];
            
            // Verify color components are in valid range [0, 1]
            expect(color.r).toBeGreaterThanOrEqual(0);
            expect(color.r).toBeLessThanOrEqual(1);
            expect(color.g).toBeGreaterThanOrEqual(0);
            expect(color.g).toBeLessThanOrEqual(1);
            expect(color.b).toBeGreaterThanOrEqual(0);
            expect(color.b).toBeLessThanOrEqual(1);
            
            // Verify all color components are finite
            expect(Number.isFinite(color.r)).toBe(true);
            expect(Number.isFinite(color.g)).toBe(true);
            expect(Number.isFinite(color.b)).toBe(true);
            
            // Verify color is pink
            expect(color.r).toBeCloseTo(expectedPink.r, 5);
            expect(color.g).toBeCloseTo(expectedPink.g, 5);
            expect(color.b).toBeCloseTo(expectedPink.b, 5);
          }
          
          // Verify positions are valid Vector3 objects
          for (let i = 0; i < count; i++) {
            const pos = result.positions[i];
            
            // Verify position has x, y, z properties
            expect(pos).toHaveProperty('x');
            expect(pos).toHaveProperty('y');
            expect(pos).toHaveProperty('z');
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            // Arrow heart has 3D depth for visual enhancement
            // Heart part has dome depth up to 0.6*scale, arrow has depth up to 0.15*scale
            const maxDepth = 0.6 * scale + 0.1; // Allow some margin
            expect(Math.abs(pos.z)).toBeLessThanOrEqual(maxDepth);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 14: 心形区域填充
   * Validates: Requirements 8.1, 8.5
   * 
   * For any generated heart positions, all points should be within the
   * mathematically defined heart region (in XY plane).
   * Note: Heart now has 3D dome depth for visual enhancement.
   */
  it('Property 14: heart region filling', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // particle count
        fc.float({ min: Math.fround(0.5), max: Math.fround(5.0), noNaN: true }), // scale
        (count, scale) => {
          const generator = new ShapeGenerator();
          const positions = generator.generateHeart(count, scale);
          
          // Verify the correct number of positions generated
          expect(positions.length).toBe(count);
          
          // Verify all positions are valid Vector3 objects with finite coordinates
          for (let i = 0; i < count; i++) {
            const pos = positions[i];
            
            // Verify position has x, y, z properties
            expect(pos).toHaveProperty('x');
            expect(pos).toHaveProperty('y');
            expect(pos).toHaveProperty('z');
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            // Heart has 3D dome depth for visual enhancement
            // Dome depth is 0.6 * scale, with some particles on back side at -0.3 * scale
            const maxDepth = 0.6 * scale + 0.1; // Allow some margin
            expect(Math.abs(pos.z)).toBeLessThanOrEqual(maxDepth);
          }
          
          // Verify all points are within the heart's mathematical definition (in XY plane)
          // This is the core property: all generated points must be inside the heart
          for (let i = 0; i < count; i++) {
            const pos = positions[i];
            
            // Use the isPointInHeart method to verify each point is inside
            // We need to access the private method through a workaround
            // Instead, we'll verify using the heart parametric equation bounds
            
            // Generate heart boundary for verification
            const boundaryPoints: Array<{ x: number; y: number }> = [];
            const numBoundaryPoints = 100;
            
            for (let j = 0; j < numBoundaryPoints; j++) {
              const t = (j / numBoundaryPoints) * Math.PI * 2;
              
              const sinT = Math.sin(t);
              const cosT = Math.cos(t);
              const cos2T = Math.cos(2 * t);
              const cos3T = Math.cos(3 * t);
              const cos4T = Math.cos(4 * t);
              
              const heartX = 16 * sinT * sinT * sinT;
              const heartY = 13 * cosT - 5 * cos2T - 2 * cos3T - cos4T;
              
              const scaledX = (heartX / 16) * scale;
              const scaledY = (heartY / 16) * scale;
              
              boundaryPoints.push({ x: scaledX, y: scaledY });
            }
            
            // Ray casting algorithm to verify point is inside heart (XY plane projection)
            let inside = false;
            const n = boundaryPoints.length;
            
            for (let j = 0, k = n - 1; j < n; k = j++) {
              const xi = boundaryPoints[j].x;
              const yi = boundaryPoints[j].y;
              const xk = boundaryPoints[k].x;
              const yk = boundaryPoints[k].y;
              
              const intersect = ((yi > pos.y) !== (yk > pos.y)) &&
                (pos.x < (xk - xi) * (pos.y - yi) / (yk - yi) + xi);
              
              if (intersect) {
                inside = !inside;
              }
            }
            
            // All points must be inside the heart region (XY projection)
            expect(inside).toBe(true);
          }
          
          // Verify particles fill the heart region (not just on boundary)
          // Check that we have particles in different regions of the heart
          if (count > 100) {
            let hasUpperRegion = false;
            let hasMiddleRegion = false;
            let hasLowerRegion = false;
            
            for (let i = 0; i < count; i++) {
              const pos = positions[i];
              
              // Upper region (y > 0.3 * scale)
              if (pos.y > 0.3 * scale) {
                hasUpperRegion = true;
              }
              // Middle region (-0.3 * scale < y < 0.3 * scale)
              else if (pos.y > -0.3 * scale) {
                hasMiddleRegion = true;
              }
              // Lower region (y < -0.3 * scale)
              else {
                hasLowerRegion = true;
              }
            }
            
            // With enough particles, we should have coverage in all regions
            expect(hasUpperRegion).toBe(true);
            expect(hasMiddleRegion).toBe(true);
            expect(hasLowerRegion).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
