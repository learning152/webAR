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
import { GestureSimulator, type Euler } from './GestureSimulator';

/**
 * ParticleCanvas 组件属性
 */
export interface ParticleCanvasProps {
  particleCount?: number; // 粒子数量，默认 16000
  onGestureChange?: (gesture: GestureType) => void; // 手势变化回调
  onError?: (error: string) => void; // 错误回调
  showUIControls?: boolean; // 是否显示 UI 控制层，默认 true
  showDebugInfo?: boolean; // 是否显示调试信息，默认 false
  enableFallbackMode?: boolean; // 是否启用降级模式，默认 true
  showSimulatorButton?: boolean; // 是否显示模拟器按钮，默认 true
  onCameraStatusChange?: (available: boolean) => void; // 摄像头状态回调
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
  showDebugInfo = false,
  enableFallbackMode = true,
  showSimulatorButton = true,
  onCameraStatusChange
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
  
  // 摄像头和降级模式状态
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(false);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [canRetryCamera, setCanRetryCamera] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simulatorActive, setSimulatorActive] = useState<boolean>(false);
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.PLANET);

  useEffect(() => {
    // 初始化标志
    let mounted = true;
    let initialized = false;

    /**
     * 初始化摄像头（非阻塞）
     */
    const initializeCamera = async () => {
      try {
        if (!videoRef.current) {
          throw new Error('视频元素未找到');
        }

        // 初始化摄像头管理器
        const cameraManager = new CameraManager();
        const cameraResult = await cameraManager.requestCamera();
        
        if (!cameraResult.success) {
          // 摄像头失败，但不阻塞应用
          console.warn('摄像头初始化失败:', cameraResult.errorMessage);
          setCameraError(cameraResult.errorMessage || '摄像头访问失败');
          setCameraAvailable(false);
          
          // 根据错误类型决定是否可以重试
          if (cameraResult.error !== 'device_not_found') {
            setCanRetryCamera(true);
          }
          
          // 进入降级模式
          if (enableFallbackMode) {
            setFallbackMode(true);
            setShowSimulator(true);
          }
          
          if (onCameraStatusChange) {
            onCameraStatusChange(false);
          }
          
          return;
        }

        // 将视频流绑定到 video 元素
        const attached = await cameraManager.attachToVideoElement(videoRef.current);
        if (!attached) {
          console.warn('视频流绑定失败');
          setCameraAvailable(false);
          
          if (enableFallbackMode) {
            setFallbackMode(true);
            setShowSimulator(true);
          }
          
          if (onCameraStatusChange) {
            onCameraStatusChange(false);
          }
          
          return;
        }
        
        cameraManagerRef.current = cameraManager;

        // 初始化手势识别引擎
        const gestureEngine = new GestureEngine();
        await gestureEngine.initialize(videoRef.current);
        gestureEngineRef.current = gestureEngine;
        
        // 摄像头成功
        setCameraAvailable(true);
        setFallbackMode(false);
        setCameraError(null);
        
        if (onCameraStatusChange) {
          onCameraStatusChange(true);
        }
      } catch (error) {
        console.error('摄像头初始化错误:', error);
        setCameraAvailable(false);
        
        if (enableFallbackMode) {
          setFallbackMode(true);
          setShowSimulator(true);
        }
        
        if (onCameraStatusChange) {
          onCameraStatusChange(false);
        }
      }
    };

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

        // 3. 初始化手势状态机
        const stateMachine = new GestureStateMachine();
        stateMachineRef.current = stateMachine;

        // 4. 初始化交互管理器
        const interactionManager = new InteractionManager();
        interactionManager.setPhysicsEngine(physicsEngine);
        interactionManagerRef.current = interactionManager;

        // 5. 初始化性能监控器
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
            // 更新当前形态
            setCurrentShape(targetShape);
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
        
        // 非阻塞地初始化摄像头
        initializeCamera();

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

          // 2. 更新手势引擎（仅在摄像头可用且模拟器未激活时）
          if (gestureEngineRef.current && !simulatorActive) {
            gestureEngineRef.current.update();
            
            // 更新 UI 状态
            const gesture = gestureEngineRef.current.getCurrentGesture();
            const hand = gestureEngineRef.current.getHandData();
            setCurrentGesture(gesture);
            setHandData(hand);
          }

          // 3. 更新状态机（仅在摄像头可用且模拟器未激活时）
          if (stateMachineRef.current && gestureEngineRef.current && !simulatorActive) {
            const currentGesture = gestureEngineRef.current.getCurrentGesture();
            stateMachineRef.current.update(currentGesture, clampedDeltaTime);
          }

          // 4. 更新交互管理器
          if (interactionManagerRef.current) {
            // 始终更新过渡状态（形态切换动画）
            interactionManagerRef.current.updateTransition(clampedDeltaTime);
            interactionManagerRef.current.updateFingerHeartSpread(clampedDeltaTime);
            
            // 挥手风暴和深度推拉仅在摄像头可用且模拟器未激活时
            if (gestureEngineRef.current && !simulatorActive) {
              const handData = gestureEngineRef.current.getHandData();
              if (handData) {
                interactionManagerRef.current.update(handData, clampedDeltaTime);
              }
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
  }, [particleCount, onGestureChange, onError, enableFallbackMode, onCameraStatusChange]);

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

  /**
   * 处理模拟器形态变化
   */
  const handleSimulatorShapeChange = (shape: ShapeType) => {
    console.log(`模拟器形态变化: ${shape}`);
    
    if (interactionManagerRef.current) {
      // 触发爆炸过渡特效
      interactionManagerRef.current.triggerTransition(shape);
      // 更新当前形态
      setCurrentShape(shape);
    }
  };

  /**
   * 处理模拟器旋转变化
   */
  const handleSimulatorRotationChange = (delta: Euler) => {
    if (threeEngineRef.current) {
      threeEngineRef.current.addSceneRotation(delta);
    }
  };

  /**
   * 处理模拟器缩放变化
   */
  const handleSimulatorScaleChange = (scale: number) => {
    if (threeEngineRef.current) {
      threeEngineRef.current.setSceneScale(scale);
    }
  };

  /**
   * 处理模拟器关闭
   */
  const handleSimulatorClose = () => {
    setShowSimulator(false);
    setSimulatorActive(false);
  };

  /**
   * 处理显示模拟器按钮点击
   */
  const handleShowSimulator = () => {
    setShowSimulator(true);
    setSimulatorActive(true);
  };

  /**
   * 重试摄像头初始化
   */
  const handleRetryCamera = async () => {
    console.log('重试摄像头初始化...');
    setCameraError(null);
    setCanRetryCamera(false);
    
    // 清理现有的摄像头和手势引擎
    if (gestureEngineRef.current) {
      gestureEngineRef.current.dispose();
      gestureEngineRef.current = null;
    }
    
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stop();
      cameraManagerRef.current = null;
    }
    
    // 重新初始化摄像头
    if (!videoRef.current) {
      return;
    }

    try {
      const cameraManager = new CameraManager();
      const cameraResult = await cameraManager.requestCamera();
      
      if (!cameraResult.success) {
        console.warn('摄像头重试失败:', cameraResult.errorMessage);
        setCameraError(cameraResult.errorMessage || '摄像头访问失败');
        setCameraAvailable(false);
        
        if (cameraResult.error !== 'device_not_found') {
          setCanRetryCamera(true);
        }
        
        if (onCameraStatusChange) {
          onCameraStatusChange(false);
        }
        
        return;
      }

      const attached = await cameraManager.attachToVideoElement(videoRef.current);
      if (!attached) {
        console.warn('视频流绑定失败');
        setCameraAvailable(false);
        setCanRetryCamera(true);
        
        if (onCameraStatusChange) {
          onCameraStatusChange(false);
        }
        
        return;
      }
      
      cameraManagerRef.current = cameraManager;

      const gestureEngine = new GestureEngine();
      await gestureEngine.initialize(videoRef.current);
      gestureEngineRef.current = gestureEngine;
      
      setCameraAvailable(true);
      setFallbackMode(false);
      setCameraError(null);
      setShowSimulator(false);
      setSimulatorActive(false);
      
      if (onCameraStatusChange) {
        onCameraStatusChange(true);
      }
      
      console.log('摄像头重试成功');
    } catch (error) {
      console.error('摄像头重试错误:', error);
      setCameraAvailable(false);
      setCanRetryCamera(true);
      
      if (onCameraStatusChange) {
        onCameraStatusChange(false);
      }
    }
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
      
      {/* 手势模拟器 */}
      {enableFallbackMode && (
        <GestureSimulator
          visible={showSimulator}
          currentShape={currentShape}
          onShapeChange={handleSimulatorShapeChange}
          onRotationChange={handleSimulatorRotationChange}
          onScaleChange={handleSimulatorScaleChange}
          onClose={handleSimulatorClose}
        />
      )}
      
      {/* 模拟器控制按钮 */}
      {enableFallbackMode && showSimulatorButton && !showSimulator && (
        <button
          onClick={handleShowSimulator}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '12px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000
          }}
        >
          🎮 显示手势模拟器
        </button>
      )}
      
      {/* 摄像头错误提示和重试按钮 */}
      {fallbackMode && cameraError && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            backgroundColor: 'rgba(255, 200, 0, 0.9)',
            borderRadius: '8px',
            color: '#000',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span>⚠️ {cameraError}</span>
          {canRetryCamera && (
            <button
              onClick={handleRetryCamera}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ParticleCanvas;
