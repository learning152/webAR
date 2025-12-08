import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ShapeGenerator } from './ShapeGenerator';

describe('ShapeGenerator Volume Sampling Property-Based Tests', () => {
  /**
   * Feature: solid-3d-shapes, Property 1: 球体体积分布
   * Validates: Requirements 1.1
   * 
   * For any sphere with radius R and particle count N, when generating particles
   * using volume sampling, there SHALL exist particles at multiple radii r where
   * 0 < r < R (not just at r ≈ R).
   * 
   * Specifically, we divide the sphere into concentric shells and verify that
   * particles exist in at least 3 different shells (inner, middle, outer).
   */
  it('Property 1: Sphere volume distribution', () => {
    fc.assert(
      fc.property(
        // Need at least 500 particles to ensure statistical significance for inner shell
        // Inner shell has ~3.7% of volume, so 500 particles gives ~18 expected in inner shell
        fc.integer({ min: 500, max: 5000 }), // particle count (need enough for distribution)
        fc.float({ min: Math.fround(1.0), max: Math.fround(10.0), noNaN: true }), // radius
        (count, radius) => {
          const generator = new ShapeGenerator();
          const particles = generator.generatePlanetVolume(count, radius);
          
          // Verify the correct number of particles generated
          expect(particles.length).toBe(count);
          
          // Define 3 concentric shells:
          // Inner shell: 0 to radius/3
          // Middle shell: radius/3 to 2*radius/3
          // Outer shell: 2*radius/3 to radius
          const innerThreshold = radius / 3;
          const middleThreshold = (2 * radius) / 3;
          
          let innerCount = 0;
          let middleCount = 0;
          let outerCount = 0;
          
          for (const particle of particles) {
            const pos = particle.position;
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            // Calculate distance from origin
            const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            
            // Verify particle is within the sphere
            expect(distance).toBeLessThanOrEqual(radius + 0.001); // Small tolerance for floating point
            
            // Categorize into shells
            if (distance <= innerThreshold) {
              innerCount++;
            } else if (distance <= middleThreshold) {
              middleCount++;
            } else {
              outerCount++;
            }
            
            // Verify particle attributes
            expect(particle.size).toBeGreaterThanOrEqual(0.5);
            expect(particle.size).toBeLessThanOrEqual(2.0);
            expect(particle.shapeType).toBeGreaterThanOrEqual(0);
            expect(particle.shapeType).toBeLessThanOrEqual(4);
            expect(particle.color.r).toBeGreaterThanOrEqual(0);
            expect(particle.color.r).toBeLessThanOrEqual(1);
            expect(particle.color.g).toBeGreaterThanOrEqual(0);
            expect(particle.color.g).toBeLessThanOrEqual(1);
            expect(particle.color.b).toBeGreaterThanOrEqual(0);
            expect(particle.color.b).toBeLessThanOrEqual(1);
          }
          
          // Verify particles exist in all 3 shells (volume distribution, not just surface)
          // With 500+ particles and uniform volume distribution, all shells should have particles
          // Inner shell has ~3.7% of volume, so with 500 particles we expect ~18 particles
          expect(innerCount).toBeGreaterThan(0);
          expect(middleCount).toBeGreaterThan(0);
          expect(outerCount).toBeGreaterThan(0);
          
          // For uniform volume distribution, the outer shell should have more particles
          // because it has more volume (proportional to r³)
          // Inner shell volume: (1/3)³ = 1/27 of total
          // Middle shell volume: (2/3)³ - (1/3)³ = 8/27 - 1/27 = 7/27 of total
          // Outer shell volume: 1 - (2/3)³ = 1 - 8/27 = 19/27 of total
          // So we expect roughly: inner ~3.7%, middle ~26%, outer ~70%
          
          // Verify the distribution is roughly correct (with tolerance for randomness)
          const totalParticles = innerCount + middleCount + outerCount;
          const innerRatio = innerCount / totalParticles;
          const outerRatio = outerCount / totalParticles;
          
          // Allow generous tolerance due to randomness, but verify general trend
          // Inner should be smallest, outer should be largest
          expect(innerRatio).toBeLessThan(0.15); // Should be ~3.7%, allow up to 15%
          expect(outerRatio).toBeGreaterThan(0.4); // Should be ~70%, require at least 40%
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error handling for invalid parameters
   */
  it('Property 1 (edge case): Invalid parameters throw errors', () => {
    const generator = new ShapeGenerator();
    
    // Test invalid count
    expect(() => generator.generatePlanetVolume(0, 3.0)).toThrow('Particle count must be positive');
    expect(() => generator.generatePlanetVolume(-1, 3.0)).toThrow('Particle count must be positive');
    
    // Test invalid radius
    expect(() => generator.generatePlanetVolume(100, 0)).toThrow('Radius must be positive');
    expect(() => generator.generatePlanetVolume(100, -1)).toThrow('Radius must be positive');
  });

  /**
   * Feature: solid-3d-shapes, Property 2: 爱心体积分布
   * Validates: Requirements 1.2
   * 
   * For any heart shape with scale S and particle count N, when generating particles
   * using volume sampling, there SHALL exist particles at multiple depth levels
   * (z-coordinates) throughout the heart volume, not concentrated at z ≈ 0.
   * 
   * We verify that particles exist at various z-depths by checking that the standard
   * deviation of z-coordinates is above a threshold.
   */
  it('Property 2: Heart volume distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // particle count
        fc.float({ min: Math.fround(0.5), max: Math.fround(3.0), noNaN: true }), // scale
        (count, scale) => {
          const generator = new ShapeGenerator();
          const particles = generator.generateHeartVolume(count, scale);
          
          // Verify the correct number of particles generated
          expect(particles.length).toBe(count);
          
          // Collect z-coordinates
          const zCoordinates: number[] = [];
          let minZ = Infinity;
          let maxZ = -Infinity;
          
          for (const particle of particles) {
            const pos = particle.position;
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            zCoordinates.push(pos.z);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
            
            // Verify particle attributes
            expect(particle.size).toBeGreaterThanOrEqual(0.5);
            expect(particle.size).toBeLessThanOrEqual(2.0);
            expect(particle.shapeType).toBeGreaterThanOrEqual(0);
            expect(particle.shapeType).toBeLessThanOrEqual(4);
            expect(particle.color.r).toBeGreaterThanOrEqual(0);
            expect(particle.color.r).toBeLessThanOrEqual(1);
            expect(particle.color.g).toBeGreaterThanOrEqual(0);
            expect(particle.color.g).toBeLessThanOrEqual(1);
            expect(particle.color.b).toBeGreaterThanOrEqual(0);
            expect(particle.color.b).toBeLessThanOrEqual(1);
          }
          
          // Calculate standard deviation of z-coordinates
          const meanZ = zCoordinates.reduce((sum, z) => sum + z, 0) / zCoordinates.length;
          const variance = zCoordinates.reduce((sum, z) => sum + (z - meanZ) ** 2, 0) / zCoordinates.length;
          const stdDev = Math.sqrt(variance);
          
          // Verify z-coordinates have sufficient variance (not concentrated at z ≈ 0)
          // For volume distribution, we expect particles throughout the depth
          // The max z should be around 0.6 * scale based on design
          // Standard deviation should be at least 10% of the expected max z range
          const expectedMaxZ = 0.6 * scale;
          const minStdDev = expectedMaxZ * 0.1;
          
          expect(stdDev).toBeGreaterThan(minStdDev);
          
          // Verify z-coordinates span a reasonable range
          const zRange = maxZ - minZ;
          expect(zRange).toBeGreaterThan(expectedMaxZ * 0.3); // At least 30% of expected range
          
          // Verify particles exist at multiple depth levels
          // Divide z-range into 3 zones: negative, near-zero, positive
          const zeroThreshold = expectedMaxZ * 0.1;
          let negativeCount = 0;
          let nearZeroCount = 0;
          let positiveCount = 0;
          
          for (const z of zCoordinates) {
            if (z < -zeroThreshold) {
              negativeCount++;
            } else if (z > zeroThreshold) {
              positiveCount++;
            } else {
              nearZeroCount++;
            }
          }
          
          // Verify particles exist in multiple zones (volume distribution)
          // At least 2 of the 3 zones should have particles
          const zonesWithParticles = [negativeCount > 0, nearZeroCount > 0, positiveCount > 0]
            .filter(Boolean).length;
          expect(zonesWithParticles).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error handling for invalid parameters (heart)
   */
  it('Property 2 (edge case): Invalid parameters throw errors', () => {
    const generator = new ShapeGenerator();
    
    // Test invalid count
    expect(() => generator.generateHeartVolume(0, 1.5)).toThrow('Particle count must be positive');
    expect(() => generator.generateHeartVolume(-1, 1.5)).toThrow('Particle count must be positive');
    
    // Test invalid scale
    expect(() => generator.generateHeartVolume(100, 0)).toThrow('Scale must be positive');
    expect(() => generator.generateHeartVolume(100, -1)).toThrow('Scale must be positive');
  });

  /**
   * Feature: solid-3d-shapes, Property 3: 星形体积分布
   * Validates: Requirements 1.3
   * 
   * For any star shape with outer radius R and particle count N, when generating
   * particles using volume sampling, there SHALL exist particles at multiple depth
   * levels (z-coordinates) throughout the star volume.
   * 
   * Similar to heart, we verify z-coordinate distribution has sufficient variance.
   */
  it('Property 3: Star volume distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // particle count
        fc.float({ min: Math.fround(1.0), max: Math.fround(5.0), noNaN: true }), // outer radius
        fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }), // inner radius
        (count, outerRadius, innerRadius) => {
          // Ensure outer radius is greater than inner radius
          if (outerRadius <= innerRadius) {
            return; // Skip this test case
          }
          
          const generator = new ShapeGenerator();
          const particles = generator.generateStarVolume(count, outerRadius, innerRadius);
          
          // Verify the correct number of particles generated
          expect(particles.length).toBe(count);
          
          // Collect z-coordinates
          const zCoordinates: number[] = [];
          let minZ = Infinity;
          let maxZ = -Infinity;
          
          for (const particle of particles) {
            const pos = particle.position;
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            zCoordinates.push(pos.z);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
            
            // Verify particle is within reasonable bounds
            // x and y should be within the outer radius
            const distXY = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            expect(distXY).toBeLessThanOrEqual(outerRadius + 0.001);
            
            // Verify particle attributes
            expect(particle.size).toBeGreaterThanOrEqual(0.5);
            expect(particle.size).toBeLessThanOrEqual(2.0);
            expect(particle.shapeType).toBeGreaterThanOrEqual(0);
            expect(particle.shapeType).toBeLessThanOrEqual(4);
            expect(particle.color.r).toBeGreaterThanOrEqual(0);
            expect(particle.color.r).toBeLessThanOrEqual(1);
            expect(particle.color.g).toBeGreaterThanOrEqual(0);
            expect(particle.color.g).toBeLessThanOrEqual(1);
            expect(particle.color.b).toBeGreaterThanOrEqual(0);
            expect(particle.color.b).toBeLessThanOrEqual(1);
          }
          
          // Calculate standard deviation of z-coordinates
          const meanZ = zCoordinates.reduce((sum, z) => sum + z, 0) / zCoordinates.length;
          const variance = zCoordinates.reduce((sum, z) => sum + (z - meanZ) ** 2, 0) / zCoordinates.length;
          const stdDev = Math.sqrt(variance);
          
          // Verify z-coordinates have sufficient variance (not concentrated at z ≈ 0)
          // For volume distribution, we expect particles throughout the depth
          // The max z should be around 0.4 * outerRadius based on design (dome effect)
          const expectedMaxZ = 0.4 * outerRadius;
          const minStdDev = expectedMaxZ * 0.1;
          
          expect(stdDev).toBeGreaterThan(minStdDev);
          
          // Verify z-coordinates span a reasonable range
          const zRange = maxZ - minZ;
          expect(zRange).toBeGreaterThan(expectedMaxZ * 0.3); // At least 30% of expected range
          
          // Verify particles exist at multiple depth levels
          // Divide z-range into 3 zones: negative, near-zero, positive
          const zeroThreshold = expectedMaxZ * 0.1;
          let negativeCount = 0;
          let nearZeroCount = 0;
          let positiveCount = 0;
          
          for (const z of zCoordinates) {
            if (z < -zeroThreshold) {
              negativeCount++;
            } else if (z > zeroThreshold) {
              positiveCount++;
            } else {
              nearZeroCount++;
            }
          }
          
          // Verify particles exist in multiple zones (volume distribution)
          // At least 2 of the 3 zones should have particles
          const zonesWithParticles = [negativeCount > 0, nearZeroCount > 0, positiveCount > 0]
            .filter(Boolean).length;
          expect(zonesWithParticles).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error handling for invalid parameters (star)
   */
  it('Property 3 (edge case): Invalid parameters throw errors', () => {
    const generator = new ShapeGenerator();
    
    // Test invalid count
    expect(() => generator.generateStarVolume(0, 3.0, 1.2)).toThrow('Particle count must be positive');
    expect(() => generator.generateStarVolume(-1, 3.0, 1.2)).toThrow('Particle count must be positive');
    
    // Test invalid outer radius
    expect(() => generator.generateStarVolume(100, 0, 1.2)).toThrow('Outer radius must be positive');
    expect(() => generator.generateStarVolume(100, -1, 1.2)).toThrow('Outer radius must be positive');
    
    // Test invalid inner radius
    expect(() => generator.generateStarVolume(100, 3.0, 0)).toThrow('Inner radius must be positive');
    expect(() => generator.generateStarVolume(100, 3.0, -1)).toThrow('Inner radius must be positive');
  });

  /**
   * Feature: solid-3d-shapes, Property 4: 圆环体积分布
   * Validates: Requirements 1.4
   * 
   * For any torus with major radius R and minor radius r, when generating particles
   * using volume sampling, there SHALL exist particles at various distances from the
   * tube center (not just at distance ≈ r).
   * 
   * We check that particles exist at multiple radial distances from the tube centerline,
   * verifying true volume distribution rather than just surface sampling.
   */
  it('Property 4: Torus volume distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // particle count
        fc.float({ min: Math.fround(2.0), max: Math.fround(8.0), noNaN: true }), // major radius
        fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }), // minor radius
        (count, majorRadius, minorRadius) => {
          // Ensure major radius is greater than minor radius for valid torus
          if (majorRadius <= minorRadius) {
            return; // Skip this test case
          }
          
          const generator = new ShapeGenerator();
          const particles = generator.generateTorusVolume(count, majorRadius, minorRadius);
          
          // Verify the correct number of particles generated
          expect(particles.length).toBe(count);
          
          // For each particle, calculate its distance from the tube centerline
          // The tube centerline is a circle of radius majorRadius in the XY plane
          const tubeDistances: number[] = [];
          
          for (const particle of particles) {
            const pos = particle.position;
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            // Calculate distance from origin in XY plane (distance to torus center)
            const distFromOriginXY = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            
            // Calculate distance from the tube centerline
            // The tube centerline is at distance majorRadius from origin
            // Distance from tube center = sqrt((distFromOriginXY - majorRadius)² + z²)
            const distFromTubeCenter = Math.sqrt(
              (distFromOriginXY - majorRadius) ** 2 + pos.z ** 2
            );
            
            tubeDistances.push(distFromTubeCenter);
            
            // Verify particle is within the tube (with small tolerance)
            expect(distFromTubeCenter).toBeLessThanOrEqual(minorRadius + 0.001);
            
            // Verify particle attributes
            expect(particle.size).toBeGreaterThanOrEqual(0.5);
            expect(particle.size).toBeLessThanOrEqual(2.0);
            expect(particle.shapeType).toBeGreaterThanOrEqual(0);
            expect(particle.shapeType).toBeLessThanOrEqual(4);
            expect(particle.color.r).toBeGreaterThanOrEqual(0);
            expect(particle.color.r).toBeLessThanOrEqual(1);
            expect(particle.color.g).toBeGreaterThanOrEqual(0);
            expect(particle.color.g).toBeLessThanOrEqual(1);
            expect(particle.color.b).toBeGreaterThanOrEqual(0);
            expect(particle.color.b).toBeLessThanOrEqual(1);
          }
          
          // Verify particles exist at multiple radial distances from tube center
          // Divide the tube radius into 3 zones: inner, middle, outer
          const innerThreshold = minorRadius / 3;
          const middleThreshold = (2 * minorRadius) / 3;
          
          let innerCount = 0;
          let middleCount = 0;
          let outerCount = 0;
          
          for (const dist of tubeDistances) {
            if (dist <= innerThreshold) {
              innerCount++;
            } else if (dist <= middleThreshold) {
              middleCount++;
            } else {
              outerCount++;
            }
          }
          
          // Verify particles exist in all 3 zones (volume distribution, not just surface)
          // With 500+ particles and uniform volume distribution, all zones should have particles
          expect(innerCount).toBeGreaterThan(0);
          expect(middleCount).toBeGreaterThan(0);
          expect(outerCount).toBeGreaterThan(0);
          
          // For uniform volume distribution in a circular cross-section,
          // the outer zone should have more particles because it has more area
          // Inner zone area: π(r/3)² = πr²/9 ≈ 11% of total
          // Middle zone area: π(2r/3)² - π(r/3)² = 4πr²/9 - πr²/9 = 3πr²/9 ≈ 33% of total
          // Outer zone area: πr² - π(2r/3)² = πr² - 4πr²/9 = 5πr²/9 ≈ 56% of total
          
          const totalParticles = innerCount + middleCount + outerCount;
          const innerRatio = innerCount / totalParticles;
          const outerRatio = outerCount / totalParticles;
          
          // Verify the distribution is roughly correct (with tolerance for randomness)
          // Inner should be smallest, outer should be largest
          expect(innerRatio).toBeLessThan(0.25); // Should be ~11%, allow up to 25%
          expect(outerRatio).toBeGreaterThan(0.35); // Should be ~56%, require at least 35%
          
          // Verify standard deviation of tube distances shows volume distribution
          const meanDist = tubeDistances.reduce((sum, d) => sum + d, 0) / tubeDistances.length;
          const variance = tubeDistances.reduce((sum, d) => sum + (d - meanDist) ** 2, 0) / tubeDistances.length;
          const stdDev = Math.sqrt(variance);
          
          // Standard deviation should be significant (not all particles at same distance)
          // For uniform distribution in a circle, expect stdDev to be meaningful
          expect(stdDev).toBeGreaterThan(minorRadius * 0.15); // At least 15% of tube radius
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error handling for invalid parameters (torus)
   */
  it('Property 4 (edge case): Invalid parameters throw errors', () => {
    const generator = new ShapeGenerator();
    
    // Test invalid count
    expect(() => generator.generateTorusVolume(0, 3.0, 1.0)).toThrow('Particle count must be positive');
    expect(() => generator.generateTorusVolume(-1, 3.0, 1.0)).toThrow('Particle count must be positive');
    
    // Test invalid major radius
    expect(() => generator.generateTorusVolume(100, 0, 1.0)).toThrow('Major radius must be positive');
    expect(() => generator.generateTorusVolume(100, -1, 1.0)).toThrow('Major radius must be positive');
    
    // Test invalid minor radius
    expect(() => generator.generateTorusVolume(100, 3.0, 0)).toThrow('Minor radius must be positive');
    expect(() => generator.generateTorusVolume(100, 3.0, -1)).toThrow('Minor radius must be positive');
  });

  /**
   * Feature: solid-3d-shapes, Property 5: 一箭穿心体积分布
   * Validates: Requirements 1.5
   * 
   * For any arrow-heart shape with scale S and particle count N, when generating
   * particles using volume sampling, there SHALL exist particles in both the heart
   * region and the arrow region, with both regions showing interior particle distribution.
   * 
   * We verify:
   * 1. Overall z-coordinate variance shows volume distribution (not just surface)
   * 2. Particles span a reasonable z-range throughout the combined shape
   * 3. Multiple depth zones contain particles
   */
  it('Property 5: Arrow-heart volume distribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // particle count
        fc.float({ min: Math.fround(0.5), max: Math.fround(3.0), noNaN: true }), // scale
        (count, scale) => {
          const generator = new ShapeGenerator();
          const particles = generator.generateArrowHeartVolume(count, scale);
          
          // Verify the correct number of particles generated
          expect(particles.length).toBe(count);
          
          // Collect all z-coordinates and verify particle attributes
          const zCoordinates: number[] = [];
          let minZ = Infinity;
          let maxZ = -Infinity;
          
          for (const particle of particles) {
            const pos = particle.position;
            
            // Verify all coordinates are finite numbers
            expect(Number.isFinite(pos.x)).toBe(true);
            expect(Number.isFinite(pos.y)).toBe(true);
            expect(Number.isFinite(pos.z)).toBe(true);
            
            zCoordinates.push(pos.z);
            minZ = Math.min(minZ, pos.z);
            maxZ = Math.max(maxZ, pos.z);
            
            // Verify particle attributes
            expect(particle.size).toBeGreaterThanOrEqual(0.5);
            expect(particle.size).toBeLessThanOrEqual(2.0);
            expect(particle.shapeType).toBeGreaterThanOrEqual(0);
            expect(particle.shapeType).toBeLessThanOrEqual(4);
            expect(particle.color.r).toBeGreaterThanOrEqual(0);
            expect(particle.color.r).toBeLessThanOrEqual(1);
            expect(particle.color.g).toBeGreaterThanOrEqual(0);
            expect(particle.color.g).toBeLessThanOrEqual(1);
            expect(particle.color.b).toBeGreaterThanOrEqual(0);
            expect(particle.color.b).toBeLessThanOrEqual(1);
          }
          
          // Calculate standard deviation of z-coordinates
          const meanZ = zCoordinates.reduce((sum, z) => sum + z, 0) / zCoordinates.length;
          const variance = zCoordinates.reduce((sum, z) => sum + (z - meanZ) ** 2, 0) / zCoordinates.length;
          const stdDev = Math.sqrt(variance);
          
          // Verify z-coordinates have sufficient variance (volume distribution, not just surface)
          // The heart component has max z around 0.6 * scale
          // The arrow component has max z around 0.15 * scale
          // Combined, we expect significant z-variance
          const expectedMaxZ = 0.6 * scale; // Based on heart's max z
          const minStdDev = expectedMaxZ * 0.08; // At least 8% of expected max z
          
          expect(stdDev).toBeGreaterThan(minStdDev);
          
          // Verify z-coordinates span a reasonable range
          const zRange = maxZ - minZ;
          expect(zRange).toBeGreaterThan(expectedMaxZ * 0.25); // At least 25% of expected range
          
          // Verify particles exist at multiple depth levels
          // Divide z-range into 3 zones: negative, near-zero, positive
          const zeroThreshold = expectedMaxZ * 0.1;
          let negativeCount = 0;
          let nearZeroCount = 0;
          let positiveCount = 0;
          
          for (const z of zCoordinates) {
            if (z < -zeroThreshold) {
              negativeCount++;
            } else if (z > zeroThreshold) {
              positiveCount++;
            } else {
              nearZeroCount++;
            }
          }
          
          // Verify particles exist in multiple zones (volume distribution)
          // At least 2 of the 3 zones should have particles
          const zonesWithParticles = [negativeCount > 0, nearZeroCount > 0, positiveCount > 0]
            .filter(Boolean).length;
          expect(zonesWithParticles).toBeGreaterThanOrEqual(2);
          
          // Additional verification: Check that particles are distributed in both
          // the heart-like region (larger |y| values) and arrow-like region (smaller |y| values)
          // This indirectly verifies both components are present
          const yValues = particles.map(p => Math.abs(p.position.y));
          const maxY = Math.max(...yValues);
          const minY = Math.min(...yValues);
          
          // Verify y-coordinates span a reasonable range (both heart and arrow present)
          // Heart extends to larger |y| values, arrow has smaller |y| values
          const yRange = maxY - minY;
          expect(yRange).toBeGreaterThan(0.2 * scale); // Reasonable y-range indicates both components
          
          // Verify particles exist at both small and large |y| values using adaptive thresholds
          // Use percentiles of the actual data rather than fixed thresholds
          const sortedYValues = [...yValues].sort((a, b) => a - b);
          const percentile25 = sortedYValues[Math.floor(sortedYValues.length * 0.25)];
          const percentile75 = sortedYValues[Math.floor(sortedYValues.length * 0.75)];
          
          // Verify there's meaningful spread in y-values (not all concentrated in one region)
          const ySpread = percentile75 - percentile25;
          expect(ySpread).toBeGreaterThan(0.1 * scale); // Interquartile range should be significant
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error handling for invalid parameters (arrow-heart)
   */
  it('Property 5 (edge case): Invalid parameters throw errors', () => {
    const generator = new ShapeGenerator();
    
    // Test invalid count
    expect(() => generator.generateArrowHeartVolume(0, 1.5)).toThrow('Particle count must be positive');
    expect(() => generator.generateArrowHeartVolume(-1, 1.5)).toThrow('Particle count must be positive');
    
    // Test invalid scale
    expect(() => generator.generateArrowHeartVolume(100, 0)).toThrow('Scale must be positive');
    expect(() => generator.generateArrowHeartVolume(100, -1)).toThrow('Scale must be positive');
  });
});
