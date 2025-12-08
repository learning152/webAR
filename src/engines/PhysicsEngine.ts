/**
 * Particle interface defining the properties of a single particle
 */
export interface Particle {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
}

/**
 * ParticleData class manages the particle system using Float32Array for performance
 * Stores data for 16,000 particles with position, velocity, acceleration, target position, and color
 */
export class ParticleData {
  private count: number;
  
  // Data arrays using Float32Array for GPU-friendly storage
  public positions: Float32Array;      // [x, y, z] * count
  public velocities: Float32Array;     // [vx, vy, vz] * count
  public accelerations: Float32Array;  // [ax, ay, az] * count
  public targetPositions: Float32Array; // [tx, ty, tz] * count
  public colors: Float32Array;         // [r, g, b] * count
  
  // Physical parameters (optimized for smooth motion)
  public mass: number = 1.0;
  public damping: number = 0.92;        // Reduced from 0.95 for faster settling
  public maxSpeed: number = 12.0;       // Increased from 10.0 for more dynamic motion
  
  constructor(count: number) {
    this.count = count;
    
    // Allocate memory for all particle data
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.accelerations = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    
    // Initialize particles
    this.initialize();
  }
  
  /**
   * Initialize all particles with default values
   * Sets cyan color (0, 1, 1) for all particles
   */
  private initialize(): void {
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      
      // Initialize positions to random values in a small cube
      this.positions[idx] = (Math.random() - 0.5) * 2;
      this.positions[idx + 1] = (Math.random() - 0.5) * 2;
      this.positions[idx + 2] = (Math.random() - 0.5) * 2;
      
      // Initialize velocities to zero
      this.velocities[idx] = 0;
      this.velocities[idx + 1] = 0;
      this.velocities[idx + 2] = 0;
      
      // Initialize accelerations to zero
      this.accelerations[idx] = 0;
      this.accelerations[idx + 1] = 0;
      this.accelerations[idx + 2] = 0;
      
      // Initialize target positions to current positions
      this.targetPositions[idx] = this.positions[idx];
      this.targetPositions[idx + 1] = this.positions[idx + 1];
      this.targetPositions[idx + 2] = this.positions[idx + 2];
      
      // Initialize colors to cyan (0, 1, 1)
      this.colors[idx] = 0;     // r
      this.colors[idx + 1] = 1; // g (cyan)
      this.colors[idx + 2] = 1; // b (cyan)
    }
  }
  
  /**
   * Get the number of particles
   */
  public getCount(): number {
    return this.count;
  }
  
  /**
   * Get a single particle's data by index
   */
  public getParticle(index: number): Particle {
    const idx = index * 3;
    return {
      position: {
        x: this.positions[idx],
        y: this.positions[idx + 1],
        z: this.positions[idx + 2]
      },
      velocity: {
        x: this.velocities[idx],
        y: this.velocities[idx + 1],
        z: this.velocities[idx + 2]
      },
      acceleration: {
        x: this.accelerations[idx],
        y: this.accelerations[idx + 1],
        z: this.accelerations[idx + 2]
      },
      targetPosition: {
        x: this.targetPositions[idx],
        y: this.targetPositions[idx + 1],
        z: this.targetPositions[idx + 2]
      },
      color: {
        r: this.colors[idx],
        g: this.colors[idx + 1],
        b: this.colors[idx + 2]
      }
    };
  }
  
  /**
   * Set a single particle's data by index
   */
  public setParticle(index: number, particle: Partial<Particle>): void {
    const idx = index * 3;
    
    if (particle.position) {
      this.positions[idx] = particle.position.x;
      this.positions[idx + 1] = particle.position.y;
      this.positions[idx + 2] = particle.position.z;
    }
    
    if (particle.velocity) {
      this.velocities[idx] = particle.velocity.x;
      this.velocities[idx + 1] = particle.velocity.y;
      this.velocities[idx + 2] = particle.velocity.z;
    }
    
    if (particle.acceleration) {
      this.accelerations[idx] = particle.acceleration.x;
      this.accelerations[idx + 1] = particle.acceleration.y;
      this.accelerations[idx + 2] = particle.acceleration.z;
    }
    
    if (particle.targetPosition) {
      this.targetPositions[idx] = particle.targetPosition.x;
      this.targetPositions[idx + 1] = particle.targetPosition.y;
      this.targetPositions[idx + 2] = particle.targetPosition.z;
    }
    
    if (particle.color) {
      this.colors[idx] = particle.color.r;
      this.colors[idx + 1] = particle.color.g;
      this.colors[idx + 2] = particle.color.b;
    }
  }
  
  /**
   * Update physics for all particles
   * Implements velocity integration: v = v + a*dt
   * Implements position integration: p = p + v*dt
   */
  public updatePhysics(deltaTime: number): void {
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      
      // Velocity integration: v = v + a*dt
      this.velocities[idx] += this.accelerations[idx] * deltaTime;
      this.velocities[idx + 1] += this.accelerations[idx + 1] * deltaTime;
      this.velocities[idx + 2] += this.accelerations[idx + 2] * deltaTime;
      
      // Position integration: p = p + v*dt
      this.positions[idx] += this.velocities[idx] * deltaTime;
      this.positions[idx + 1] += this.velocities[idx + 1] * deltaTime;
      this.positions[idx + 2] += this.velocities[idx + 2] * deltaTime;
    }
  }
}

