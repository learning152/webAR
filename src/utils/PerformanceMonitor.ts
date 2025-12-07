/**
 * PerformanceMonitor - 性能监控和降级管理
 * 监控 FPS 并在性能不足时触发降级策略
 */

/**
 * 性能降级策略配置
 */
export interface DegradationConfig {
  fpsThreshold: number;           // FPS 阈值，低于此值触发降级（默认 20）
  particleReductionFactor: number; // 粒子数量减少因子（默认 0.5，即减少到 50%）
  gestureDetectionInterval: number; // 手势检测间隔增加（毫秒，默认 100ms = 10 FPS）
}

/**
 * 性能降级状态
 */
export interface DegradationState {
  isDegraded: boolean;            // 是否处于降级状态
  currentParticleCount: number;   // 当前粒子数量
  originalParticleCount: number;  // 原始粒子数量
  currentGestureInterval: number; // 当前手势检测间隔
  originalGestureInterval: number; // 原始手势检测间隔
}

/**
 * 性能监控回调接口
 */
export interface PerformanceCallbacks {
  onDegradationTriggered?: (state: DegradationState) => void;
  onDegradationRestored?: (state: DegradationState) => void;
  onFpsUpdate?: (fps: number) => void;
}

const DEFAULT_CONFIG: DegradationConfig = {
  fpsThreshold: 20,
  particleReductionFactor: 0.5,
  gestureDetectionInterval: 100
};

/**
 * PerformanceMonitor 类
 * 监控应用性能并在必要时触发降级策略
 */
export class PerformanceMonitor {
  private config: DegradationConfig;
  private callbacks: PerformanceCallbacks;
  
  // FPS 计算相关
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 10; // 保留最近 10 次 FPS 测量
  
  // 降级状态
  private degradationState: DegradationState;
  
  // 性能监控是否启用
  private enabled: boolean = true;
  
  constructor(
    originalParticleCount: number,
    originalGestureInterval: number,
    config: Partial<DegradationConfig> = {},
    callbacks: PerformanceCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    
    // 初始化降级状态
    this.degradationState = {
      isDegraded: false,
      currentParticleCount: originalParticleCount,
      originalParticleCount: originalParticleCount,
      currentGestureInterval: originalGestureInterval,
      originalGestureInterval: originalGestureInterval
    };
    
    this.lastTime = performance.now();
  }
  
  /**
   * 更新性能监控
   * 应该在每帧调用此方法
   */
  public update(): void {
    if (!this.enabled) {
      return;
    }
    
    this.frameCount++;
    const currentTime = performance.now();
    
    // 每秒计算一次 FPS
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // 添加到历史记录
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
      
      // 触发 FPS 更新回调
      if (this.callbacks.onFpsUpdate) {
        this.callbacks.onFpsUpdate(this.fps);
      }
      
      // 检查是否需要降级或恢复
      this.checkPerformance();
    }
  }
  
  /**
   * 检查性能并决定是否需要降级或恢复
   */
  private checkPerformance(): void {
    // 计算平均 FPS（使用历史记录）
    const avgFps = this.getAverageFps();
    
    // 如果当前未降级且 FPS 低于阈值，触发降级
    if (!this.degradationState.isDegraded && avgFps < this.config.fpsThreshold) {
      this.triggerDegradation();
    }
    
    // 如果当前已降级且 FPS 恢复到阈值以上（加上一些缓冲），恢复性能
    if (this.degradationState.isDegraded && avgFps > this.config.fpsThreshold * 1.5) {
      this.restorePerformance();
    }
  }
  
  /**
   * 触发性能降级
   */
  private triggerDegradation(): void {
    console.warn('性能不足，启动降级模式');
    
    // 更新降级状态
    this.degradationState.isDegraded = true;
    this.degradationState.currentParticleCount = Math.floor(
      this.degradationState.originalParticleCount * this.config.particleReductionFactor
    );
    this.degradationState.currentGestureInterval = this.config.gestureDetectionInterval;
    
    // 触发降级回调
    if (this.callbacks.onDegradationTriggered) {
      this.callbacks.onDegradationTriggered({ ...this.degradationState });
    }
  }
  
  /**
   * 恢复性能（取消降级）
   */
  private restorePerformance(): void {
    console.log('性能恢复，取消降级模式');
    
    // 更新降级状态
    this.degradationState.isDegraded = false;
    this.degradationState.currentParticleCount = this.degradationState.originalParticleCount;
    this.degradationState.currentGestureInterval = this.degradationState.originalGestureInterval;
    
    // 触发恢复回调
    if (this.callbacks.onDegradationRestored) {
      this.callbacks.onDegradationRestored({ ...this.degradationState });
    }
  }
  
  /**
   * 获取当前 FPS
   */
  public getFps(): number {
    return this.fps;
  }
  
  /**
   * 获取平均 FPS（基于历史记录）
   */
  public getAverageFps(): number {
    if (this.fpsHistory.length === 0) {
      return this.fps;
    }
    
    const sum = this.fpsHistory.reduce((acc, val) => acc + val, 0);
    return sum / this.fpsHistory.length;
  }
  
  /**
   * 获取降级状态
   */
  public getDegradationState(): DegradationState {
    return { ...this.degradationState };
  }
  
  /**
   * 检查是否处于降级状态
   */
  public isDegraded(): boolean {
    return this.degradationState.isDegraded;
  }
  
  /**
   * 获取配置
   */
  public getConfig(): DegradationConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<DegradationConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 启用性能监控
   */
  public enable(): void {
    this.enabled = true;
  }
  
  /**
   * 禁用性能监控
   */
  public disable(): void {
    this.enabled = false;
  }
  
  /**
   * 检查性能监控是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * 重置性能监控
   * 清除历史记录和降级状态
   */
  public reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsHistory = [];
    
    // 恢复到非降级状态
    if (this.degradationState.isDegraded) {
      this.restorePerformance();
    }
  }
  
  /**
   * 手动触发降级（用于测试）
   */
  public forceDegradation(): void {
    if (!this.degradationState.isDegraded) {
      this.triggerDegradation();
    }
  }
  
  /**
   * 手动恢复性能（用于测试）
   */
  public forceRestore(): void {
    if (this.degradationState.isDegraded) {
      this.restorePerformance();
    }
  }
}
