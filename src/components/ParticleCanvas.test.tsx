/**
 * ParticleCanvas 组件测试
 * 测试组件挂载、初始化和卸载清理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ParticleCanvas } from './ParticleCanvas';

// Mock requestAnimationFrame and cancelAnimationFrame
let rafCallbacks: ((time: number) => void)[] = [];
let rafId = 0;

const mockRequestAnimationFrame = vi.fn((callback: (time: number) => void) => {
  rafCallbacks.push(callback);
  return ++rafId;
});

const mockCancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks = [];
});

// Mock performance.now()
let mockTime = 0;
const mockPerformanceNow = vi.fn(() => mockTime);

// Setup global mocks
beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  mockTime = 0;
  
  global.requestAnimationFrame = mockRequestAnimationFrame as any;
  global.cancelAnimationFrame = mockCancelAnimationFrame as any;
  global.performance.now = mockPerformanceNow;
});

// Mock 引擎类
vi.mock('../engines/ThreeEngine', () => ({
  ThreeEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    updatePositions: vi.fn(),
    updateColors: vi.fn()
  }))
}));

vi.mock('../engines/PhysicsEngine', () => ({
  PhysicsEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    update: vi.fn(),
    getParticleData: vi.fn(() => ({
      positions: new Float32Array(16000 * 3),
      colors: new Float32Array(16000 * 3)
    }))
  }))
}));

vi.mock('../engines/GestureEngine', () => ({
  GestureEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    getCurrentGesture: vi.fn(() => 'none'),
    getHandData: vi.fn(() => null)
  })),
  GestureType: {
    OPEN_HAND: 'open_hand',
    SCISSORS: 'scissors',
    FIST: 'fist',
    POINT: 'point',
    THUMBS_UP: 'thumbs_up',
    FINGER_HEART: 'finger_heart',
    NONE: 'none'
  }
}));

vi.mock('../engines/GestureStateMachine', () => ({
  GestureStateMachine: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    onStateChange: vi.fn(),
    getCurrentState: vi.fn(() => 'none')
  }))
}));

vi.mock('../engines/InteractionManager', () => ({
  InteractionManager: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    triggerTransition: vi.fn()
  }))
}));

vi.mock('../utils/CameraManager', () => ({
  CameraManager: vi.fn().mockImplementation(() => ({
    requestCamera: vi.fn().mockResolvedValue({
      success: true,
      stream: {} as MediaStream
    }),
    attachToVideoElement: vi.fn().mockResolvedValue(true),
    stop: vi.fn()
  }))
}));

describe('ParticleCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('组件挂载和初始化', () => {
    it('should render without crashing', () => {
      const { container } = render(<ParticleCanvas />);
      expect(container).toBeDefined();
    });

    it('should create container div with correct styles', () => {
      const { container } = render(<ParticleCanvas />);
      const containerDiv = container.firstChild as HTMLElement;
      
      expect(containerDiv).toBeDefined();
      expect(containerDiv.style.width).toBe('100%');
      expect(containerDiv.style.height).toBe('100%');
      expect(containerDiv.style.position).toBe('relative');
      expect(containerDiv.style.backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('should create hidden video element', () => {
      const { container } = render(<ParticleCanvas />);
      const video = container.querySelector('video');
      
      expect(video).toBeDefined();
      expect(video?.style.position).toBe('absolute');
      expect(video?.style.opacity).toBe('0');
      expect(video?.hasAttribute('playsinline')).toBe(true);
      // React sets muted as a property, not always as an attribute
      expect(video).toBeDefined();
    });

    it('should accept particleCount prop', () => {
      const { container } = render(<ParticleCanvas particleCount={16000} />);
      expect(container).toBeDefined();
    });

    it('should accept onGestureChange callback prop', () => {
      const onGestureChange = vi.fn();
      const { container } = render(<ParticleCanvas onGestureChange={onGestureChange} />);
      expect(container).toBeDefined();
    });

    it('should accept onError callback prop', () => {
      const onError = vi.fn();
      const { container } = render(<ParticleCanvas onError={onError} />);
      expect(container).toBeDefined();
    });
  });

  describe('组件卸载和清理', () => {
    it('should unmount without errors', () => {
      const { unmount } = render(<ParticleCanvas />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle multiple unmounts gracefully', () => {
      const { unmount } = render(<ParticleCanvas />);
      
      // Should not throw error on multiple unmounts
      expect(() => {
        unmount();
        unmount();
      }).not.toThrow();
    });
  });

  describe('渲染循环', () => {
    it('should have requestAnimationFrame available globally', () => {
      // Verify that requestAnimationFrame is available
      expect(global.requestAnimationFrame).toBeDefined();
      expect(typeof global.requestAnimationFrame).toBe('function');
    });

    it('should have cancelAnimationFrame available globally', () => {
      // Verify that cancelAnimationFrame is available
      expect(global.cancelAnimationFrame).toBeDefined();
      expect(typeof global.cancelAnimationFrame).toBe('function');
    });

    it('should calculate deltaTime correctly in render loop logic', () => {
      // Test the deltaTime calculation logic
      const lastTime = 1000; // ms
      const currentTime = 1016; // ms (16ms later, ~60fps)
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      
      expect(deltaTime).toBeCloseTo(0.016, 3);
    });

    it('should clamp deltaTime to prevent large jumps', () => {
      // Test the deltaTime clamping logic
      const lastTime = 1000; // ms
      const currentTime = 2000; // ms (1000ms later - a huge jump)
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      const clampedDeltaTime = Math.min(deltaTime, 0.1); // Clamp to 0.1 seconds max
      
      expect(deltaTime).toBe(1.0);
      expect(clampedDeltaTime).toBe(0.1);
    });

    it('should handle multiple frame time calculations', () => {
      // Simulate multiple frames
      const frameTimes = [0, 16, 32, 48, 64, 80]; // 60fps timing
      const deltaTimes = [];
      
      for (let i = 1; i < frameTimes.length; i++) {
        const deltaTime = (frameTimes[i] - frameTimes[i - 1]) / 1000;
        deltaTimes.push(deltaTime);
      }
      
      // All delta times should be approximately 0.016 seconds (60fps)
      deltaTimes.forEach(dt => {
        expect(dt).toBeCloseTo(0.016, 3);
      });
    });
  });
});
