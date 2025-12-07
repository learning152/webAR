/**
 * ParticleCanvas - React 组件
 * 作为 Three.js 场景容器，协调三大引擎（渲染、物理、手势）
 */

import { useEffect, useRef, useState } from 'react';
import { ThreeEngine } from '../engines/ThreeEngine';
import { PhysicsEngine } from '../engines/PhysicsEngine';
import { GestureEngine, GestureType } from '../engines/GestureEngine';
import type { HandData } from '../engines/GestureEngine';
import { GestureStateMachine } from '../engines/GestureStateMachine';
import { InteractionManager } from '../engines/InteractionManager';
import { CameraManager } from '../utils/CameraManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { ShapeType } from '../shapes/ShapeGenerator';
import { UIControls } from './UIControls';

/**
 * ParticleCanvas 组件属性
 */
export interface ParticleCanvasProps {
  particleCount?: number; // 粒子数量，默认 16000
  onGestureChange?: (gesture: GestureType) => void; // 手势变化回调
  onError?: (error: string) => void; // 错误回调
  showUIControls?: boolean; // 是否显示 UI 控制层，默认 true
  showDebugInfo?: boolean; // 是否显示调试信息，默认 false
}

/**
 * ParticleCanvas 组件
 * 管理 Three.js 场景、物理引擎、手势识别引擎的生命周期
 */
