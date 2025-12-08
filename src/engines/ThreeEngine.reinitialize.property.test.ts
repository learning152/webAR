/**
 * Property-based tests for ThreeEngine.reinitializeParticles
 * Tests dynamic particle count adjustment functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ThreeEngine } from './ThreeEngine';

// Mock THREE.js
const createMockTHREE = () => {
  const mockGeometry = {
    setAttribute: vi.fn(),
    attributes: {
      position: { array: new Float32Array(0), needsUpdate: false },
      color: { array: new Float32Array(0), needsUpdate: false },
      size: { array: new Float32Array(0), needsUpdate: false }
    },
    dispose: vi.fn()
  };

  const mockMaterial = {
    dispose: vi.fn()
  };

  const mockPoints = {
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1, set: vi.fn((x: number, y: number, z: number) => {
      mockPoints.scale.x = x;
      mockPoints.scale.y = y;
      mockPoints.scale.z = z;
    }) }
  };

  const mockScene = {
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    background: null
  };

  const mockCamera = {
    aspect: 1,
    position: { z: 5 },
    updateProjectionMatrix: vi.fn()
  };

  const mockRenderer = {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas')
  };

  // Track created geometries for testing
  let lastCreatedGeometry = mockGeometry;
  let geometryCreateCount = 0;

  return {
    Scene: vi.fn(() => mockScene),
    PerspectiveCamera: vi.fn(() => mockCamera),
    WebGLRenderer: vi.fn(() => mockRenderer),
    BufferGeometry: vi.fn(() => {
      geometryCreateCount++;
      const newGeometry = {
        setAttribute: vi.fn((name: string, attr: any) => {
          newGeometry.attributes[name] = { array: attr.array, needsUpdate: false };
        }),
        attributes: {
          position: { array: new Float32Array(0), needsUpdate: false },
          color: { array: new Float32Array(0), needsUpdate: false },
          size: { array: new Float32Array(0), needsUpdate: false }
        },
        dispose: vi.fn()
      };
      lastCreatedGeometry = newGeometry;
      return newGeometry;
    }),
    BufferAttribute: vi.fn((array: Float32Array, itemSize: number) => ({ array, itemSize })),
    ShaderMaterial: vi.fn(() => mockMaterial),
    Points: vi.fn((geometry: any, material: any) => {
      const points = {
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1, set: vi.fn((x: number, y: number, z: number) => {
          points.scale.x = x;
          points.scale.y = y;
          points.scale.z = z;
        }) },
        geometry,
        material
      };
      return points;
    }),
    Color: vi.fn(),
    AdditiveBlending: 1,
    getLastCreatedGeometry: () => lastCreatedGeometry,
    getGeometryCreateCount: () => geometryCreateCount,
    resetGeometryCreateCount: () => { geometryCreateCount = 0; }
  };
};

describe('ThreeEngine.reinitializeParticles Property Tests', () => {
  let engine: ThreeEngine;
  let mockTHREE: ReturnType<typeof createMockTHREE>;
  let container: HTMLElement;

  beforeEach(() => {
    mockTHREE = createMockTHREE();
    (window as any).THREE = mockTHREE;
    
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);
    
    engine = new ThreeEngine();
  });

  afterEach(() => {
    engine.dispose();
    document.body.removeChild(container);
    delete (window as any).THREE;
  });

  /**
   * Property 1: Geometry buffer size matches particle count
   * For any particle count N in range [1000, 32000], after calling
   * reinitializeParticles(N), the geometry position buffer SHALL have
   * exactly N * 3 elements.
   * 
   * **Feature: dynamic-particle-count, Property 1: Geometry buffer size matches particle count**
   * **Validates: Requirements 1.2, 2.1**
   */
  it('Property 1: geometry buffer size matches particle count after reinitialization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 32000 }),
        (newCount) => {
          // Initialize with a different count first
          const initialCount = newCount === 16000 ? 8000 : 16000;
          engine.initialize(container, initialCount);
          
          // Reinitialize with new count
          engine.reinitializeParticles(newCount);
          
          // Verify geometry buffer size
          const geometry = engine.getGeometry();
          expect(geometry).toBeDefined();
          expect(geometry.attributes.position.array.length).toBe(newCount * 3);
          expect(geometry.attributes.color.array.length).toBe(newCount * 3);
          
          // Verify particle count is updated
          expect(engine.getParticleCount()).toBe(newCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Scene state preservation round-trip
   * For any rotation R and scale S, after setting rotation to R and scale to S,
   * then calling reinitializeParticles(N), the rotation SHALL equal R and
   * scale SHALL equal S.
   * 
   * **Feature: dynamic-particle-count, Property 3: Scene state preservation round-trip**
   * **Validates: Requirements 2.2**
   */
  it('Property 3: scene rotation and scale are preserved after reinitialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          rotationX: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          rotationY: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          rotationZ: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          scale: fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }),
          newCount: fc.integer({ min: 1000, max: 32000 })
        }),
        ({ rotationX, rotationY, rotationZ, scale, newCount }) => {
          // Initialize
          const initialCount = newCount === 16000 ? 8000 : 16000;
          engine.initialize(container, initialCount);
          
          // Set rotation and scale
          engine.setSceneRotation({ x: rotationX, y: rotationY, z: rotationZ });
          engine.setSceneScale(scale);
          
          // Reinitialize
          engine.reinitializeParticles(newCount);
          
          // Verify rotation is preserved
          const rotation = engine.getSceneRotation();
          expect(rotation.x).toBeCloseTo(rotationX, 5);
          expect(rotation.y).toBeCloseTo(rotationY, 5);
          expect(rotation.z).toBeCloseTo(rotationZ, 5);
          
          // Verify scale is preserved (clamped to valid range)
          const expectedScale = Math.max(0.1, Math.min(10.0, scale));
          expect(engine.getSceneScale()).toBeCloseTo(expectedScale, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Same count skips reinitialization
   * For any ThreeEngine with current count N, calling reinitializeParticles(N)
   * SHALL NOT create new geometry buffers.
   * 
   * **Feature: dynamic-particle-count, Property 4: Same count skips reinitialization**
   * **Validates: Requirements 2.4**
   */
  it('Property 4: same count skips reinitialization (no new geometry created)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 32000 }),
        (count) => {
          // Initialize
          engine.initialize(container, count);
          
          // Get initial geometry reference
          const initialGeometry = engine.getGeometry();
          
          // Reset geometry create count
          mockTHREE.resetGeometryCreateCount();
          
          // Reinitialize with same count
          engine.reinitializeParticles(count);
          
          // Verify no new geometry was created
          expect(mockTHREE.getGeometryCreateCount()).toBe(0);
          
          // Verify geometry reference is unchanged
          expect(engine.getGeometry()).toBe(initialGeometry);
        }
      ),
      { numRuns: 100 }
    );
  });
});
