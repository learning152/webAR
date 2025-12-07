/**
 * GestureStateMachine - 手势状态机
 * 管理手势状态转换、过渡状态和状态变化回调
 */

import { GestureType } from './GestureEngine';

/**
 * 状态变化回调函数类型
 */
export type StateChangeCallback = (
  fromState: GestureType,
  toState: GestureType,
  transitionTime: number
) => void;

/**
 * 状态机配置
 */
export interface StateMachineConfig {
  transitionDuration: number; // 过渡持续时间（秒），默认 0.3s
}

const DEFAULT_CONFIG: StateMachineConfig = {
  transitionDuration: 0.3
};

/**
 * GestureStateMachine 类
 * 跟踪手势状态变化，管理过渡状态，触发回调
 */
export class GestureStateMachine {
  private currentState: GestureType;
  private previousState: GestureType;
  private transitionTime: number;
  private isTransitioning: boolean;
  private config: StateMachineConfig;
  private callbacks: StateChangeCallback[];
  
  constructor(config?: Partial<StateMachineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = GestureType.NONE;
    this.previousState = GestureType.NONE;
    this.transitionTime = 0;
    this.isTransitioning = false;
    this.callbacks = [];
  }
  
  /**
   * 注册状态变化回调
   * @param callback - 状态变化时调用的回调函数
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.callbacks.push(callback);
  }
  
  /**
   * 移除状态变化回调
   * @param callback - 要移除的回调函数
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }
  
  /**
   * 清除所有回调
   */
  public clearCallbacks(): void {
    this.callbacks = [];
  }
  
  /**
   * 更新状态机，检测状态转换
   * @param newState - 新的手势状态
   * @param deltaTime - 时间增量（秒）
   */
  public update(newState: GestureType, deltaTime: number): void {
    // 检测状态变化
    if (this.currentState !== newState) {
      this.transition(newState);
    }
    
    // 更新过渡状态
    if (this.isTransitioning) {
      this.transitionTime += deltaTime;
      
      // 检查过渡是否完成
      if (this.transitionTime >= this.config.transitionDuration) {
        this.isTransitioning = false;
      }
    }
  }
  
  /**
   * 执行状态转换
   * @param newState - 新的手势状态
   */
  private transition(newState: GestureType): void {
    // 保存前一个状态
    this.previousState = this.currentState;
    
    // 更新当前状态
    this.currentState = newState;
    
    // 重置过渡状态
    this.isTransitioning = true;
    this.transitionTime = 0;
    
    // 触发所有回调
    this.triggerCallbacks();
  }
  
  /**
   * 触发所有注册的状态变化回调
   */
  private triggerCallbacks(): void {
    for (const callback of this.callbacks) {
      try {
        callback(this.previousState, this.currentState, this.transitionTime);
      } catch (error) {
        console.error('状态变化回调执行错误:', error);
      }
    }
  }
  
  /**
   * 获取当前状态
   */
  public getCurrentState(): GestureType {
    return this.currentState;
  }
  
  /**
   * 获取前一个状态
   */
  public getPreviousState(): GestureType {
    return this.previousState;
  }
  
  /**
   * 获取过渡时间
   */
  public getTransitionTime(): number {
    return this.transitionTime;
  }
  
  /**
   * 检查是否正在过渡
   */
  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }
  
  /**
   * 获取配置
   */
  public getConfig(): StateMachineConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<StateMachineConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 重置状态机到初始状态
   */
  public reset(): void {
    this.currentState = GestureType.NONE;
    this.previousState = GestureType.NONE;
    this.transitionTime = 0;
    this.isTransitioning = false;
  }
  
  /**
   * 获取过渡进度（0.0 到 1.0）
   */
  public getTransitionProgress(): number {
    if (!this.isTransitioning) {
      return 1.0;
    }
    
    return Math.min(this.transitionTime / this.config.transitionDuration, 1.0);
  }
}
