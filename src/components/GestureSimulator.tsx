/**
 * GestureSimulator - 手势模拟器组件
 * 在无摄像头情况下提供手动控制粒子形态的 UI 面板
 */

import React, { useEffect, useRef, useState } from 'react';
import { ShapeType } from '../shapes/ShapeGenerator';
import { getAllShapeTypes, getShapeConfig } from '../config/shapeConfig';
import './GestureSimulator.css';

/**
 * 欧拉角接口，用于表示旋转
 */
export interface Euler {
  x: number;  // 绕 X 轴旋转（弧度）
  y: number;  // 绕 Y 轴旋转（弧度）
  z: number;  // 绕 Z 轴旋转（弧度）
}

/**
 * GestureSimulator 组件属性
 */
export interface GestureSimulatorProps {
  visible: boolean;                          // 是否显示面板
  currentShape: ShapeType;                   // 当前形态
  onShapeChange: (shape: ShapeType) => void; // 形态变化回调
  onRotationChange: (rotation: Euler) => void; // 旋转变化回调
  onScaleChange: (scale: number) => void;    // 缩放变化回调
  onClose?: () => void;                      // 关闭面板回调
}

/**
 * GestureSimulator 组件
 * 提供形态切换、旋转控制和缩放控制功能
 */
export const GestureSimulator: React.FC<GestureSimulatorProps> = ({
  visible,
  currentShape,
  onShapeChange,
  onRotationChange,
  onScaleChange,
  onClose
}) => {
  // Track pressed keys for combination support
  const pressedKeys = useRef<Set<string>>(new Set());
  
  // Rotation speed (radians per key press)
  const ROTATION_SPEED = 0.05;

  // Scale state (slider value 0-100, maps to scale 0.5-2.0)
  const [sliderValue, setSliderValue] = useState(50); // 50 = scale 1.0 (middle)
  
  // Scale bounds
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.0;

  // Map slider value (0-100) to scale (0.5-2.0)
  const sliderToScale = (value: number): number => {
    return MIN_SCALE + (value / 100) * (MAX_SCALE - MIN_SCALE);
  };

  // Handle scale slider change
  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
    
    const scale = sliderToScale(value);
    onScaleChange(scale);
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    // Handle keyboard events for rotation control
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent keyboard events when focus is on input elements
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Check if it's an arrow key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        
        // Add key to pressed keys set
        pressedKeys.current.add(event.key);
        
        // Calculate rotation delta based on all pressed keys
        const delta: Euler = { x: 0, y: 0, z: 0 };
        
        if (pressedKeys.current.has('ArrowUp')) {
          delta.x += ROTATION_SPEED; // Rotate up around X axis
        }
        if (pressedKeys.current.has('ArrowDown')) {
          delta.x -= ROTATION_SPEED; // Rotate down around X axis
        }
        if (pressedKeys.current.has('ArrowLeft')) {
          delta.y += ROTATION_SPEED; // Rotate left around Y axis
        }
        if (pressedKeys.current.has('ArrowRight')) {
          delta.y -= ROTATION_SPEED; // Rotate right around Y axis
        }
        
        // Apply rotation
        onRotationChange(delta);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Remove key from pressed keys set
      pressedKeys.current.delete(event.key);
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      pressedKeys.current.clear();
    };
  }, [visible, onRotationChange]);

  if (!visible) {
    return null;
  }

  // 获取所有形态类型
  const allShapeTypes = getAllShapeTypes();

  // 处理形态按钮点击
  const handleShapeClick = (shapeType: ShapeType) => {
    onShapeChange(shapeType);
  };

  return (
    <div className="gesture-simulator">
      <div className="gesture-simulator-header">
        <h3>手势模拟器</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        )}
      </div>
      
      <div className="gesture-simulator-content">
        <div className="section">
          <h4>形态选择</h4>
          <div className="shape-buttons">
            {allShapeTypes.map((shapeType) => {
              const config = getShapeConfig(shapeType);
              const isActive = shapeType === currentShape;
              
              return (
                <button
                  key={shapeType}
                  className={`shape-button ${isActive ? 'active' : ''}`}
                  onClick={() => handleShapeClick(shapeType)}
                  title={`${config.label} - ${config.gesture}`}
                >
                  <span className="shape-icon">{config.icon}</span>
                  <span className="shape-label">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="section">
          <h4>旋转控制</h4>
          <div className="keyboard-hint">
            <div className="hint-text">使用方向键旋转粒子</div>
            <div className="arrow-keys">
              <div className="arrow-row">
                <div className="arrow-key">↑</div>
              </div>
              <div className="arrow-row">
                <div className="arrow-key">←</div>
                <div className="arrow-key">↓</div>
                <div className="arrow-key">→</div>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h4>缩放控制</h4>
          <div className="scale-control">
            <div className="scale-labels">
              <span className="scale-label">小</span>
              <span className="scale-value">{sliderToScale(sliderValue).toFixed(2)}x</span>
              <span className="scale-label">大</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleScaleChange}
              className="scale-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
