import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ThreeEngine } from './ThreeEngine';

/**
 * Property-based tests for ThreeEngine scaling functionality
 * Feature: gesture-simulator-fallback
 */
describe('ThreeEngine Scale Property Tests', () => {
  let engine: ThreeEngine;
  let container: HTMLElement;
  let mockTHREE: any;

  beforeEach(() => {
    // 创建容器元素
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // 模拟 Three.js 全局对象
    mockTHREE = createMockTHREE();
    (window as any).THREE = mockTHREE;
    engine = new ThreeEngine();
    engine.initialize(container);
  });

  afterEach(() => {
    // 清理
    try {
      if (engine) {
        engine.dispose();
      }
    } catch (e) {
      // Ignore disposal errors in tests
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    delete (window as any).THREE;
    vi.restoreAllMocks();
  });

  /**
   * Property 4: 缩放滑块值与缩放比例的映射
   * Validates: Requirements 4.2, 4.4
   * 
   * For any slider value (within valid range), the scale should be proportionally
   * mapped, and scale values should be clamped within minimum and maximum boundaries.
   * Note: Scale range extended to 0.1-10.0 for more dramatic zoom effects.
   */
  it('Property 4: scale slider values should map correctly and be clamped', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(15), noNaN: true }),
        (sliderValue) => {
          // Set the scale
          engine.setSceneScale(sliderValue);

          // Get the resulting scale
          const result = engine.getSceneScale();

          // Scale should be clamped between 0.1 and 10.0 (extended range)
          expect(result).toBeGreaterThanOrEqual(0.1);
          expect(result).toBeLessThanOrEqual(10.0);

          // If slider value is within bounds, it should match
          if (sliderValue >= 0.1 && sliderValue <= 10.0) {
            expect(result).toBeCloseTo(sliderValue, 5);
          }

          // If slider value is below minimum, should clamp to 0.1
          if (sliderValue < 0.1) {
            expect(result).toBeCloseTo(0.1, 5);
          }

          // If slider value is above maximum, should clamp to 10.0
          if (sliderValue > 10.0) {
            expect(result).toBeCloseTo(10.0, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Scale should be uniform across all axes
   */
  it('should apply uniform scale across x, y, z axes', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }),
        (scale) => {
          engine.setSceneScale(scale);

          const points = engine.getPoints();
          
          // All axes should have the same scale
          expect(points.scale.x).toBeCloseTo(scale, 5);
          expect(points.scale.y).toBeCloseTo(scale, 5);
          expect(points.scale.z).toBeCloseTo(scale, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Scale should be retrievable after setting
   */
  it('should retrieve the same scale value that was set', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }),
        (scale) => {
          engine.setSceneScale(scale);
          const result = engine.getSceneScale();

          expect(result).toBeCloseTo(scale, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Default scale should be 1.0
   */
  it('should have default scale of 1.0 after initialization', () => {
    const scale = engine.getSceneScale();
    expect(scale).toBe(1.0);
  });
});

// Helper function to create mock THREE object
function createMockTHREE() {
  return {
    Scene: vi.fn().mockImplementation(() => ({
      background: null,
      children: [],
      add: vi.fn(),
      remove: vi.fn()
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { z: 0 },
      aspect: 1,
      updateProjectionMatrix: vi.fn()
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => {
      const canvas = document.createElement('canvas');
      return {
        domElement: canvas,
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn()
      };
    }),
    BufferGeometry: vi.fn().mockImplementation(() => ({
      setAttribute: vi.fn(),
      attributes: {
        position: { array: new Float32Array(100), needsUpdate: false },
        color: { array: new Float32Array(100), needsUpdate: false },
        size: { array: new Float32Array(100), needsUpdate: false }
      },
      dispose: vi.fn()
    })),
    BufferAttribute: vi.fn().mockImplementation((array: Float32Array, itemSize: number) => ({
      array,
      itemSize,
      needsUpdate: false
    })),
    PointsMaterial: vi.fn().mockImplementation(() => ({
      dispose: vi.fn()
    })),
    ShaderMaterial: vi.fn().mockImplementation(() => ({
      dispose: vi.fn(),
      uniforms: {}
    })),
    Points: vi.fn().mockImplementation((geometry: any, material: any) => ({
      geometry,
      material,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1, set: vi.fn(function(this: any, x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      })}
    })),
    Color: vi.fn().mockImplementation((color: number) => color),
    AdditiveBlending: 2
  };
}