/**
 * Physics configuration parameters
 */
export interface PhysicsConfig {
  damping: number;                  // Damping coefficient (0.95)
  maxSpeed: number;                 // Maximum velocity (10.0)
  maxAcceleration: number;          // Maximum acceleration (5.0)
  attractionStrength: number;       // Attraction force strength (2.0)
  attractionRadius: number;         // Attraction force radius (0.5)
  explosionStrength: number;        // Explosion force strength (5.0)
  explosionDuration: number;        // Explosion duration in seconds (0.3)
}

import { ShapeType } from '../shapes/ShapeGenerator';

/**
 * PhysicsEngine manages the particle system and physics simulation
 */
export class PhysicsEngine {
  private particleData: ParticleData | null = null;
  private config: PhysicsConfig;
  private explosionActive: boolean = false;
  private explosionTimer: number = 0;
  private explosionCenter: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private currentShapeType: ShapeType = ShapeType.PLANET;
  
  // Planet state tracking
  private planetCenter: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private planetRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private originalTargetPositions: Float32Array | null = null;
  
  constructor(config?: Partial<PhysicsConfig>) {
    // Optimized physics configuration for smooth, natural motion
    this.config = {
      damping: 0.92,                    // Reduced for faster settling
      maxSpeed: 12.0,                   // Increased for more dynamic motion
      maxAcceleration: 6.0,             // Increased for snappier response
      attractionStrength: 3.5,          // Increased for faster shape formation
      attractionRadius: 0.8,            // Increased for smoother transitions
      explosionStrength: 7.0,           // Increased for more dramatic effect
      explosionDuration: 0.4,           // Increased for smoother transitions
      ...config
    };
  }
  
  /**
   * Initialize the physics engine with a specific particle count
   */
  public initialize(count: number): void {
    this.particleData = new ParticleData(count);
  }
  
  /**
   * Get the particle data
   */
  public getParticleData(): ParticleData | null {
    return this.particleData;
  }

  /**
   * Get the current particle count
   * @returns Current particle count, or 0 if not initialized
   */
  public getParticleCount(): number {
    return this.particleData ? this.particleData.getCount() : 0;
  }

  /**
   * Set the current shape type
   * @param shapeType - The shape type to set
   */
  public setCurrentShapeType(shapeType: ShapeType): void {
    this.currentShapeType = shapeType;
  }

  /**
   * Get the current shape type
   * @returns Current shape type
   */
  public getCurrentShapeType(): ShapeType {
    return this.currentShapeType;
  }

  /**
   * Reinitialize the physics engine with a new particle count
   * Preserves the current shape type setting
   * @param newCount - New particle count
   */
  public reinitialize(newCount: number): void {
    // Skip if count is the same
    if (this.particleData && this.particleData.getCount() === newCount) {
      return;
    }

    // Preserve current shape type
    const preservedShapeType = this.currentShapeType;

    // Create new particle data
    this.particleData = new ParticleData(newCount);

    // Restore shape type
    this.currentShapeType = preservedShapeType;

    // Reset planet state
    this.resetPlanetState();
  }
  
