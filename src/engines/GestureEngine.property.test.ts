import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { GestureEngine, Vector3, Euler, FingerStates, HAND_LANDMARKS } from './GestureEngine';

/**
 * Helper function to create a GestureEngine with mocked internals for testing
 * pure calculation methods without MediaPipe dependency
 */
function createTestableEngine(): GestureEngine {
  return new GestureEngine();
}

/**
 * Helper function to generate valid hand landmarks (21 points)
 * MediaPipe hand landmarks are normalized coordinates [0, 1]
 */
function generateMockLandmarks(
  wrist: Vector3,
  indexBase: Vector3,
  pinkyBase: Vector3,
  middleBase: Vector3
): Vector3[] {
  const landmarks: Vector3[] = [];
  
  // Generate 21 landmarks with the key points at specific indices
  for (let i = 0; i < 21; i++) {
    if (i === 0) {
      // Wrist
      landmarks.push({ ...wrist });
    } else if (i === 5) {
      // Index finger base (MCP)
      landmarks.push({ ...indexBase });
    } else if (i === 9) {
      // Middle finger base (MCP)
      landmarks.push({ ...middleBase });
    } else if (i === 17) {
      // Pinky base (MCP)
      landmarks.push({ ...pinkyBase });
    } else {
      // Other landmarks - interpolate between key points
      const t = i / 21;
      landmarks.push({
        x: wrist.x + t * (middleBase.x - wrist.x),
        y: wrist.y + t * (middleBase.y - wrist.y),
        z: wrist.z + t * (middleBase.z - wrist.z)
      });
    }
  }
  
  return landmarks;
}

