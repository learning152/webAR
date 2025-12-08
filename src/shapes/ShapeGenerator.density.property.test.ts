import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ShapeGenerator, ShapeType } from './ShapeGenerator';

describe('ShapeGenerator Density Control Property-Based Tests', () => {
  /**
   * Feature: solid-3d-shapes, Property 12: 低粒子数表面优先
   * Validates: Requirements 5.2
   * 
   * For any shape generation with particle count N < 1000, the percentage of particles
   * near the surface (within 10% of max radius) SHALL be greater than the percentage
   * when N > 5000.
   * 
   * This verifies that low particle counts prioritize surface particles for shape recognition.
   */
  it('Property 12: Surface priority at low counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(ShapeType.PLANET, ShapeType.HEART, ShapeType.STAR, ShapeType.TORUS),
        fc.float({ min: Math.fround(1.0), max: Math.fround(5.0), noNaN: true }), // radius/scale
        (shapeType, size) => {
          const generator = new ShapeGenerator();
          
          // Generate with low particle count (< 1000)
          const lowCount = 500;
          let lowParticles;
          
          // Generate with high particle count (> 5000)
          const highCount = 6000;
          let highParticles;
          
          // Generate particles based on shape type
          switch (shapeType) {
            case ShapeType.PLANET:
              lowParticles = generator.generatePlanetVolume(lowCount, size);
              highParticles = generator.generatePlanetVolume(highCount, size);
              break;
            case ShapeType.HEART:
              lowParticles = generator.generateHeartVolume(lowCount, size);
              highParticles = generator.generateHeartVolume(highCount, size);
              break;
            case ShapeType.STAR:
              lowParticles = generator.generateStarVolume(lowCount, size, size * 0.4);
              highParticles = generator.generateStarVolume(highCount, size, size * 0.4);
              break;
            case ShapeType.TORUS:
              lowParticles = generator.generateTorusVolume(lowCount, size, size * 0.3);
              highParticles = generator.generateTorusVolume(highCount, size, size * 0.3);
              break;
            default:
              return; // Skip unsupported shape types
          }
          
          // Calculate surface particle percentage for low count
          const lowSurfaceCount = countSurfaceParticles(lowParticles, shapeType, size);
          const lowSurfacePercentage = lowSurfaceCount / lowParticles.length;
          
          // Calculate surface particle percentage for high count
          const highSurfaceCount = countSurfaceParticles(highParticles, shapeType, size);
          const highSurfacePercentage = highSurfaceCount / highParticles.length;
          
          // Verify that low count has higher surface percentage than high count
          // This validates that low particle counts prioritize surface particles
          // Allow small tolerance for randomness (at least 5% difference)
          const surfaceDifference = lowSurfacePercentage - highSurfacePercentage;
          expect(surfaceDifference).toBeGreaterThan(0.05);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: solid-3d-shapes, Property 13: 高粒子数内部密度
   * Validates: Requirements 5.3
   * 
   * For any shape generation with particle count N > 5000, the ratio of interior
   * particles (beyond 10% from surface) to total particles SHALL be greater than
   * the ratio when N < 1000.
   * 
   * This verifies that high particle counts increase interior density.
   */
  it('Property 13: Interior density at high counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(ShapeType.PLANET, ShapeType.HEART, ShapeType.STAR, ShapeType.TORUS),
        fc.float({ min: Math.fround(1.0), max: Math.fround(5.0), noNaN: true }), // radius/scale
        (shapeType, size) => {
          const generator = new ShapeGenerator();
          
          // Generate with low particle count (< 1000)
          const lowCount = 500;
          let lowParticles;
          
          // Generate with high particle count (> 5000)
          const highCount = 6000;
          let highParticles;
          
          // Generate particles based on shape type
          switch (shapeType) {
            case ShapeType.PLANET:
              lowParticles = generator.generatePlanetVolume(lowCount, size);
              highParticles = generator.generatePlanetVolume(highCount, size);
              break;
            case ShapeType.HEART:
              lowParticles = generator.generateHeartVolume(lowCount, size);
              highParticles = generator.generateHeartVolume(highCount, size);
              break;
            case ShapeType.STAR:
              lowParticles = generator.generateStarVolume(lowCount, size, size * 0.4);
              highParticles = generator.generateStarVolume(highCount, size, size * 0.4);
              break;
            case ShapeType.TORUS:
              lowParticles = generator.generateTorusVolume(lowCount, size, size * 0.3);
              highParticles = generator.generateTorusVolume(highCount, size, size * 0.3);
              break;
            default:
              return; // Skip unsupported shape types
          }
          
          // Calculate interior particle ratio for low count
          const lowInteriorCount = countInteriorParticles(lowParticles, shapeType, size);
          const lowInteriorRatio = lowInteriorCount / lowParticles.length;
          
          // Calculate interior particle ratio for high count
          const highInteriorCount = countInteriorParticles(highParticles, shapeType, size);
          const highInteriorRatio = highInteriorCount / highParticles.length;
          
          // Verify that high count has higher interior ratio than low count
          // This validates that high particle counts increase interior density
          // Allow small tolerance for randomness (at least 5% difference)
          const interiorDifference = highInteriorRatio - lowInteriorRatio;
          expect(interiorDifference).toBeGreaterThan(0.05);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to count surface particles
 * Surface particles are defined as those within 10% of the max radius from the surface
 */
function countSurfaceParticles(
  particles: Array<{ position: { x: number; y: number; z: number } }>,
  shapeType: ShapeType,
  size: number
): number {
  let surfaceCount = 0;
  const surfaceThreshold = 0.1; // 10% threshold
  
  for (const particle of particles) {
    const pos = particle.position;
    let distanceFromSurface = 0;
    
    switch (shapeType) {
      case ShapeType.PLANET: {
        const radius = size;
        const distFromCenter = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        // Distance from surface = radius - distFromCenter
        distanceFromSurface = radius - distFromCenter;
        // Normalize by radius
        const normalizedDist = distanceFromSurface / radius;
        if (normalizedDist <= surfaceThreshold) {
          surfaceCount++;
        }
        break;
      }
      
      case ShapeType.HEART: {
        const scale = size;
        // For heart, approximate using 2D distance
        const distFromCenter2D = Math.sqrt(pos.x ** 2 + pos.y ** 2);
        const maxDist = scale * 1.5;
        const normalizedDist2D = distFromCenter2D / maxDist;
        
        // Calculate allowed z at this position
        const maxZ = scale * 0.6 * (1 - normalizedDist2D);
        const normalizedZ = maxZ > 0 ? Math.abs(pos.z) / maxZ : 1;
        
        // Particle is near surface if it's close to boundary in either dimension
        const distFromSurface2D = 1 - normalizedDist2D;
        const distFromSurfaceZ = 1 - normalizedZ;
        const minDist = Math.min(distFromSurface2D, distFromSurfaceZ);
        
        if (minDist <= surfaceThreshold) {
          surfaceCount++;
        }
        break;
      }
      
      case ShapeType.STAR: {
        const outerRadius = size;
        // For star, use 2D distance
        const distFromCenter2D = Math.sqrt(pos.x ** 2 + pos.y ** 2);
        const normalizedDist2D = distFromCenter2D / outerRadius;
        
        // Calculate allowed z at this position
        const maxZ = outerRadius * 0.4 * (1 - normalizedDist2D);
        const normalizedZ = maxZ > 0 ? Math.abs(pos.z) / maxZ : 1;
        
        // Particle is near surface if it's close to boundary in either dimension
        const distFromSurface2D = 1 - normalizedDist2D;
        const distFromSurfaceZ = 1 - normalizedZ;
        const minDist = Math.min(distFromSurface2D, distFromSurfaceZ);
        
        if (minDist <= surfaceThreshold) {
          surfaceCount++;
        }
        break;
      }
      
      case ShapeType.TORUS: {
        const majorRadius = size;
        const minorRadius = size * 0.3;
        
        // Distance from tube centerline
        const distFromCenter2D = Math.sqrt(pos.x ** 2 + pos.y ** 2);
        const distFromTubeCenterline = Math.abs(distFromCenter2D - majorRadius);
        const distFromTubeSurface = Math.sqrt(distFromTubeCenterline ** 2 + pos.z ** 2);
        
        // Distance from surface
        const distFromSurface = minorRadius - distFromTubeSurface;
        const normalizedDist = distFromSurface / minorRadius;
        
        if (normalizedDist <= surfaceThreshold) {
          surfaceCount++;
        }
        break;
      }
    }
  }
  
  return surfaceCount;
}

/**
 * Helper function to count interior particles
 * Interior particles are defined as those beyond 10% from the surface
 */
function countInteriorParticles(
  particles: Array<{ position: { x: number; y: number; z: number } }>,
  shapeType: ShapeType,
  size: number
): number {
  const totalParticles = particles.length;
  const surfaceParticles = countSurfaceParticles(particles, shapeType, size);
  return totalParticles - surfaceParticles;
}
