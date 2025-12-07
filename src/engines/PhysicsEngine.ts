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
  
  // Physical parameters
  public mass: number = 1.0;
  public damping: number = 0.95;
  public maxSpeed: number = 10.0;
  
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

/**
 * PhysicsEngine manages the particle system and physics simulation
 */
export class PhysicsEngine {
  private particleData: ParticleData | null = null;
  private config: PhysicsConfig;
  private explosionActive: boolean = false;
  private explosionTimer: number = 0;
  private explosionCenter: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
  constructor(config?: Partial<PhysicsConfig>) {
    // Default physics configuration
    this.config = {
      damping: 0.95,
      maxSpeed: 10.0,
      maxAcceleration: 5.0,
      attractionStrength: 2.0,
      attractionRadius: 0.5,
      explosionStrength: 5.0,
      explosionDuration: 0.3,
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
}
