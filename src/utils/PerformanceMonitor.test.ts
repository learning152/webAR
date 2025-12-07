/**
 * PerformanceMonitor 单元测试
 * 测试 FPS 计算和降级触发逻辑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockPerformanceNow: any;
  
  beforeEach(() => {
    // Mock performance.now()
    mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValue(0);
  });
  
  afterEach(() => {
    mockPerformanceNow.mockRestore();
  });
  
  describe('FPS 计算', () => {
    it('应该正确初始化 FPS 为 60', () => {
      monitor = new PerformanceMonitor(16000, 50);
      expect(monitor.getFps()).toBe(60);
    });
    
    it('应该在 1 秒后计算 FPS', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      // 模拟 60 帧在 1 秒内
      for (let i = 0; i < 60; i++) {
        mockPerformanceNow.mockReturnValue(i * (1000 / 60));
        monitor.update();
      }
      
      // 在 1 秒后，FPS 应该被计算
      mockPerformanceNow.mockReturnValue(1000);
      monitor.update();
      
      // FPS 计算包含触发计算的那一帧，所以是 61
      expect(monitor.getFps()).toBe(61);
    });
    
    it('应该正确计算低 FPS', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      // 模拟 15 帧在 1 秒内
      for (let i = 0; i < 15; i++) {
        mockPerformanceNow.mockReturnValue(i * (1000 / 15));
        monitor.update();
      }
      
      // 在 1 秒后，FPS 应该被计算
      mockPerformanceNow.mockReturnValue(1000);
      monitor.update();
      
      // FPS 计算包含触发计算的那一帧，所以是 16
      expect(monitor.getFps()).toBe(16);
    });
    
    it('应该计算平均 FPS', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      // 模拟多个 FPS 测量周期
      const fpsMeasurements = [60, 55, 50, 45, 40];
      let currentTime = 0;
      
      for (const targetFps of fpsMeasurements) {
        // 模拟该 FPS 的帧数
        for (let i = 0; i < targetFps; i++) {
          mockPerformanceNow.mockReturnValue(currentTime + i * (1000 / targetFps));
          monitor.update();
        }
        
        // 完成 1 秒
        currentTime += 1000;
        mockPerformanceNow.mockReturnValue(currentTime);
        monitor.update();
      }
      
      // 平均 FPS 应该是 (61 + 56 + 51 + 46 + 41) / 5 = 51 (每个周期多计算一帧)
      expect(monitor.getAverageFps()).toBe(51);
    });
    
    it('应该触发 FPS 更新回调', () => {
      const onFpsUpdate = vi.fn();
      monitor = new PerformanceMonitor(16000, 50, {}, { onFpsUpdate });
      
      // 模拟 30 帧在 1 秒内
      for (let i = 0; i < 30; i++) {
        mockPerformanceNow.mockReturnValue(i * (1000 / 30));
        monitor.update();
      }
      
      mockPerformanceNow.mockReturnValue(1000);
      monitor.update();
      
      // FPS 计算包含触发计算的那一帧，所以是 31
      expect(onFpsUpdate).toHaveBeenCalledWith(31);
    });
  });
  
  describe('降级触发', () => {
    it('应该在 FPS 低于阈值时触发降级', () => {
      const onDegradationTriggered = vi.fn();
      monitor = new PerformanceMonitor(
        16000,
        50,
        { fpsThreshold: 20 },
        { onDegradationTriggered }
      );
      
      // 模拟多个低 FPS 周期以触发降级
      let currentTime = 0;
      for (let cycle = 0; cycle < 10; cycle++) {
        // 模拟 15 FPS
        for (let i = 0; i < 15; i++) {
          mockPerformanceNow.mockReturnValue(currentTime + i * (1000 / 15));
          monitor.update();
        }
        
        currentTime += 1000;
        mockPerformanceNow.mockReturnValue(currentTime);
        monitor.update();
      }
      
      // 降级应该被触发
      expect(monitor.isDegraded()).toBe(true);
      expect(onDegradationTriggered).toHaveBeenCalled();
      
      // 检查降级状态
      const state = monitor.getDegradationState();
      expect(state.isDegraded).toBe(true);
      expect(state.currentParticleCount).toBe(8000); // 50% of 16000
      expect(state.currentGestureInterval).toBe(100);
    });
    
    it('应该在 FPS 恢复时取消降级', () => {
      const onDegradationRestored = vi.fn();
      monitor = new PerformanceMonitor(
        16000,
        50,
        { fpsThreshold: 20 },
        { onDegradationRestored }
      );
      
      // 首先触发降级
      let currentTime = 0;
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 15; i++) {
          mockPerformanceNow.mockReturnValue(currentTime + i * (1000 / 15));
          monitor.update();
        }
        currentTime += 1000;
        mockPerformanceNow.mockReturnValue(currentTime);
        monitor.update();
      }
      
      expect(monitor.isDegraded()).toBe(true);
      
      // 然后模拟 FPS 恢复到 40（高于阈值 * 1.5 = 30）
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 40; i++) {
          mockPerformanceNow.mockReturnValue(currentTime + i * (1000 / 40));
          monitor.update();
        }
        currentTime += 1000;
        mockPerformanceNow.mockReturnValue(currentTime);
        monitor.update();
      }
      
      // 降级应该被取消
      expect(monitor.isDegraded()).toBe(false);
      expect(onDegradationRestored).toHaveBeenCalled();
      
      // 检查恢复状态
      const state = monitor.getDegradationState();
      expect(state.isDegraded).toBe(false);
      expect(state.currentParticleCount).toBe(16000);
      expect(state.currentGestureInterval).toBe(50);
    });
    
    it('应该使用自定义降级配置', () => {
      const onDegradationTriggered = vi.fn();
      monitor = new PerformanceMonitor(
        16000,
        50,
        {
          fpsThreshold: 30,
          particleReductionFactor: 0.25,
          gestureDetectionInterval: 200
        },
        { onDegradationTriggered }
      );
      
      // 模拟低 FPS
      let currentTime = 0;
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 25; i++) {
          mockPerformanceNow.mockReturnValue(currentTime + i * (1000 / 25));
          monitor.update();
        }
        currentTime += 1000;
        mockPerformanceNow.mockReturnValue(currentTime);
        monitor.update();
      }
      
      expect(monitor.isDegraded()).toBe(true);
      
      const state = monitor.getDegradationState();
      expect(state.currentParticleCount).toBe(4000); // 25% of 16000
      expect(state.currentGestureInterval).toBe(200);
    });
    
    it('应该支持手动触发降级', () => {
      const onDegradationTriggered = vi.fn();
      monitor = new PerformanceMonitor(16000, 50, {}, { onDegradationTriggered });
      
      expect(monitor.isDegraded()).toBe(false);
      
      monitor.forceDegradation();
      
      expect(monitor.isDegraded()).toBe(true);
      expect(onDegradationTriggered).toHaveBeenCalled();
    });
    
    it('应该支持手动恢复性能', () => {
      const onDegradationRestored = vi.fn();
      monitor = new PerformanceMonitor(16000, 50, {}, { onDegradationRestored });
      
      monitor.forceDegradation();
      expect(monitor.isDegraded()).toBe(true);
      
      monitor.forceRestore();
      
      expect(monitor.isDegraded()).toBe(false);
      expect(onDegradationRestored).toHaveBeenCalled();
    });
  });
  
  describe('配置和控制', () => {
    it('应该返回正确的配置', () => {
      monitor = new PerformanceMonitor(16000, 50, {
        fpsThreshold: 25,
        particleReductionFactor: 0.6,
        gestureDetectionInterval: 150
      });
      
      const config = monitor.getConfig();
      expect(config.fpsThreshold).toBe(25);
      expect(config.particleReductionFactor).toBe(0.6);
      expect(config.gestureDetectionInterval).toBe(150);
    });
    
    it('应该支持更新配置', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      monitor.updateConfig({ fpsThreshold: 15 });
      
      const config = monitor.getConfig();
      expect(config.fpsThreshold).toBe(15);
    });
    
    it('应该支持启用和禁用', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      expect(monitor.isEnabled()).toBe(true);
      
      monitor.disable();
      expect(monitor.isEnabled()).toBe(false);
      
      monitor.enable();
      expect(monitor.isEnabled()).toBe(true);
    });
    
    it('禁用时不应该更新 FPS', () => {
      const onFpsUpdate = vi.fn();
      monitor = new PerformanceMonitor(16000, 50, {}, { onFpsUpdate });
      
      monitor.disable();
      
      // 模拟帧
      for (let i = 0; i < 30; i++) {
        mockPerformanceNow.mockReturnValue(i * (1000 / 30));
        monitor.update();
      }
      
      mockPerformanceNow.mockReturnValue(1000);
      monitor.update();
      
      // FPS 回调不应该被调用
      expect(onFpsUpdate).not.toHaveBeenCalled();
    });
    
    it('应该支持重置', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      // 触发降级
      monitor.forceDegradation();
      expect(monitor.isDegraded()).toBe(true);
      
      // 重置
      monitor.reset();
      
      expect(monitor.isDegraded()).toBe(false);
      expect(monitor.getFps()).toBe(60);
      expect(monitor.getAverageFps()).toBe(60);
    });
  });
  
  describe('降级状态', () => {
    it('应该返回完整的降级状态', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      const state = monitor.getDegradationState();
      
      expect(state).toHaveProperty('isDegraded');
      expect(state).toHaveProperty('currentParticleCount');
      expect(state).toHaveProperty('originalParticleCount');
      expect(state).toHaveProperty('currentGestureInterval');
      expect(state).toHaveProperty('originalGestureInterval');
      
      expect(state.originalParticleCount).toBe(16000);
      expect(state.originalGestureInterval).toBe(50);
    });
    
    it('降级状态应该是不可变的', () => {
      monitor = new PerformanceMonitor(16000, 50);
      
      const state1 = monitor.getDegradationState();
      state1.isDegraded = true; // 尝试修改
      
      const state2 = monitor.getDegradationState();
      expect(state2.isDegraded).toBe(false); // 应该不受影响
    });
  });
});
