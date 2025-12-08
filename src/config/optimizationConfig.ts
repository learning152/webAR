/**
 * Optimization Configuration
 * Centralized configuration for visual quality, physics parameters, and performance tuning
 */

/**
 * Physics optimization parameters
 * Tuned for smooth, natural particle motion
 */
export const PHYSICS_CONFIG = {
  // Core physics parameters
  damping: 0.92,                    // Reduced from 0.95 for faster settling
  maxSpeed: 12.0,                   // Increased from 10.0 for more dynamic motion
  maxAcceleration: 6.0,             // Increased from 5.0 for snappier response
  
  // Target attraction parameters
  attractionStrength: 3.5,          // Increased from 2.0 for faster shape formation
  attractionRadius: 0.8,            // Increased from 0.5 for smoother transitions
  
  // Explosion parameters
  explosionStrength: 7.0,           // Increased from 5.0 for more dramatic effect
  explosionDuration: 0.4,           // Increased from 0.3 for smoother transitions
};

/**
 * Interaction optimization parameters
 * Tuned for responsive and satisfying user interactions
 */
export const INTERACTION_CONFIG = {
  // Wave storm parameters
  waveStorm: {
    velocityThreshold: 4.0,         // Reduced from 5.0 for easier triggering
    forceStrength: 10.0,            // Increased from 8.0 for more impact
    influenceRadius: 2.5,           // Increased from 2.0 for wider effect
  },
  
  // Depth scale parameters
  depthScale: {
    minScale: 0.6,                  // Increased from 0.5 for better visibility
    maxScale: 2.5,                  // Increased from 2.0 for more dramatic effect
    smoothing: 0.15,                // Increased from 0.1 for smoother transitions
  },
  
  // Explosion transition parameters
  explosionTransition: {
    explosionStrength: 7.0,         // Increased from 5.0 for more dramatic effect
    explosionDuration: 0.4,         // Increased from 0.3 for smoother transitions
  },
  
  // Finger heart spread parameters
  fingerHeartSpread: {
    colorTransitionDuration: 0.6,   // Increased from 0.5 for smoother color transition
    spreadStrength: 8.0,            // Increased from 6.0 for more dramatic spread
  },
};

/**
 * Shape generation optimization parameters
 * Tuned for clear visibility and aesthetic appeal
 */
export const SHAPE_CONFIG = {
  // Planet parameters
  planet: {
    radius: 3.5,                    // Increased from 3.0 for better visibility
  },
  
  // Text parameters
  text: {
    content: "我是ai",
    scale: 1.0,                     // Base scale
  },
  
  // Torus parameters
  torus: {
    majorRadius: 3.5,               // Increased from 3.0 for better visibility
    minorRadius: 1.2,               // Increased from 1.0 for clearer shape
  },
  
  // Star parameters
  star: {
    outerRadius: 3.5,               // Increased from 3.0 for better visibility
    innerRadius: 1.4,               // Increased from 1.2 for clearer points
  },
  
  // Heart parameters
  heart: {
    scale: 1.8,                     // Increased from 1.5 for better visibility
  },
  
  // Arrow heart parameters
  arrowHeart: {
    scale: 1.8,                     // Increased from 1.5 for better visibility
  },
};

/**
 * Rendering optimization parameters
 * Tuned for visual quality and performance balance
 */
export const RENDERING_CONFIG = {
  // Particle material parameters
  particleSize: 0.06,               // Increased from 0.05 for better visibility
  opacity: 0.85,                    // Increased from 0.8 for more vibrant appearance
  
  // Camera parameters
  cameraFOV: 70,                    // Reduced from 75 for less distortion
  cameraPosition: {
    x: 0,
    y: 0,
    z: 6,                           // Increased from 5 for better view
  },
  
  // Background color
  backgroundColor: 0x0a0a0a,        // Slightly lighter than pure black for contrast
  
  // Blending and transparency
  useAdditiveBlending: true,
  sizeAttenuation: true,
};

/**
 * Color palette optimization
 * Enhanced colors for better visual appeal
 */
export const COLOR_CONFIG = {
  // Cyan (default particle color)
  cyan: {
    r: 0.0,
    g: 1.0,
    b: 1.0,
  },
  
  // Pink (finger heart color)
  pink: {
    r: 1.0,
    g: 0.5,                         // Increased from 0.4 for brighter pink
    b: 0.75,                        // Increased from 0.7 for more vibrant pink
  },
  
  // Gold (planet gradient start)
  gold: {
    r: 1.0,
    g: 0.88,                        // Increased from 0.84 for brighter gold
    b: 0.1,                         // Added slight blue tint for warmth
  },
  
  // Blue (planet gradient end)
  blue: {
    r: 0.0,
    g: 0.6,                         // Increased from 0.5 for brighter blue
    b: 1.0,
  },
};

/**
 * Performance optimization parameters
 * Tuned for smooth 60 FPS on most devices
 */
export const PERFORMANCE_CONFIG = {
  // Target frame rate
  targetFPS: 60,
  
  // Performance degradation thresholds
  lowFPSThreshold: 25,              // Increased from 20 for earlier intervention
  criticalFPSThreshold: 15,         // New threshold for critical performance
  
  // Gesture detection throttling
  gestureDetectionInterval: 40,     // Reduced from 50 for more responsive detection
  
  // Particle count adjustment
  enableDynamicParticleCount: false, // Disabled by default
  minParticleCount: 8000,
  maxParticleCount: 16000,
};

/**
 * Get optimized physics configuration
 */
export function getOptimizedPhysicsConfig() {
  return { ...PHYSICS_CONFIG };
}

/**
 * Get optimized interaction configuration
 */
export function getOptimizedInteractionConfig() {
  return { ...INTERACTION_CONFIG };
}

/**
 * Get optimized shape configuration
 */
export function getOptimizedShapeConfig() {
  return { ...SHAPE_CONFIG };
}

/**
 * Get optimized rendering configuration
 */
export function getOptimizedRenderingConfig() {
  return { ...RENDERING_CONFIG };
}

/**
 * Get optimized color configuration
 */
export function getOptimizedColorConfig() {
  return { ...COLOR_CONFIG };
}

/**
 * Get optimized performance configuration
 */
export function getOptimizedPerformanceConfig() {
  return { ...PERFORMANCE_CONFIG };
}
