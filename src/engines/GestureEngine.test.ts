import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GestureEngine, GestureType, Vector3 } from './GestureEngine';

describe('GestureEngine', () => {
  let engine: GestureEngine;
  let mockHands: any;
  let mockVideoElement: HTMLVideoElement;

  // 创建模拟的 MediaPipe Hands
  function createMockHands() {
    const onResultsCallback: ((results: any) => void)[] = [];
    
    return {
      constructor: vi.fn(),
      setOptions: vi.fn(),
      onResults: vi.fn((callback: (results: any) => void) => {
        onResultsCallback.push(callback);
      }),
      send: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      // 用于测试的辅助方法
      _triggerResults: (results: any) => {
        onResultsCallback.forEach(cb => cb(results));
      }
    };
  }

  // 创建模拟的手部关键点数据（21个点）
  function createMockLandmarks(): Vector3[] {
    const landmarks: Vector3[] = [];
    for (let i = 0; i < 21; i++) {
      landmarks.push({
        x: 0.5 + (i * 0.01),
        y: 0.5 + (i * 0.01),
        z: 0
      });
    }
    return landmarks;
  }

  beforeEach(() => {
    // 创建模拟的视频元素
    mockVideoElement = document.createElement('video');
    Object.defineProperty(mockVideoElement, 'readyState', {
      value: 4, // HAVE_ENOUGH_DATA
      writable: true
    });

    // 创建模拟的 MediaPipe Hands
    mockHands = createMockHands();
    
    // 设置全局 Hands 构造函数
    (window as any).Hands = vi.fn().mockImplementation(() => mockHands);

    engine = new GestureEngine();
  });

  afterEach(() => {
    if (engine) {
      engine.dispose();
    }
    delete (window as any).Hands;
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('should throw error if MediaPipe Hands is not loaded', async () => {
      delete (window as any).Hands;
      const newEngine = new GestureEngine();

      await expect(newEngine.initialize(mockVideoElement)).rejects.toThrow(
        'MediaPipe Hands 未加载'
      );
    });

    it('should initialize successfully with MediaPipe Hands', async () => {
      await engine.initialize(mockVideoElement);

      expect(engine.isInitialized()).toBe(true);
      expect((window as any).Hands).toHaveBeenCalled();
      expect(mockHands.setOptions).toHaveBeenCalled();
      expect(mockHands.onResults).toHaveBeenCalled();
    });

    it('should configure MediaPipe with default options', async () => {
      await engine.initialize(mockVideoElement);

      expect(mockHands.setOptions).toHaveBeenCalledWith({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    });

    it('should configure MediaPipe with custom options', async () => {
      const customEngine = new GestureEngine({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      await customEngine.initialize(mockVideoElement);

      expect(mockHands.setOptions).toHaveBeenCalledWith({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      customEngine.dispose();
    });

    it('should warn if already initialized', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await engine.initialize(mockVideoElement);
      await engine.initialize(mockVideoElement);

      expect(consoleSpy).toHaveBeenCalledWith('GestureEngine 已经初始化');
      consoleSpy.mockRestore();
    });
  });

  describe('更新方法', () => {
    it('should not process if not initialized', async () => {
      await engine.update();

      expect(mockHands.send).not.toHaveBeenCalled();
    });

    it('should send video frame to MediaPipe', async () => {
      await engine.initialize(mockVideoElement);
      
      await engine.update();

      expect(mockHands.send).toHaveBeenCalledWith({ image: mockVideoElement });
    });

    it('should not process if video is not ready', async () => {
      Object.defineProperty(mockVideoElement, 'readyState', {
        value: 1, // HAVE_METADATA
        writable: true
      });

      await engine.initialize(mockVideoElement);
      await engine.update();

      expect(mockHands.send).not.toHaveBeenCalled();
    });
  });

  describe('节流机制', () => {
    it('should throttle processing to configured interval', async () => {
      const customEngine = new GestureEngine({ processInterval: 100 });
      await customEngine.initialize(mockVideoElement);

      // 第一次调用应该处理
      await customEngine.update();
      expect(mockHands.send).toHaveBeenCalledTimes(1);

      // 立即再次调用应该被节流
      await customEngine.update();
      expect(mockHands.send).toHaveBeenCalledTimes(1);

      customEngine.dispose();
    });

    it('should process after interval has passed', async () => {
      const customEngine = new GestureEngine({ processInterval: 50 });
      await customEngine.initialize(mockVideoElement);

      await customEngine.update();
      expect(mockHands.send).toHaveBeenCalledTimes(1);

      // 等待足够的时间让节流间隔过去
      await new Promise(resolve => setTimeout(resolve, 60));

      await customEngine.update();
      expect(mockHands.send).toHaveBeenCalledTimes(2);

      customEngine.dispose();
    });
  });

  describe('无手部检测处理', () => {
    it('should set handData to null when no hand detected', async () => {
      await engine.initialize(mockVideoElement);
      
      // 触发空结果
      mockHands._triggerResults({
        multiHandLandmarks: []
      });

      expect(engine.getHandData()).toBeNull();
      expect(engine.getCurrentGesture()).toBe(GestureType.NONE);
    });

    it('should set handData to null when multiHandLandmarks is undefined', async () => {
      await engine.initialize(mockVideoElement);
      
      mockHands._triggerResults({});

      expect(engine.getHandData()).toBeNull();
    });

    it('should return false for hasHand when no hand detected', async () => {
      await engine.initialize(mockVideoElement);
      
      mockHands._triggerResults({
        multiHandLandmarks: []
      });

      expect(engine.hasHand()).toBe(false);
    });
  });

  describe('手部数据处理', () => {
    it('should extract hand data when hand is detected', async () => {
      await engine.initialize(mockVideoElement);
      
      const landmarks = createMockLandmarks();
      mockHands._triggerResults({
        multiHandLandmarks: [landmarks]
      });

      const handData = engine.getHandData();
      expect(handData).not.toBeNull();
      expect(handData!.landmarks).toHaveLength(21);
    });

    it('should calculate hand center correctly', async () => {
      await engine.initialize(mockVideoElement);
      
      const landmarks = createMockLandmarks();
      // 设置手腕(0)和中指根部(9)的位置
      landmarks[0] = { x: 0.4, y: 0.4, z: 0 };
      landmarks[9] = { x: 0.6, y: 0.6, z: 0 };
      
      mockHands._triggerResults({
        multiHandLandmarks: [landmarks]
      });

      const handData = engine.getHandData();
      expect(handData!.center.x).toBeCloseTo(0.5);
      expect(handData!.center.y).toBeCloseTo(0.5);
    });

    it('should return true for hasHand when hand is detected', async () => {
      await engine.initialize(mockVideoElement);
      
      mockHands._triggerResults({
        multiHandLandmarks: [createMockLandmarks()]
      });

      expect(engine.hasHand()).toBe(true);
    });
  });

  describe('手掌占比计算', () => {
    it('should calculate area ratio based on bounding box', () => {
      const landmarks: Vector3[] = [];
      // 创建一个 0.2 x 0.2 的边界框
      for (let i = 0; i < 21; i++) {
        landmarks.push({
          x: 0.4 + (i % 5) * 0.05,
          y: 0.4 + Math.floor(i / 5) * 0.05,
          z: 0
        });
      }

      const areaRatio = engine.calculateAreaRatio(landmarks);
      
      // 边界框大约是 0.2 x 0.2 = 0.04
      expect(areaRatio).toBeGreaterThan(0);
      expect(areaRatio).toBeLessThan(1);
    });

    it('should return 0 for insufficient landmarks', () => {
      const landmarks: Vector3[] = [{ x: 0.5, y: 0.5, z: 0 }];
      
      const areaRatio = engine.calculateAreaRatio(landmarks);
      
      expect(areaRatio).toBe(0);
    });
  });

  describe('手部旋转计算', () => {
    it('should calculate rotation from landmarks', () => {
      const landmarks = createMockLandmarks();
      // 设置手腕(0)、食指根部(5)和小指根部(17)
      landmarks[0] = { x: 0.5, y: 0.5, z: 0 };
      landmarks[5] = { x: 0.6, y: 0.4, z: 0 };
      landmarks[17] = { x: 0.4, y: 0.4, z: 0 };

      const rotation = engine.calculateHandRotation(landmarks);

      expect(rotation).toHaveProperty('x');
      expect(rotation).toHaveProperty('y');
      expect(rotation).toHaveProperty('z');
    });

    it('should return zero rotation for insufficient landmarks', () => {
      const landmarks: Vector3[] = [{ x: 0.5, y: 0.5, z: 0 }];

      const rotation = engine.calculateHandRotation(landmarks);

      expect(rotation.x).toBe(0);
      expect(rotation.y).toBe(0);
      expect(rotation.z).toBe(0);
    });
  });

  describe('资源清理', () => {
    it('should close MediaPipe Hands on dispose', async () => {
      await engine.initialize(mockVideoElement);
      
      engine.dispose();

      expect(mockHands.close).toHaveBeenCalled();
    });

    it('should reset state on dispose', async () => {
      await engine.initialize(mockVideoElement);
      
      mockHands._triggerResults({
        multiHandLandmarks: [createMockLandmarks()]
      });

      engine.dispose();

      expect(engine.isInitialized()).toBe(false);
      expect(engine.getHandData()).toBeNull();
      expect(engine.getCurrentGesture()).toBe(GestureType.NONE);
    });
  });

  describe('配置更新', () => {
    it('should update config', async () => {
      await engine.initialize(mockVideoElement);
      
      engine.updateConfig({ processInterval: 100 });

      const config = engine.getConfig();
      expect(config.processInterval).toBe(100);
    });

    it('should update MediaPipe options when config changes', async () => {
      await engine.initialize(mockVideoElement);
      
      engine.updateConfig({ maxNumHands: 2 });

      expect(mockHands.setOptions).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxNumHands: 2 })
      );
    });
  });
});
