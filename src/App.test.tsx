import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { LibraryLoader } from './utils/LibraryLoader';

// Mock LibraryLoader
vi.mock('./utils/LibraryLoader');

// Mock ParticleCanvas component
vi.mock('./components/ParticleCanvas', () => ({
  default: () => <div data-testid="particle-canvas">ParticleCanvas Component</div>
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('加载状态管理', () => {
    it('should show loading state initially', () => {
      // Mock loadAllLibraries to never resolve
      const mockLoadAllLibraries = vi.fn(() => new Promise(() => {}));
      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      // Should show loading UI
      expect(screen.getByText('正在加载...')).toBeInTheDocument();
      expect(screen.getByText('正在加载 Three.js 和 MediaPipe Hands 库')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should show loaded state when libraries load successfully', async () => {
      // Mock successful library loading
      const mockLoadAllLibraries = vi.fn(() => Promise.resolve([
        { success: true, library: 'Three.js' as const },
        { success: true, library: 'MediaPipe Hands' as const }
      ]));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('particle-canvas')).toBeInTheDocument();
      });

      // Should not show loading UI anymore
      expect(screen.queryByText('正在加载...')).not.toBeInTheDocument();
    });

    it('should transition from loading to loaded state', async () => {
      const mockLoadAllLibraries = vi.fn(() => Promise.resolve([
        { success: true, library: 'Three.js' as const },
        { success: true, library: 'MediaPipe Hands' as const }
      ]));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      // Initially should show loading
      expect(screen.getByText('正在加载...')).toBeInTheDocument();

      // Wait for transition to loaded state
      await waitFor(() => {
        expect(screen.getByTestId('particle-canvas')).toBeInTheDocument();
      });

      expect(mockLoadAllLibraries).toHaveBeenCalledTimes(1);
    });
  });

  describe('错误处理 UI', () => {
    it('should show error UI when library loading fails', async () => {
      // Mock failed library loading
      const mockLoadAllLibraries = vi.fn(() => Promise.resolve([
        { success: false, library: 'Three.js' as const, error: '脚本加载失败: https://unpkg.com/three' }
      ]));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      // Mock static method
      vi.spyOn(LibraryLoader, 'getErrorMessage').mockReturnValue(
        '无法加载 Three.js，请检查网络连接或刷新页面重试'
      );

      render(<App />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText('无法加载 Three.js，请检查网络连接或刷新页面重试')).toBeInTheDocument();
      
      // Should show retry button
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });

    it('should show error details with load results', async () => {
      const mockLoadAllLibraries = vi.fn(() => Promise.resolve([
        { success: true, library: 'Three.js' as const },
        { success: false, library: 'MediaPipe Hands' as const, error: '网络错误' }
      ]));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      vi.spyOn(LibraryLoader, 'getErrorMessage').mockReturnValue(
        '无法加载 MediaPipe Hands: 网络错误'
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });

      // Should show load results
      expect(screen.getByText('加载结果:')).toBeInTheDocument();
      expect(screen.getByText('Three.js')).toBeInTheDocument();
      expect(screen.getByText('MediaPipe Hands')).toBeInTheDocument();
    });

    it('should retry loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails, second call succeeds
      const mockLoadAllLibraries = vi.fn()
        .mockResolvedValueOnce([
          { success: false, library: 'Three.js' as const, error: '网络错误' }
        ])
        .mockResolvedValueOnce([
          { success: true, library: 'Three.js' as const },
          { success: true, library: 'MediaPipe Hands' as const }
        ]);

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      vi.spyOn(LibraryLoader, 'getErrorMessage').mockReturnValue('无法加载 Three.js');

      render(<App />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: '重试' });
      await user.click(retryButton);

      // Wait for successful load (may skip loading state if fast)
      await waitFor(() => {
        expect(screen.getByTestId('particle-canvas')).toBeInTheDocument();
      });

      // Verify loadAllLibraries was called twice (initial + retry)
      expect(mockLoadAllLibraries).toHaveBeenCalledTimes(2);
    });

    it('should handle exception during library loading', async () => {
      const mockLoadAllLibraries = vi.fn(() => Promise.reject(new Error('网络连接失败')));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
      });

      expect(screen.getByText(/库加载失败: 网络连接失败/)).toBeInTheDocument();
    });
  });

  describe('ParticleCanvas 集成', () => {
    it('should render ParticleCanvas when libraries are loaded', async () => {
      const mockLoadAllLibraries = vi.fn(() => Promise.resolve([
        { success: true, library: 'Three.js' as const },
        { success: true, library: 'MediaPipe Hands' as const }
      ]));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('particle-canvas')).toBeInTheDocument();
      });
    });

    it('should call loadAllLibraries on mount', () => {
      const mockLoadAllLibraries = vi.fn(() => new Promise(() => {}));

      vi.mocked(LibraryLoader).mockImplementation(() => ({
        loadAllLibraries: mockLoadAllLibraries,
        loadThreeJS: vi.fn(),
        loadMediaPipeHands: vi.fn(),
        areAllLibrariesLoaded: vi.fn()
      }) as any);

      render(<App />);

      expect(mockLoadAllLibraries).toHaveBeenCalledTimes(1);
    });
  });
});