export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  particleCount = 16000,
  onGestureChange,
  onError,
  showUIControls = true,
  showDebugInfo = false
}) => {
  // DOM 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 引擎实例引用
  const threeEngineRef = useRef<ThreeEngine | null>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const gestureEngineRef = useRef<GestureEngine | null>(null);
  const stateMachineRef = useRef<GestureStateMachine | null>(null);
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  
  // 动画循环引用
  const animationIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // UI 状态
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [handData, setHandData] = useState<HandData | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [currentParticleCount, setCurrentParticleCount] = useState<number>(particleCount);

  useEffect(() => {
    // 初始化标志
    let mounted = true;
    let initialized = false;

    /**
     * 初始化所有引擎
     */
    const initializeEngines = async () => {
      try {
        // 检查容器是否存在
        if (!containerRef.current || !videoRef.current) {
          throw new Error('容器或视频元素未找到');
        }

        // 1. 初始化 Three.js 渲染引擎
        const threeEngine = new ThreeEngine();
        threeEngine.initialize(containerRef.current, particleCount);
        threeEngineRef.current = threeEngine;

        // 2. 初始化物理引擎
        const physicsEngine = new PhysicsEngine();
        physicsEngine.initialize(particleCount);
        physicsEngineRef.current = physicsEngine;

        // 3. 初始化摄像头管理器
        const cameraManager = new CameraManager();
        const cameraResult = await cameraManager.requestCamera();
        
        if (!cameraResult.success) {
          throw new Error(cameraResult.errorMessage || '摄像头访问失败');
        }

        // 将视频流绑定到 video 元素
        const attached = await cameraManager.attachToVideoElement(videoRef.current);
        if (!attached) {
          throw new Error('视频流绑定失败');
        }
        
        cameraManagerRef.current = cameraManager;

        // 4. 初始化手势识别引擎
        const gestureEngine = new GestureEngine();
        await gestureEngine.initialize(videoRef.current);
        gestureEngineRef.current = gestureEngine;

        // 5. 初始化手势状态机
        const stateMachine = new GestureStateMachine();
        stateMachineRef.current = stateMachine;

        // 6. 初始化交互管理器
        const interactionManager = new InteractionManager();
        interactionManager.setPhysicsEngine(physicsEngine);
        interactionManagerRef.current = interactionManager;

        // 7. 初始化性能监控器
        const performanceMonitor = new PerformanceMonitor(
          particleCount,
          50, // 手势检测间隔
          {},
          {
            onFpsUpdate: (newFps) => {
              setFps(newFps);
            }
          }
        );
        performanceMonitorRef.current = performanceMonitor;

        // 注册状态变化回调
        stateMachine.onStateChange((fromState, toState) => {
          console.log(`手势状态变化: ${fromState} -> ${toState}`);
          
          // 更新 UI 状态
          setCurrentGesture(toState);
          
          // 映射 GestureType 到 ShapeType
          const shapeTypeMap: Record<GestureType, ShapeType | null> = {
            [GestureType.OPEN_HAND]: ShapeType.PLANET,
            [GestureType.SCISSORS]: ShapeType.TEXT,
            [GestureType.FIST]: ShapeType.TORUS,
            [GestureType.POINT]: ShapeType.STAR,
            [GestureType.THUMBS_UP]: ShapeType.HEART,
            [GestureType.FINGER_HEART]: ShapeType.ARROW_HEART,
            [GestureType.NONE]: null
          };
          
          const targetShape = shapeTypeMap[toState];
          if (targetShape) {
            // 触发爆炸过渡特效
            interactionManager.triggerTransition(targetShape);
          }
          
          // 处理手势变化（检测手指比心散开）
          interactionManager.handleGestureChange(fromState, toState);
          
          // 调用外部回调
          if (onGestureChange) {
            onGestureChange(toState);
          }
        });

        // 设置窗口大小调整监听器
        const handleResize = () => {
          if (containerRef.current && threeEngine) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            threeEngine.resize(width, height);
          }
        };
        window.addEventListener('resize', handleResize);

        initialized = true;

        // 启动渲染循环
        startRenderLoop();

        // 清理函数
        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('引擎初始化失败:', error);
        if (onError) {
          onError(error instanceof Error ? error.message : '初始化失败');
        }
      }
    };

    /**
     * 启动主渲染循环
     */
    const startRenderLoop = () => {
      lastTimeRef.current = performance.now();

      const renderLoop = (currentTime: number) => {
        if (!mounted || !initialized) {
          return;
        }

        // 计算 deltaTime（秒）
        const deltaTime = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;

        // 限制 deltaTime 避免大的跳跃
        const clampedDeltaTime = Math.min(deltaTime, 0.1);

        try {
          // 1. 更新性能监控器
          if (performanceMonitorRef.current) {
            performanceMonitorRef.current.update();
          }

          // 2. 更新手势引擎
          if (gestureEngineRef.current) {
            gestureEngineRef.current.update();
            
            // 更新 UI 状态
            const gesture = gestureEngineRef.current.getCurrentGesture();
            const hand = gestureEngineRef.current.getHandData();
            setCurrentGesture(gesture);
            setHandData(hand);
          }

          // 3. 更新状态机
          if (stateMachineRef.current && gestureEngineRef.current) {
            const currentGesture = gestureEngineRef.current.getCurrentGesture();
            stateMachineRef.current.update(currentGesture, clampedDeltaTime);
          }

          // 4. 更新交互管理器（挥手风暴和深度推拉）
          if (interactionManagerRef.current && gestureEngineRef.current) {
            const handData = gestureEngineRef.current.getHandData();
            if (handData) {
              interactionManagerRef.current.update(handData, clampedDeltaTime);
            }
          }

          // 5. 更新物理引擎
          if (physicsEngineRef.current) {
            physicsEngineRef.current.update(clampedDeltaTime);
          }

          // 6. 更新 Three.js 几何体
          if (threeEngineRef.current && physicsEngineRef.current) {
            const particleData = physicsEngineRef.current.getParticleData();
            if (particleData) {
              threeEngineRef.current.updatePositions(particleData.positions);
              threeEngineRef.current.updateColors(particleData.colors);
            }
          }

          // 7. 渲染场景
          if (threeEngineRef.current) {
            threeEngineRef.current.render();
          }
        } catch (error) {
          console.error('渲染循环错误:', error);
        }

        // 继续下一帧
        animationIdRef.current = requestAnimationFrame(renderLoop);
      };

      // 启动循环
      animationIdRef.current = requestAnimationFrame(renderLoop);
    };

    // 执行初始化
    initializeEngines();

    // 清理函数
    return () => {
      mounted = false;
      initialized = false;

      // 停止动画循环
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      // 清理手势引擎
      if (gestureEngineRef.current) {
        gestureEngineRef.current.dispose();
        gestureEngineRef.current = null;
      }

      // 清理摄像头
      if (cameraManagerRef.current) {
        cameraManagerRef.current.stop();
        cameraManagerRef.current = null;
      }

      // 清理 Three.js 引擎
      if (threeEngineRef.current) {
        threeEngineRef.current.dispose();
        threeEngineRef.current = null;
      }

      // 清理其他引擎引用
      physicsEngineRef.current = null;
      stateMachineRef.current = null;
      interactionManagerRef.current = null;
      performanceMonitorRef.current = null;
    };
  }, [particleCount, onGestureChange, onError]);

  /**
   * 处理粒子数量变化
   */
  const handleParticleCountChange = (newCount: number) => {
    console.log(`粒子数量变化: ${currentParticleCount} -> ${newCount}`);
    setCurrentParticleCount(newCount);
    
    // 注意：实际应用中，这里需要重新初始化物理引擎和渲染引擎
    // 为了简化，这里只更新状态，实际重新初始化需要更复杂的逻辑
    // 可以考虑在未来版本中实现动态粒子数量调整
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000000'
      }}
    >
      {/* 隐藏的视频元素，用于 MediaPipe 处理 */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        playsInline
        muted
      />
      
      {/* UI 控制层 */}
      {showUIControls && (
        <UIControls
          currentGesture={currentGesture}
          handData={handData}
          fps={fps}
          particleCount={currentParticleCount}
          onParticleCountChange={handleParticleCountChange}
          showDebugInfo={showDebugInfo}
        />
      )}
    </div>
  );
};

export default ParticleCanvas;
