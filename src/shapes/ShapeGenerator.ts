/**
 * Shape types supported by the particle system
 */
export enum ShapeType {
  PLANET = 'planet',
  TEXT = 'text',
  TORUS = 'torus',
  STAR = 'star',
  HEART = 'heart',
  ARROW_HEART = 'arrow_heart'
}

/**
 * Parameters for shape generation
 */
export interface ShapeParams {
  radius?: number;
  text?: string;
  innerRadius?: number;
  outerRadius?: number;
  points?: number;
  scale?: number;
}

/**
 * Vector3 interface for position data
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Color interface for RGB values
 */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * Result of planet generation including positions and colors
 */
export interface PlanetGenerationResult {
  positions: Vector3[];
  colors: Color[];
}

/**
 * Particle attributes including position, color, size, and shape type
 * Used for volume-based particle generation with visual variety
 */
export interface ParticleAttributes {
  position: Vector3;    // 3D position in space
  color: Color;         // RGB color values
  size: number;         // Particle size multiplier (0.5 - 2.0)
  shapeType: number;    // Particle shape type index (0-4)
}

/**
 * ShapeGenerator class provides methods to generate particle positions
 * for various shapes using mathematical algorithms
 */
export class ShapeGenerator {
  /**
   * Generate planet (sphere) shape using uniform spherical sampling
   * Uses the Fibonacci sphere algorithm for even distribution
   * 
   * @param count - Number of particles to generate
   * @param radius - Radius of the sphere (default: 3.0)
   * @returns Object containing positions and gold-blue gradient colors
   */
  public generatePlanet(count: number, radius: number = 3.0): PlanetGenerationResult {
    const positions: Vector3[] = [];
    const colors: Color[] = [];
    
    // Use Fibonacci sphere algorithm for uniform distribution
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = Math.PI * 2 * goldenRatio;
    
    for (let i = 0; i < count; i++) {
      // Calculate spherical coordinates using Fibonacci spiral
      const t = i / count;
      const inclination = Math.acos(1 - 2 * t); // theta: 0 to PI
      const azimuth = angleIncrement * i; // phi: spiral around
      
      // Convert spherical to Cartesian coordinates
      const x = radius * Math.sin(inclination) * Math.cos(azimuth);
      const y = radius * Math.sin(inclination) * Math.sin(azimuth);
      const z = radius * Math.cos(inclination);
      
      positions.push({ x, y, z });
      
      // Generate gold-blue gradient based on height (z-coordinate)
      // Normalize z to [0, 1] range
      const heightRatio = (z + radius) / (2 * radius);
      
      // Gold color: (1.0, 0.88, 0.1) - brighter and warmer
      // Blue color: (0.0, 0.6, 1.0) - brighter blue
      // Interpolate between them based on height
      const r = 1.0 * (1 - heightRatio) + 0.0 * heightRatio;
      const g = 0.88 * (1 - heightRatio) + 0.6 * heightRatio;
      const b = 0.1 * (1 - heightRatio) + 1.0 * heightRatio;
      
      colors.push({ r, g, b });
    }
    
    return { positions, colors };
  }

  /**
   * Generate torus (donut) shape using parametric equations
   * Uses uniform sampling in parameter space for even distribution
   * 
   * @param count - Number of particles to generate
   * @param majorRadius - Distance from torus center to tube center (default: 3.0)
   * @param minorRadius - Radius of the tube (default: 1.0)
   * @returns Array of positions distributed on the torus surface
   */
  public generateTorus(
    count: number,
    majorRadius: number = 3.0,
    minorRadius: number = 1.0
  ): Vector3[] {
    const positions: Vector3[] = [];
    
    // Use square root sampling for more uniform distribution
    // This compensates for the fact that the outer edge of the torus
    // has more surface area than the inner edge
    const sqrtCount = Math.ceil(Math.sqrt(count));
    const uSteps = sqrtCount;
    const vSteps = sqrtCount;
    
    // Generate particles using parametric equations
    // u: angle around the major circle (0 to 2π)
    // v: angle around the tube (0 to 2π)
    let particleIndex = 0;
    
    for (let i = 0; i < uSteps && particleIndex < count; i++) {
      for (let j = 0; j < vSteps && particleIndex < count; j++) {
        // Add small random offset for more natural distribution
        const uOffset = (Math.random() - 0.5) * 0.1;
        const vOffset = (Math.random() - 0.5) * 0.1;
        
        const u = (i / uSteps) * Math.PI * 2 + uOffset;
        const v = (j / vSteps) * Math.PI * 2 + vOffset;
        
        // Parametric equations for torus
        // x = (R + r*cos(v)) * cos(u)
        // y = (R + r*cos(v)) * sin(u)
        // z = r * sin(v)
        const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
        const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
        const z = minorRadius * Math.sin(v);
        
        positions.push({ x, y, z });
        particleIndex++;
      }
    }
    
    return positions;
  }

