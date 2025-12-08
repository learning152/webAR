/**
 * GestureEngine - 手势识别引擎
 * 集成 MediaPipe Hands 进行实时手部追踪和手势识别
 */

/**
 * 手势类型枚举
 */
export enum GestureType {
  OPEN_HAND = 'open_hand',      // 张手 -> 行星
  SCISSORS = 'scissors',        // 剪刀手 -> 文字
  FIST = 'fist',                // 握拳 -> 圆环
  POINT = 'point',              // 食指 -> 星形
  THUMBS_UP = 'thumbs_up',      // 竖大拇指 -> 爱心
  FINGER_HEART = 'finger_heart', // 手指比心 -> 一箭穿心
  NONE = 'none'
}

/**
 * 手指状态接口
 * 表示每个手指的伸展状态
 */
export interface FingerStates {
  thumb: boolean;    // 大拇指是否伸展
  index: boolean;    // 食指是否伸展
  middle: boolean;   // 中指是否伸展
  ring: boolean;     // 无名指是否伸展
  pinky: boolean;    // 小指是否伸展
}

/**
 * MediaPipe 手部关键点索引
 * 参考: https://google.github.io/mediapipe/solutions/hands.html
 */
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
};

/**
 * 3D 向量接口
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 欧拉角接口
 */
export interface Euler {
  x: number;
  y: number;
  z: number;
}

/**
 * 手部关键点数据（MediaPipe 格式）
 */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * 手部数据接口
 */
export interface HandData {
  landmarks: Vector3[];     // 21 个手部关键点
  center: Vector3;          // 手掌中心
  velocity: Vector3;        // 手部移动速度
  areaRatio: number;        // 手掌画面占比
  rotation: Euler;          // 手部旋转角度
}

/**
 * MediaPipe Hands 结果接口
 */
interface MediaPipeResults {
  multiHandLandmarks?: Landmark[][];
  multiHandedness?: Array<{ label: string; score: number }>;
}

/**
 * MediaPipe Hands 接口（全局对象）
 */
interface MediaPipeHands {
  new (config: {
    locateFile: (file: string) => string;
  }): MediaPipeHandsInstance;
}