  /**
   * Get the physics configuration
   */
  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }
  
  /**
   * Apply force to particles within a radius from a center point
   * Implements F = ma, where a = F / m
   * 
   * @param force - Force vector to apply
   * @param radius - Radius of effect (Infinity for all particles)
   * @param center - Center point for radius calculation
   */
  public applyForce(
    force: { x: number; y: number; z: number },
    radius: number,
    center: { x: number; y: number; z: number }
  ): void {
    if (!this.particleData) return;
    
    const count = this.particleData.getCount();
    const mass = this.particleData.mass;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get particle position
      const px = this.particleData.positions[idx];
      const py = this.particleData.positions[idx + 1];
      const pz = this.particleData.positions[idx + 2];
      
      // Calculate distance from center
      const dx = px - center.x;
      const dy = py - center.y;
      const dz = pz - center.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      // Check if particle is within radius
      if (distSq <= radius * radius) {
        // Calculate acceleration: a = F / m
        const ax = force.x / mass;
        const ay = force.y / mass;
        const az = force.z / mass;
        
        // Add to existing acceleration
        this.particleData.accelerations[idx] += ax;
        this.particleData.accelerations[idx + 1] += ay;
        this.particleData.accelerations[idx + 2] += az;
      }
    }
  }
  
  /**
   * Apply damping to particles approaching their target positions
   * Reduces velocity as particles get closer to targets
   */
  public applyDamping(): void {
    if (!this.particleData) return;
    
    const count = this.particleData.getCount();
    const dampingFactor = this.config.damping;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get particle position and target
      const px = this.particleData.positions[idx];
      const py = this.particleData.positions[idx + 1];
      const pz = this.particleData.positions[idx + 2];
      
      const tx = this.particleData.targetPositions[idx];
      const ty = this.particleData.targetPositions[idx + 1];
      const tz = this.particleData.targetPositions[idx + 2];
      
      // Calculate distance to target
      const dx = tx - px;
      const dy = ty - py;
      const dz = tz - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      // Apply stronger damping when close to target
      if (distSq < this.config.attractionRadius * this.config.attractionRadius) {
        this.particleData.velocities[idx] *= dampingFactor;
        this.particleData.velocities[idx + 1] *= dampingFactor;
        this.particleData.velocities[idx + 2] *= dampingFactor;
      }
    }
  }
  
  /**
   * Apply attraction force towards target positions
   * Drives particles to move towards their assigned targets
   */
  public applyTargetAttraction(): void {
    if (!this.particleData) return;
    
    const count = this.particleData.getCount();
    const strength = this.config.attractionStrength;
    const mass = this.particleData.mass;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get particle position and target
      const px = this.particleData.positions[idx];
      const py = this.particleData.positions[idx + 1];
      const pz = this.particleData.positions[idx + 2];
      
      const tx = this.particleData.targetPositions[idx];
      const ty = this.particleData.targetPositions[idx + 1];
      const tz = this.particleData.targetPositions[idx + 2];
      
      // Calculate direction to target
      const dx = tx - px;
      const dy = ty - py;
      const dz = tz - pz;
      
      // Calculate force towards target
      const fx = dx * strength;
      const fy = dy * strength;
      const fz = dz * strength;
      
      // Apply force as acceleration (F = ma, so a = F/m)
      this.particleData.accelerations[idx] += fx / mass;
      this.particleData.accelerations[idx + 1] += fy / mass;
      this.particleData.accelerations[idx + 2] += fz / mass;
    }
  }
  
  /**
   * Trigger explosion effect
   * Applies radial outward force to all particles from a center point
   * 
   * @param center - Center point of explosion (optional, defaults to origin)
   */
  public triggerExplosion(center?: { x: number; y: number; z: number }): void {
    if (!this.particleData) return;
    
    this.explosionActive = true;
    this.explosionTimer = 0;
    this.explosionCenter = center || { x: 0, y: 0, z: 0 };
    
    const count = this.particleData.getCount();
    const strength = this.config.explosionStrength;
    const mass = this.particleData.mass;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get particle position
      const px = this.particleData.positions[idx];
      const py = this.particleData.positions[idx + 1];
      const pz = this.particleData.positions[idx + 2];
      
      // Calculate direction from explosion center
      const dx = px - this.explosionCenter.x;
      const dy = py - this.explosionCenter.y;
      const dz = pz - this.explosionCenter.z;
      
      // Calculate distance
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Normalize direction (avoid division by zero)
      const invDist = dist > 0.001 ? 1.0 / dist : 1.0;
      const ndx = dx * invDist;
      const ndy = dy * invDist;
      const ndz = dz * invDist;
      
      // Apply radial outward force
      const fx = ndx * strength;
      const fy = ndy * strength;
      const fz = ndz * strength;
      
      // Apply as acceleration
      this.particleData.accelerations[idx] += fx / mass;
      this.particleData.accelerations[idx + 1] += fy / mass;
      this.particleData.accelerations[idx + 2] += fz / mass;
    }
  }
  
  /**
   * Check if explosion is currently active
   */
  public isExplosionActive(): boolean {
    return this.explosionActive;
  }
  
  /**
   * Update the physics simulation
   * Applies forces, updates velocities and positions
   */
  public update(deltaTime: number): void {
    if (!this.particleData) return;
    
    // Reset accelerations
    const count = this.particleData.getCount();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.particleData.accelerations[idx] = 0;
      this.particleData.accelerations[idx + 1] = 0;
      this.particleData.accelerations[idx + 2] = 0;
    }
    
    // Update explosion timer
    if (this.explosionActive) {
      this.explosionTimer += deltaTime;
      if (this.explosionTimer >= this.config.explosionDuration) {
        this.explosionActive = false;
      }
    }
    
    // Apply target attraction (unless explosion is active)
    if (!this.explosionActive) {
      this.applyTargetAttraction();
    }
    
    // Apply damping
    this.applyDamping();
    
    // Update physics (velocity and position integration)
    this.particleData.updatePhysics(deltaTime);
  }
  
  /**
   * Store original target positions for planet state
   * This is called when entering planet state to save the base positions
   * before any transformations are applied
   */
  public storeOriginalTargetPositions(): void {
    if (!this.particleData) return;
    
    const count = this.particleData.getCount();
    this.originalTargetPositions = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i++) {
      this.originalTargetPositions[i] = this.particleData.targetPositions[i];
    }
  }
  
  /**
   * Get the original target positions
   */
  public getOriginalTargetPositions(): Float32Array | null {
    return this.originalTargetPositions;
  }
  
  /**
   * Update planet center position to follow hand
   * Translates all target positions to follow the hand center
   * 
   * @param handCenter - The hand center position to follow
   */
  public updatePlanetPosition(handCenter: { x: number; y: number; z: number }): void {
    if (!this.particleData || !this.originalTargetPositions) return;
    
    // Store the new planet center
    this.planetCenter = { ...handCenter };
    
    // Apply translation to all target positions
    const count = this.particleData.getCount();
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get original position (relative to origin)
      const ox = this.originalTargetPositions[idx];
      const oy = this.originalTargetPositions[idx + 1];
      const oz = this.originalTargetPositions[idx + 2];
      
      // Apply current rotation first, then translation
      const rotated = this.applyRotation(ox, oy, oz, this.planetRotation);
      
      // Translate to hand center
      this.particleData.targetPositions[idx] = rotated.x + handCenter.x;
      this.particleData.targetPositions[idx + 1] = rotated.y + handCenter.y;
      this.particleData.targetPositions[idx + 2] = rotated.z + handCenter.z;
    }
  }
  
  /**
   * Update planet rotation to follow hand rotation
   * Rotates all target positions around the planet center
   * 
   * @param rotation - The rotation angles (Euler angles in radians)
   */
  public updatePlanetRotation(rotation: { x: number; y: number; z: number }): void {
    if (!this.particleData || !this.originalTargetPositions) return;
    
    // Store the new rotation
    this.planetRotation = { ...rotation };
    
    // Apply rotation and translation to all target positions
    const count = this.particleData.getCount();
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // Get original position (relative to origin)
      const ox = this.originalTargetPositions[idx];
      const oy = this.originalTargetPositions[idx + 1];
      const oz = this.originalTargetPositions[idx + 2];
      
      // Apply rotation
      const rotated = this.applyRotation(ox, oy, oz, rotation);
      
      // Translate to planet center
      this.particleData.targetPositions[idx] = rotated.x + this.planetCenter.x;
      this.particleData.targetPositions[idx + 1] = rotated.y + this.planetCenter.y;
      this.particleData.targetPositions[idx + 2] = rotated.z + this.planetCenter.z;
    }
  }
  
  /**
   * Apply Euler rotation to a point
   * Uses rotation order: X -> Y -> Z
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param rotation - Euler angles in radians
   * @returns Rotated coordinates
   */
  private applyRotation(
    x: number,
    y: number,
    z: number,
    rotation: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    // Rotation around X axis
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    
    // Rotation around Y axis
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    let x2 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;
    
    // Rotation around Z axis
    const cosZ = Math.cos(rotation.z);
    const sinZ = Math.sin(rotation.z);
    let x3 = x2 * cosZ - y1 * sinZ;
    let y3 = x2 * sinZ + y1 * cosZ;
    
    return { x: x3, y: y3, z: z2 };
  }
  
  /**
   * Get the current planet center position
   */
  public getPlanetCenter(): { x: number; y: number; z: number } {
    return { ...this.planetCenter };
  }
  
  /**
   * Get the current planet rotation
   */
  public getPlanetRotation(): { x: number; y: number; z: number } {
    return { ...this.planetRotation };
  }
  
  /**
   * Reset planet state (center and rotation)
   */
  public resetPlanetState(): void {
    this.planetCenter = { x: 0, y: 0, z: 0 };
    this.planetRotation = { x: 0, y: 0, z: 0 };
    this.originalTargetPositions = null;
  }
  
  /**
   * Calculate the distance from a point to the planet center
   * Used to verify shape integrity after transformations
   * 
   * @param index - Particle index
   * @returns Distance from the particle's target position to planet center
   */
  public getDistanceFromPlanetCenter(index: number): number {
    if (!this.particleData) return 0;
    
    const idx = index * 3;
    const tx = this.particleData.targetPositions[idx];
    const ty = this.particleData.targetPositions[idx + 1];
    const tz = this.particleData.targetPositions[idx + 2];
    
    const dx = tx - this.planetCenter.x;
    const dy = ty - this.planetCenter.y;
    const dz = tz - this.planetCenter.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
