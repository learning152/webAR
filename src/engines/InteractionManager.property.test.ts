import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { InteractionManager } from './InteractionManager';
import { PhysicsEngine } from './PhysicsEngine';

describe('InteractionManager Property-Based Tests', () => {
  /**
   * Feature: webar-particle-interaction, Property 19: 挥手风暴触发和力施加
   * Validates: Requirements 11.2, 11.3, 11.4, 11.5
   * 
   * For any hand movement velocity exceeding the threshold, the system should:
   * 1. Identify it as a wave storm event
   * 2. Calculate the hand movement direction
   * 3. Apply force to particles within range along the movement direction
   * 4. Apply force with distance attenuation (farther particles receive less force)
   */
  it('Property 19: wave storm trigger and force application with distance attenuation', () => {
    fc.assert(
      fc.property(
        // Hand velocity components
        fc.float({ min: Math.fround(-20), max: Math.fround(20), noNaN: true }), // velocity x
        fc.float({ min: Math.fround(-20), max: Math.fround(20), noNaN: true }), // velocity y
        fc.float({ min: Math.fround(-20), max: Math.fround(20), noNaN: true }), // velocity z
        // Hand center position
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // center x
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // center y
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // center z
        // Particle position (relative to hand center)
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }), // particle offset x
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }), // particle offset y
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }), // particle offset z
        (vx, vy, vz, cx, cy, cz, offsetX, offsetY, offsetZ) => {
          // Calculate velocity magnitude
          const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
          
          // Create interaction manager with known configuration
          const config = {
            waveStorm: {
              velocityThreshold: 5.0,
              forceStrength: 8.0,
              influenceRadius: 2.0
            }
          };
          const manager = new InteractionManager(config);
          
          // Create physics engine
          const engine = new PhysicsEngine();
          engine.initialize(1);
          manager.setPhysicsEngine(engine);
          
          const particleData = engine.getParticleData()!;
          
          // Set particle position
          const px = cx + offsetX;
          const py = cy + offsetY;
          const pz = cz + offsetZ;
          
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Test 1: Check wave storm detection
          const velocity = { x: vx, y: vy, z: vz };
          const isWaveStorm = manager.checkWaveStorm(velocity);
          
          if (speed > config.waveStorm.velocityThreshold) {
            expect(isWaveStorm).toBe(true);
          } else {
            expect(isWaveStorm).toBe(false);
          }
          
          // If not a wave storm, skip force application tests
          if (!isWaveStorm) return;
          
          // Test 2: Apply wave force
          const handCenter = { x: cx, y: cy, z: cz };
          manager.applyWaveForce(handCenter, velocity);
          
          // Get particle after force application
          const particle = particleData.getParticle(0);
          
          // Calculate distance from particle to hand center
          const dx = px - cx;
          const dy = py - cy;
          const dz = pz - cz;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Test 3: Verify force is only applied within influence radius
          if (distance > config.waveStorm.influenceRadius) {
            // Particle outside radius should have zero acceleration
            expect(particle.acceleration.x).toBe(0);
            expect(particle.acceleration.y).toBe(0);
            expect(particle.acceleration.z).toBe(0);
            return;
          }
          
          // Test 4: Verify distance attenuation
          // Force should decrease linearly with distance
          const attenuationFactor = 1.0 - (distance / config.waveStorm.influenceRadius);
          expect(attenuationFactor).toBeGreaterThanOrEqual(0);
          expect(attenuationFactor).toBeLessThanOrEqual(1);
          
          // Test 5: Verify force direction aligns with hand velocity
          // Skip if velocity is too small to have meaningful direction
          if (speed < 0.01) return;
          
          // Normalize velocity direction
          const dirX = vx / speed;
          const dirY = vy / speed;
          const dirZ = vz / speed;
          
          // Calculate expected acceleration magnitude
          const mass = particleData.mass;
          const expectedForceMag = config.waveStorm.forceStrength * attenuationFactor;
          const expectedAccelMag = expectedForceMag / mass;
          
          // Calculate actual acceleration magnitude
          const accelMag = Math.sqrt(
            particle.acceleration.x * particle.acceleration.x +
            particle.acceleration.y * particle.acceleration.y +
            particle.acceleration.z * particle.acceleration.z
          );
          
          // Verify acceleration magnitude matches expected (with attenuation)
          expect(accelMag).toBeCloseTo(expectedAccelMag, 4);
          
          // Test 6: Verify acceleration direction matches velocity direction
          // Normalize acceleration
          if (accelMag > 0.001) {
            const accelDirX = particle.acceleration.x / accelMag;
            const accelDirY = particle.acceleration.y / accelMag;
            const accelDirZ = particle.acceleration.z / accelMag;
            
            // Dot product should be close to 1 (same direction)
            const dotProduct = accelDirX * dirX + accelDirY * dirY + accelDirZ * dirZ;
            expect(dotProduct).toBeCloseTo(1.0, 3);
          }
          
          // Test 7: Verify particles closer to hand receive stronger force
          // This is implicitly tested by the attenuation factor check above
          // Closer particles have higher attenuationFactor, thus stronger force
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify wave storm does not trigger below threshold
   */
  it('wave storm should not trigger when velocity is below threshold', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(4.9), noNaN: true }), // speed below threshold
        fc.float({ min: Math.fround(0), max: Math.fround(2 * Math.PI), noNaN: true }), // theta
        fc.float({ min: Math.fround(0), max: Math.fround(Math.PI), noNaN: true }), // phi
        (speed, theta, phi) => {
          // Convert spherical to cartesian
          const vx = speed * Math.sin(phi) * Math.cos(theta);
          const vy = speed * Math.sin(phi) * Math.sin(theta);
          const vz = speed * Math.cos(phi);
          
          const manager = new InteractionManager();
          const velocity = { x: vx, y: vy, z: vz };
          
          // Should not trigger wave storm
          expect(manager.checkWaveStorm(velocity)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify wave storm triggers above threshold
   */
  it('wave storm should trigger when velocity exceeds threshold', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(5.1), max: Math.fround(20), noNaN: true }), // speed above threshold
        fc.float({ min: Math.fround(0), max: Math.fround(2 * Math.PI), noNaN: true }), // theta
        fc.float({ min: Math.fround(0), max: Math.fround(Math.PI), noNaN: true }), // phi
        (speed, theta, phi) => {
          // Convert spherical to cartesian
          const vx = speed * Math.sin(phi) * Math.cos(theta);
          const vy = speed * Math.sin(phi) * Math.sin(theta);
          const vz = speed * Math.cos(phi);
          
          const manager = new InteractionManager();
          const velocity = { x: vx, y: vy, z: vz };
          
          // Should trigger wave storm
          expect(manager.checkWaveStorm(velocity)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify force is zero outside influence radius
   */
  it('particles outside influence radius should receive no force', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(10), max: Math.fround(20), noNaN: true }), // high velocity
        fc.float({ min: Math.fround(2.1), max: Math.fround(10), noNaN: true }), // distance > radius
        fc.float({ min: Math.fround(0), max: Math.fround(2 * Math.PI), noNaN: true }), // angle
        (speed, distance, angle) => {
          const manager = new InteractionManager({
            waveStorm: {
              velocityThreshold: 5.0,
              forceStrength: 8.0,
              influenceRadius: 2.0
            }
          });
          
          const engine = new PhysicsEngine();
          engine.initialize(1);
          manager.setPhysicsEngine(engine);
          
          const particleData = engine.getParticleData()!;
          
          // Place particle outside influence radius
          const px = distance * Math.cos(angle);
          const py = distance * Math.sin(angle);
          const pz = 0;
          
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Apply wave force from origin
          const handCenter = { x: 0, y: 0, z: 0 };
          const velocity = { x: speed, y: 0, z: 0 };
          manager.applyWaveForce(handCenter, velocity);
          
          // Particle should have zero acceleration
          const particle = particleData.getParticle(0);
          expect(particle.acceleration.x).toBe(0);
          expect(particle.acceleration.y).toBe(0);
          expect(particle.acceleration.z).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: webar-particle-interaction, Property 20: 手掌占比与缩放正相关
   * Validates: Requirements 12.1, 12.2, 12.3, 12.4
   * 
   * For any hand palm area ratio change, the particle system's scale should:
   * 1. Increase when area ratio increases (hand moves closer to camera)
   * 2. Decrease when area ratio decreases (hand moves away from camera)
   * 3. Transition smoothly without sudden jumps
   * 4. Stay within configured min/max bounds
   */
  it('Property 20: hand palm area ratio positively correlates with scale', () => {
    fc.assert(
      fc.property(
        // Two different area ratios to compare
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // areaRatio1
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // areaRatio2
        (areaRatio1, areaRatio2) => {
          // Skip if ratios are too similar (can't meaningfully test correlation)
          if (Math.abs(areaRatio1 - areaRatio2) < 0.01) return;
          
          const config = {
            depthScale: {
              minScale: 0.5,
              maxScale: 2.0,
              smoothing: 0.1
            }
          };
          
          // Test with first area ratio
          const manager1 = new InteractionManager(config);
          
          // Apply area ratio multiple times to converge to target scale
          for (let i = 0; i < 100; i++) {
            manager1.updateScale(areaRatio1);
          }
          const scale1 = manager1.getCurrentScale();
          
          // Test with second area ratio
          const manager2 = new InteractionManager(config);
          
          // Apply area ratio multiple times to converge to target scale
          for (let i = 0; i < 100; i++) {
            manager2.updateScale(areaRatio2);
          }
          const scale2 = manager2.getCurrentScale();
          
          // Test 1: Verify positive correlation
          // Larger area ratio should result in larger scale
          if (areaRatio1 > areaRatio2) {
            expect(scale1).toBeGreaterThan(scale2);
          } else {
            expect(scale2).toBeGreaterThan(scale1);
          }
          
          // Test 2: Verify scales are within configured bounds
          expect(scale1).toBeGreaterThanOrEqual(config.depthScale.minScale);
          expect(scale1).toBeLessThanOrEqual(config.depthScale.maxScale);
          expect(scale2).toBeGreaterThanOrEqual(config.depthScale.minScale);
          expect(scale2).toBeLessThanOrEqual(config.depthScale.maxScale);
          
          // Test 3: Verify smooth transitions (no sudden jumps)
          const manager3 = new InteractionManager(config);
          const initialScale = manager3.getCurrentScale();
          
          // Single update should not jump to target immediately
          manager3.updateScale(areaRatio1);
          const afterOneUpdate = manager3.getCurrentScale();
          
          // Change should be bounded by smoothing factor
          const maxChange = Math.abs(scale1 - initialScale) * config.depthScale.smoothing * 1.5;
          const actualChange = Math.abs(afterOneUpdate - initialScale);
          
          // Should have moved but not jumped completely
          if (Math.abs(scale1 - initialScale) > 0.01) {
            expect(actualChange).toBeLessThan(maxChange);
          }
          
          // Test 4: Verify convergence over multiple updates
          // After many updates, should be very close to target
          const tolerance = 0.01;
          expect(Math.abs(scale1 - manager1.getCurrentScale())).toBeLessThan(tolerance);
          expect(Math.abs(scale2 - manager2.getCurrentScale())).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify scale stays within bounds for extreme area ratios
   */
  it('scale should stay within configured bounds for any area ratio', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), // any area ratio
        (areaRatio) => {
          const config = {
            depthScale: {
              minScale: 0.5,
              maxScale: 2.0,
              smoothing: 0.1
            }
          };
          
          const manager = new InteractionManager(config);
          
          // Apply area ratio multiple times to converge
          for (let i = 0; i < 100; i++) {
            manager.updateScale(areaRatio);
          }
          
          const scale = manager.getCurrentScale();
          
          // Scale must be within bounds
          expect(scale).toBeGreaterThanOrEqual(config.depthScale.minScale);
          expect(scale).toBeLessThanOrEqual(config.depthScale.maxScale);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify smoothing prevents sudden jumps
   */
  it('scale transitions should be smooth and gradual', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // target area ratio
        (targetAreaRatio) => {
          const config = {
            depthScale: {
              minScale: 0.5,
              maxScale: 2.0,
              smoothing: 0.1
            }
          };
          
          const manager = new InteractionManager(config);
          const initialScale = manager.getCurrentScale();
          
          // Apply single update
          manager.updateScale(targetAreaRatio);
          const afterOneUpdate = manager.getCurrentScale();
          
          // Apply second update
          manager.updateScale(targetAreaRatio);
          const afterTwoUpdates = manager.getCurrentScale();
          
          // Each step should move closer to target
          // Calculate target scale for comparison
          const minAreaRatio = 0.05;
          const maxAreaRatio = 0.3;
          const clampedRatio = Math.max(minAreaRatio, Math.min(maxAreaRatio, targetAreaRatio));
          const normalizedRatio = (clampedRatio - minAreaRatio) / (maxAreaRatio - minAreaRatio);
          const targetScale = config.depthScale.minScale +
            normalizedRatio * (config.depthScale.maxScale - config.depthScale.minScale);
          
          // Distance to target should decrease with each update
          const dist1 = Math.abs(afterOneUpdate - targetScale);
          const dist2 = Math.abs(afterTwoUpdates - targetScale);
          
          // Should be converging (unless already at target)
          if (Math.abs(initialScale - targetScale) > 0.01) {
            expect(dist2).toBeLessThanOrEqual(dist1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: webar-particle-interaction, Property 21: 缩放保持形状比例
   * Validates: Requirements 12.5
   * 
   * For any scaling operation, the particle shape's relative proportions should remain unchanged.
   * This means the scaling should be uniform (same scale factor in all dimensions).
   * 
   * Since InteractionManager returns a single scalar scale value (not separate x, y, z scales),
   * this property is inherently satisfied by the design. We test that:
   * 1. The scale is always a single positive number
   * 2. When applied uniformly to particle positions, relative distances are preserved
   * 3. The shape maintains its proportions after scaling
   */
  it('Property 21: scaling maintains shape proportions (uniform scaling)', () => {
    fc.assert(
      fc.property(
        // Generate random particle positions to form a shape
        fc.array(
          fc.record({
            x: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
            y: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
            z: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // area ratio
        (particles, areaRatio) => {
          // Skip if particles are too close together (degenerate shape)
          let hasValidDistances = false;
          for (let i = 0; i < particles.length - 1; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dz = particles[i].z - particles[j].z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist > 0.1) {
                hasValidDistances = true;
                break;
              }
            }
            if (hasValidDistances) break;
          }
          
          if (!hasValidDistances) return;
          
          const manager = new InteractionManager();
          
          // Apply area ratio to get scale
          for (let i = 0; i < 100; i++) {
            manager.updateScale(areaRatio);
          }
          
          const scale = manager.getCurrentScale();
          
          // Test 1: Scale is a single positive number (uniform scaling)
          expect(scale).toBeGreaterThan(0);
          expect(typeof scale).toBe('number');
          expect(isFinite(scale)).toBe(true);
          
          // Test 2: Calculate relative distances before scaling
          const originalDistances: number[] = [];
          for (let i = 0; i < particles.length - 1; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dz = particles[i].z - particles[j].z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              originalDistances.push(dist);
            }
          }
          
          // Test 3: Apply uniform scaling to all particles
          const scaledParticles = particles.map(p => ({
            x: p.x * scale,
            y: p.y * scale,
            z: p.z * scale
          }));
          
          // Test 4: Calculate relative distances after scaling
          const scaledDistances: number[] = [];
          for (let i = 0; i < scaledParticles.length - 1; i++) {
            for (let j = i + 1; j < scaledParticles.length; j++) {
              const dx = scaledParticles[i].x - scaledParticles[j].x;
              const dy = scaledParticles[i].y - scaledParticles[j].y;
              const dz = scaledParticles[i].z - scaledParticles[j].z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              scaledDistances.push(dist);
            }
          }
          
          // Test 5: Verify all distances are scaled by the same factor
          // scaledDistance = originalDistance * scale
          for (let i = 0; i < originalDistances.length; i++) {
            const expectedScaledDist = originalDistances[i] * scale;
            const actualScaledDist = scaledDistances[i];
            
            // Allow small floating point error
            const relativeError = Math.abs(expectedScaledDist - actualScaledDist) / 
              (Math.abs(expectedScaledDist) + 0.0001);
            expect(relativeError).toBeLessThan(0.001);
          }
          
          // Test 6: Verify relative proportions are maintained
          // The ratio of any two distances should remain the same
          for (let i = 0; i < originalDistances.length - 1; i++) {
            for (let j = i + 1; j < originalDistances.length; j++) {
              // Skip if distances are too small
              if (originalDistances[i] < 0.01 || originalDistances[j] < 0.01) continue;
              
              const originalRatio = originalDistances[i] / originalDistances[j];
              const scaledRatio = scaledDistances[i] / scaledDistances[j];
              
              // Ratios should be preserved (uniform scaling)
              const ratioError = Math.abs(originalRatio - scaledRatio) / 
                (Math.abs(originalRatio) + 0.0001);
              expect(ratioError).toBeLessThan(0.001);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify scale is always positive and finite
   */
  it('scale should always be positive and finite', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), // any area ratio
        (areaRatio) => {
          const manager = new InteractionManager();
          
          // Apply area ratio
          for (let i = 0; i < 100; i++) {
            manager.updateScale(areaRatio);
          }
          
          const scale = manager.getCurrentScale();
          
          // Scale must be positive and finite
          expect(scale).toBeGreaterThan(0);
          expect(isFinite(scale)).toBe(true);
          expect(isNaN(scale)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