interface MediaPipeHandsInstance {
  setOptions(options: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }): void;
  onResults(callback: (results: MediaPipeResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

// 声明全局 Hands 对象
declare const Hands: MediaPipeHands;

/**
 * GestureEngine 配置
 */
export interface GestureEngineConfig {
  maxNumHands: number;
  modelComplexity: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  processInterval: number; // 处理间隔（毫秒），默认 50ms = 20 FPS
}

const DEFAULT_CONFIG: GestureEngineConfig = {
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  processInterval: 40 // 25 FPS (reduced from 50ms for more responsive detection)
};

/**
 * GestureEngine - 手势识别引擎类
 */
export class GestureEngine {
  private hands: MediaPipeHandsInstance | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: GestureEngineConfig;
  private initialized: boolean = false;
  
  // 当前状态
  public currentGesture: GestureType = GestureType.NONE;
  public handData: HandData | null = null;
  
  // 节流控制
  private lastProcessTime: number = 0;
  
  // 手部位置历史（用于计算速度）
  private previousCenter: Vector3 | null = null;
  private previousTime: number = 0;
  
  // 最新的 MediaPipe 结果
  private latestResults: MediaPipeResults | null = null;
  
  constructor(config: Partial<GestureEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 初始化手势识别引擎
   * @param videoElement - 视频元素，用于捕获摄像头画面
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    if (this.initialized) {
      console.warn('GestureEngine 已经初始化');
      return;
    }
    
    // 检查 MediaPipe Hands 是否已加载
    if (typeof Hands === 'undefined') {
      throw new Error('MediaPipe Hands 未加载，请先使用 LibraryLoader 加载');
    }
    
    this.videoElement = videoElement;
    
    // 创建 MediaPipe Hands 实例
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    // 配置 MediaPipe Hands
    this.hands.setOptions({
      maxNumHands: this.config.maxNumHands,
      modelComplexity: this.config.modelComplexity,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence
    });
    
    // 设置结果回调
    this.hands.onResults((results: MediaPipeResults) => {
      this.latestResults = results;
      this.processResults(results);
    });
    
    this.initialized = true;
  }
  
  /**
   * 更新方法 - 处理视频帧并获取手部关键点
   * 实现节流机制，降低 MediaPipe 处理频率（20 FPS）
   */
  async update(): Promise<void> {
    if (!this.initialized || !this.hands || !this.videoElement) {
      return;
    }
    
    const now = performance.now();
    
    // 节流：检查是否达到处理间隔
    if (now - this.lastProcessTime < this.config.processInterval) {
      return;
    }
    
    this.lastProcessTime = now;
    
    // 检查视频是否准备好
    if (this.videoElement.readyState < 2) {
      return;
    }
    
    try {
      // 发送视频帧到 MediaPipe 进行处理
      await this.hands.send({ image: this.videoElement });
    } catch (error) {
      console.error('MediaPipe 处理错误:', error);
    }
  }
  
  /**
   * 处理 MediaPipe 返回的结果
   */
  private processResults(results: MediaPipeResults): void {
    // 检查是否检测到手部
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.handleNoHandDetected();
      return;
    }
    
    // 获取第一只手的关键点
    const landmarks = results.multiHandLandmarks[0];
    
    // 转换关键点为 Vector3 数组
    const landmarkVectors: Vector3[] = landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z
    }));
    
    // 计算手掌中心（使用手腕和中指根部的中点）
    const center = this.calculateHandCenter(landmarkVectors);
    
    // 计算手部速度
    const velocity = this.calculateHandVelocity(center);
    
    // 计算手掌画面占比
    const areaRatio = this.calculateAreaRatio(landmarkVectors);
    
    // 计算手部旋转
    const rotation = this.calculateHandRotation(landmarkVectors);
    
    // 更新手部数据
    this.handData = {
      landmarks: landmarkVectors,
      center,
      velocity,
      areaRatio,
      rotation
    };
    
    // 检测手势类型
    this.currentGesture = this.detectGesture(landmarkVectors);
    
    // 更新前一帧数据（用于速度计算）
    this.previousCenter = { ...center };
    this.previousTime = performance.now();
  }
  
  /**
   * 处理无手部检测的情况
   */
  private handleNoHandDetected(): void {
    this.handData = null;
    this.currentGesture = GestureType.NONE;
    this.previousCenter = null;
    this.previousTime = 0;
  }
  
  /**
   * 计算手掌中心位置
   * 使用手腕(0)和中指根部(9)的中点
   */
  private calculateHandCenter(landmarks: Vector3[]): Vector3 {
    if (landmarks.length < 21) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // 手腕 (index 0) 和中指根部 (index 9)
    const wrist = landmarks[0];
    const middleFingerBase = landmarks[9];
    
    return {
      x: (wrist.x + middleFingerBase.x) / 2,
      y: (wrist.y + middleFingerBase.y) / 2,
      z: (wrist.z + middleFingerBase.z) / 2
    };
  }
  
  /**
   * 计算手部移动速度
   * 基于位置历史（位置差 / 时间差）
   */
  public calculateHandVelocity(currentCenter?: Vector3): Vector3 {
    const center = currentCenter || this.handData?.center;
    
    if (!center || !this.previousCenter || this.previousTime === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.previousTime) / 1000; // 转换为秒
    
    if (deltaTime <= 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: (center.x - this.previousCenter.x) / deltaTime,
      y: (center.y - this.previousCenter.y) / deltaTime,
      z: (center.z - this.previousCenter.z) / deltaTime
    };
  }
  
  /**
   * 计算手掌画面占比
   * 基于手部边界框面积
   */
  public calculateAreaRatio(landmarks: Vector3[]): number {
    if (landmarks.length < 21) {
      return 0;
    }
    
    // 计算边界框
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const lm of landmarks) {
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }
    
    // 计算边界框面积（归一化坐标，所以总面积为 1）
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;
    
    return area;
  }
  
  /**
   * 计算手部旋转角度
   * 基于手掌平面法向量
   */
  public calculateHandRotation(landmarks: Vector3[]): Euler {
    if (landmarks.length < 21) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // 使用手腕(0)、食指根部(5)和小指根部(17)来定义手掌平面
    const wrist = landmarks[0];
    const indexBase = landmarks[5];
    const pinkyBase = landmarks[17];
    
    // 计算两个向量
    const v1 = {
      x: indexBase.x - wrist.x,
      y: indexBase.y - wrist.y,
      z: indexBase.z - wrist.z
    };
    
    const v2 = {
      x: pinkyBase.x - wrist.x,
      y: pinkyBase.y - wrist.y,
      z: pinkyBase.z - wrist.z
    };
    
    // 计算法向量（叉积）
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
    
    // 归一化法向量
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (length > 0.001) {
      normal.x /= length;
      normal.y /= length;
      normal.z /= length;
    }
    
    // 从法向量计算欧拉角
    // 这是一个简化的计算，实际应用中可能需要更精确的方法
    const pitch = Math.asin(-normal.y); // 绕 X 轴旋转
    const yaw = Math.atan2(normal.x, normal.z); // 绕 Y 轴旋转
    const roll = Math.atan2(v1.y, v1.x); // 绕 Z 轴旋转
    
    return {
      x: pitch,
      y: yaw,
      z: roll
    };
  }
  
  /**
   * 分析手指伸展状态
   * 根据 MediaPipe 手部关键点判断每个手指是否伸展
   * @param landmarks - 21 个手部关键点
   * @returns 每个手指的伸展状态
   */
  public analyzeFingerStates(landmarks: Vector3[]): FingerStates {
    if (landmarks.length < 21) {
      return {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false
      };
    }

    // 大拇指判断：比较拇指尖与拇指 MCP 关节到手腕的距离
    // 由于手的朝向可能不同，我们使用拇指尖到手腕的距离与拇指 MCP 到手腕的距离比较
    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const thumbMCP = landmarks[HAND_LANDMARKS.THUMB_MCP];
    
    // 计算拇指尖到手腕的距离
    const thumbTipToWrist = this.distance(thumbTip, wrist);
    const thumbMCPToWrist = this.distance(thumbMCP, wrist);
    // 拇指伸展时，拇指尖到手腕的距离应该大于拇指 MCP 到手腕的距离
    const thumb = thumbTipToWrist > thumbMCPToWrist * 1.2;

    // 其他四指判断：比较指尖与 PIP 关节的 y 坐标
    // 在 MediaPipe 坐标系中，y 值越小表示越靠近屏幕顶部
    // 手指伸展时，指尖的 y 值应该小于 PIP 关节的 y 值
    
    const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
    const indexPIP = landmarks[HAND_LANDMARKS.INDEX_PIP];
    const indexMCP = landmarks[HAND_LANDMARKS.INDEX_MCP];
    const index = indexTip.y < indexPIP.y && indexPIP.y < indexMCP.y;

    const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_TIP];
    const middlePIP = landmarks[HAND_LANDMARKS.MIDDLE_PIP];
    const middleMCP = landmarks[HAND_LANDMARKS.MIDDLE_MCP];
    const middle = middleTip.y < middlePIP.y && middlePIP.y < middleMCP.y;

    const ringTip = landmarks[HAND_LANDMARKS.RING_TIP];
    const ringPIP = landmarks[HAND_LANDMARKS.RING_PIP];
    const ringMCP = landmarks[HAND_LANDMARKS.RING_MCP];
    const ring = ringTip.y < ringPIP.y && ringPIP.y < ringMCP.y;

    const pinkyTip = landmarks[HAND_LANDMARKS.PINKY_TIP];
    const pinkyPIP = landmarks[HAND_LANDMARKS.PINKY_PIP];
    const pinkyMCP = landmarks[HAND_LANDMARKS.PINKY_MCP];
    const pinky = pinkyTip.y < pinkyPIP.y && pinkyPIP.y < pinkyMCP.y;

    return { thumb, index, middle, ring, pinky };
  }

  /**
   * 计算两点之间的距离
   */
  private distance(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 检测手指比心手势
   * 食指和大拇指形成心形（指尖靠近）
   * @param landmarks - 21 个手部关键点
   * @param fingerStates - 手指伸展状态
   * @returns 是否为手指比心手势
   */
  private isFingerHeart(landmarks: Vector3[], fingerStates: FingerStates): boolean {
    if (landmarks.length < 21) return false;

    // 手指比心需要：食指和大拇指伸展，其他手指收起
    if (!fingerStates.thumb || !fingerStates.index) return false;
    if (fingerStates.middle || fingerStates.ring || fingerStates.pinky) return false;

    // 检查食指尖和拇指尖是否靠近（形成心形）
    const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
    
    const tipDistance = this.distance(thumbTip, indexTip);
    
    // 计算手掌大小作为参考（手腕到中指根部的距离）
    const wrist = landmarks[HAND_LANDMARKS.WRIST];
    const middleMCP = landmarks[HAND_LANDMARKS.MIDDLE_MCP];
    const palmSize = this.distance(wrist, middleMCP);
    
    // 如果指尖距离小于手掌大小的一定比例，认为是比心手势
    return tipDistance < palmSize * 0.5;
  }

  /**
   * 根据手指状态检测手势类型
   * @param landmarks - 21 个手部关键点
   * @returns 识别的手势类型
   */
  public detectGesture(landmarks: Vector3[]): GestureType {
    if (landmarks.length < 21) {
      return GestureType.NONE;
    }

    const fingerStates = this.analyzeFingerStates(landmarks);
    const { thumb, index, middle, ring, pinky } = fingerStates;

    // 计算伸展的手指数量
    const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

    // 1. 手指比心检测（优先级最高，因为它有特殊的指尖距离要求）
    if (this.isFingerHeart(landmarks, fingerStates)) {
      return GestureType.FINGER_HEART;
    }

    // 2. 张手手势：五指张开
    if (extendedCount === 5) {
      return GestureType.OPEN_HAND;
    }

    // 3. 握拳手势：所有手指收起
    if (extendedCount === 0) {
      return GestureType.FIST;
    }

    // 4. 竖大拇指手势：仅大拇指伸展
    if (thumb && !index && !middle && !ring && !pinky) {
      return GestureType.THUMBS_UP;
    }

    // 5. 食指手势：仅食指伸展
    if (!thumb && index && !middle && !ring && !pinky) {
      return GestureType.POINT;
    }

    // 6. 剪刀手手势：食指和中指伸展，其他手指收起
    if (!thumb && index && middle && !ring && !pinky) {
      return GestureType.SCISSORS;
    }

    // 默认返回 NONE
    return GestureType.NONE;
  }

  /**
   * 获取当前手势类型
   */
  public getCurrentGesture(): GestureType {
    return this.currentGesture;
  }
  
  /**
   * 获取当前手部数据
   */
  public getHandData(): HandData | null {
    return this.handData;
  }
  
  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 检查是否检测到手部
   */
  public hasHand(): boolean {
    return this.handData !== null;
  }
  
  /**
   * 获取最新的 MediaPipe 结果
   */
  public getLatestResults(): MediaPipeResults | null {
    return this.latestResults;
  }
  
  /**
   * 获取配置
   */
  public getConfig(): GestureEngineConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<GestureEngineConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果已初始化，更新 MediaPipe 配置
    if (this.hands) {
      this.hands.setOptions({
        maxNumHands: this.config.maxNumHands,
        modelComplexity: this.config.modelComplexity,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
    }
  }
  
  /**
   * 释放资源
   */
  public dispose(): void {
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    
    this.videoElement = null;
    this.initialized = false;
    this.handData = null;
    this.currentGesture = GestureType.NONE;
    this.previousCenter = null;
    this.previousTime = 0;
    this.latestResults = null;
  }
}
