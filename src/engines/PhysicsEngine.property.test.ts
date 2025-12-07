import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ParticleData, PhysicsEngine } from './PhysicsEngine';

describe('PhysicsEngine Property-Based Tests', () => {
  /**
   * Feature: webar-particle-interaction, Property 1: 粒子系统初始化完整性
   * Validates: Requirements 1.2, 1.3, 1.4
   * 
   * For any particle system initialization, the system should create exactly the specified
   * number of particles, each particle should have position, velocity, and acceleration
   * attributes, and the initial color should be cyan (0, 1, 1).
   */
  it('Property 1: particle system initialization completeness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20000 }), // Test with various particle counts
        (count) => {
          const particleData = new ParticleData(count);
          
          // Verify the correct number of particles
          expect(particleData.getCount()).toBe(count);
          
          // Verify all arrays have the correct length
          expect(particleData.positions.length).toBe(count * 3);
          expect(particleData.velocities.length).toBe(count * 3);
          expect(particleData.accelerations.length).toBe(count * 3);
          expect(particleData.targetPositions.length).toBe(count * 3);
          expect(particleData.colors.length).toBe(count * 3);
          
          // Verify each particle has all required attributes and cyan color
          for (let i = 0; i < count; i++) {
            const particle = particleData.getParticle(i);
            
            // Check that position exists and is a valid number
            expect(typeof particle.position.x).toBe('number');
            expect(typeof particle.position.y).toBe('number');
            expect(typeof particle.position.z).toBe('number');
            expect(Number.isFinite(particle.position.x)).toBe(true);
            expect(Number.isFinite(particle.position.y)).toBe(true);
            expect(Number.isFinite(particle.position.z)).toBe(true);
            
            // Check that velocity exists and is initialized to zero
            expect(particle.velocity.x).toBe(0);
            expect(particle.velocity.y).toBe(0);
            expect(particle.velocity.z).toBe(0);
            
            // Check that acceleration exists and is initialized to zero
            expect(particle.acceleration.x).toBe(0);
            expect(particle.acceleration.y).toBe(0);
            expect(particle.acceleration.z).toBe(0);
            
            // Check that target position exists
            expect(typeof particle.targetPosition.x).toBe('number');
            expect(typeof particle.targetPosition.y).toBe('number');
            expect(typeof particle.targetPosition.z).toBe('number');
            
            // Check that color is cyan (0, 1, 1)
            expect(particle.color.r).toBe(0);
            expect(particle.color.g).toBe(1);
            expect(particle.color.b).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 2: 速度积分更新位置
   * Validates: Requirements 3.1
   * 
   * For any particle and time step dt, the new position should equal the old position
   * plus velocity times dt (position_new = position_old + velocity * dt).
   */
  it('Property 2: velocity integration updates position', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position x
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position y
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position z
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity x
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity y
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity z
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }), // dt
        (px, py, pz, vx, vy, vz, dt) => {
          const particleData = new ParticleData(1);
          
          // Set initial state with zero acceleration
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            velocity: { x: vx, y: vy, z: vz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Calculate expected position
          const expectedX = px + vx * dt;
          const expectedY = py + vy * dt;
          const expectedZ = pz + vz * dt;
          
          // Update physics
          particleData.updatePhysics(dt);
          
          // Get updated particle
          const particle = particleData.getParticle(0);
          
          // Verify position updated correctly
          expect(particle.position.x).toBeCloseTo(expectedX, 5);
          expect(particle.position.y).toBeCloseTo(expectedY, 5);
          expect(particle.position.z).toBeCloseTo(expectedZ, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 3: 加速度积分更新速度
   * Validates: Requirements 3.2
   * 
   * For any particle and time step dt, the new velocity should equal the old velocity
   * plus acceleration times dt (velocity_new = velocity_old + acceleration * dt).
   */
  it('Property 3: acceleration integration updates velocity', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity x
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity y
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),   // velocity z
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }),     // acceleration x
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }),     // acceleration y
        fc.float({ min: Math.fround(-5), max: Math.fround(5), noNaN: true }),     // acceleration z
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }), // dt
        (vx, vy, vz, ax, ay, az, dt) => {
          const particleData = new ParticleData(1);
          
          // Set initial state
          particleData.setParticle(0, {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: vx, y: vy, z: vz },
            acceleration: { x: ax, y: ay, z: az }
          });
          
          // Calculate expected velocity
          const expectedVx = vx + ax * dt;
          const expectedVy = vy + ay * dt;
          const expectedVz = vz + az * dt;
          
          // Update physics
          particleData.updatePhysics(dt);
          
          // Get updated particle
          const particle = particleData.getParticle(0);
          
          // Verify velocity updated correctly
          expect(particle.velocity.x).toBeCloseTo(expectedVx, 5);
          expect(particle.velocity.y).toBeCloseTo(expectedVy, 5);
          expect(particle.velocity.z).toBeCloseTo(expectedVz, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 4: 力正确应用为加速度
   * Validates: Requirements 3.3
   * 
   * For any particle and applied force vector, applying the force should correctly
   * update the particle's acceleration according to F = ma (a = F/m).
   */
  it('Property 4: force correctly applied as acceleration', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // force x
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // force y
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // force z
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position x
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position y
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position z
        (fx, fy, fz, px, py, pz) => {
          const engine = new PhysicsEngine();
          engine.initialize(1);
          
          const particleData = engine.getParticleData()!;
          const mass = particleData.mass;
          
          // Set particle position
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Apply force to all particles (radius = Infinity)
          const force = { x: fx, y: fy, z: fz };
          const center = { x: 0, y: 0, z: 0 };
          engine.applyForce(force, Infinity, center);
          
          // Get particle after force application
          const particle = particleData.getParticle(0);
          
          // Calculate expected acceleration: a = F/m
          const expectedAx = fx / mass;
          const expectedAy = fy / mass;
          const expectedAz = fz / mass;
          
          // Verify acceleration updated correctly
          expect(particle.acceleration.x).toBeCloseTo(expectedAx, 5);
          expect(particle.acceleration.y).toBeCloseTo(expectedAy, 5);
          expect(particle.acceleration.z).toBeCloseTo(expectedAz, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 5: 阻尼减速效果
   * Validates: Requirements 3.5
   * 
   * For any particle approaching its target position, applying damping should
   * reduce the velocity magnitude.
   */
  it('Property 5: damping reduces velocity when near target', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // velocity x
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // velocity y
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }), // velocity z
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position x
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position y
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position z
        (vx, vy, vz, px, py, pz) => {
          // Skip test if velocity is too small (already effectively zero)
          const velocityMag = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (velocityMag < 0.01) return;
          
          const engine = new PhysicsEngine();
          engine.initialize(1);
          
          const particleData = engine.getParticleData()!;
          const config = engine.getConfig();
          
          // Set particle close to target (within attraction radius)
          const targetX = px + 0.1; // Close to position
          const targetY = py + 0.1;
          const targetZ = pz + 0.1;
          
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            velocity: { x: vx, y: vy, z: vz },
            targetPosition: { x: targetX, y: targetY, z: targetZ }
          });
          
          // Calculate initial velocity magnitude
          const initialSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
          
          // Apply damping
          engine.applyDamping();
          
          // Get particle after damping
          const particle = particleData.getParticle(0);
          
          // Calculate final velocity magnitude
          const finalSpeed = Math.sqrt(
            particle.velocity.x * particle.velocity.x +
            particle.velocity.y * particle.velocity.y +
            particle.velocity.z * particle.velocity.z
          );
          
          // Verify velocity magnitude decreased
          expect(finalSpeed).toBeLessThan(initialSpeed);
          
          // Verify it decreased by the damping factor
          expect(finalSpeed).toBeCloseTo(initialSpeed * config.damping, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 16: 状态转换触发爆炸
   * Validates: Requirements 10.1, 10.2, 10.3
   * 
   * For any state change, the system should detect the transition and apply
   * radial explosion force to all particles from a center point.
   */
  it('Property 16: state transition triggers explosion with radial force', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // particle x
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // particle y
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // particle z
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // center x
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // center y
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // center z
        (px, py, pz, cx, cy, cz) => {
          const engine = new PhysicsEngine();
          engine.initialize(1);
          
          const particleData = engine.getParticleData()!;
          const config = engine.getConfig();
          
          // Set particle position with zero acceleration
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Calculate direction from center to particle
          const dx = px - cx;
          const dy = py - cy;
          const dz = pz - cz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Trigger explosion
          const center = { x: cx, y: cy, z: cz };
          engine.triggerExplosion(center);
          
          // Verify explosion is active
          expect(engine.isExplosionActive()).toBe(true);
          
          // Get particle after explosion
          const particle = particleData.getParticle(0);
          
          // If particle is at center, skip direction check
          if (dist < 0.001) return;
          
          // Normalize expected direction
          const invDist = 1.0 / dist;
          const ndx = dx * invDist;
          const ndy = dy * invDist;
          const ndz = dz * invDist;
          
          // Calculate expected acceleration (radial outward)
          const mass = particleData.mass;
          const expectedAx = (ndx * config.explosionStrength) / mass;
          const expectedAy = (ndy * config.explosionStrength) / mass;
          const expectedAz = (ndz * config.explosionStrength) / mass;
          
          // Verify acceleration is in radial direction
          expect(particle.acceleration.x).toBeCloseTo(expectedAx, 4);
          expect(particle.acceleration.y).toBeCloseTo(expectedAy, 4);
          expect(particle.acceleration.z).toBeCloseTo(expectedAz, 4);
          
          // Verify acceleration magnitude
          const accelMag = Math.sqrt(
            particle.acceleration.x * particle.acceleration.x +
            particle.acceleration.y * particle.acceleration.y +
            particle.acceleration.z * particle.acceleration.z
          );
          const expectedMag = config.explosionStrength / mass;
          expect(accelMag).toBeCloseTo(expectedMag, 4);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 17: 爆炸后重组吸引
   * Validates: Requirements 10.5
   * 
   * For any particle that has reached maximum dispersion distance, the system
   * should apply attraction force towards the new target position.
   */
  it('Property 17: post-explosion reassembly attraction', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position x
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position y
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), // position z
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // target x
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // target y
        fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }), // target z
        (px, py, pz, tx, ty, tz) => {
          const engine = new PhysicsEngine();
          engine.initialize(1);
          
          const particleData = engine.getParticleData()!;
          const config = engine.getConfig();
          
          // Set particle position and target
          particleData.setParticle(0, {
            position: { x: px, y: py, z: pz },
            targetPosition: { x: tx, y: ty, z: tz },
            acceleration: { x: 0, y: 0, z: 0 }
          });
          
          // Apply target attraction (simulating post-explosion state)
          engine.applyTargetAttraction();
          
          // Get particle after attraction
          const particle = particleData.getParticle(0);
          
          // Calculate direction to target
          const dx = tx - px;
          const dy = ty - py;
          const dz = tz - pz;
          
          // If already at target, skip
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 0.0001) return;
          
          // Calculate expected acceleration towards target
          const mass = particleData.mass;
          const expectedAx = (dx * config.attractionStrength) / mass;
          const expectedAy = (dy * config.attractionStrength) / mass;
          const expectedAz = (dz * config.attractionStrength) / mass;
          
          // Verify acceleration points towards target
          expect(particle.acceleration.x).toBeCloseTo(expectedAx, 4);
          expect(particle.acceleration.y).toBeCloseTo(expectedAy, 4);
          expect(particle.acceleration.z).toBeCloseTo(expectedAz, 4);
          
          // Verify acceleration direction is towards target
          // (dot product of acceleration and direction should be positive)
          const dotProduct = 
            particle.acceleration.x * dx +
            particle.acceleration.y * dy +
            particle.acceleration.z * dz;
          
          expect(dotProduct).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