describe('GestureEngine Property-Based Tests', () => {
  /**
   * Feature: webar-particle-interaction, Property 18: 手部速度计算
   * Validates: Requirements 11.1
   * 
   * For any hand position history sequence, the calculated velocity should equal
   * the position change divided by the time interval (velocity = Δposition / Δtime).
   */
  it('Property 18: hand velocity calculation', () => {
    fc.assert(
      fc.property(
        // Previous position (normalized coordinates [0, 1])
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
        // Current position (normalized coordinates [0, 1])
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
        // Time delta in milliseconds (realistic frame intervals)
        fc.float({ min: Math.fround(16), max: Math.fround(100), noNaN: true }),
        (prevX, prevY, prevZ, currX, currY, currZ, deltaTimeMs) => {
          const engine = createTestableEngine();
          
          // Set up previous position and time by accessing private members
          // We need to simulate the state that would exist after a previous frame
          const previousCenter: Vector3 = { x: prevX, y: prevY, z: prevZ };
          const currentCenter: Vector3 = { x: currX, y: currY, z: currZ };
          
          // Convert delta time to seconds for velocity calculation
          const deltaTimeSec = deltaTimeMs / 1000;
          
          // Calculate expected velocity (position change / time)
          const expectedVelocity: Vector3 = {
            x: (currX - prevX) / deltaTimeSec,
            y: (currY - prevY) / deltaTimeSec,
            z: (currZ - prevZ) / deltaTimeSec
          };
          
          // Access private members to set up test state
          // @ts-ignore - accessing private members for testing
          engine.previousCenter = previousCenter;
          // @ts-ignore - accessing private members for testing
          engine.previousTime = performance.now() - deltaTimeMs;
          
          // Calculate velocity using the engine's method
          const calculatedVelocity = engine.calculateHandVelocity(currentCenter);
          
          // Verify velocity components are calculated correctly
          // Allow some tolerance due to timing variations
          expect(calculatedVelocity.x).toBeCloseTo(expectedVelocity.x, 1);
          expect(calculatedVelocity.y).toBeCloseTo(expectedVelocity.y, 1);
          expect(calculatedVelocity.z).toBeCloseTo(expectedVelocity.z, 1);
          
          // Verify velocity direction is correct
          // If position increased, velocity should be positive (and vice versa)
          if (Math.abs(currX - prevX) > 0.01) {
            expect(Math.sign(calculatedVelocity.x)).toBe(Math.sign(currX - prevX));
          }
          if (Math.abs(currY - prevY) > 0.01) {
            expect(Math.sign(calculatedVelocity.y)).toBe(Math.sign(currY - prevY));
          }
          if (Math.abs(currZ - prevZ) > 0.01) {
            expect(Math.sign(calculatedVelocity.z)).toBe(Math.sign(currZ - prevZ));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 18 (edge case): zero velocity when no movement
   * Validates: Requirements 11.1
   * 
   * When the hand position doesn't change, velocity should be zero.
   */
  it('Property 18 (edge case): zero velocity when position unchanged', () => {
    fc.assert(
      fc.property(
        // Position (same for previous and current)
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
        // Time delta
        fc.float({ min: Math.fround(16), max: Math.fround(100), noNaN: true }),
        (x, y, z, deltaTimeMs) => {
          const engine = createTestableEngine();
          
          const position: Vector3 = { x, y, z };
          
          // @ts-ignore - accessing private members for testing
          engine.previousCenter = { ...position };
          // @ts-ignore - accessing private members for testing
          engine.previousTime = performance.now() - deltaTimeMs;
          
          const velocity = engine.calculateHandVelocity(position);
          
          // Velocity should be zero (or very close to zero)
          expect(Math.abs(velocity.x)).toBeLessThan(0.001);
          expect(Math.abs(velocity.y)).toBeLessThan(0.001);
          expect(Math.abs(velocity.z)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 18 (edge case): zero velocity when no previous data
   * Validates: Requirements 11.1
   * 
   * When there's no previous position data, velocity should be zero.
   */
  it('Property 18 (edge case): zero velocity when no previous data', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
        (x, y, z) => {
          const engine = createTestableEngine();
          
          // Don't set previous center - simulate first frame
          const currentCenter: Vector3 = { x, y, z };
          
          const velocity = engine.calculateHandVelocity(currentCenter);
          
          // Velocity should be zero when no previous data
          expect(velocity.x).toBe(0);
          expect(velocity.y).toBe(0);
          expect(velocity.z).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Feature: webar-particle-interaction, Property 23: 手部旋转计算
   * Validates: Requirements 16.1, 16.2
   * 
   * For any hand landmarks, the system should be able to calculate the hand's
   * 3D rotation angles and rotation axis based on the palm plane normal vector.
   */
  it('Property 23: hand rotation calculation', () => {
    fc.assert(
      fc.property(
        // Wrist position (normalized coordinates)
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.7), noNaN: true }),
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.7), noNaN: true }),
        fc.float({ min: Math.fround(-0.3), max: Math.fround(0.3), noNaN: true }),
        // Index finger base offset from wrist
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.2), noNaN: true }),
        fc.float({ min: Math.fround(-0.2), max: Math.fround(-0.05), noNaN: true }),
        fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
        // Pinky base offset from wrist
        fc.float({ min: Math.fround(-0.2), max: Math.fround(-0.05), noNaN: true }),
        fc.float({ min: Math.fround(-0.2), max: Math.fround(-0.05), noNaN: true }),
        fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
        (wristX, wristY, wristZ, indexOffX, indexOffY, indexOffZ, pinkyOffX, pinkyOffY, pinkyOffZ) => {
          const engine = createTestableEngine();
          
          // Create wrist position
          const wrist: Vector3 = { x: wristX, y: wristY, z: wristZ };
          
          // Create index finger base position (relative to wrist)
          const indexBase: Vector3 = {
            x: wristX + indexOffX,
            y: wristY + indexOffY,
            z: wristZ + indexOffZ
          };
          
          // Create pinky base position (relative to wrist)
          const pinkyBase: Vector3 = {
            x: wristX + pinkyOffX,
            y: wristY + pinkyOffY,
            z: wristZ + pinkyOffZ
          };
          
          // Create middle finger base (between index and pinky)
          const middleBase: Vector3 = {
            x: (indexBase.x + pinkyBase.x) / 2,
            y: (indexBase.y + pinkyBase.y) / 2,
            z: (indexBase.z + pinkyBase.z) / 2
          };
          
          // Generate full landmarks array
          const landmarks = generateMockLandmarks(wrist, indexBase, pinkyBase, middleBase);
          
          // Calculate rotation
          const rotation = engine.calculateHandRotation(landmarks);
          
          // Verify rotation is a valid Euler object
          expect(rotation).toHaveProperty('x');
          expect(rotation).toHaveProperty('y');
          expect(rotation).toHaveProperty('z');
          
          // Verify all rotation components are finite numbers
          expect(Number.isFinite(rotation.x)).toBe(true);
          expect(Number.isFinite(rotation.y)).toBe(true);
          expect(Number.isFinite(rotation.z)).toBe(true);
          
          // Verify rotation angles are within valid range
          // Pitch (x): -π/2 to π/2
          expect(rotation.x).toBeGreaterThanOrEqual(-Math.PI / 2 - 0.01);
          expect(rotation.x).toBeLessThanOrEqual(Math.PI / 2 + 0.01);
          
          // Yaw (y): -π to π
          expect(rotation.y).toBeGreaterThanOrEqual(-Math.PI - 0.01);
          expect(rotation.y).toBeLessThanOrEqual(Math.PI + 0.01);
          
          // Roll (z): -π to π
          expect(rotation.z).toBeGreaterThanOrEqual(-Math.PI - 0.01);
          expect(rotation.z).toBeLessThanOrEqual(Math.PI + 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 23 (consistency): rotation changes with hand orientation
   * Validates: Requirements 16.1, 16.2
   * 
   * When the hand orientation changes, the calculated rotation should change accordingly.
   */
  it('Property 23 (consistency): rotation changes with hand orientation', () => {
    fc.assert(
      fc.property(
        // Base wrist position
        fc.float({ min: Math.fround(0.4), max: Math.fround(0.6), noNaN: true }),
        fc.float({ min: Math.fround(0.4), max: Math.fround(0.6), noNaN: true }),
        // Rotation angle to apply (in radians)
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
        (wristX, wristY, rotationAngle) => {
          const engine = createTestableEngine();
          
          // Create base hand configuration (flat hand facing camera)
          const wrist: Vector3 = { x: wristX, y: wristY, z: 0 };
          const indexBase: Vector3 = { x: wristX + 0.1, y: wristY - 0.1, z: 0 };
          const pinkyBase: Vector3 = { x: wristX - 0.1, y: wristY - 0.1, z: 0 };
          const middleBase: Vector3 = { x: wristX, y: wristY - 0.1, z: 0 };
          
          const landmarks1 = generateMockLandmarks(wrist, indexBase, pinkyBase, middleBase);
          const rotation1 = engine.calculateHandRotation(landmarks1);
          
          // Create rotated hand configuration (tilted)
          const cos = Math.cos(rotationAngle);
          const sin = Math.sin(rotationAngle);
          
          // Rotate index and pinky around wrist (simple 2D rotation in XY plane)
          const rotatedIndexBase: Vector3 = {
            x: wristX + (indexBase.x - wristX) * cos - (indexBase.y - wristY) * sin,
            y: wristY + (indexBase.x - wristX) * sin + (indexBase.y - wristY) * cos,
            z: 0
          };
          const rotatedPinkyBase: Vector3 = {
            x: wristX + (pinkyBase.x - wristX) * cos - (pinkyBase.y - wristY) * sin,
            y: wristY + (pinkyBase.x - wristX) * sin + (pinkyBase.y - wristY) * cos,
            z: 0
          };
          const rotatedMiddleBase: Vector3 = {
            x: (rotatedIndexBase.x + rotatedPinkyBase.x) / 2,
            y: (rotatedIndexBase.y + rotatedPinkyBase.y) / 2,
            z: 0
          };
          
          const landmarks2 = generateMockLandmarks(wrist, rotatedIndexBase, rotatedPinkyBase, rotatedMiddleBase);
          const rotation2 = engine.calculateHandRotation(landmarks2);
          
          // The rotations should be different
          const rotationDiff = Math.abs(rotation1.z - rotation2.z);
          
          // The difference should be approximately equal to the applied rotation
          // Allow some tolerance due to the simplified rotation model
          expect(rotationDiff).toBeGreaterThan(0.05);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 23 (edge case): zero rotation for insufficient landmarks
   * Validates: Requirements 16.1, 16.2
   * 
   * When there are insufficient landmarks, rotation should be zero.
   */
  it('Property 23 (edge case): zero rotation for insufficient landmarks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // Number of landmarks (less than 21)
        (numLandmarks) => {
          const engine = createTestableEngine();
          
          // Create insufficient landmarks
          const landmarks: Vector3[] = [];
          for (let i = 0; i < numLandmarks; i++) {
            landmarks.push({ x: 0.5, y: 0.5, z: 0 });
          }
          
          const rotation = engine.calculateHandRotation(landmarks);
          
          // Rotation should be zero for insufficient landmarks
          expect(rotation.x).toBe(0);
          expect(rotation.y).toBe(0);
          expect(rotation.z).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 18 + 23 (integration): area ratio calculation
   * Validates: Requirements 12.1
   * 
   * For any valid hand landmarks, the area ratio should be calculated correctly
   * based on the bounding box area.
   */
  it('Area ratio calculation based on bounding box', () => {
    fc.assert(
      fc.property(
        // Bounding box dimensions (normalized coordinates)
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // width
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }), // height
        // Center position
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.7), noNaN: true }),
        fc.float({ min: Math.fround(0.3), max: Math.fround(0.7), noNaN: true }),
        (width, height, centerX, centerY) => {
          const engine = createTestableEngine();
          
          // Create landmarks that span the specified bounding box
          const landmarks: Vector3[] = [];
          
          // Create 21 landmarks distributed within the bounding box
          for (let i = 0; i < 21; i++) {
            const t = i / 20;
            const row = Math.floor(i / 5);
            const col = i % 5;
            
            landmarks.push({
              x: centerX - width / 2 + (col / 4) * width,
              y: centerY - height / 2 + (row / 4) * height,
              z: 0
            });
          }
          
          const areaRatio = engine.calculateAreaRatio(landmarks);
          
          // Verify area ratio is positive
          expect(areaRatio).toBeGreaterThan(0);
          
          // Verify area ratio is less than 1 (normalized coordinates)
          expect(areaRatio).toBeLessThanOrEqual(1);
          
          // Verify area ratio is approximately width * height
          // Allow some tolerance due to discrete landmark positions
          const expectedArea = width * height;
          expect(areaRatio).toBeCloseTo(expectedArea, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 22: 手指状态分析
   * Validates: Requirements 13.1
   * 
   * For any valid hand landmarks, the system should be able to analyze
   * each finger's extension state (extended or curled).
   */
  it('Property 22: finger state analysis', () => {
    fc.assert(
      fc.property(
        // Generate finger extension states (true = extended, false = curled)
        fc.boolean(), // thumb
        fc.boolean(), // index
        fc.boolean(), // middle
        fc.boolean(), // ring
        fc.boolean(), // pinky
        // Base wrist position
        fc.float({ min: Math.fround(0.4), max: Math.fround(0.6), noNaN: true }),
        fc.float({ min: Math.fround(0.5), max: Math.fround(0.7), noNaN: true }),
        (thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended, wristX, wristY) => {
          const engine = createTestableEngine();
          
          // Generate landmarks based on finger extension states
          const landmarks = generateLandmarksWithFingerStates(
            wristX, wristY,
            thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended
          );
          
          // Analyze finger states
          const fingerStates = engine.analyzeFingerStates(landmarks);
          
          // Verify the result is a valid FingerStates object
          expect(fingerStates).toHaveProperty('thumb');
          expect(fingerStates).toHaveProperty('index');
          expect(fingerStates).toHaveProperty('middle');
          expect(fingerStates).toHaveProperty('ring');
          expect(fingerStates).toHaveProperty('pinky');
          
          // Verify all states are boolean
          expect(typeof fingerStates.thumb).toBe('boolean');
          expect(typeof fingerStates.index).toBe('boolean');
          expect(typeof fingerStates.middle).toBe('boolean');
          expect(typeof fingerStates.ring).toBe('boolean');
          expect(typeof fingerStates.pinky).toBe('boolean');
          
          // Verify finger states match the generated landmarks
          // Note: We expect the analysis to correctly identify the finger states
          expect(fingerStates.index).toBe(indexExtended);
          expect(fingerStates.middle).toBe(middleExtended);
          expect(fingerStates.ring).toBe(ringExtended);
          expect(fingerStates.pinky).toBe(pinkyExtended);
          // Thumb detection is more complex due to different orientation
          // We verify it returns a boolean but don't strictly check the value
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: webar-particle-interaction, Property 22 (edge case): insufficient landmarks
   * Validates: Requirements 13.1
   * 
   * When there are insufficient landmarks, all finger states should be false.
   */
  it('Property 22 (edge case): all fingers false for insufficient landmarks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // Number of landmarks (less than 21)
        (numLandmarks) => {
          const engine = createTestableEngine();
          
          // Create insufficient landmarks
          const landmarks: Vector3[] = [];
          for (let i = 0; i < numLandmarks; i++) {
            landmarks.push({ x: 0.5, y: 0.5, z: 0 });
          }
          
          const fingerStates = engine.analyzeFingerStates(landmarks);
          
          // All finger states should be false for insufficient landmarks
          expect(fingerStates.thumb).toBe(false);
          expect(fingerStates.index).toBe(false);
          expect(fingerStates.middle).toBe(false);
          expect(fingerStates.ring).toBe(false);
          expect(fingerStates.pinky).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to generate landmarks with specific finger extension states
 * This creates realistic hand landmarks where fingers are either extended or curled
 */
function generateLandmarksWithFingerStates(
  wristX: number,
  wristY: number,
  thumbExtended: boolean,
  indexExtended: boolean,
  middleExtended: boolean,
  ringExtended: boolean,
  pinkyExtended: boolean
): Vector3[] {
  const landmarks: Vector3[] = [];
  
  // Initialize all 21 landmarks with default positions
  for (let i = 0; i < 21; i++) {
    landmarks.push({ x: wristX, y: wristY, z: 0 });
  }
  
  // Wrist (0)
  landmarks[HAND_LANDMARKS.WRIST] = { x: wristX, y: wristY, z: 0 };
  
  // Thumb landmarks (1-4)
  // Thumb extends to the side, so we use x-coordinate primarily
  const thumbBaseX = wristX - 0.08;
  landmarks[HAND_LANDMARKS.THUMB_CMC] = { x: thumbBaseX, y: wristY - 0.02, z: 0 };
  landmarks[HAND_LANDMARKS.THUMB_MCP] = { x: thumbBaseX - 0.03, y: wristY - 0.05, z: 0 };
  landmarks[HAND_LANDMARKS.THUMB_IP] = { x: thumbBaseX - 0.05, y: wristY - 0.08, z: 0 };
  if (thumbExtended) {
    // Extended thumb - tip is far from wrist
    landmarks[HAND_LANDMARKS.THUMB_TIP] = { x: thumbBaseX - 0.08, y: wristY - 0.10, z: 0 };
  } else {
    // Curled thumb - tip is close to palm
    landmarks[HAND_LANDMARKS.THUMB_TIP] = { x: thumbBaseX - 0.02, y: wristY - 0.06, z: 0 };
  }
  
  // Index finger landmarks (5-8)
  const indexBaseX = wristX - 0.04;
  landmarks[HAND_LANDMARKS.INDEX_MCP] = { x: indexBaseX, y: wristY - 0.12, z: 0 };
  if (indexExtended) {
    // Extended: tip.y < pip.y < mcp.y (finger pointing up)
    landmarks[HAND_LANDMARKS.INDEX_PIP] = { x: indexBaseX, y: wristY - 0.18, z: 0 };
    landmarks[HAND_LANDMARKS.INDEX_DIP] = { x: indexBaseX, y: wristY - 0.22, z: 0 };
    landmarks[HAND_LANDMARKS.INDEX_TIP] = { x: indexBaseX, y: wristY - 0.26, z: 0 };
  } else {
    // Curled: tip.y > pip.y (finger curled down)
    landmarks[HAND_LANDMARKS.INDEX_PIP] = { x: indexBaseX, y: wristY - 0.15, z: 0 };
    landmarks[HAND_LANDMARKS.INDEX_DIP] = { x: indexBaseX + 0.02, y: wristY - 0.13, z: 0 };
    landmarks[HAND_LANDMARKS.INDEX_TIP] = { x: indexBaseX + 0.03, y: wristY - 0.11, z: 0 };
  }
  
  // Middle finger landmarks (9-12)
  const middleBaseX = wristX;
  landmarks[HAND_LANDMARKS.MIDDLE_MCP] = { x: middleBaseX, y: wristY - 0.12, z: 0 };
  if (middleExtended) {
    landmarks[HAND_LANDMARKS.MIDDLE_PIP] = { x: middleBaseX, y: wristY - 0.19, z: 0 };
    landmarks[HAND_LANDMARKS.MIDDLE_DIP] = { x: middleBaseX, y: wristY - 0.24, z: 0 };
    landmarks[HAND_LANDMARKS.MIDDLE_TIP] = { x: middleBaseX, y: wristY - 0.28, z: 0 };
  } else {
    landmarks[HAND_LANDMARKS.MIDDLE_PIP] = { x: middleBaseX, y: wristY - 0.15, z: 0 };
    landmarks[HAND_LANDMARKS.MIDDLE_DIP] = { x: middleBaseX + 0.02, y: wristY - 0.13, z: 0 };
    landmarks[HAND_LANDMARKS.MIDDLE_TIP] = { x: middleBaseX + 0.03, y: wristY - 0.11, z: 0 };
  }
  
  // Ring finger landmarks (13-16)
  const ringBaseX = wristX + 0.04;
  landmarks[HAND_LANDMARKS.RING_MCP] = { x: ringBaseX, y: wristY - 0.11, z: 0 };
  if (ringExtended) {
    landmarks[HAND_LANDMARKS.RING_PIP] = { x: ringBaseX, y: wristY - 0.17, z: 0 };
    landmarks[HAND_LANDMARKS.RING_DIP] = { x: ringBaseX, y: wristY - 0.21, z: 0 };
    landmarks[HAND_LANDMARKS.RING_TIP] = { x: ringBaseX, y: wristY - 0.25, z: 0 };
  } else {
    landmarks[HAND_LANDMARKS.RING_PIP] = { x: ringBaseX, y: wristY - 0.14, z: 0 };
    landmarks[HAND_LANDMARKS.RING_DIP] = { x: ringBaseX + 0.02, y: wristY - 0.12, z: 0 };
    landmarks[HAND_LANDMARKS.RING_TIP] = { x: ringBaseX + 0.03, y: wristY - 0.10, z: 0 };
  }
  
  // Pinky finger landmarks (17-20)
  const pinkyBaseX = wristX + 0.07;
  landmarks[HAND_LANDMARKS.PINKY_MCP] = { x: pinkyBaseX, y: wristY - 0.10, z: 0 };
  if (pinkyExtended) {
    landmarks[HAND_LANDMARKS.PINKY_PIP] = { x: pinkyBaseX, y: wristY - 0.14, z: 0 };
    landmarks[HAND_LANDMARKS.PINKY_DIP] = { x: pinkyBaseX, y: wristY - 0.17, z: 0 };
    landmarks[HAND_LANDMARKS.PINKY_TIP] = { x: pinkyBaseX, y: wristY - 0.20, z: 0 };
  } else {
    landmarks[HAND_LANDMARKS.PINKY_PIP] = { x: pinkyBaseX, y: wristY - 0.12, z: 0 };
    landmarks[HAND_LANDMARKS.PINKY_DIP] = { x: pinkyBaseX + 0.02, y: wristY - 0.10, z: 0 };
    landmarks[HAND_LANDMARKS.PINKY_TIP] = { x: pinkyBaseX + 0.03, y: wristY - 0.09, z: 0 };
  }
  
  return landmarks;
}
