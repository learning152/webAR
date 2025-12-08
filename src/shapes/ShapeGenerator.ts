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
        const z = 0; // Star is flat in XY plane
        
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
      
      positions.push({
        x: r1 * v0.x + r2 * v1.x + r3 * v2.x,
        y: r1 * v0.y + r2 * v1.y + r3 * v2.y,
        z: 0
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
        positions.push({ x, y, z: 0 });
      }
    }
    
    // If we couldn't generate enough particles (unlikely), fill remaining with boundary points
    while (positions.length < count) {
      const randomBoundaryPoint = boundaryPoints[Math.floor(Math.random() * boundaryPoints.length)];
      positions.push({ ...randomBoundaryPoint });
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
    
    // Generate arrow shape positions
    const arrowPositions = this.generateArrow(arrowParticleCount, scale);
    
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
   * @returns Array of positions for the arrow
   */
  private generateArrow(count: number, scale: number): Vector3[] {
    const positions: Vector3[] = [];
    
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
    
    // Generate arrow shaft (rectangular)
    for (let i = 0; i < shaftParticleCount; i++) {
      const x = shaftStart + Math.random() * (shaftEnd - shaftStart);
      const y = (Math.random() - 0.5) * shaftWidth;
      const z = 0;
      
      positions.push({ x, y, z });
    }
    
    // Generate arrow head (triangle)
    // Arrow head vertices:
    // - Tip: (arrowTip, 0)
    // - Top base: (shaftEnd, headWidth/2)
    // - Bottom base: (shaftEnd, -headWidth/2)
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
      const z = 0;
      
      positions.push({ x, y, z });
    }
    
    return positions;
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
          const zPos = 0; // Text is flat in XY plane
          
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
        
        positions.push({
          x: textPixels[index].x + randomX,
          y: textPixels[index].y + randomY,
          z: textPixels[index].z
        });
      }
    }
    
    return positions;
  }
}
