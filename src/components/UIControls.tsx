/**
 * UIControls - UI 控制层组件
 * 显示当前手势状态、FPS、调试信息和粒子数量调整滑块
 */

import { useState, useEffect } from 'react';
import { GestureType } from '../engines/GestureEngine';
import type { HandData } from '../engines/GestureEngine';
import './UIControls.css';

/**
 * UIControls 组件属性
 */
export interface UIControlsProps {
  currentGesture: GestureType;
  handData: HandData | null;
  fps: number;
  particleCount: number;
  onParticleCountChange?: (count: number) => void;
  showDebugInfo?: boolean;
}

/**
 * 手势类型到中文名称的映射
 */
const GESTURE_NAMES: Record<GestureType, string> = {
  [GestureType.OPEN_HAND]: '张手 (行星)',
  [GestureType.SCISSORS]: '剪刀手 (文字)',
  [GestureType.FIST]: '握拳 (圆环)',
  [GestureType.POINT]: '食指 (星形)',
  [GestureType.THUMBS_UP]: '竖大拇指 (爱心)',
  [GestureType.FINGER_HEART]: '手指比心 (一箭穿心)',
  [GestureType.NONE]: '未检测到手势'
};

/**
 * 手势类型到图标的映射
 */
const GESTURE_ICONS: Record<GestureType, string> = {
  [GestureType.OPEN_HAND]: '🖐️',
  [GestureType.SCISSORS]: '✌️',
  [GestureType.FIST]: '✊',
  [GestureType.POINT]: '☝️',
  [GestureType.THUMBS_UP]: '👍',
  [GestureType.FINGER_HEART]: '🫰',
  [GestureType.NONE]: '❓'
};

/**
 * UIControls 组件
 */
export const UIControls: React.FC<UIControlsProps> = ({
  currentGesture,
  handData,
  fps,
  particleCount,
  onParticleCountChange,
  showDebugInfo = false
}) => {
  const [localParticleCount, setLocalParticleCount] = useState(particleCount);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  // 同步外部 particleCount 变化
  useEffect(() => {
    setLocalParticleCount(particleCount);
  }, [particleCount]);

  /**
   * 处理粒子数量滑块变化
   */
  const handleParticleCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = parseInt(event.target.value, 10);
    setLocalParticleCount(newCount);
  };

  /**
   * 处理粒子数量滑块释放（应用变化）
   */
  const handleParticleCountApply = () => {
    if (onParticleCountChange) {
      onParticleCountChange(localParticleCount);
    }
  };

  /**
   * 获取 FPS 颜色（根据性能）
   */
  const getFpsColor = (): string => {
    if (fps >= 50) return '#4ade80'; // 绿色 - 良好
    if (fps >= 30) return '#fbbf24'; // 黄色 - 一般
    return '#f87171'; // 红色 - 差
  };

  /**
   * 格式化向量显示
   */
  const formatVector = (v: { x: number; y: number; z: number } | null): string => {
    if (!v) return 'N/A';
    return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
  };

  /**
   * 格式化数字显示
   */
  const formatNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return 'N/A';
    return n.toFixed(3);
  };

  return (
    <div className="ui-controls">
      {/* FPS 显示 */}
      <div className="ui-panel fps-panel">
        <div className="fps-display" style={{ color: getFpsColor() }}>
          <span className="fps-label">FPS:</span>
          <span className="fps-value">{fps}</span>
        </div>
      </div>

      {/* 手势状态显示 */}
      <div className="ui-panel gesture-panel">
        <div className="gesture-display">
          <div className="gesture-icon">{GESTURE_ICONS[currentGesture]}</div>
          <div className="gesture-info">
            <div className="gesture-label">当前手势</div>
            <div className="gesture-name">{GESTURE_NAMES[currentGesture]}</div>
          </div>
        </div>
        {handData && (
          <div className="hand-status">
            <div className="status-indicator active"></div>
            <span>手部已检测</span>
          </div>
        )}
        {!handData && (
          <div className="hand-status">
            <div className="status-indicator inactive"></div>
            <span>未检测到手部</span>
          </div>
        )}
      </div>

      {/* 粒子数量调整 */}
      <div className="ui-panel particle-control-panel">
        <div className="control-header">
          <span className="control-label">粒子数量</span>
          <span className="control-value">{localParticleCount.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="1000"
          max="32000"
          step="1000"
          value={localParticleCount}
          onChange={handleParticleCountChange}
          onMouseUp={handleParticleCountApply}
          onTouchEnd={handleParticleCountApply}
          className="particle-slider"
        />
        <div className="slider-labels">
          <span>1K</span>
          <span>16K</span>
          <span>32K</span>
        </div>
      </div>

      {/* 调试信息 */}
      {showDebugInfo && (
        <div className="ui-panel debug-panel">
          <div
            className="debug-header"
            onClick={() => setIsDebugExpanded(!isDebugExpanded)}
          >
            <span className="debug-label">调试信息</span>
            <span className="debug-toggle">{isDebugExpanded ? '▼' : '▶'}</span>
          </div>
          {isDebugExpanded && handData && (
            <div className="debug-content">
              <div className="debug-item">
                <span className="debug-key">手部中心:</span>
                <span className="debug-value">{formatVector(handData.center)}</span>
              </div>
              <div className="debug-item">
                <span className="debug-key">手部速度:</span>
                <span className="debug-value">{formatVector(handData.velocity)}</span>
              </div>
              <div className="debug-item">
                <span className="debug-key">速度大小:</span>
                <span className="debug-value">
                  {formatNumber(
                    handData.velocity
                      ? Math.sqrt(
                          handData.velocity.x ** 2 +
                            handData.velocity.y ** 2 +
                            handData.velocity.z ** 2
                        )
                      : 0
                  )}
                </span>
              </div>
              <div className="debug-item">
                <span className="debug-key">画面占比:</span>
                <span className="debug-value">
                  {formatNumber(handData.areaRatio)} ({(handData.areaRatio * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="debug-item">
                <span className="debug-key">旋转角度:</span>
                <span className="debug-value">{formatVector(handData.rotation)}</span>
              </div>
              <div className="debug-item">
                <span className="debug-key">关键点数量:</span>
                <span className="debug-value">{handData.landmarks.length}</span>
              </div>
            </div>
          )}
          {isDebugExpanded && !handData && (
            <div className="debug-content">
              <div className="debug-empty">无手部数据</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UIControls;
