import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThreeEngine } from './ThreeEngine';

describe('ThreeEngine', () => {
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

  describe('场景初始化', () => {
    it('should throw error if Three.js is not loaded', () => {
      delete (window as any).THREE;
      const newEngine = new ThreeEngine();

      expect(() => {
        newEngine.initialize(container);
      }).toThrow('Three.js 未加载');
    });

    it('should initialize scene, camera, and renderer', () => {
      engine.initialize(container);

      expect(mockTHREE.Scene).toHaveBeenCalled();
      expect(mockTHREE.PerspectiveCamera).toHaveBeenCalled();
      expect(mockTHREE.WebGLRenderer).toHaveBeenCalled();
      
      expect(engine.getScene()).toBeDefined();
      expect(engine.getCamera()).toBeDefined();
      expect(engine.getRenderer()).toBeDefined();
    });

    it('should create BufferGeometry with correct particle count', () => {
      const particleCount = 16000;
      engine.initialize(container, particleCount);

      expect(mockTHREE.BufferGeometry).toHaveBeenCalled();
      expect(engine.getGeometry()).toBeDefined();
    });

    it('should append renderer canvas to container', () => {
      engine.initialize(container);

      const renderer = engine.getRenderer();
      expect(container.contains(renderer.domElement)).toBe(true);
    });
  });

  describe('渲染功能', () => {
    it('should render scene when render is called', () => {
      engine.initialize(container);
      const renderer = engine.getRenderer();

      engine.render();

      expect(renderer.render).toHaveBeenCalled();
    });

    it('should warn if render is called before initialization', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      engine.render();

      expect(consoleSpy).toHaveBeenCalledWith('ThreeEngine 未初始化，无法渲染');
      consoleSpy.mockRestore();
    });
  });

  describe('窗口调整', () => {
    it('should update camera aspect ratio on resize', () => {
      engine.initialize(container);
      const camera = engine.getCamera();

      engine.resize(1920, 1080);

      expect(camera.aspect).toBe(1920 / 1080);
      expect(camera.updateProjectionMatrix).toHaveBeenCalled();
    });

    it('should update renderer size on resize', () => {
      engine.initialize(container);
      const renderer = engine.getRenderer();

      engine.resize(1920, 1080);

      expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
    });
  });

  describe('资源清理', () => {
    it('should dispose geometry on cleanup', () => {
      engine.initialize(container);
      const geometry = engine.getGeometry();

      engine.dispose();

      expect(geometry.dispose).toHaveBeenCalled();
      expect(engine.getGeometry()).toBeNull();
    });

    it('should dispose material on cleanup', () => {
      engine.initialize(container);
      const material = engine.getMaterial();

      engine.dispose();

      expect(material.dispose).toHaveBeenCalled();
      expect(engine.getMaterial()).toBeNull();
    });

    it('should dispose renderer on cleanup', () => {
      engine.initialize(container);
      const renderer = engine.getRenderer();

      engine.dispose();

      expect(renderer.dispose).toHaveBeenCalled();
      expect(engine.getRenderer()).toBeNull();
    });

    it('should remove canvas from container on cleanup', () => {
      engine.initialize(container);
      const renderer = engine.getRenderer();
      const canvas = renderer.domElement;

      expect(container.contains(canvas)).toBe(true);

      engine.dispose();

      expect(container.contains(canvas)).toBe(false);
    });
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
      scale: { x: 1, y: 1, z: 1, set: vi.fn() }
    })),
    Color: vi.fn().mockImplementation((color: number) => color),
    AdditiveBlending: 2
  };
}
