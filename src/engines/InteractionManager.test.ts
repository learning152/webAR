import { describe, it, expect, beforeEach } from 'vitest';
import { InteractionManager } from './InteractionManager';
import { PhysicsEngine } from './PhysicsEngine';
import { ShapeType } from '../shapes/ShapeGenerator';
import { GestureType } from './GestureEngine';

describe('InteractionManager', () => {
  let manager: InteractionManager;
  let engine: PhysicsEngine;
  
  beforeEach(() => {
    manager = new InteractionManager();
    engine = new PhysicsEngine();
    engine.initialize(100);
    manager.setPhysicsEngine(engine);
  });
  
  describe('checkWaveStorm', () => {
    it('should return true when velocity exceeds threshold', () => {
      const velocity = { x: 6, y: 0, z: 0 }; // Speed = 6 > 5 (default threshold)
      expect(manager.checkWaveStorm(velocity)).toBe(true);
    });
    
    it('should return false when velocity is below threshold', () => {
      const velocity = { x: 3, y: 0, z: 0 }; // Speed = 3 < 5 (default threshold)
      expect(manager.checkWaveStorm(velocity)).toBe(false);
    });
    
    it('should calculate velocity magnitude correctly for 3D vectors', () => {
      const velocity = { x: 3, y: 4, z: 0 }; // Speed = 5 (above optimized threshold of 4.0)
      expect(manager.checkWaveStorm(velocity)).toBe(true); // Should be true (exceeding optimized threshold)
      
      const velocity2 = { x: 3, y: 4, z: 0.1 }; // Speed > 5
      expect(manager.checkWaveStorm(velocity2)).toBe(true);
    });
  });
  
  describe('applyWaveForce', () => {
    it('should apply force to particles within influence radius', () => {
      const particleData = engine.getParticleData()!;
      
      // Place a particle at origin
      particleData.setParticle(0, {
        position: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      // Apply wave force from nearby
      const handCenter = { x: 0.5, y: 0, z: 0 }; // Within default radius of 2.0
      const direction = { x: 1, y: 0, z: 0 };
      
      manager.applyWaveForce(handCenter, direction);
      
      const particle = particleData.getParticle(0);
      
      // Particle should have received some acceleration in x direction
      expect(particle.acceleration.x).toBeGreaterThan(0);
    });
    
    it('should not apply force to particles outside influence radius', () => {
      const particleData = engine.getParticleData()!;
      
      // Place a particle far away
      particleData.setParticle(0, {
        position: { x: 10, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      // Apply wave force from origin
      const handCenter = { x: 0, y: 0, z: 0 };
      const direction = { x: 1, y: 0, z: 0 };
      
      manager.applyWaveForce(handCenter, direction);
      
      const particle = particleData.getParticle(0);
      
      // Particle should have zero acceleration
      expect(particle.acceleration.x).toBe(0);
      expect(particle.acceleration.y).toBe(0);
      expect(particle.acceleration.z).toBe(0);
    });
    
    it('should apply stronger force to closer particles', () => {
      const particleData = engine.getParticleData()!;
      
      // Place two particles at different distances
      particleData.setParticle(0, {
        position: { x: 0.5, y: 0, z: 0 }, // Closer
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      particleData.setParticle(1, {
        position: { x: 1.5, y: 0, z: 0 }, // Farther
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      // Apply wave force from origin
      const handCenter = { x: 0, y: 0, z: 0 };
      const direction = { x: 1, y: 0, z: 0 };
      
      manager.applyWaveForce(handCenter, direction);
      
      const particle0 = particleData.getParticle(0);
      const particle1 = particleData.getParticle(1);
      
      // Closer particle should have stronger acceleration
      const accel0 = Math.sqrt(
        particle0.acceleration.x ** 2 +
        particle0.acceleration.y ** 2 +
        particle0.acceleration.z ** 2
      );
      
      const accel1 = Math.sqrt(
        particle1.acceleration.x ** 2 +
        particle1.acceleration.y ** 2 +
        particle1.acceleration.z ** 2
      );
      
      expect(accel0).toBeGreaterThan(accel1);
    });
    
    it('should normalize direction vector', () => {
      const particleData = engine.getParticleData()!;
      
      // Place a particle at origin
      particleData.setParticle(0, {
        position: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      // Apply wave force with non-normalized direction
      const handCenter = { x: 0.5, y: 0, z: 0 };
      const direction = { x: 10, y: 0, z: 0 }; // Large magnitude
      
      manager.applyWaveForce(handCenter, direction);
      
      const particle = particleData.getParticle(0);
      
      // Should still apply reasonable force (not scaled by direction magnitude)
      expect(particle.acceleration.x).toBeGreaterThan(0);
      expect(particle.acceleration.x).toBeLessThan(100); // Not scaled by 10
    });
  });
  
  describe('updateScale', () => {
    it('should update scale based on area ratio', () => {
      const initialScale = manager.getCurrentScale();
      
      // Update with a larger area ratio
      manager.updateScale(0.2);
      
      // Scale should change (may take multiple updates due to smoothing)
      for (let i = 0; i < 20; i++) {
        manager.updateScale(0.2);
      }
      
      const newScale = manager.getCurrentScale();
      expect(newScale).not.toBe(initialScale);
    });
    
    it('should clamp area ratio to valid range', () => {
      // Very small area ratio
      manager.updateScale(0.01);
      for (let i = 0; i < 20; i++) {
        manager.updateScale(0.01);
      }
      const minScale = manager.getCurrentScale();
      
      // Very large area ratio
      manager.updateScale(0.5);
      for (let i = 0; i < 20; i++) {
        manager.updateScale(0.5);
      }
      const maxScale = manager.getCurrentScale();
      
      // Should be within configured range
      const config = manager.getConfig();
      expect(minScale).toBeGreaterThanOrEqual(config.depthScale.minScale * 0.9);
      expect(maxScale).toBeLessThanOrEqual(config.depthScale.maxScale * 1.1);
    });
    
    it('should smooth scale transitions', () => {
      const initialScale = manager.getCurrentScale();
      
      // Single update should not jump to target immediately
      manager.updateScale(0.3);
      const afterOneUpdate = manager.getCurrentScale();
      
      // Should have moved but not reached target
      expect(afterOneUpdate).not.toBe(initialScale);
      
      // Multiple updates should converge to target
      for (let i = 0; i < 100; i++) {
        manager.updateScale(0.3);
      }
      const convergedScale = manager.getCurrentScale();
      
      // Should be closer to target than after one update
      expect(Math.abs(convergedScale - afterOneUpdate)).toBeGreaterThan(0);
    });
  });
  
  describe('triggerTransition', () => {
    it('should trigger explosion in physics engine', () => {
      expect(engine.isExplosionActive()).toBe(false);
      
      manager.triggerTransition(ShapeType.PLANET);
      
      expect(engine.isExplosionActive()).toBe(true);
    });
    
    it('should trigger explosion at specified center', () => {
      const center = { x: 5, y: 5, z: 5 };
      manager.triggerTransition(ShapeType.TORUS, center);
      
      expect(engine.isExplosionActive()).toBe(true);
    });
    
    it('should mark transition as active', () => {
      expect(manager.isInTransition()).toBe(false);
      
      manager.triggerTransition(ShapeType.STAR);
      
      expect(manager.isInTransition()).toBe(true);
    });
    
    it('should update target shape after explosion duration', () => {
      const particleData = engine.getParticleData()!;
      
      // Store initial target positions
      const initialTargets = [];
      for (let i = 0; i < 10; i++) {
        const particle = particleData.getParticle(i);
        initialTargets.push({ ...particle.targetPosition });
      }
      
      // Trigger transition to planet
      manager.triggerTransition(ShapeType.PLANET);
      
      // Simulate time passing (explosion duration is 0.3s by default)
      const deltaTime = 0.1;
      for (let i = 0; i < 4; i++) {
        manager.update(null, deltaTime);
      }
      
      // Check that target positions have changed
      let targetsChanged = false;
      for (let i = 0; i < 10; i++) {
        const particle = particleData.getParticle(i);
        if (
          Math.abs(particle.targetPosition.x - initialTargets[i].x) > 0.01 ||
          Math.abs(particle.targetPosition.y - initialTargets[i].y) > 0.01 ||
          Math.abs(particle.targetPosition.z - initialTargets[i].z) > 0.01
        ) {
          targetsChanged = true;
          break;
        }
      }
      
      expect(targetsChanged).toBe(true);
    });
    
    it('should reset transition state after completion', () => {
      manager.triggerTransition(ShapeType.HEART);
      
      expect(manager.isInTransition()).toBe(true);
      
      // Simulate time passing beyond explosion duration
      const deltaTime = 0.1;
      for (let i = 0; i < 5; i++) {
        manager.update(null, deltaTime);
      }
      
      expect(manager.isInTransition()).toBe(false);
    });
    
    it('should update colors for planet shape', () => {
      const particleData = engine.getParticleData()!;
      
      // Trigger transition to planet
      manager.triggerTransition(ShapeType.PLANET);
      
      // Simulate time passing
      const deltaTime = 0.1;
      for (let i = 0; i < 4; i++) {
        manager.update(null, deltaTime);
      }
      
      // Check that colors have changed from cyan (0, 1, 1)
      let colorsChanged = false;
      for (let i = 0; i < 10; i++) {
        const particle = particleData.getParticle(i);
        if (
          Math.abs(particle.color.r - 0) > 0.01 ||
          Math.abs(particle.color.g - 1) > 0.01 ||
          Math.abs(particle.color.b - 1) > 0.01
        ) {
          colorsChanged = true;
          break;
        }
      }
      
      expect(colorsChanged).toBe(true);
    });
    
    it('should update colors to pink for arrow heart shape', () => {
      const particleData = engine.getParticleData()!;
      
      // Trigger transition to arrow heart
      manager.triggerTransition(ShapeType.ARROW_HEART);
      
      // Simulate time passing
      const deltaTime = 0.1;
      for (let i = 0; i < 4; i++) {
        manager.update(null, deltaTime);
      }
      
      // Check that colors are pink (1.0, 0.5, 0.75) - optimized brighter pink
      const particle = particleData.getParticle(0);
      expect(particle.color.r).toBeCloseTo(1.0, 1);
      expect(particle.color.g).toBeCloseTo(0.5, 1);
      expect(particle.color.b).toBeCloseTo(0.75, 1);
    });
    
    it('should apply diverse colors for non-special shapes', () => {
      const particleData = engine.getParticleData()!;
      
      // Trigger transition to torus
      manager.triggerTransition(ShapeType.TORUS);
      
      // Simulate time passing
      const deltaTime = 0.1;
      for (let i = 0; i < 4; i++) {
        manager.update(null, deltaTime);
      }
      
      // Check that colors are valid RGB values (diverse colors now applied)
      const particle = particleData.getParticle(0);
      expect(particle.color.r).toBeGreaterThanOrEqual(0);
      expect(particle.color.r).toBeLessThanOrEqual(1);
      expect(particle.color.g).toBeGreaterThanOrEqual(0);
      expect(particle.color.g).toBeLessThanOrEqual(1);
      expect(particle.color.b).toBeGreaterThanOrEqual(0);
      expect(particle.color.b).toBeLessThanOrEqual(1);
    });
  });
  
  describe('update', () => {
    it('should handle null hand data', () => {
      // Should not throw
      expect(() => manager.update(null, 0.016)).not.toThrow();
    });
    
    it('should apply wave storm when velocity exceeds threshold', () => {
      const particleData = engine.getParticleData()!;
      
      // Place a particle at origin
      particleData.setParticle(0, {
        position: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 }
      });
      
      // Create hand data with high velocity
      const handData = {
        landmarks: [],
        center: { x: 0.5, y: 0, z: 0 },
        velocity: { x: 10, y: 0, z: 0 }, // High velocity
        areaRatio: 0.1,
        rotation: { x: 0, y: 0, z: 0 }
      };
      
      manager.update(handData, 0.016);
      
      const particle = particleData.getParticle(0);
      
      // Particle should have received acceleration
      expect(particle.acceleration.x).toBeGreaterThan(0);
    });
    
    it('should update scale based on hand area ratio', () => {
      const initialScale = manager.getCurrentScale();
      
      const handData = {
        landmarks: [],
        center: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        areaRatio: 0.2,
        rotation: { x: 0, y: 0, z: 0 }
      };
      
      // Multiple updates to see scale change
      for (let i = 0; i < 20; i++) {
        manager.update(handData, 0.016);
      }
      
      const newScale = manager.getCurrentScale();
      expect(newScale).not.toBe(initialScale);
    });
    
    it('should update transition state over time', () => {
      manager.triggerTransition(ShapeType.STAR);
      
      expect(manager.isInTransition()).toBe(true);
      expect(manager.getTransitionProgress()).toBeCloseTo(0, 1);
      
      // Update with deltaTime
      manager.update(null, 0.15);
      
      expect(manager.isInTransition()).toBe(true);
      expect(manager.getTransitionProgress()).toBeGreaterThan(0);
      expect(manager.getTransitionProgress()).toBeLessThan(1);
      
      // Complete the transition (now 0.4s duration instead of 0.3s)
      manager.update(null, 0.3); // Need more time due to optimized duration
      
      expect(manager.isInTransition()).toBe(false);
      expect(manager.getTransitionProgress()).toBe(1.0);
    });
  });
  
  describe('configuration', () => {
    it('should use default configuration', () => {
      const config = manager.getConfig();
      
      // Optimized values
      expect(config.waveStorm.velocityThreshold).toBe(4.0);
      expect(config.waveStorm.forceStrength).toBe(10.0);
      expect(config.waveStorm.influenceRadius).toBe(2.5);
      expect(config.depthScale.minScale).toBe(0.6);
      expect(config.depthScale.maxScale).toBe(2.5);
      expect(config.depthScale.smoothing).toBe(0.15);
      expect(config.explosionTransition.explosionStrength).toBe(7.0);
      expect(config.explosionTransition.explosionDuration).toBe(0.4);
    });
    
    it('should accept custom configuration', () => {
      const customManager = new InteractionManager({
        waveStorm: {
          velocityThreshold: 10.0,
          forceStrength: 15.0,
          influenceRadius: 3.0
        },
        explosionTransition: {
          explosionStrength: 8.0,
          explosionDuration: 0.5
        }
      });
      
      const config = customManager.getConfig();
      
      expect(config.waveStorm.velocityThreshold).toBe(10.0);
      expect(config.waveStorm.forceStrength).toBe(15.0);
      expect(config.waveStorm.influenceRadius).toBe(3.0);
      expect(config.explosionTransition.explosionStrength).toBe(8.0);
      expect(config.explosionTransition.explosionDuration).toBe(0.5);
    });
    
    it('should allow configuration updates', () => {
      manager.updateConfig({
        waveStorm: {
          velocityThreshold: 7.0,
          forceStrength: 12.0,
          influenceRadius: 2.5
        },
        explosionTransition: {
          explosionStrength: 6.0,
          explosionDuration: 0.4
        }
      });
      
      const config = manager.getConfig();
      
      expect(config.waveStorm.velocityThreshold).toBe(7.0);
      expect(config.waveStorm.forceStrength).toBe(12.0);
      expect(config.waveStorm.influenceRadius).toBe(2.5);
      expect(config.explosionTransition.explosionStrength).toBe(6.0);
      expect(config.explosionTransition.explosionDuration).toBe(0.4);
    });
  });
  
  describe('getTransitionProgress', () => {
    it('should return 1.0 when not transitioning', () => {
      expect(manager.getTransitionProgress()).toBe(1.0);
    });
    
    it('should return progress between 0 and 1 during transition', () => {
      manager.triggerTransition(ShapeType.HEART);
      
      // At start
      expect(manager.getTransitionProgress()).toBeCloseTo(0, 1);
      
      // Midway
      manager.update(null, 0.15);
      const midProgress = manager.getTransitionProgress();
      expect(midProgress).toBeGreaterThan(0);
      expect(midProgress).toBeLessThan(1);
      
      // Complete (now 0.4s duration instead of 0.3s)
      manager.update(null, 0.3); // Need more time due to optimized duration
      expect(manager.getTransitionProgress()).toBe(1.0);
    });
  });
  
  /**
   * 手指比心散开效果测试
   * 需求: 9.4, 9.5
   */
  describe('fingerHeartSpread', () => {
    describe('isFingerHeartToOpenHand', () => {
      it('should detect transition from FINGER_HEART to OPEN_HAND', () => {
        expect(manager.isFingerHeartToOpenHand(
          GestureType.FINGER_HEART,
          GestureType.OPEN_HAND
        )).toBe(true);
      });
      
      it('should return false for other transitions', () => {
        // OPEN_HAND to FINGER_HEART (reverse)
        expect(manager.isFingerHeartToOpenHand(
          GestureType.OPEN_HAND,
          GestureType.FINGER_HEART
        )).toBe(false);
        
        // FINGER_HEART to FIST
        expect(manager.isFingerHeartToOpenHand(
          GestureType.FINGER_HEART,
          GestureType.FIST
        )).toBe(false);
        
        // NONE to OPEN_HAND
        expect(manager.isFingerHeartToOpenHand(
          GestureType.NONE,
          GestureType.OPEN_HAND
        )).toBe(false);
      });
    });
    
    describe('triggerFingerHeartSpread', () => {
      it('should mark finger heart spread as active', () => {
        expect(manager.isInFingerHeartSpread()).toBe(false);
        
        manager.triggerFingerHeartSpread();
        
        expect(manager.isInFingerHeartSpread()).toBe(true);
      });
      
      it('should apply radial force to particles', () => {
        const particleData = engine.getParticleData()!;
        
        // Place a particle away from origin
        particleData.setParticle(0, {
          position: { x: 1, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 }
        });
        
        manager.triggerFingerHeartSpread();
        
        const particle = particleData.getParticle(0);
        
        // Particle should have received outward acceleration
        expect(particle.acceleration.x).toBeGreaterThan(0);
      });
      
      it('should apply force from specified center', () => {
        const particleData = engine.getParticleData()!;
        
        // Place a particle at origin
        particleData.setParticle(0, {
          position: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 }
        });
        
        // Trigger spread from a different center
        manager.triggerFingerHeartSpread({ x: 1, y: 0, z: 0 });
        
        const particle = particleData.getParticle(0);
        
        // Particle should have received acceleration away from center (negative x)
        expect(particle.acceleration.x).toBeLessThan(0);
      });
    });
    
    describe('color transition', () => {
      it('should transition colors from pink to cyan over time', () => {
        const particleData = engine.getParticleData()!;
        
        // Set initial pink color
        particleData.setParticle(0, {
          color: { r: 1.0, g: 0.4, b: 0.7 }
        });
        
        manager.triggerFingerHeartSpread();
        
        // Update halfway through transition (optimized duration is 0.6s)
        manager.update(null, 0.3);
        
        const midParticle = particleData.getParticle(0);
        
        // Colors should be between pink and cyan
        expect(midParticle.color.r).toBeLessThan(1.0);
        expect(midParticle.color.r).toBeGreaterThan(0);
        expect(midParticle.color.g).toBeGreaterThan(0.5); // Updated from 0.4 for optimized pink
        expect(midParticle.color.g).toBeLessThan(1.0);
        
        // Complete the transition
        manager.update(null, 0.4); // Need more time due to optimized duration (0.6s total)
        
        const finalParticle = particleData.getParticle(0);
        
        // Colors should be cyan
        expect(finalParticle.color.r).toBeCloseTo(0, 1);
        expect(finalParticle.color.g).toBeCloseTo(1, 1);
        expect(finalParticle.color.b).toBeCloseTo(1, 1);
      });
      
      it('should complete spread after color transition duration', () => {
        manager.triggerFingerHeartSpread();
        
        expect(manager.isInFingerHeartSpread()).toBe(true);
        
        // Update past the transition duration (default 0.5s)
        manager.update(null, 0.6);
        
        expect(manager.isInFingerHeartSpread()).toBe(false);
      });
    });
    
    describe('handleGestureChange', () => {
      it('should trigger spread when transitioning from FINGER_HEART to OPEN_HAND', () => {
        expect(manager.isInFingerHeartSpread()).toBe(false);
        
        manager.handleGestureChange(
          GestureType.FINGER_HEART,
          GestureType.OPEN_HAND
        );
        
        expect(manager.isInFingerHeartSpread()).toBe(true);
      });
      
      it('should not trigger spread for other transitions', () => {
        manager.handleGestureChange(
          GestureType.OPEN_HAND,
          GestureType.FIST
        );
        
        expect(manager.isInFingerHeartSpread()).toBe(false);
      });
      
      it('should use provided center for spread', () => {
        const particleData = engine.getParticleData()!;
        
        // Place a particle at origin
        particleData.setParticle(0, {
          position: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 }
        });
        
        manager.handleGestureChange(
          GestureType.FINGER_HEART,
          GestureType.OPEN_HAND,
          { x: 1, y: 0, z: 0 }
        );
        
        const particle = particleData.getParticle(0);
        
        // Particle should have received acceleration away from center
        expect(particle.acceleration.x).toBeLessThan(0);
      });
    });
    
    describe('getFingerHeartSpreadProgress', () => {
      it('should return 1.0 when not spreading', () => {
        expect(manager.getFingerHeartSpreadProgress()).toBe(1.0);
      });
      
      it('should return progress between 0 and 1 during spread', () => {
        manager.triggerFingerHeartSpread();
        
        // At start
        expect(manager.getFingerHeartSpreadProgress()).toBeCloseTo(0, 1);
        
        // Midway (optimized duration is 0.6s)
        manager.update(null, 0.3);
        const midProgress = manager.getFingerHeartSpreadProgress();
        expect(midProgress).toBeGreaterThan(0);
        expect(midProgress).toBeLessThan(1);
        
        // Complete
        manager.update(null, 0.4); // Need more time due to optimized duration
        expect(manager.getFingerHeartSpreadProgress()).toBe(1.0);
      });
    });
    
    describe('configuration', () => {
      it('should use default finger heart spread configuration', () => {
        const config = manager.getConfig();
        
        expect(config.fingerHeartSpread.colorTransitionDuration).toBe(0.6); // Optimized from 0.5
        expect(config.fingerHeartSpread.spreadStrength).toBe(8.0); // Optimized from 6.0
      });
      
      it('should accept custom finger heart spread configuration', () => {
        const customManager = new InteractionManager({
          fingerHeartSpread: {
            colorTransitionDuration: 1.0,
            spreadStrength: 10.0
          }
        });
        customManager.setPhysicsEngine(engine);
        
        const config = customManager.getConfig();
        
        expect(config.fingerHeartSpread.colorTransitionDuration).toBe(1.0);
        expect(config.fingerHeartSpread.spreadStrength).toBe(10.0);
      });
      
      it('should allow updating finger heart spread configuration', () => {
        manager.updateConfig({
          fingerHeartSpread: {
            colorTransitionDuration: 0.8,
            spreadStrength: 12.0
          }
        });
        
        const config = manager.getConfig();
        
        expect(config.fingerHeartSpread.colorTransitionDuration).toBe(0.8);
        expect(config.fingerHeartSpread.spreadStrength).toBe(12.0);
      });
    });
  });
});
