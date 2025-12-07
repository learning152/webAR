/**
 * GestureStateMachine 单元测试
 * 测试状态转换检测和过渡状态管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GestureStateMachine } from './GestureStateMachine';
import { GestureType } from './GestureEngine';

describe('GestureStateMachine', () => {
  let stateMachine: GestureStateMachine;
  
  beforeEach(() => {
    stateMachine = new GestureStateMachine();
  });
  
  describe('初始化', () => {
    it('应该以 NONE 状态初始化', () => {
      expect(stateMachine.getCurrentState()).toBe(GestureType.NONE);
      expect(stateMachine.getPreviousState()).toBe(GestureType.NONE);
    });
    
    it('应该初始化为非过渡状态', () => {
      expect(stateMachine.getIsTransitioning()).toBe(false);
      expect(stateMachine.getTransitionTime()).toBe(0);
    });
    
    it('应该使用默认配置', () => {
      const config = stateMachine.getConfig();
      expect(config.transitionDuration).toBe(0.3);
    });
    
    it('应该接受自定义配置', () => {
      const customMachine = new GestureStateMachine({ transitionDuration: 0.5 });
      const config = customMachine.getConfig();
      expect(config.transitionDuration).toBe(0.5);
    });
  });
  
  describe('状态转换检测', () => {
    it('应该检测到状态变化', () => {
      // 初始状态为 NONE
      expect(stateMachine.getCurrentState()).toBe(GestureType.NONE);
      
      // 更新到 OPEN_HAND
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      // 应该检测到状态变化
      expect(stateMachine.getCurrentState()).toBe(GestureType.OPEN_HAND);
      expect(stateMachine.getPreviousState()).toBe(GestureType.NONE);
    });
    
    it('应该在状态变化时触发过渡', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      expect(stateMachine.getIsTransitioning()).toBe(true);
      expect(stateMachine.getTransitionTime()).toBeGreaterThan(0);
    });
    
    it('应该正确跟踪多次状态变化', () => {
      // NONE -> OPEN_HAND
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(stateMachine.getCurrentState()).toBe(GestureType.OPEN_HAND);
      expect(stateMachine.getPreviousState()).toBe(GestureType.NONE);
      
      // OPEN_HAND -> SCISSORS
      stateMachine.update(GestureType.SCISSORS, 0.016);
      expect(stateMachine.getCurrentState()).toBe(GestureType.SCISSORS);
      expect(stateMachine.getPreviousState()).toBe(GestureType.OPEN_HAND);
      
      // SCISSORS -> FIST
      stateMachine.update(GestureType.FIST, 0.016);
      expect(stateMachine.getCurrentState()).toBe(GestureType.FIST);
      expect(stateMachine.getPreviousState()).toBe(GestureType.SCISSORS);
    });
    
    it('应该在状态未变化时不触发新的过渡', () => {
      // 第一次更新
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      const firstTransitionTime = stateMachine.getTransitionTime();
      
      // 第二次更新，状态相同
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      const secondTransitionTime = stateMachine.getTransitionTime();
      
      // 过渡时间应该增加（而不是重置）
      expect(secondTransitionTime).toBeGreaterThan(firstTransitionTime);
    });
  });
  
  describe('过渡状态管理', () => {
    it('应该跟踪过渡时间', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      const time1 = stateMachine.getTransitionTime();
      expect(time1).toBeGreaterThan(0);
      
      // 继续更新
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      const time2 = stateMachine.getTransitionTime();
      
      // 时间应该增加
      expect(time2).toBeGreaterThan(time1);
    });
    
    it('应该在过渡完成后停止过渡状态', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(stateMachine.getIsTransitioning()).toBe(true);
      
      // 模拟足够长的时间让过渡完成（默认 0.3 秒）
      stateMachine.update(GestureType.OPEN_HAND, 0.3);
      
      expect(stateMachine.getIsTransitioning()).toBe(false);
    });
    
    it('应该在新的状态变化时重置过渡时间', () => {
      // 第一次状态变化
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      stateMachine.update(GestureType.OPEN_HAND, 0.1);
      
      const time1 = stateMachine.getTransitionTime();
      expect(time1).toBeGreaterThan(0.1);
      
      // 第二次状态变化
      stateMachine.update(GestureType.SCISSORS, 0.016);
      const time2 = stateMachine.getTransitionTime();
      
      // 过渡时间应该重置（包含当前帧的 deltaTime）
      expect(time2).toBeLessThan(time1);
      expect(time2).toBeCloseTo(0.016, 3);
    });
    
    it('应该正确计算过渡进度', () => {
      const machine = new GestureStateMachine({ transitionDuration: 1.0 });
      
      // 初始进度应该是 1.0（未过渡）
      expect(machine.getTransitionProgress()).toBe(1.0);
      
      // 触发状态变化
      machine.update(GestureType.OPEN_HAND, 0.0);
      expect(machine.getTransitionProgress()).toBe(0.0);
      
      // 更新到 50%
      machine.update(GestureType.OPEN_HAND, 0.5);
      expect(machine.getTransitionProgress()).toBeCloseTo(0.5, 1);
      
      // 更新到 100%
      machine.update(GestureType.OPEN_HAND, 0.5);
      expect(machine.getTransitionProgress()).toBe(1.0);
    });
  });
  
  describe('状态变化回调', () => {
    it('应该在状态变化时触发回调', () => {
      const callback = vi.fn();
      stateMachine.onStateChange(callback);
      
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        GestureType.NONE,
        GestureType.OPEN_HAND,
        0
      );
    });
    
    it('应该触发多个注册的回调', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      stateMachine.onStateChange(callback1);
      stateMachine.onStateChange(callback2);
      
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
    
    it('应该在状态未变化时不触发回调', () => {
      const callback = vi.fn();
      stateMachine.onStateChange(callback);
      
      // 第一次更新触发回调
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // 第二次更新，状态相同，不应触发回调
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('应该能够移除回调', () => {
      const callback = vi.fn();
      stateMachine.onStateChange(callback);
      
      // 移除回调
      stateMachine.removeStateChangeCallback(callback);
      
      // 状态变化不应触发回调
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('应该能够清除所有回调', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      stateMachine.onStateChange(callback1);
      stateMachine.onStateChange(callback2);
      
      // 清除所有回调
      stateMachine.clearCallbacks();
      
      // 状态变化不应触发任何回调
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
    
    it('应该处理回调中的错误而不中断其他回调', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('回调错误');
      });
      const normalCallback = vi.fn();
      
      stateMachine.onStateChange(errorCallback);
      stateMachine.onStateChange(normalCallback);
      
      // 即使第一个回调抛出错误，第二个回调也应该被调用
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      stateMachine.updateConfig({ transitionDuration: 0.5 });
      
      const config = stateMachine.getConfig();
      expect(config.transitionDuration).toBe(0.5);
    });
    
    it('应该使用更新后的配置', () => {
      stateMachine.updateConfig({ transitionDuration: 0.1 });
      
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      expect(stateMachine.getIsTransitioning()).toBe(true);
      
      // 0.1 秒后过渡应该完成
      stateMachine.update(GestureType.OPEN_HAND, 0.1);
      expect(stateMachine.getIsTransitioning()).toBe(false);
    });
  });
  
  describe('重置功能', () => {
    it('应该能够重置状态机', () => {
      // 设置一些状态
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      stateMachine.update(GestureType.OPEN_HAND, 0.1);
      
      // 重置
      stateMachine.reset();
      
      // 应该回到初始状态
      expect(stateMachine.getCurrentState()).toBe(GestureType.NONE);
      expect(stateMachine.getPreviousState()).toBe(GestureType.NONE);
      expect(stateMachine.getIsTransitioning()).toBe(false);
      expect(stateMachine.getTransitionTime()).toBe(0);
    });
  });
  
  describe('边缘情况', () => {
    it('应该处理零时间增量', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0);
      
      expect(stateMachine.getCurrentState()).toBe(GestureType.OPEN_HAND);
      expect(stateMachine.getTransitionTime()).toBe(0);
    });
    
    it('应该处理负时间增量', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      const time1 = stateMachine.getTransitionTime();
      
      // 负时间增量不应该减少过渡时间
      stateMachine.update(GestureType.OPEN_HAND, -0.016);
      const time2 = stateMachine.getTransitionTime();
      
      expect(time2).toBeLessThan(time1);
    });
    
    it('应该处理非常大的时间增量', () => {
      stateMachine.update(GestureType.OPEN_HAND, 0.016);
      
      // 非常大的时间增量应该立即完成过渡
      stateMachine.update(GestureType.OPEN_HAND, 10.0);
      
      expect(stateMachine.getIsTransitioning()).toBe(false);
      expect(stateMachine.getTransitionProgress()).toBe(1.0);
    });
  });
});
