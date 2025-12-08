/**
 * Optimization Tests
 * Verify that all optimization parameters are correctly applied
 */

import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../engines/PhysicsEngine';
import { InteractionManager } from '../engines/InteractionManager';
import { ShapeGenerator } from '../shapes/ShapeGenerator';
import {
  PHYSICS_CONFIG,
  INTERACTION_CONFIG,
  SHAPE_CONFIG,
  RENDERING_CONFIG,
  COLOR_CONFIG,
  PERFORMANCE_CONFIG
} from '../config/optimizationConfig';

describe('Optimization Configuration Tests', () => {
  describe('Physics Engine Optimization', () => {
    it('should use optimized physics parameters', () => {
      const engine = new PhysicsEngine();
      const config = engine.getConfig();
      
      // Verify optimized values
      expect(config.damping).toBe(0.92);
      expect(config.maxSpeed).toBe(12.0);
      expect(config.maxAcceleration).toBe(6.0);
      expect(config.attractionStrength).toBe(3.5);
      expect(config.attractionRadius).toBe(0.8);
      expect(config.explosionStrength).toBe(7.0);
      expect(config.explosionDuration).toBe(0.4);
    });
    
    it('should match centralized physics config', () => {
      const engine = new PhysicsEngine();
      const config = engine.getConfig();
      
      expect(config.damping).toBe(PHYSICS_CONFIG.damping);
      expect(config.maxSpeed).toBe(PHYSICS_CONFIG.maxSpeed);
      expect(config.attractionStrength).toBe(PHYSICS_CONFIG.attractionStrength);
    });
  });
  
  describe('Interaction Manager Optimization', () => {
    it('should use optimized wave storm parameters', () => {
      const manager = new InteractionManager();
      const config = manager.getConfig();
      
      expect(config.waveStorm.velocityThreshold).toBe(4.0);
      expect(config.waveStorm.forceStrength).toBe(10.0);
      expect(config.waveStorm.influenceRadius).toBe(2.5);
    });
    
    it('should use optimized depth scale parameters', () => {
      const manager = new InteractionManager();
      const config = manager.getConfig();
      
      expect(config.depthScale.minScale).toBe(0.6);
      expect(config.depthScale.maxScale).toBe(2.5);
      expect(config.depthScale.smoothing).toBe(0.15);
    });
    
    it('should use optimized explosion transition parameters', () => {
      const manager = new InteractionManager();
      const config = manager.getConfig();
      
      expect(config.explosionTransition.explosionStrength).toBe(7.0);
      expect(config.explosionTransition.explosionDuration).toBe(0.4);
    });
    
    it('should use optimized finger heart spread parameters', () => {
      const manager = new InteractionManager();
      const config = manager.getConfig();
      
      expect(config.fingerHeartSpread.colorTransitionDuration).toBe(0.6);
      expect(config.fingerHeartSpread.spreadStrength).toBe(8.0);
    });
    
    it('should match centralized interaction config', () => {
      const manager = new InteractionManager();
      const config = manager.getConfig();
      
      expect(config.waveStorm.velocityThreshold).toBe(INTERACTION_CONFIG.waveStorm.velocityThreshold);
      expect(config.depthScale.minScale).toBe(INTERACTION_CONFIG.depthScale.minScale);
    });
  });
  
  describe('Shape Generation Optimization', () => {
    it('should generate planet with optimized radius', () => {
      const generator = new ShapeGenerator();
      const result = generator.generatePlanet(100, 3.5);
      
      expect(result.positions.length).toBe(100);
      expect(result.colors.length).toBe(100);
      
      // Verify particles are on sphere surface with optimized radius
      const avgDistance = result.positions.reduce((sum, pos) => {
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        return sum + dist;
      }, 0) / result.positions.length;
      
      expect(avgDistance).toBeCloseTo(3.5, 0.5);
    });
    
    it('should use optimized gold-blue gradient colors', () => {
      const generator = new ShapeGenerator();
      const result = generator.generatePlanet(100, 3.5);
      
      // Check that colors are in the gold-blue range
      const hasGoldish = result.colors.some(c => c.r > 0.8 && c.g > 0.7);
      const hasBluish = result.colors.some(c => c.b > 0.8 && c.g > 0.4);
      
      expect(hasGoldish).toBe(true);
      expect(hasBluish).toBe(true);
    });
    
    it('should generate torus with optimized dimensions', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateTorus(100, 3.5, 1.2);
      
      expect(positions.length).toBe(100);
      
      // Verify torus geometry with optimized radii
      const distances = positions.map(pos => {
        const xyDist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        return xyDist;
      });
      
      const avgXYDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      expect(avgXYDist).toBeGreaterThan(2.0); // Should be around majorRadius
      expect(avgXYDist).toBeLessThan(5.0);
    });
    
    it('should generate star with optimized dimensions', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateStar(100, 3.5, 1.4);
      
      expect(positions.length).toBe(100);
      
      // Verify star points are within optimized radius
      const maxDist = Math.max(...positions.map(pos => 
        Math.sqrt(pos.x * pos.x + pos.y * pos.y)
      ));
      
      expect(maxDist).toBeLessThanOrEqual(3.6); // Should be close to outerRadius
    });
    
    it('should generate heart with optimized scale', () => {
      const generator = new ShapeGenerator();
      const positions = generator.generateHeart(100, 1.8);
      
      expect(positions.length).toBe(100);
      
      // Verify heart is properly scaled
      const maxY = Math.max(...positions.map(pos => pos.y));
      const minY = Math.min(...positions.map(pos => pos.y));
      
      expect(maxY - minY).toBeGreaterThan(2.0); // Should be larger with increased scale
    });
    
    it('should generate arrow heart with optimized pink color', () => {
      const generator = new ShapeGenerator();
      const result = generator.generateArrowHeart(100, 1.8);
      
      expect(result.positions.length).toBe(100);
      expect(result.colors.length).toBe(100);
      
      // Verify all colors are the optimized pink
      result.colors.forEach(color => {
        expect(color.r).toBe(1.0);
        expect(color.g).toBe(0.5); // Increased from 0.4
        expect(color.b).toBe(0.75); // Increased from 0.7
      });
    });
  });
  
  describe('Color Configuration', () => {
    it('should define optimized color palette', () => {
      expect(COLOR_CONFIG.cyan).toEqual({ r: 0.0, g: 1.0, b: 1.0 });
      expect(COLOR_CONFIG.pink).toEqual({ r: 1.0, g: 0.5, b: 0.75 });
      expect(COLOR_CONFIG.gold).toEqual({ r: 1.0, g: 0.88, b: 0.1 });
      expect(COLOR_CONFIG.blue).toEqual({ r: 0.0, g: 0.6, b: 1.0 });
    });
  });
  
  describe('Rendering Configuration', () => {
    it('should define optimized rendering parameters', () => {
      expect(RENDERING_CONFIG.particleSize).toBe(0.06);
      expect(RENDERING_CONFIG.opacity).toBe(0.85);
      expect(RENDERING_CONFIG.cameraFOV).toBe(70);
      expect(RENDERING_CONFIG.cameraPosition.z).toBe(6);
      expect(RENDERING_CONFIG.backgroundColor).toBe(0x0a0a0a);
    });
  });
  
  describe('Performance Configuration', () => {
    it('should define optimized performance parameters', () => {
      expect(PERFORMANCE_CONFIG.targetFPS).toBe(60);
      expect(PERFORMANCE_CONFIG.lowFPSThreshold).toBe(25);
      expect(PERFORMANCE_CONFIG.criticalFPSThreshold).toBe(15);
      expect(PERFORMANCE_CONFIG.gestureDetectionInterval).toBe(40);
    });
  });
  
  describe('Integration Tests', () => {
    it('should create physics engine with optimized parameters', () => {
      const engine = new PhysicsEngine();
      engine.initialize(100);
      
      const particleData = engine.getParticleData();
      expect(particleData).not.toBeNull();
      expect(particleData?.getCount()).toBe(100);
      
      // Verify damping is optimized
      expect(particleData?.damping).toBe(0.92);
    });
    
    it('should create interaction manager with optimized parameters', () => {
      const manager = new InteractionManager();
      const engine = new PhysicsEngine();
      engine.initialize(100);
      
      manager.setPhysicsEngine(engine);
      
      // Test wave storm with optimized threshold
      const velocity = { x: 4.5, y: 0, z: 0 }; // Above new threshold of 4.0
      expect(manager.checkWaveStorm(velocity)).toBe(true);
      
      const lowVelocity = { x: 3.5, y: 0, z: 0 }; // Below threshold
      expect(manager.checkWaveStorm(lowVelocity)).toBe(false);
    });
    
    it('should apply optimized scale range', () => {
      const manager = new InteractionManager();
      
      // Test with minimum area ratio
      manager.updateScale(0.05);
      expect(manager.getCurrentScale()).toBeGreaterThanOrEqual(0.6);
      
      // Test with maximum area ratio
      manager.updateScale(0.3);
      // Scale should approach maxScale (2.5) with smoothing
      expect(manager.getCurrentScale()).toBeLessThanOrEqual(2.5);
    });
  });
  
  describe('Visual Quality Tests', () => {
    it('should generate shapes with improved visibility', () => {
      const generator = new ShapeGenerator();
      
      // All shapes should use larger dimensions for better visibility
      const planet = generator.generatePlanet(100, 3.5);
      const torus = generator.generateTorus(100, 3.5, 1.2);
      const star = generator.generateStar(100, 3.5, 1.4);
      const heart = generator.generateHeart(100, 1.8);
      const arrowHeart = generator.generateArrowHeart(100, 1.8);
      
      expect(planet.positions.length).toBe(100);
      expect(torus.length).toBe(100);
      expect(star.length).toBe(100);
      expect(heart.length).toBe(100);
      expect(arrowHeart.positions.length).toBe(100);
    });
    
    it('should use brighter colors for better visibility', () => {
      const generator = new ShapeGenerator();
      
      // Planet should have brighter gold-blue gradient
      const planet = generator.generatePlanet(10, 3.5);
      const avgGreen = planet.colors.reduce((sum, c) => sum + c.g, 0) / planet.colors.length;
      expect(avgGreen).toBeGreaterThan(0.6); // Should be brighter
      
      // Arrow heart should have brighter pink
      const arrowHeart = generator.generateArrowHeart(10, 1.8);
      arrowHeart.colors.forEach(color => {
        expect(color.g).toBe(0.5); // Brighter than 0.4
        expect(color.b).toBe(0.75); // Brighter than 0.7
      });
    });
  });
  
  describe('Performance Optimization Tests', () => {
    it('should have faster attraction for quicker shape formation', () => {
      const engine = new PhysicsEngine();
      const config = engine.getConfig();
      
      // Attraction strength should be increased
      expect(config.attractionStrength).toBeGreaterThan(2.0);
      expect(config.attractionStrength).toBe(3.5);
    });
    
    it('should have more dramatic explosions', () => {
      const engine = new PhysicsEngine();
      const config = engine.getConfig();
      
      // Explosion strength should be increased
      expect(config.explosionStrength).toBeGreaterThan(5.0);
      expect(config.explosionStrength).toBe(7.0);
    });
    
    it('should have smoother transitions', () => {
      const engine = new PhysicsEngine();
      const config = engine.getConfig();
      
      // Explosion duration should be increased for smoother transitions
      expect(config.explosionDuration).toBeGreaterThan(0.3);
      expect(config.explosionDuration).toBe(0.4);
    });
  });
});