  /**
   * Generate five-pointed star shape
   * Uses parametric equations to create star vertices and fills interior
   * 
   * @param count - Number of particles to generate
   * @param outerRadius - Radius to outer points of the star (default: 3.0)
   * @param innerRadius - Radius to inner points of the star (default: 1.2)
   * @returns Array of positions distributed on the star outline and interior
   */
  public generateStar(
    count: number,
    outerRadius: number = 3.0,
    innerRadius: number = 1.2
  ): Vector3[] {
    const positions: Vector3[] = [];
    const numPoints = 5; // Five-pointed star
    
    // Calculate the 10 vertices of the star (5 outer + 5 inner)
    const vertices: Vector3[] = [];
    for (let i = 0; i < numPoints * 2; i++) {
      // Alternate between outer and inner radius
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      // Start from top (-PI/2) and go clockwise
      const angle = -Math.PI / 2 + (i * Math.PI) / numPoints;
      
      vertices.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: 0
      });
    }
    
    // Calculate the triangles that make up the star
    // The star consists of 5 outer triangles (the points) and 1 inner pentagon
    const triangles: Array<[Vector3, Vector3, Vector3]> = [];
    
    // Add the 5 outer triangles (the star points)
    for (let i = 0; i < numPoints; i++) {
      const outerIndex = i * 2;
      const innerLeft = (outerIndex + 9) % 10; // Previous inner vertex
      const innerRight = (outerIndex + 1) % 10; // Next inner vertex
      
      triangles.push([
        vertices[outerIndex],
        vertices[innerLeft],
        vertices[innerRight]
      ]);
    }
    
    // Add the inner pentagon as triangles (fan from center)
    const center: Vector3 = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < numPoints; i++) {
      const innerIndex1 = i * 2 + 1;
      const innerIndex2 = ((i + 1) % numPoints) * 2 + 1;
      
      triangles.push([
        center,
        vertices[innerIndex1],
        vertices[innerIndex2]
      ]);
    }
    
    // Calculate approximate area of each triangle for weighted distribution
    const triangleAreas: number[] = triangles.map(tri => 
      this.calculateTriangleArea(tri[0], tri[1], tri[2])
    );
    const totalArea = triangleAreas.reduce((sum, area) => sum + area, 0);
    
    // Distribute particles across triangles proportionally to their area
    let particlesGenerated = 0;
    
    for (let t = 0; t < triangles.length; t++) {
      // Calculate how many particles this triangle should get
      const triangleParticleCount = t === triangles.length - 1
        ? count - particlesGenerated // Last triangle gets remaining particles
        : Math.round((triangleAreas[t] / totalArea) * count);
      
      const [v0, v1, v2] = triangles[t];
      
      // Generate random points inside the triangle using barycentric coordinates
      for (let i = 0; i < triangleParticleCount && particlesGenerated < count; i++) {
        // Generate random barycentric coordinates
        let r1 = Math.random();
        let r2 = Math.random();
        
        // Ensure point is inside triangle (not outside)
        if (r1 + r2 > 1) {
          r1 = 1 - r1;
          r2 = 1 - r2;
        }
        
        const r3 = 1 - r1 - r2;
        
        // Calculate position using barycentric interpolation
        const x = r1 * v0.x + r2 * v1.x + r3 * v2.x;
        const y = r1 * v0.y + r2 * v1.y + r3 * v2.y;
        // Add 3D depth based on distance from center (dome effect)
        const distFromCenter = Math.sqrt(x * x + y * y);
        const maxDist = outerRadius;
        const normalizedDist = Math.min(distFromCenter / maxDist, 1);
        // Create a dome shape with random variation
        const depth = 0.8;
        const baseZ = depth * (1 - normalizedDist * normalizedDist) * (Math.random() * 0.5 + 0.5);
        // Randomly place some particles on the back side for volume
        const z = Math.random() > 0.5 ? baseZ : -baseZ * 0.5;
        
        positions.push({ x, y, z });
        particlesGenerated++;
      }
    }
    
    // Ensure we have exactly the requested count
    while (positions.length < count) {
      // Add particles at random positions within the star
      const randomTriangle = triangles[Math.floor(Math.random() * triangles.length)];
      const [v0, v1, v2] = randomTriangle;
      
      let r1 = Math.random();
      let r2 = Math.random();
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      const r3 = 1 - r1 - r2;
      
      const px = r1 * v0.x + r2 * v1.x + r3 * v2.x;
      const py = r1 * v0.y + r2 * v1.y + r3 * v2.y;
      const distFromCenter = Math.sqrt(px * px + py * py);
      const normalizedDist = Math.min(distFromCenter / outerRadius, 1);
      const depth = 0.8;
      const baseZ = depth * (1 - normalizedDist * normalizedDist) * (Math.random() * 0.5 + 0.5);
      
      positions.push({
        x: px,
        y: py,
        z: Math.random() > 0.5 ? baseZ : -baseZ * 0.5
      });
    }
    
    return positions;
  }

  /**
   * Calculate the area of a triangle given three vertices
   * Uses the cross product formula: Area = 0.5 * |AB × AC|
   */
  private calculateTriangleArea(v0: Vector3, v1: Vector3, v2: Vector3): number {
    const ax = v1.x - v0.x;
    const ay = v1.y - v0.y;
    const bx = v2.x - v0.x;
    const by = v2.y - v0.y;
    
    // Cross product magnitude for 2D (z component of 3D cross product)
    return Math.abs(ax * by - ay * bx) / 2;
  }

  /**
   * Check if a point is inside the star shape
   * Uses ray casting algorithm
   */
  public isPointInStar(
    point: Vector3,
    outerRadius: number = 3.0,
    innerRadius: number = 1.2
  ): boolean {
    const numPoints = 5;
    
    // Calculate the 10 vertices of the star
    const vertices: Vector3[] = [];
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (i * Math.PI) / numPoints;
      
      vertices.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: 0
      });
    }
    
    // Ray casting algorithm - count intersections with polygon edges
    let inside = false;
    const n = vertices.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      
      if (intersect) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Generate heart shape using parametric equations
   * Uses the standard heart curve equation and fills the interior region
   * 
   * @param count - Number of particles to generate
   * @param scale - Scale factor for the heart size (default: 1.5)
   * @returns Array of positions distributed within the heart region
   */
  public generateHeart(count: number, scale: number = 1.5): Vector3[] {
    const positions: Vector3[] = [];
    
    // Heart parametric equation:
    // x(t) = 16 * sin^3(t)
    // y(t) = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
    // where t ranges from 0 to 2π
    
    // First, generate the heart boundary points
    const boundaryPoints: Vector3[] = [];
    const numBoundaryPoints = 200;
    
    for (let i = 0; i < numBoundaryPoints; i++) {
      const t = (i / numBoundaryPoints) * Math.PI * 2;
      
      const sinT = Math.sin(t);
      const cosT = Math.cos(t);
      const cos2T = Math.cos(2 * t);
      const cos3T = Math.cos(3 * t);
      const cos4T = Math.cos(4 * t);
      
      const x = 16 * sinT * sinT * sinT;
      const y = 13 * cosT - 5 * cos2T - 2 * cos3T - cos4T;
      
      // Scale and normalize
      const scaledX = (x / 16) * scale;
      const scaledY = (y / 16) * scale;
      
      boundaryPoints.push({ x: scaledX, y: scaledY, z: 0 });
    }
    
    // Find bounding box for the heart
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of boundaryPoints) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    // Generate particles by sampling within the bounding box
    // and checking if they're inside the heart
    let attempts = 0;
    const maxAttempts = count * 100; // Prevent infinite loop
    
    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      
      // Generate random point within bounding box
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      
      // Check if point is inside the heart using ray casting
      if (this.isPointInHeart(x, y, scale)) {
        // Add 3D depth based on distance from center (dome effect)
        const distFromCenter = Math.sqrt(x * x + y * y);
        const maxDist = scale * 1.2;
        const normalizedDist = Math.min(distFromCenter / maxDist, 1);
        const depth = 0.6 * scale;
        const baseZ = depth * (1 - normalizedDist * normalizedDist) * (Math.random() * 0.5 + 0.5);
        const z = Math.random() > 0.5 ? baseZ : -baseZ * 0.5;
        
        positions.push({ x, y, z });
      }
    }
    
    // If we couldn't generate enough particles (unlikely), fill remaining with boundary points
    while (positions.length < count) {
      const randomBoundaryPoint = boundaryPoints[Math.floor(Math.random() * boundaryPoints.length)];
      const depth = 0.3 * scale;
      const z = (Math.random() - 0.5) * depth;
      positions.push({ x: randomBoundaryPoint.x, y: randomBoundaryPoint.y, z });
    }
    
    return positions;
  }

  /**
   * Check if a point (x, y) is inside the heart shape
   * Uses ray casting algorithm with the heart boundary
   * 
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param scale - Scale factor used for heart generation
   * @returns true if point is inside the heart, false otherwise
   */
  private isPointInHeart(x: number, y: number, scale: number = 1.5): boolean {
    // Generate heart boundary points for ray casting
    const numPoints = 100;
    const boundaryPoints: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI * 2;
      
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
    
    // Ray casting algorithm - count intersections with polygon edges
    let inside = false;
    const n = boundaryPoints.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = boundaryPoints[i].x;
      const yi = boundaryPoints[i].y;
      const xj = boundaryPoints[j].x;
      const yj = boundaryPoints[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Generate arrow through heart shape with pink coloring
   * Creates a heart shape with an arrow piercing through it
   * 
   * @param count - Number of particles to generate
   * @param scale - Scale factor for the heart and arrow size (default: 1.5)
   * @returns Object containing heart positions, arrow positions, and pink colors
   */
  public generateArrowHeart(count: number, scale: number = 1.5): {
    positions: Vector3[];
    colors: Color[];
  } {
    // Allocate approximately 70% of particles to heart, 30% to arrow
    const heartParticleCount = Math.floor(count * 0.7);
    const arrowParticleCount = count - heartParticleCount;
    
    // Generate heart shape positions
    const heartPositions = this.generateHeart(heartParticleCount, scale);
    
    // Generate arrow shape particles (returns ParticleAttributes[])
    const baseColor: Color = { r: 1.0, g: 0.5, b: 0.75 };
    const arrowParticles = this.generateArrow(arrowParticleCount, scale, baseColor);
    
    // Extract positions from arrow particles
    const arrowPositions = arrowParticles.map(p => p.position);
    
    // Combine positions
    const positions: Vector3[] = [...heartPositions, ...arrowPositions];
    
    // Generate pink colors for all particles
    // Pink color: (1.0, 0.5, 0.75) - a brighter, more vibrant pink
    const colors: Color[] = [];
    for (let i = 0; i < count; i++) {
      colors.push({ r: 1.0, g: 0.5, b: 0.75 });
    }
    
    return { positions, colors };
  }

  /**
   * Generate arrow shape (arrow head + arrow shaft)
   * The arrow pierces through the heart from left to right
   * 
   * @param count - Number of particles for the arrow
   * @param scale - Scale factor for sizing
   * @param baseColor - Base color for arrow particles (default: pink)
   * @returns Array of ParticleAttributes for the arrow
   */
  private generateArrow(count: number, scale: number, baseColor: Color = { r: 1.0, g: 0.5, b: 0.75 }): ParticleAttributes[] {
    const particles: ParticleAttributes[] = [];
    
    // Arrow dimensions (scaled)
    const arrowLength = 3.0 * scale;
    const shaftWidth = 0.15 * scale;
    const headLength = 0.6 * scale;
    const headWidth = 0.4 * scale;
    
    // Arrow is positioned horizontally, piercing through the heart
    // Center the arrow at origin, pointing right
    const shaftStart = -arrowLength / 2;
    const shaftEnd = arrowLength / 2 - headLength;
    const arrowTip = arrowLength / 2;
    
    // Allocate particles: 60% to shaft, 40% to head
    const shaftParticleCount = Math.floor(count * 0.6);
    const headParticleCount = count - shaftParticleCount;
    
    // Generate arrow shaft (rectangular with 3D depth)
    const shaftDepth = 0.1 * scale;
    for (let i = 0; i < shaftParticleCount; i++) {
      const x = shaftStart + Math.random() * (shaftEnd - shaftStart);
      const y = (Math.random() - 0.5) * shaftWidth;
      const z = (Math.random() - 0.5) * shaftDepth;
      
      particles.push({
        position: { x, y, z },
        color: this.generateColorVariation(baseColor),
        size: this.generateSizeVariation(),
        shapeType: this.generateShapeTypeVariation()
      });
    }
    
    // Generate arrow head (triangle with 3D depth)
    const headDepth = 0.15 * scale;
    for (let i = 0; i < headParticleCount; i++) {
      // Use barycentric coordinates for triangle sampling
      let r1 = Math.random();
      let r2 = Math.random();
      
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      
      const r3 = 1 - r1 - r2;
      
      // Triangle vertices
      const v0 = { x: arrowTip, y: 0 };
      const v1 = { x: shaftEnd, y: headWidth / 2 };
      const v2 = { x: shaftEnd, y: -headWidth / 2 };
      
      const x = r1 * v0.x + r2 * v1.x + r3 * v2.x;
      const y = r1 * v0.y + r2 * v1.y + r3 * v2.y;
      const z = (Math.random() - 0.5) * headDepth;
      
      particles.push({
        position: { x, y, z },
        color: this.generateColorVariation(baseColor),
        size: this.generateSizeVariation(),
        shapeType: this.generateShapeTypeVariation()
      });
    }
    
    return particles;
  }

  /**
   * Generate arrow-heart shape with volume sampling
   * Creates a heart with an arrow piercing through it, both with volume distribution
   * Uses adaptive depth bias based on particle count (inherited from heart generation)
   * 
   * @param count - Number of particles to generate
   * @param scale - Scale factor for the heart and arrow size (default: 1.5)
   * @returns Array of ParticleAttributes with 70% in heart volume, 30% in arrow volume
   */
  public generateArrowHeartVolume(count: number, scale: number = 1.5): ParticleAttributes[] {
    // Parameter validation
    if (count <= 0) {
      throw new Error('Particle count must be positive');
    }
    if (scale <= 0) {
      throw new Error('Scale must be positive');
    }

    // Allocate 70% of particles to heart, 30% to arrow
    const heartParticleCount = Math.floor(count * 0.7);
    const arrowParticleCount = count - heartParticleCount;
    
    // Base color for arrow-heart (pink)
    const baseColor: Color = { r: 1.0, g: 0.5, b: 0.75 };
    
    // Generate heart volume particles (already has adaptive depth bias)
    const heartParticles = this.generateHeartVolume(heartParticleCount, scale);
    
    // Generate arrow particles with volume attributes
    const arrowParticles = this.generateArrow(arrowParticleCount, scale, baseColor);
    
    // Combine both sets of particles
    const allParticles = [...heartParticles, ...arrowParticles];
    
    return allParticles;
  }

  /**
   * Generate size variation for a particle
   * Returns one of 5 discrete size values for visual variety
   * 
   * @returns Size multiplier (0.5, 0.75, 1.0, 1.5, or 2.0)
   */
  private generateSizeVariation(): number {
    const sizes = [0.5, 0.75, 1.0, 1.5, 2.0];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  /**
   * Generate shape type variation for a particle
   * Returns one of 5 discrete shape type indices
   * 
   * @returns Shape type index (0-4)
   */
  private generateShapeTypeVariation(): number {
    return Math.floor(Math.random() * 5);
  }

  /**
   * Generate color variation based on a base color
   * Returns one of 5 color variations for visual variety
   * 
   * @param baseColor - Base color to create variations from
   * @returns Color variation with RGB values clamped to [0, 1]
   */
  private generateColorVariation(baseColor: Color): Color {
    // Strategy: Use offsets that avoid clamping by staying within safe bounds
    // Cap positive offsets at 0.85 and negative offsets at 0.15 to avoid hitting 0 or 1
    const variations = [
      // Variation 0: Base color
      { r: baseColor.r, g: baseColor.g, b: baseColor.b },
      // Variation 1: Strong red shift (cap to avoid exceeding 1.0)
      { 
        r: Math.min(baseColor.r + 0.25, 0.85), 
        g: Math.max(baseColor.g - 0.10, 0.05), 
        b: Math.max(baseColor.b - 0.10, 0.05) 
      },
      // Variation 2: Strong green shift (cap to avoid exceeding 1.0)
      { 
        r: Math.max(baseColor.r - 0.10, 0.05), 
        g: Math.min(baseColor.g + 0.25, 0.85), 
        b: Math.max(baseColor.b - 0.10, 0.05) 
      },
      // Variation 3: Strong blue shift (cap to avoid exceeding 1.0)
      { 
        r: Math.max(baseColor.r - 0.10, 0.05), 
        g: Math.max(baseColor.g - 0.10, 0.05), 
        b: Math.min(baseColor.b + 0.25, 0.85) 
      },
      // Variation 4: Balanced brightening (cap to avoid exceeding 1.0)
      { 
        r: Math.min(baseColor.r + 0.15, 0.90), 
        g: Math.min(baseColor.g + 0.15, 0.90), 
        b: Math.min(baseColor.b + 0.15, 0.90) 
      }
    ];
    
    const variation = variations[Math.floor(Math.random() * variations.length)];
    
    // Ensure color values are in [0, 1] range (should rarely clamp now)
    return {
      r: Math.min(1.0, Math.max(0.0, variation.r)),
      g: Math.min(1.0, Math.max(0.0, variation.g)),
      b: Math.min(1.0, Math.max(0.0, variation.b))
    };
  }

  /**
   * Generate planet (sphere) shape with volume sampling
   * Uses adaptive radial distribution based on particle count:
   * - Low counts (< 1000): r^2.3 distribution (surface-biased) + density adjustment
   * - High counts (> 5000): r³ distribution (uniform volume) + density adjustment
   * - Medium counts: r^2.7 distribution (slightly biased)
   * 
   * @param count - Number of particles to generate
   * @param radius - Radius of the sphere (default: 3.0)
   * @returns Array of ParticleAttributes with positions distributed throughout the sphere volume
   */
  public generatePlanetVolume(count: number, radius: number = 3.0): ParticleAttributes[] {
    // Parameter validation
    if (count <= 0) {
      throw new Error('Particle count must be positive');
    }
    if (radius <= 0) {
      throw new Error('Radius must be positive');
    }

    // Generate more particles than needed to allow for density adjustment filtering
    // Use higher oversample factor to ensure we have enough particles for filtering
    const overSampleFactor = count < 1000 || count > 5000 ? 3.0 : 1.0;
    const generateCount = Math.ceil(count * overSampleFactor);
    
    const particles: ParticleAttributes[] = [];
    
    // Base color for gold-blue gradient (using gold as base)
    const baseColor: Color = { r: 1.0, g: 0.88, b: 0.1 };
    
    // Determine radial distribution exponent based on particle count
    // IMPORTANT: Higher exponent = more particles near surface (due to shell volume)
    // Lower exponent = more particles in interior
    let radialExponent: number;
    if (count < 1000) {
      radialExponent = 3.0; // More surface particles for low counts (uniform volume)
    } else if (count > 5000) {
      radialExponent = 2.3; // More interior particles for high counts
    } else {
      radialExponent = 2.7; // Balanced for medium counts
    }
    
    for (let i = 0; i < generateCount; i++) {
      // Use adaptive radial distribution
      // r^n distribution where n varies based on particle count
      const r = radius * Math.pow(Math.random(), 1 / radialExponent);
      
      // Uniform spherical sampling for direction
      // theta: polar angle (0 to PI)
      const theta = Math.acos(2 * Math.random() - 1);
      // phi: azimuthal angle (0 to 2*PI)
      const phi = 2 * Math.PI * Math.random();
      
      // Convert spherical to Cartesian coordinates
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      
      particles.push({
        position: { x, y, z },
        color: this.generateColorVariation(baseColor),
        size: this.generateSizeVariation(),
        shapeType: this.generateShapeTypeVariation()
      });
    }
    
    // Apply density adjustment based on particle count
    const adjustedParticles = this.adjustDensityByCount(
      particles,
      count,
      ShapeType.PLANET,
      { radius }
    );
    
    // Return exactly the requested count
    return adjustedParticles.slice(0, count);
  }

  /**
   * Calculate bounding box for heart shape
   * Helper method for heart volume sampling
   * 
   * @param scale - Scale factor for the heart size
   * @returns Bounding box with min/max coordinates
   */
  private calculateHeartBounds(scale: number): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } {
    // Heart parametric equation boundary analysis
    // x(t) = 16 * sin^3(t) ranges from -16 to 16
    // y(t) = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t) ranges approximately from -16 to 13
    
    const xRange = 16;
    const yMax = 13;
    const yMin = -16;
    
    // Scale the bounds
    const minX = -(xRange / 16) * scale;
    const maxX = (xRange / 16) * scale;
    const minY = (yMin / 16) * scale;
    const maxY = (yMax / 16) * scale;
    
    // Z bounds based on dome effect (60% of scale as per design)
    const maxZ = 0.6 * scale;
    const minZ = -maxZ;
    
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  /**
   * Check if a point is inside the heart volume
   * Uses 2D heart boundary check combined with z-depth constraints
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param scale - Scale factor for the heart
   * @returns true if point is inside heart volume, false otherwise
   */
  private isPointInHeartVolume(x: number, y: number, z: number, scale: number): boolean {
    // First check if point is inside 2D heart boundary
    if (!this.isPointInHeart(x, y, scale)) {
      return false;
    }
    
    // Calculate allowed z range based on distance from center
    // Points closer to center can have larger z values (dome effect)
    const distFromCenter = Math.sqrt(x * x + y * y);
    const maxDist = scale * 1.5; // Approximate max distance in heart
    const normalizedDist = Math.min(distFromCenter / maxDist, 1);
    
    // Maximum z decreases as we move away from center
    const maxZ = scale * 0.6 * (1 - normalizedDist);
    
    return Math.abs(z) <= maxZ;
  }

  /**
   * Generate heart shape with volume sampling
   * Uses rejection sampling with adaptive depth bias based on particle count:
   * - Low counts (< 1000): Bias toward surface (shallower z-depth) + density adjustment
   * - High counts (> 5000): More interior particles (deeper z-depth) + density adjustment
   * - Medium counts: Moderate depth bias
   * 
   * @param count - Number of particles to generate
   * @param scale - Scale factor for the heart size (default: 1.5)
   * @returns Array of ParticleAttributes with positions distributed throughout the heart volume
   */
  public generateHeartVolume(count: number, scale: number = 1.5): ParticleAttributes[] {
    // Parameter validation
    if (count <= 0) {
      throw new Error('Particle count must be positive');
    }
    if (scale <= 0) {
      throw new Error('Scale must be positive');
    }

    // Generate more particles than needed to allow for density adjustment filtering
    // Use higher oversample factor to ensure we have enough particles for filtering
    const overSampleFactor = count < 1000 || count > 5000 ? 3.0 : 1.0;
    const generateCount = Math.ceil(count * overSampleFactor);
    
    const particles: ParticleAttributes[] = [];
    
    // Base color for heart (pink)
    const baseColor: Color = { r: 1.0, g: 0.5, b: 0.75 };
    
    // Calculate bounding box
    const bounds = this.calculateHeartBounds(scale);
    
    // Determine depth bias based on particle count
    // Lower exponent = more particles near z=0 (surface)
    // Higher exponent = more uniform depth distribution (more interior)
    let depthExponent: number;
    if (count < 1000) {
      depthExponent = 0.5; // Surface-biased (shallower z, more particles near surface)
    } else if (count > 5000) {
      depthExponent = 1.2; // Interior-biased (deeper z, more interior particles)
    } else {
      depthExponent = 0.8; // Moderate bias
    }
    
    // Use rejection sampling
    let attempts = 0;
    const maxAttempts = generateCount * 10; // Limit attempts as per design
    
    while (particles.length < generateCount && attempts < maxAttempts) {
      attempts++;
      
      // Sample random point within bounding box
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      
      // Apply depth bias to z-coordinate
      const zNormalized = Math.pow(Math.random(), depthExponent); // Biased toward 0
      const zSign = Math.random() < 0.5 ? -1 : 1;
      const z = zSign * zNormalized * (bounds.maxZ - bounds.minZ) / 2;
      
      // Check if point is inside heart volume
      if (this.isPointInHeartVolume(x, y, z, scale)) {
        particles.push({
          position: { x, y, z },
          color: this.generateColorVariation(baseColor),
          size: this.generateSizeVariation(),
          shapeType: this.generateShapeTypeVariation()
        });
      }
    }
    
    // If rejection sampling failed to generate enough particles, use surface fallback
    if (particles.length < count) {
      console.warn(`Heart volume sampling generated ${particles.length}/${count} particles after ${attempts} attempts. Filling remaining with surface particles.`);
      
      // Generate remaining particles using surface sampling
      const remaining = count - particles.length;
      const surfacePositions = this.generateHeart(remaining, scale);
      
      for (const pos of surfacePositions) {
        particles.push({
          position: pos,
          color: this.generateColorVariation(baseColor),
          size: this.generateSizeVariation(),
          shapeType: this.generateShapeTypeVariation()
        });
      }
    }
    
    // Apply density adjustment based on particle count
    const adjustedParticles = this.adjustDensityByCount(
      particles,
      count,
      ShapeType.HEART,
      { scale }
    );
    
    // Return exactly the requested count
    return adjustedParticles.slice(0, count);
  }

  /**
   * Sample a random point inside a 2D star shape
   * Uses rejection sampling within the star's bounding circle
   * 
   * @param outerRadius - Radius to outer points of the star
   * @param innerRadius - Radius to inner points of the star
   * @returns A 2D point (x, y) inside the star
   */
  private samplePointInStar2D(outerRadius: number, innerRadius: number): { x: number; y: number } {
    // Use rejection sampling within the bounding circle
    const maxAttempts = 100;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Sample random point within bounding circle (use outer radius)
      const angle = Math.random() * 2 * Math.PI;
      const r = outerRadius * Math.sqrt(Math.random());
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      
      // Check if point is inside the star
      if (this.isPointInStar({ x, y, z: 0 }, outerRadius, innerRadius)) {
        return { x, y };
      }
    }
    
    // Fallback: return a point on the star boundary if rejection sampling fails
    const angle = Math.random() * 2 * Math.PI;
    const numPoints = 5;
    const segmentAngle = (2 * Math.PI) / (numPoints * 2);
    const segmentIndex = Math.floor(angle / segmentAngle);
    const radius = segmentIndex % 2 === 0 ? outerRadius : innerRadius;
    
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }

  /**
   * Generate star shape with volume sampling
   * Uses layered 2D sampling with adaptive depth bias:
   * - Low counts (< 1000): Bias toward surface (shallower z-depth) + density adjustment
   * - High counts (> 5000): More interior particles (deeper z-depth) + density adjustment
   * - Medium counts: Moderate depth bias
   * 
   * @param count - Number of particles to generate
   * @param outerRadius - Radius to outer points of the star (default: 3.0)
   * @param innerRadius - Radius to inner points of the star (default: 1.2)
   * @returns Array of ParticleAttributes with positions distributed throughout the star volume
   */
  public generateStarVolume(
    count: number,
    outerRadius: number = 3.0,
    innerRadius: number = 1.2
  ): ParticleAttributes[] {
    // Parameter validation
    if (count <= 0) {
      throw new Error('Particle count must be positive');
    }
    if (outerRadius <= 0) {
      throw new Error('Outer radius must be positive');
    }
    if (innerRadius <= 0) {
      throw new Error('Inner radius must be positive');
    }

    // Generate more particles than needed to allow for density adjustment filtering
    // Use higher oversample factor to ensure we have enough particles for filtering
    const overSampleFactor = count < 1000 || count > 5000 ? 3.0 : 1.0;
    const generateCount = Math.ceil(count * overSampleFactor);
    
    const particles: ParticleAttributes[] = [];
    
    // Base color for star (gold/yellow)
    const baseColor: Color = { r: 1.0, g: 0.88, b: 0.1 };
    
    // Determine depth bias based on particle count
    // Lower exponent = more particles near z=0 (surface)
    // Higher exponent = more uniform depth distribution (more interior)
    let depthExponent: number;
    if (count < 1000) {
      depthExponent = 0.5; // Surface-biased (shallower z, more particles near surface)
    } else if (count > 5000) {
      depthExponent = 1.2; // Interior-biased (deeper z, more interior particles)
    } else {
      depthExponent = 0.8; // Moderate bias
    }
    
    for (let i = 0; i < generateCount; i++) {
      // 1. Sample point in 2D star
      const point2D = this.samplePointInStar2D(outerRadius, innerRadius);
      
      // 2. Calculate z range based on distance from center (dome effect)
      const distFromCenter = Math.sqrt(point2D.x ** 2 + point2D.y ** 2);
      const normalizedDist = Math.min(distFromCenter / outerRadius, 1);
      
      // Maximum z decreases as we move away from center (dome shape)
      // Use 40% of outer radius as max depth (as per design)
      const maxZ = outerRadius * 0.4 * (1 - normalizedDist);
      
      // 3. Sample z with depth bias
      const zNormalized = Math.pow(Math.random(), depthExponent);
      const zSign = Math.random() < 0.5 ? -1 : 1;
      const z = zSign * zNormalized * maxZ;
      
      particles.push({
        position: { x: point2D.x, y: point2D.y, z },
        color: this.generateColorVariation(baseColor),
        size: this.generateSizeVariation(),
        shapeType: this.generateShapeTypeVariation()
      });
    }
    
    // Apply density adjustment based on particle count
    const adjustedParticles = this.adjustDensityByCount(
      particles,
      count,
      ShapeType.STAR,
      { outerRadius, innerRadius }
    );
    
    // Return exactly the requested count
    return adjustedParticles.slice(0, count);
  }

  /**
   * Generate torus (donut) shape with volume sampling
   * Uses parametric equations with adaptive radial distribution:
   * - Low counts (< 1000): r^1.5 distribution (surface-biased) + density adjustment
   * - High counts (> 5000): r² distribution (uniform area) + density adjustment
   * - Medium counts: r^1.7 distribution (slightly biased)
   * 
   * @param count - Number of particles to generate
   * @param majorRadius - Distance from torus center to tube center (default: 3.0)
   * @param minorRadius - Radius of the tube (default: 1.0)
   * @returns Array of ParticleAttributes with positions distributed throughout the torus volume
   */
  public generateTorusVolume(
    count: number,
    majorRadius: number = 3.0,
    minorRadius: number = 1.0
  ): ParticleAttributes[] {
    // Parameter validation
    if (count <= 0) {
      throw new Error('Particle count must be positive');
    }
    if (majorRadius <= 0) {
      throw new Error('Major radius must be positive');
    }
    if (minorRadius <= 0) {
      throw new Error('Minor radius must be positive');
    }

    // Generate more particles than needed to allow for density adjustment filtering
    // Use higher oversample factor to ensure we have enough particles for filtering
    const overSampleFactor = count < 1000 || count > 5000 ? 3.0 : 1.0;
    const generateCount = Math.ceil(count * overSampleFactor);
    
    const particles: ParticleAttributes[] = [];
    
    // Base color for torus (blue-purple)
    const baseColor: Color = { r: 0.5, g: 0.3, b: 0.9 };
    
    // Determine radial distribution exponent based on particle count
    // Higher exponent = more particles near tube surface
    // Lower exponent = more particles in tube interior
    let radialExponent: number;
    if (count < 1000) {
      radialExponent = 2.0; // More surface particles for low counts
    } else if (count > 5000) {
      radialExponent = 1.5; // More interior particles for high counts
    } else {
      radialExponent = 1.7; // Balanced for medium counts
    }
    
    for (let i = 0; i < generateCount; i++) {
      // 1. Uniformly sample major circle angle u (0 to 2π)
      const u = 2 * Math.PI * Math.random();
      
      // 2. Uniformly sample tube angle v (0 to 2π)
      const v = 2 * Math.PI * Math.random();
      
      // 3. Sample within tube radius using adaptive distribution
      const r = minorRadius * Math.pow(Math.random(), 1 / radialExponent);
      
      // 4. Calculate 3D position using parametric equations
      // Torus parametric equations:
      // x = (R + r*cos(v)) * cos(u)
      // y = (R + r*cos(v)) * sin(u)
      // z = r * sin(v)
      const x = (majorRadius + r * Math.cos(v)) * Math.cos(u);
      const y = (majorRadius + r * Math.cos(v)) * Math.sin(u);
      const z = r * Math.sin(v);
      
      particles.push({
        position: { x, y, z },
        color: this.generateColorVariation(baseColor),
        size: this.generateSizeVariation(),
        shapeType: this.generateShapeTypeVariation()
      });
    }
    
    // Apply density adjustment based on particle count
    const adjustedParticles = this.adjustDensityByCount(
      particles,
      count,
      ShapeType.TORUS,
      { radius: majorRadius, innerRadius: minorRadius }
    );
    
    // Return exactly the requested count
    return adjustedParticles.slice(0, count);
  }

  /**
   * Calculate distance from a point to the surface of a shape
   * Returns normalized distance where 0 = at surface, 1 = at center
   * 
   * @param point - Point to measure distance from
   * @param shapeType - Type of shape
   * @param params - Shape parameters (radius, scale, etc.)
   * @returns Normalized distance from surface (0 = surface, 1 = center)
   */
  private calculateDistanceFromSurface(
    point: Vector3,
    shapeType: ShapeType,
    params: ShapeParams
  ): number {
    switch (shapeType) {
      case ShapeType.PLANET: {
        const radius = params.radius || 3.0;
        const distFromCenter = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
        // Normalize: 0 at surface (radius), 1 at center (0)
        return 1 - (distFromCenter / radius);
      }
      
      case ShapeType.HEART: {
        const scale = params.scale || 1.5;
        // For heart, approximate distance using 2D distance from center
        // and z-depth relative to allowed z at that position
        const distFromCenter2D = Math.sqrt(point.x ** 2 + point.y ** 2);
        const maxDist = scale * 1.5;
        const normalizedDist2D = Math.min(distFromCenter2D / maxDist, 1);
        
        // Calculate allowed z at this position
        const maxZ = scale * 0.6 * (1 - normalizedDist2D);
        const normalizedZ = maxZ > 0 ? Math.abs(point.z) / maxZ : 1;
        
        // Combine 2D and z distances (closer to surface = higher value)
        return 1 - Math.max(normalizedDist2D, normalizedZ);
      }
      
      case ShapeType.STAR: {
        const outerRadius = params.outerRadius || 3.0;
        // For star, use 2D distance and z-depth
        const distFromCenter2D = Math.sqrt(point.x ** 2 + point.y ** 2);
        const normalizedDist2D = Math.min(distFromCenter2D / outerRadius, 1);
        
        // Calculate allowed z at this position
        const maxZ = outerRadius * 0.4 * (1 - normalizedDist2D);
        const normalizedZ = maxZ > 0 ? Math.abs(point.z) / maxZ : 1;
        
        return 1 - Math.max(normalizedDist2D, normalizedZ);
      }
      
      case ShapeType.TORUS: {
        const majorRadius = params.radius || 3.0;
        const minorRadius = params.innerRadius || 1.0;
        
        // Distance from tube centerline
        const distFromCenter2D = Math.sqrt(point.x ** 2 + point.y ** 2);
        const distFromTubeCenterline = Math.abs(distFromCenter2D - majorRadius);
        const distFromTubeSurface = Math.sqrt(distFromTubeCenterline ** 2 + point.z ** 2);
        
        // Normalize: 0 at tube surface, 1 at tube center
        return 1 - (distFromTubeSurface / minorRadius);
      }
      
      case ShapeType.ARROW_HEART: {
        // For arrow-heart, use heart distance calculation
        const scale = params.scale || 1.5;
        const distFromCenter2D = Math.sqrt(point.x ** 2 + point.y ** 2);
        const maxDist = scale * 1.5;
        const normalizedDist2D = Math.min(distFromCenter2D / maxDist, 1);
        
        const maxZ = scale * 0.6 * (1 - normalizedDist2D);
        const normalizedZ = maxZ > 0 ? Math.abs(point.z) / maxZ : 1;
        
        return 1 - Math.max(normalizedDist2D, normalizedZ);
      }
      
      default:
        return 0.5; // Default middle distance
    }
  }

  /**
   * Prioritize surface particles by sorting and keeping specified ratio
   * Ensures the output has the desired surface:interior ratio while maintaining
   * volume distribution (particles in all depth zones)
   * 
   * @param particles - Array of particles to filter
   * @param surfaceRatio - Desired ratio of surface particles in output (0-1)
   * @param shapeType - Type of shape for distance calculation
   * @param params - Shape parameters
   * @returns Filtered array with specified surface:interior ratio
   */
  private prioritizeSurfaceParticles(
    particles: ParticleAttributes[],
    surfaceRatio: number,
    shapeType: ShapeType,
    params: ShapeParams
  ): ParticleAttributes[] {
    // Define surface threshold (particles within 10% of max distance are considered "surface")
    // This matches the test definition for surface particles
    const surfaceThreshold = 0.1;
    
    // Classify particles into 3 zones: surface, middle, and deep interior
    // This ensures we maintain volume distribution even when prioritizing surface
    const surfaceParticles: ParticleAttributes[] = [];
    const middleParticles: ParticleAttributes[] = [];
    const deepParticles: ParticleAttributes[] = [];
    
    for (const p of particles) {
      const distFromCenter = this.calculateDistanceFromSurface(p.position, shapeType, params);
      // Lower values = closer to surface (0 = at surface, 1 = at center)
      if (distFromCenter <= surfaceThreshold) {
        surfaceParticles.push(p);
      } else if (distFromCenter <= 0.5) {
        middleParticles.push(p);
      } else {
        deepParticles.push(p);
      }
    }
    
    // Calculate how many of each type we need
    const totalNeeded = particles.length;
    const surfaceNeeded = Math.ceil(totalNeeded * surfaceRatio);
    const interiorNeeded = totalNeeded - surfaceNeeded;
    
    // Ensure minimum representation from each zone to maintain volume distribution
    // At least 5% of particles should come from middle zone
    // At least 2% of particles should come from deep zone
    const minMiddle = Math.max(1, Math.ceil(totalNeeded * 0.05));
    const minDeep = Math.max(1, Math.ceil(totalNeeded * 0.02));
    
    // Select particles to achieve desired ratio while maintaining volume distribution
    const result: ParticleAttributes[] = [];
    
    // First, ensure minimum deep particles (for volume distribution)
    const deepToTake = Math.min(minDeep, deepParticles.length);
    for (let i = 0; i < deepToTake; i++) {
      result.push(deepParticles[i]);
    }
    
    // Then, ensure minimum middle particles (for volume distribution)
    const middleToTake = Math.min(minMiddle, middleParticles.length);
    for (let i = 0; i < middleToTake; i++) {
      result.push(middleParticles[i]);
    }
    
    // Calculate remaining slots
    const remainingSlots = totalNeeded - result.length;
    const remainingSurfaceNeeded = Math.ceil(remainingSlots * surfaceRatio);
    const remainingInteriorNeeded = remainingSlots - remainingSurfaceNeeded;
    
    // Take surface particles
    const surfaceToTake = Math.min(remainingSurfaceNeeded, surfaceParticles.length);
    for (let i = 0; i < surfaceToTake; i++) {
      result.push(surfaceParticles[i]);
    }
    
    // Take additional interior particles (from middle and deep pools)
    const remainingMiddle = middleParticles.slice(middleToTake);
    const remainingDeep = deepParticles.slice(deepToTake);
    const allRemainingInterior = [...remainingMiddle, ...remainingDeep];
    
    const interiorToTake = Math.min(remainingInteriorNeeded, allRemainingInterior.length);
    for (let i = 0; i < interiorToTake; i++) {
      result.push(allRemainingInterior[i]);
    }
    
    // If we still need more particles, fill from any available pool
    let poolIndex = 0;
    const pools = [surfaceParticles.slice(surfaceToTake), remainingMiddle.slice(interiorToTake), remainingDeep];
    while (result.length < totalNeeded) {
      const pool = pools[poolIndex % pools.length];
      const idx = Math.floor(poolIndex / pools.length);
      if (idx < pool.length) {
        result.push(pool[idx]);
      }
      poolIndex++;
      if (poolIndex > totalNeeded * 3) break; // Safety limit
    }
    
    return result.slice(0, totalNeeded);
  }

  /**
   * Balance surface and interior particles according to specified ratio
   * 
   * @param particles - Array of particles to balance
   * @param surfaceRatio - Desired ratio of surface particles (0-1)
   * @param shapeType - Type of shape for distance calculation
   * @param params - Shape parameters
   * @returns Balanced array with specified surface/interior ratio
   */
  private balanceSurfaceInterior(
    particles: ParticleAttributes[],
    surfaceRatio: number,
    shapeType: ShapeType,
    params: ShapeParams
  ): ParticleAttributes[] {
    return this.prioritizeSurfaceParticles(particles, surfaceRatio, shapeType, params);
  }

  /**
   * Adjust particle density based on particle count
   * Low counts prioritize surface particles, high counts increase interior density
   * 
   * @param particles - Array of particles to adjust
   * @param count - Total particle count
   * @param shapeType - Type of shape
   * @param params - Shape parameters
   * @returns Adjusted particle array with appropriate density distribution
   */
  private adjustDensityByCount(
    particles: ParticleAttributes[],
    count: number,
    shapeType: ShapeType,
    params: ShapeParams
  ): ParticleAttributes[] {
    if (count < 1000) {
      // Low particle count: prioritize surface particles (80%)
      // This ensures shape recognition at low particle counts
      // Use prioritizeSurfaceParticles which maintains minimum interior for volume distribution
      return this.prioritizeSurfaceParticles(particles, 0.80, shapeType, params);
    } else if (count > 5000) {
      // High particle count: increase interior density (25% surface, 75% interior)
      // Use simpler filtering without minimum interior guarantee
      // This creates a more solid appearance with more interior particles
      return this.filterByDensityRatio(particles, 0.25, shapeType, params);
    } else {
      // Medium particle count: balanced distribution (50-50)
      return this.balanceSurfaceInterior(particles, 0.50, shapeType, params);
    }
  }

  /**
   * Filter particles by density ratio without minimum interior guarantee
   * Used for high particle counts where natural distribution provides enough interior particles
   * 
   * @param particles - Array of particles to filter
   * @param surfaceRatio - Desired ratio of surface particles (0-1)
   * @param shapeType - Type of shape for distance calculation
   * @param params - Shape parameters
   * @returns Filtered array with specified surface:interior ratio
   */
  private filterByDensityRatio(
    particles: ParticleAttributes[],
    surfaceRatio: number,
    shapeType: ShapeType,
    params: ShapeParams
  ): ParticleAttributes[] {
    // Define surface threshold (particles within 10% of max distance are considered "surface")
    const surfaceThreshold = 0.1;
    
    // Classify particles as surface or interior
    const surfaceParticles: ParticleAttributes[] = [];
    const interiorParticles: ParticleAttributes[] = [];
    
    for (const p of particles) {
      const distFromCenter = this.calculateDistanceFromSurface(p.position, shapeType, params);
      if (distFromCenter <= surfaceThreshold) {
        surfaceParticles.push(p);
      } else {
        interiorParticles.push(p);
      }
    }
    
    // Calculate how many of each type we need
    const totalNeeded = particles.length;
    const surfaceNeeded = Math.ceil(totalNeeded * surfaceRatio);
    const interiorNeeded = totalNeeded - surfaceNeeded;
    
    // Select particles to achieve desired ratio
    const result: ParticleAttributes[] = [];
    
    // Take surface particles
    const surfaceToTake = Math.min(surfaceNeeded, surfaceParticles.length);
    for (let i = 0; i < surfaceToTake; i++) {
      result.push(surfaceParticles[i]);
    }
    
    // Take interior particles
    const interiorToTake = Math.min(interiorNeeded, interiorParticles.length);
    for (let i = 0; i < interiorToTake; i++) {
      result.push(interiorParticles[i]);
    }
    
    // Fill remaining from any available pool
    while (result.length < totalNeeded) {
      if (result.length - surfaceToTake < interiorParticles.length - interiorToTake) {
        result.push(interiorParticles[interiorToTake + (result.length - surfaceToTake - interiorToTake)]);
      } else if (result.length - interiorToTake < surfaceParticles.length - surfaceToTake) {
        result.push(surfaceParticles[surfaceToTake + (result.length - surfaceToTake - interiorToTake)]);
      } else {
        break;
      }
    }
    
    return result.slice(0, totalNeeded);
  }

  /**
   * Generate text shape using Canvas API to render text and extract pixel positions
   * 
   * @param text - Text string to render (default: "我是ai")
   * @param count - Number of particles to distribute across the text
   * @returns Array of positions distributed across the text pixels
   */
  public generateText(text: string = "我是ai", count: number): Vector3[] {
    // Create a canvas element for text rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    
    // Set canvas size - larger for better text quality
    const canvasWidth = 512;
    const canvasHeight = 256;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Configure text rendering
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Render the text
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
    
    // Extract pixel data
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = imageData.data;
    
    // Collect all non-transparent (text) pixel positions
    const textPixels: Vector3[] = [];
    
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const index = (y * canvasWidth + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        
        // Check if pixel is part of the text (black pixels with full opacity)
        // We check for dark pixels (r, g, b < 128) to capture the text
        if (a > 128 && r < 128 && g < 128 && b < 128) {
          // Convert canvas coordinates to 3D space
          // Center the text and scale it appropriately
          const xPos = (x - canvasWidth / 2) / 50; // Scale down
          const yPos = -(y - canvasHeight / 2) / 50; // Flip Y and scale down
          // Add 3D depth for text extrusion effect
          const depth = 0.4;
          const zPos = (Math.random() - 0.5) * depth;
          
          textPixels.push({ x: xPos, y: yPos, z: zPos });
        }
      }
    }
    
    // Handle case where no text pixels were found
    if (textPixels.length === 0) {
      throw new Error('No text pixels found - text may be empty or rendering failed');
    }
    
    // Distribute particles across text pixels
    const positions: Vector3[] = [];
    
    if (count <= textPixels.length) {
      // If we have fewer particles than pixels, sample evenly
      const step = textPixels.length / count;
      for (let i = 0; i < count; i++) {
        const index = Math.floor(i * step);
        positions.push({ ...textPixels[index] });
      }
    } else {
      // If we have more particles than pixels, distribute with repetition
      for (let i = 0; i < count; i++) {
        const index = i % textPixels.length;
        // Add small random offset to avoid exact overlap
        const offset = 0.02;
        const randomX = (Math.random() - 0.5) * offset;
        const randomY = (Math.random() - 0.5) * offset;
        // Add random Z depth for 3D effect
        const depth = 0.4;
        const randomZ = (Math.random() - 0.5) * depth;
        
        positions.push({
          x: textPixels[index].x + randomX,
          y: textPixels[index].y + randomY,
          z: randomZ
        });
      }
    }
    
    return positions;
  }
}
