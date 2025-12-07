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

  describe('手势识别', () => {
    // 创建带有特定手指状态的手部关键点
    function createGestureLandmarks(
      thumbExtended: boolean,
      indexExtended: boolean,
      middleExtended: boolean,
      ringExtended: boolean,
      pinkyExtended: boolean
    ): Vector3[] {
      const landmarks: Vector3[] = [];
      const wristX = 0.5;
      const wristY = 0.6;
      
      // 初始化所有 21 个关键点
      for (let i = 0; i < 21; i++) {
        landmarks.push({ x: wristX, y: wristY, z: 0 });
      }
      
      // 手腕 (0)
      landmarks[0] = { x: wristX, y: wristY, z: 0 };
      
      // 大拇指 (1-4)
      const thumbBaseX = wristX - 0.08;
      landmarks[1] = { x: thumbBaseX, y: wristY - 0.02, z: 0 };
      landmarks[2] = { x: thumbBaseX - 0.03, y: wristY - 0.05, z: 0 };
      landmarks[3] = { x: thumbBaseX - 0.05, y: wristY - 0.08, z: 0 };
      if (thumbExtended) {
        landmarks[4] = { x: thumbBaseX - 0.08, y: wristY - 0.10, z: 0 };
      } else {
        landmarks[4] = { x: thumbBaseX - 0.02, y: wristY - 0.06, z: 0 };
      }
      
      // 食指 (5-8)
      const indexBaseX = wristX - 0.04;
      landmarks[5] = { x: indexBaseX, y: wristY - 0.12, z: 0 };
      if (indexExtended) {
        landmarks[6] = { x: indexBaseX, y: wristY - 0.18, z: 0 };
        landmarks[7] = { x: indexBaseX, y: wristY - 0.22, z: 0 };
        landmarks[8] = { x: indexBaseX, y: wristY - 0.26, z: 0 };
      } else {
        landmarks[6] = { x: indexBaseX, y: wristY - 0.15, z: 0 };
        landmarks[7] = { x: indexBaseX + 0.02, y: wristY - 0.13, z: 0 };
        landmarks[8] = { x: indexBaseX + 0.03, y: wristY - 0.11, z: 0 };
      }
      
      // 中指 (9-12)
      const middleBaseX = wristX;
      landmarks[9] = { x: middleBaseX, y: wristY - 0.12, z: 0 };
      if (middleExtended) {
        landmarks[10] = { x: middleBaseX, y: wristY - 0.19, z: 0 };
        landmarks[11] = { x: middleBaseX, y: wristY - 0.24, z: 0 };
        landmarks[12] = { x: middleBaseX, y: wristY - 0.28, z: 0 };
      } else {
        landmarks[10] = { x: middleBaseX, y: wristY - 0.15, z: 0 };
        landmarks[11] = { x: middleBaseX + 0.02, y: wristY - 0.13, z: 0 };
        landmarks[12] = { x: middleBaseX + 0.03, y: wristY - 0.11, z: 0 };
      }
      
      // 无名指 (13-16)
      const ringBaseX = wristX + 0.04;
      landmarks[13] = { x: ringBaseX, y: wristY - 0.11, z: 0 };
      if (ringExtended) {
        landmarks[14] = { x: ringBaseX, y: wristY - 0.17, z: 0 };
        landmarks[15] = { x: ringBaseX, y: wristY - 0.21, z: 0 };
        landmarks[16] = { x: ringBaseX, y: wristY - 0.25, z: 0 };
      } else {
        landmarks[14] = { x: ringBaseX, y: wristY - 0.14, z: 0 };
        landmarks[15] = { x: ringBaseX + 0.02, y: wristY - 0.12, z: 0 };
        landmarks[16] = { x: ringBaseX + 0.03, y: wristY - 0.10, z: 0 };
      }
      
      // 小指 (17-20)
      const pinkyBaseX = wristX + 0.07;
      landmarks[17] = { x: pinkyBaseX, y: wristY - 0.10, z: 0 };
      if (pinkyExtended) {
        landmarks[18] = { x: pinkyBaseX, y: wristY - 0.14, z: 0 };
        landmarks[19] = { x: pinkyBaseX, y: wristY - 0.17, z: 0 };
        landmarks[20] = { x: pinkyBaseX, y: wristY - 0.20, z: 0 };
      } else {
        landmarks[18] = { x: pinkyBaseX, y: wristY - 0.12, z: 0 };
        landmarks[19] = { x: pinkyBaseX + 0.02, y: wristY - 0.10, z: 0 };
        landmarks[20] = { x: pinkyBaseX + 0.03, y: wristY - 0.09, z: 0 };
      }
      
      return landmarks;
    }

    // 创建手指比心手势的关键点（食指和大拇指指尖靠近形成心形）
    function createFingerHeartLandmarks(): Vector3[] {
      const landmarks: Vector3[] = [];
      const wristX = 0.5;
      const wristY = 0.6;
      
      // 初始化所有 21 个关键点
      for (let i = 0; i < 21; i++) {
        landmarks.push({ x: wristX, y: wristY, z: 0 });
      }
      
      // 手腕 (0)
      landmarks[0] = { x: wristX, y: wristY, z: 0 };
      
      // 大拇指 (1-4) - 伸展状态，指尖靠近食指尖
      landmarks[1] = { x: wristX - 0.08, y: wristY - 0.02, z: 0 };
      landmarks[2] = { x: wristX - 0.10, y: wristY - 0.06, z: 0 };
      landmarks[3] = { x: wristX - 0.08, y: wristY - 0.12, z: 0 };
      landmarks[4] = { x: wristX - 0.04, y: wristY - 0.20, z: 0 }; // 拇指尖，远离手腕
      
      // 食指 (5-8) - 伸展状态，指尖靠近拇指尖
      // 确保 tip.y < pip.y < mcp.y 以被检测为伸展
      landmarks[5] = { x: wristX - 0.04, y: wristY - 0.12, z: 0 }; // MCP
      landmarks[6] = { x: wristX - 0.04, y: wristY - 0.18, z: 0 }; // PIP
      landmarks[7] = { x: wristX - 0.04, y: wristY - 0.22, z: 0 }; // DIP
      landmarks[8] = { x: wristX - 0.04, y: wristY - 0.24, z: 0 }; // TIP - 最小的 y 值
      
      // 中指 (9-12) - 收起状态
      landmarks[9] = { x: wristX, y: wristY - 0.12, z: 0 };
      landmarks[10] = { x: wristX, y: wristY - 0.15, z: 0 };
      landmarks[11] = { x: wristX + 0.02, y: wristY - 0.13, z: 0 };
      landmarks[12] = { x: wristX + 0.03, y: wristY - 0.11, z: 0 };
      
      // 无名指 (13-16) - 收起状态
      landmarks[13] = { x: wristX + 0.04, y: wristY - 0.11, z: 0 };
      landmarks[14] = { x: wristX + 0.04, y: wristY - 0.14, z: 0 };
      landmarks[15] = { x: wristX + 0.06, y: wristY - 0.12, z: 0 };
      landmarks[16] = { x: wristX + 0.07, y: wristY - 0.10, z: 0 };
      
      // 小指 (17-20) - 收起状态
      landmarks[17] = { x: wristX + 0.07, y: wristY - 0.10, z: 0 };
      landmarks[18] = { x: wristX + 0.07, y: wristY - 0.12, z: 0 };
      landmarks[19] = { x: wristX + 0.09, y: wristY - 0.10, z: 0 };
      landmarks[20] = { x: wristX + 0.10, y: wristY - 0.09, z: 0 };
      
      return landmarks;
    }

    it('should recognize open hand gesture (五指张开)', () => {
      const landmarks = createGestureLandmarks(true, true, true, true, true);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.OPEN_HAND);
    });

    it('should recognize scissors gesture (剪刀手 - 食指和中指伸展)', () => {
      const landmarks = createGestureLandmarks(false, true, true, false, false);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.SCISSORS);
    });

    it('should recognize fist gesture (握拳 - 所有手指收起)', () => {
      const landmarks = createGestureLandmarks(false, false, false, false, false);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.FIST);
    });

    it('should recognize point gesture (食指 - 仅食指伸展)', () => {
      const landmarks = createGestureLandmarks(false, true, false, false, false);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.POINT);
    });

    it('should recognize thumbs up gesture (竖大拇指 - 仅大拇指伸展)', () => {
      const landmarks = createGestureLandmarks(true, false, false, false, false);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.THUMBS_UP);
    });

    it('should recognize finger heart gesture (手指比心 - 食指和大拇指形成心形)', () => {
      const landmarks = createFingerHeartLandmarks();
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.FINGER_HEART);
    });

    it('should return NONE for insufficient landmarks', () => {
      const landmarks: Vector3[] = [{ x: 0.5, y: 0.5, z: 0 }];
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.NONE);
    });

    it('should return NONE for unrecognized gesture', () => {
      // 三指伸展（不是任何已定义的手势）
      const landmarks = createGestureLandmarks(false, true, true, true, false);
      const gesture = engine.detectGesture(landmarks);
      expect(gesture).toBe(GestureType.NONE);
    });
  });

  describe('手指状态分析', () => {
    function createGestureLandmarks(
      thumbExtended: boolean,
      indexExtended: boolean,
      middleExtended: boolean,
      ringExtended: boolean,
      pinkyExtended: boolean
    ): Vector3[] {
      const landmarks: Vector3[] = [];
      const wristX = 0.5;
      const wristY = 0.6;
      
      for (let i = 0; i < 21; i++) {
        landmarks.push({ x: wristX, y: wristY, z: 0 });
      }
      
      landmarks[0] = { x: wristX, y: wristY, z: 0 };
      
      const thumbBaseX = wristX - 0.08;
      landmarks[1] = { x: thumbBaseX, y: wristY - 0.02, z: 0 };
      landmarks[2] = { x: thumbBaseX - 0.03, y: wristY - 0.05, z: 0 };
      landmarks[3] = { x: thumbBaseX - 0.05, y: wristY - 0.08, z: 0 };
      if (thumbExtended) {
        landmarks[4] = { x: thumbBaseX - 0.08, y: wristY - 0.10, z: 0 };
      } else {
        landmarks[4] = { x: thumbBaseX - 0.02, y: wristY - 0.06, z: 0 };
      }
      
      const indexBaseX = wristX - 0.04;
      landmarks[5] = { x: indexBaseX, y: wristY - 0.12, z: 0 };
      if (indexExtended) {
        landmarks[6] = { x: indexBaseX, y: wristY - 0.18, z: 0 };
        landmarks[7] = { x: indexBaseX, y: wristY - 0.22, z: 0 };
        landmarks[8] = { x: indexBaseX, y: wristY - 0.26, z: 0 };
      } else {
        landmarks[6] = { x: indexBaseX, y: wristY - 0.15, z: 0 };
        landmarks[7] = { x: indexBaseX + 0.02, y: wristY - 0.13, z: 0 };
        landmarks[8] = { x: indexBaseX + 0.03, y: wristY - 0.11, z: 0 };
      }
      
      const middleBaseX = wristX;
      landmarks[9] = { x: middleBaseX, y: wristY - 0.12, z: 0 };
      if (middleExtended) {
        landmarks[10] = { x: middleBaseX, y: wristY - 0.19, z: 0 };
        landmarks[11] = { x: middleBaseX, y: wristY - 0.24, z: 0 };
        landmarks[12] = { x: middleBaseX, y: wristY - 0.28, z: 0 };
      } else {
        landmarks[10] = { x: middleBaseX, y: wristY - 0.15, z: 0 };
        landmarks[11] = { x: middleBaseX + 0.02, y: wristY - 0.13, z: 0 };
        landmarks[12] = { x: middleBaseX + 0.03, y: wristY - 0.11, z: 0 };
      }
      
      const ringBaseX = wristX + 0.04;
      landmarks[13] = { x: ringBaseX, y: wristY - 0.11, z: 0 };
      if (ringExtended) {
        landmarks[14] = { x: ringBaseX, y: wristY - 0.17, z: 0 };
        landmarks[15] = { x: ringBaseX, y: wristY - 0.21, z: 0 };
        landmarks[16] = { x: ringBaseX, y: wristY - 0.25, z: 0 };
      } else {
        landmarks[14] = { x: ringBaseX, y: wristY - 0.14, z: 0 };
        landmarks[15] = { x: ringBaseX + 0.02, y: wristY - 0.12, z: 0 };
        landmarks[16] = { x: ringBaseX + 0.03, y: wristY - 0.10, z: 0 };
      }
      
      const pinkyBaseX = wristX + 0.07;
      landmarks[17] = { x: pinkyBaseX, y: wristY - 0.10, z: 0 };
      if (pinkyExtended) {
        landmarks[18] = { x: pinkyBaseX, y: wristY - 0.14, z: 0 };
        landmarks[19] = { x: pinkyBaseX, y: wristY - 0.17, z: 0 };
        landmarks[20] = { x: pinkyBaseX, y: wristY - 0.20, z: 0 };
      } else {
        landmarks[18] = { x: pinkyBaseX, y: wristY - 0.12, z: 0 };
        landmarks[19] = { x: pinkyBaseX + 0.02, y: wristY - 0.10, z: 0 };
        landmarks[20] = { x: pinkyBaseX + 0.03, y: wristY - 0.09, z: 0 };
      }
      
      return landmarks;
    }

    it('should analyze all fingers extended', () => {
      const landmarks = createGestureLandmarks(true, true, true, true, true);
      const states = engine.analyzeFingerStates(landmarks);
      
      expect(states.index).toBe(true);
      expect(states.middle).toBe(true);
      expect(states.ring).toBe(true);
      expect(states.pinky).toBe(true);
    });

    it('should analyze all fingers curled', () => {
      const landmarks = createGestureLandmarks(false, false, false, false, false);
      const states = engine.analyzeFingerStates(landmarks);
      
      expect(states.index).toBe(false);
      expect(states.middle).toBe(false);
      expect(states.ring).toBe(false);
      expect(states.pinky).toBe(false);
    });

    it('should analyze mixed finger states', () => {
      const landmarks = createGestureLandmarks(false, true, true, false, false);
      const states = engine.analyzeFingerStates(landmarks);
      
      expect(states.index).toBe(true);
      expect(states.middle).toBe(true);
      expect(states.ring).toBe(false);
      expect(states.pinky).toBe(false);
    });

    it('should return all false for insufficient landmarks', () => {
      const landmarks: Vector3[] = [{ x: 0.5, y: 0.5, z: 0 }];
      const states = engine.analyzeFingerStates(landmarks);
      
      expect(states.thumb).toBe(false);
      expect(states.index).toBe(false);
      expect(states.middle).toBe(false);
      expect(states.ring).toBe(false);
      expect(states.pinky).toBe(false);
    });
  });
});
