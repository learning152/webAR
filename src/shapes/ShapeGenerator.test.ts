import { describe, it, expect } from 'vitest';
import { ShapeGenerator } from './ShapeGenerator';

describe('ShapeGenerator Unit Tests', () => {
  describe('generateStar', () => {
    it('should generate correct number of particles', () => {
      const generator = new ShapeGenerator();
      const count = 1000;
      const positions = generator.generateStar(count, 3.0, 1.2);
      
      expect(positions.length).toBe(count);
    });

    it('should generate positions with valid coordinates', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateStar(100, 3.0, 1.2);
      
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should generate flat star in XY plane (z = 0)', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateStar(100, 3.0, 1.2);
      
      for (const pos of positions) {
        expect(pos.z).toBe(0);
      }
    });

    it('should generate positions within outer radius bounds', () => {
      const generator = new ShapeGenerator();
      const outerRadius = 3.0;
      const positions = generator.generateStar(1000, outerRadius, 1.2);
      
      for (const pos of positions) {
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        // All points should be within the outer radius
        expect(distance).toBeLessThanOrEqual(outerRadius + 0.01);
      }
    });

    it('should generate all points inside the star shape', () => {
      const generator = new ShapeGenerator();
      const outerRadius = 3.0;
      const innerRadius = 1.2;
      const positions = generator.generateStar(1000, outerRadius, innerRadius);
      
      for (const pos of positions) {
        const isInside = generator.isPointInStar(pos, outerRadius, innerRadius);
        expect(isInside).toBe(true);
      }
    });

    it('should use default parameters when not provided', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateStar(100);
      
      expect(positions.length).toBe(100);
      
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should have particles in all five point regions', () => {
      const generator = new ShapeGenerator();
      const outerRadius = 3.0;
      const innerRadius = 1.2;
      const positions = generator.generateStar(5000, outerRadius, innerRadius);
      
      // Check that particles exist in each of the 5 star point directions
      // The 5 points are at angles: -90°, -18°, 54°, 126°, 198° (or -162°)
      const pointAngles = [
        -Math.PI / 2,           // Top
        -Math.PI / 2 + 2 * Math.PI / 5,  // Upper right
        -Math.PI / 2 + 4 * Math.PI / 5,  // Lower right
        -Math.PI / 2 + 6 * Math.PI / 5,  // Lower left
        -Math.PI / 2 + 8 * Math.PI / 5   // Upper left
      ];
      
      // For each point direction, check if there are particles in that region
      const threshold = innerRadius + (outerRadius - innerRadius) * 0.5;
      
      for (const targetAngle of pointAngles) {
        const hasParticleInRegion = positions.some(pos => {
          const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
          const angle = Math.atan2(pos.y, pos.x);
          
          // Check if particle is in the outer region (star point) and near the target angle
          const angleDiff = Math.abs(angle - targetAngle);
          const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
          
          return distance > threshold && normalizedDiff < Math.PI / 5;
        });
        
        expect(hasParticleInRegion).toBe(true);
      }
    });
  });

  describe('generateTorus', () => {
    it('should generate correct number of particles', () => {
      const generator = new ShapeGenerator();
      const count = 1000;
      const positions = generator.generateTorus(count, 3.0, 1.0);
      
      expect(positions.length).toBe(count);
    });

    it('should generate positions with valid coordinates', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateTorus(100, 3.0, 1.0);
      
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should respect major and minor radius constraints', () => {
      const generator = new ShapeGenerator();
      const majorRadius = 3.0;
      const minorRadius = 1.0;
      const positions = generator.generateTorus(1000, majorRadius, minorRadius);
      
      for (const pos of positions) {
        // Distance from origin to point in XY plane
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        
        // For a torus, the distance from center should be between
        // (majorRadius - minorRadius) and (majorRadius + minorRadius)
        expect(distanceFromCenter).toBeGreaterThanOrEqual(majorRadius - minorRadius - 0.1);
        expect(distanceFromCenter).toBeLessThanOrEqual(majorRadius + minorRadius + 0.1);
        
        // Z coordinate should be within minorRadius
        expect(Math.abs(pos.z)).toBeLessThanOrEqual(minorRadius + 0.1);
      }
    });

    it('should use default parameters when not provided', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateTorus(100);
      
      expect(positions.length).toBe(100);
      
      // Verify positions are within expected bounds for default parameters
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });
  });

  describe('generateArrowHeart', () => {
    it('should generate correct number of particles', () => {
      const generator = new ShapeGenerator();
      const count = 1000;
      const result = generator.generateArrowHeart(count, 1.5);
      
      expect(result.positions.length).toBe(count);
      expect(result.colors.length).toBe(count);
    });

    it('should generate positions with valid coordinates', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(100, 1.5);
      
      for (const pos of result.positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should generate flat shape in XY plane (z = 0)', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(100, 1.5);
      
      for (const pos of result.positions) {
        expect(pos.z).toBe(0);
      }
    });

    it('should generate all particles with pink color', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(100, 1.5);
      
      // Pink color: (1.0, 0.4, 0.7)
      for (const color of result.colors) {
        expect(color.r).toBeCloseTo(1.0, 5);
        expect(color.g).toBeCloseTo(0.4, 5);
        expect(color.b).toBeCloseTo(0.7, 5);
      }
    });

    it('should use default scale parameter when not provided', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(100);
      
      expect(result.positions.length).toBe(100);
      expect(result.colors.length).toBe(100);
      
      for (const pos of result.positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should have particles distributed in both heart and arrow regions', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(2000, 1.5);
      
      // Check that we have particles in different regions
      let hasHeartRegion = false;
      let hasArrowRegion = false;
      
      for (const pos of result.positions) {
        // Heart region: typically has particles in upper lobes and lower point
        // Check for heart-like distribution (wider at top, narrow at bottom)
        if (Math.abs(pos.y) > 0.5 && Math.abs(pos.x) < 2.0) {
          hasHeartRegion = true;
        }
        
        // Arrow region: horizontal line through center
        // Arrow should be relatively straight and horizontal
        if (Math.abs(pos.y) < 0.3 && Math.abs(pos.x) > 1.0) {
          hasArrowRegion = true;
        }
      }
      
      expect(hasHeartRegion).toBe(true);
      expect(hasArrowRegion).toBe(true);
    });
  });

  describe('generateHeart', () => {
    it('should generate correct number of particles', () => {
      const generator = new ShapeGenerator();
      const count = 1000;
      const positions = generator.generateHeart(count, 1.5);
      
      expect(positions.length).toBe(count);
    });

    it('should generate positions with valid coordinates', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(100, 1.5);
      
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should generate flat heart in XY plane (z = 0)', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(100, 1.5);
      
      for (const pos of positions) {
        expect(pos.z).toBe(0);
      }
    });

    it('should use default scale parameter when not provided', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(100);
      
      expect(positions.length).toBe(100);
      
      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isFinite(pos.z)).toBe(true);
      }
    });

    it('should generate smooth heart curve', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(1000, 1.5);
      
      // Check that particles are distributed across the heart region
      // Heart should have particles in upper lobes and lower point
      let hasUpperLeft = false;
      let hasUpperRight = false;
      let hasLowerPoint = false;
      
      for (const pos of positions) {
        // Upper left lobe (x < 0, y > 0)
        if (pos.x < -0.3 && pos.y > 0.3) {
          hasUpperLeft = true;
        }
        // Upper right lobe (x > 0, y > 0)
        if (pos.x > 0.3 && pos.y > 0.3) {
          hasUpperRight = true;
        }
        // Lower point (y < -0.5)
        if (pos.y < -0.5) {
          hasLowerPoint = true;
        }
      }
      
      expect(hasUpperLeft).toBe(true);
      expect(hasUpperRight).toBe(true);
      expect(hasLowerPoint).toBe(true);
    });

    it('should fill entire heart region', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(2000, 1.5);
      
      // Check that particles are well distributed throughout the heart
      // by verifying we have particles in different regions
      const regions = {
        upperLeft: 0,
        upperRight: 0,
        middle: 0,
        lowerLeft: 0,
        lowerRight: 0,
        bottom: 0
      };
      
      for (const pos of positions) {
        if (pos.y > 0.5) {
          if (pos.x < -0.2) regions.upperLeft++;
          else if (pos.x > 0.2) regions.upperRight++;
        } else if (pos.y > 0) {
          regions.middle++;
        } else if (pos.y > -0.5) {
          if (pos.x < 0) regions.lowerLeft++;
          else regions.lowerRight++;
        } else {
          regions.bottom++;
        }
      }
      
      // Each region should have at least some particles
      expect(regions.upperLeft).toBeGreaterThan(0);
      expect(regions.upperRight).toBeGreaterThan(0);
      expect(regions.middle).toBeGreaterThan(0);
      expect(regions.lowerLeft).toBeGreaterThan(0);
      expect(regions.lowerRight).toBeGreaterThan(0);
      expect(regions.bottom).toBeGreaterThan(0);
    });
  });
});
