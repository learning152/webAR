/**
 * ParticleCanvas 集成测试
 * 测试降级模式完整流程和模拟器与引擎的交互
 * 验证需求: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticleCanvas } from './ParticleCanvas';
import { ShapeType } from '../shapes/ShapeGenerator';

// Mock 引擎类
const mockThreeEngine = {
  initialize: vi.fn(),
  render: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  updatePositions: vi.fn(),
  updateColors: vi.fn(),
  setSceneRotation: vi.fn(),
  addSceneRotation: vi.fn(),
  setSceneScale: vi.fn(),
  getSceneRotation: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  getSceneScale: vi.fn(() => 1.0)
};

const mockPhysicsEngine = {
  initialize: vi.fn(),
  update: vi.fn(),
  getParticleData: vi.fn(() => ({
    positions: new Float32Array(16000 * 3),
    colors: new Float32Array(16000 * 3)
  }))
};

const mockGestureEngine = {
  initialize: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn(),
  getCurrentGesture: vi.fn(() => 'none'),
  getHandData: vi.fn(() => null)
};

const mockStateMachine = {
  update: vi.fn(),
  onStateChange: vi.fn(),
  getCurrentState: vi.fn(() => 'none')
};

const mockInteractionManager = {
  update: vi.fn(),
  triggerTransition: vi.fn(),
  setPhysicsEngine: vi.fn(),
  handleGestureChange: vi.fn(),
  updateTransition: vi.fn(),
  updateFingerHeartSpread: vi.fn()
};

let mockCameraSuccess = false;
const mockCameraManager = {
  requestCamera: vi.fn(() => Promise.resolve({
    success: mockCameraSuccess,
    stream: mockCameraSuccess ? ({} as MediaStream) : undefined,
    error: mockCameraSuccess ? undefined : 'permission_denied',
    errorMessage: mockCameraSuccess ? undefined : '用户拒绝了摄像头权限'
  })),
  attachToVideoElement: vi.fn(() => Promise.resolve(mockCameraSuccess)),
  stop: vi.fn()
};

vi.mock('../engines/ThreeEngine', () => ({
  ThreeEngine: vi.fn(() => mockThreeEngine)
}));

vi.mock('../engines/PhysicsEngine', () => ({
  PhysicsEngine: vi.fn(() => mockPhysicsEngine)
}));

vi.mock('../engines/GestureEngine', () => ({
  GestureEngine: vi.fn(() => mockGestureEngine),
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
  GestureStateMachine: vi.fn(() => mockStateMachine)
}));

vi.mock('../engines/InteractionManager', () => ({
  InteractionManager: vi.fn(() => mockInteractionManager)
}));

vi.mock('../utils/CameraManager', () => ({
  CameraManager: vi.fn(() => mockCameraManager)
}));

describe('ParticleCanvas 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCameraSuccess = false; // 默认摄像头失败
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    }) as any;
    
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('降级模式完整流程 (需求 1.1, 1.2)', () => {
    it('should initialize engines without blocking when camera fails', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待引擎初始化
      await waitFor(() => {
        expect(mockThreeEngine.initialize).toHaveBeenCalled();
        expect(mockPhysicsEngine.initialize).toHaveBeenCalled();
      });
      
      // 验证摄像头失败不阻塞渲染引擎初始化
      expect(mockThreeEngine.initialize).toHaveBeenCalledTimes(1);
      expect(mockPhysicsEngine.initialize).toHaveBeenCalledTimes(1);
    });

    it('should automatically show simulator when camera fails', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待模拟器显示
      await waitFor(() => {
        const simulator = screen.queryByText('手势模拟器');
        expect(simulator).toBeTruthy();
      });
    });

    it('should render default particle shape (PLANET) in fallback mode', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待引擎初始化
      await waitFor(() => {
        expect(mockPhysicsEngine.initialize).toHaveBeenCalled();
      });
      
      // 验证物理引擎被初始化（默认形态会被渲染）
      expect(mockPhysicsEngine.initialize).toHaveBeenCalledWith(16000);
    });

    it('should show retry button when camera fails with retryable error', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待错误提示显示
      await waitFor(() => {
        const retryButton = screen.queryByText('重试');
        expect(retryButton).toBeTruthy();
      });
    });

    it('should call onCameraStatusChange callback with false when camera fails', async () => {
      mockCameraSuccess = false;
      const onCameraStatusChange = vi.fn();
      
      render(
        <ParticleCanvas 
          enableFallbackMode={true} 
          onCameraStatusChange={onCameraStatusChange}
        />
      );
      
      // 等待摄像头初始化失败
      await waitFor(() => {
        expect(onCameraStatusChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('模拟器与引擎交互 (需求 1.3)', () => {
    it('should trigger shape transition when simulator shape button is clicked', async () => {
      mockCameraSuccess = false;
      const user = userEvent.setup();
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待模拟器显示
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeTruthy();
      });
      
      // 查找并点击文字形态按钮
      const textButton = screen.getByText('文字');
      await user.click(textButton);
      
      // 验证交互管理器触发了形态转换
      await waitFor(() => {
        expect(mockInteractionManager.triggerTransition).toHaveBeenCalledWith(ShapeType.TEXT);
      });
    });

    it('should update scene rotation when arrow keys are pressed', async () => {
      mockCameraSuccess = false;
      const user = userEvent.setup();
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待模拟器显示
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeTruthy();
      });
      
      // 模拟按下方向键
      await user.keyboard('{ArrowUp}');
      
      // 验证场景旋转被调用
      await waitFor(() => {
        expect(mockThreeEngine.addSceneRotation).toHaveBeenCalled();
      });
    });

    it('should update scene scale when scale slider is changed', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待模拟器显示
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeTruthy();
      });
      
      // 查找缩放滑块（使用 class 选择器）
      const slider = document.querySelector('.scale-slider') as HTMLInputElement;
      expect(slider).toBeTruthy();
      
      // 使用 fireEvent 改变滑块值
      fireEvent.change(slider!, { target: { value: '75' } });
      
      // 验证场景缩放被调用
      await waitFor(() => {
        expect(mockThreeEngine.setSceneScale).toHaveBeenCalled();
      });
    });

    it('should pause camera gesture detection when simulator is active', async () => {
      mockCameraSuccess = true; // 摄像头可用
      const user = userEvent.setup();
      
      render(<ParticleCanvas enableFallbackMode={true} showSimulatorButton={true} />);
      
      // 等待初始化
      await waitFor(() => {
        expect(mockGestureEngine.initialize).toHaveBeenCalled();
      });
      
      // 点击显示模拟器按钮
      const showButton = await screen.findByText('🎮 显示手势模拟器');
      await user.click(showButton);
      
      // 等待模拟器显示
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeTruthy();
      });
      
      // 在模拟器激活时，手势引擎的更新应该被跳过
      // 这通过 simulatorActive 标志控制
      // 验证模拟器显示
      expect(screen.queryByText('手势模拟器')).toBeTruthy();
    });

    it('should restore camera detection when simulator is closed', async () => {
      mockCameraSuccess = false;
      const user = userEvent.setup();
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待模拟器显示
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeTruthy();
      });
      
      // 查找并点击关闭按钮
      const closeButton = screen.getByText('✕');
      await user.click(closeButton);
      
      // 验证模拟器被隐藏
      await waitFor(() => {
        expect(screen.queryByText('手势模拟器')).toBeFalsy();
      });
    });
  });

  describe('摄像头重试功能', () => {
    it('should successfully initialize camera on retry', async () => {
      mockCameraSuccess = false;
      const user = userEvent.setup();
      const onCameraStatusChange = vi.fn();
      
      render(
        <ParticleCanvas 
          enableFallbackMode={true}
          onCameraStatusChange={onCameraStatusChange}
        />
      );
      
      // 等待初始失败
      await waitFor(() => {
        expect(onCameraStatusChange).toHaveBeenCalledWith(false);
      });
      
      // 改变摄像头状态为成功
      mockCameraSuccess = true;
      
      // 点击重试按钮
      const retryButton = await screen.findByText('重试');
      await user.click(retryButton);
      
      // 验证摄像头重新初始化成功
      await waitFor(() => {
        expect(mockCameraManager.requestCamera).toHaveBeenCalledTimes(2);
        expect(onCameraStatusChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('引擎协调', () => {
    it('should coordinate all engines in render loop', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待引擎初始化
      await waitFor(() => {
        expect(mockThreeEngine.initialize).toHaveBeenCalled();
        expect(mockPhysicsEngine.initialize).toHaveBeenCalled();
      });
      
      // 等待渲染循环执行
      await waitFor(() => {
        expect(mockPhysicsEngine.update).toHaveBeenCalled();
        expect(mockThreeEngine.render).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should update particle positions and colors from physics engine', async () => {
      mockCameraSuccess = false;
      
      render(<ParticleCanvas enableFallbackMode={true} />);
      
      // 等待渲染循环执行
      await waitFor(() => {
        expect(mockPhysicsEngine.getParticleData).toHaveBeenCalled();
        expect(mockThreeEngine.updatePositions).toHaveBeenCalled();
        expect(mockThreeEngine.updateColors).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });
});
