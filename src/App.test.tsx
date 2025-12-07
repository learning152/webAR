import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('WebAR 粒子互动系统')).toBeInTheDocument();
  });

  it('should render initialization message', () => {
    render(<App />);
    expect(screen.getByText('项目初始化完成')).toBeInTheDocument();
  });
});
