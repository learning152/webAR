/**
 * UIControls 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UIControls } from './UIControls';
import { GestureType } from '../engines/GestureEngine';
import type { HandData } from '../engines/GestureEngine';

describe('UIControls', () => {
  const mockHandData: HandData = {
    landmarks: Array(21).fill({ x: 0, y: 0, z: 0 }),
    center: { x: 0.5, y: 0.5, z: 0 },
    velocity: { x: 1.0, y: 0.5, z: 0.2 },
    areaRatio: 0.15,
    rotation: { x: 0.1, y: 0.2, z: 0.3 }
  };

  it('should render FPS display', () => {
    render(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={60}
        particleCount={16000}
      />
    );

    expect(screen.getByText('FPS:')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('should render current gesture status', () => {
    render(
      <UIControls
        currentGesture={GestureType.OPEN_HAND}
        handData={mockHandData}
        fps={60}
        particleCount={16000}
      />
    );

    expect(screen.getByText('当前手势')).toBeInTheDocument();
    expect(screen.getByText('张手 (行星)')).toBeInTheDocument();
  });

  it('should show hand detected status when handData is present', () => {
    render(
      <UIControls
        currentGesture={GestureType.OPEN_HAND}
        handData={mockHandData}
        fps={60}
        particleCount={16000}
      />
    );

    expect(screen.getByText('手部已检测')).toBeInTheDocument();
  });

  it('should show no hand detected status when handData is null', () => {
    render(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={60}
        particleCount={16000}
      />
    );

    expect(screen.getByText('未检测到手部')).toBeInTheDocument();
  });

  it('should render particle count slider', () => {
    render(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={60}
        particleCount={16000}
      />
    );

    expect(screen.getByText('粒子数量')).toBeInTheDocument();
    expect(screen.getByText('16,000')).toBeInTheDocument();
    
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('16000');
  });

  it('should call onParticleCountChange when slider is released', () => {
    const handleChange = vi.fn();
    
    render(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={60}
        particleCount={16000}
        onParticleCountChange={handleChange}
      />
    );

    const slider = screen.getByRole('slider');
    
    // Change slider value
    fireEvent.change(slider, { target: { value: '20000' } });
    
    // Release slider (mouseup)
    fireEvent.mouseUp(slider);
    
    expect(handleChange).toHaveBeenCalledWith(20000);
  });

  it('should render debug info when showDebugInfo is true', () => {
    render(
      <UIControls
        currentGesture={GestureType.OPEN_HAND}
        handData={mockHandData}
        fps={60}
        particleCount={16000}
        showDebugInfo={true}
      />
    );

    expect(screen.getByText('调试信息')).toBeInTheDocument();
  });

  it('should not render debug info when showDebugInfo is false', () => {
    render(
      <UIControls
        currentGesture={GestureType.OPEN_HAND}
        handData={mockHandData}
        fps={60}
        particleCount={16000}
        showDebugInfo={false}
      />
    );

    expect(screen.queryByText('调试信息')).not.toBeInTheDocument();
  });

  it('should expand debug info when clicked', () => {
    render(
      <UIControls
        currentGesture={GestureType.OPEN_HAND}
        handData={mockHandData}
        fps={60}
        particleCount={16000}
        showDebugInfo={true}
      />
    );

    const debugHeader = screen.getByText('调试信息');
    
    // Initially collapsed
    expect(screen.queryByText('手部中心:')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(debugHeader);
    
    // Now expanded
    expect(screen.getByText('手部中心:')).toBeInTheDocument();
    expect(screen.getByText('手部速度:')).toBeInTheDocument();
    expect(screen.getByText('画面占比:')).toBeInTheDocument();
  });

  it('should display correct gesture icons', () => {
    const gestures = [
      { type: GestureType.OPEN_HAND, icon: '🖐️' },
      { type: GestureType.SCISSORS, icon: '✌️' },
      { type: GestureType.FIST, icon: '✊' },
      { type: GestureType.POINT, icon: '☝️' },
      { type: GestureType.THUMBS_UP, icon: '👍' },
      { type: GestureType.FINGER_HEART, icon: '🫰' },
      { type: GestureType.NONE, icon: '❓' }
    ];

    gestures.forEach(({ type, icon }) => {
      const { container } = render(
        <UIControls
          currentGesture={type}
          handData={null}
          fps={60}
          particleCount={16000}
        />
      );

      expect(container.textContent).toContain(icon);
    });
  });

  it('should display FPS with appropriate color based on performance', () => {
    // Good performance (green)
    const { rerender, container } = render(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={60}
        particleCount={16000}
      />
    );

    let fpsDisplay = container.querySelector('.fps-display');
    expect(fpsDisplay).toHaveStyle({ color: '#4ade80' });

    // Medium performance (yellow)
    rerender(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={40}
        particleCount={16000}
      />
    );

    fpsDisplay = container.querySelector('.fps-display');
    expect(fpsDisplay).toHaveStyle({ color: '#fbbf24' });

    // Poor performance (red)
    rerender(
      <UIControls
        currentGesture={GestureType.NONE}
        handData={null}
        fps={20}
        particleCount={16000}
      />
    );

    fpsDisplay = container.querySelector('.fps-display');
    expect(fpsDisplay).toHaveStyle({ color: '#f87171' });
  });
});
