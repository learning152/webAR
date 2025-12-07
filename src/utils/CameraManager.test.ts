import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CameraManager, CameraResult } from './CameraManager';

// Mock MediaStream and related APIs
const createMockMediaStream = () => {
  const mockTrack = {
    stop: vi.fn(),
    readyState: 'live' as MediaStreamTrackState,
    getSettings: vi.fn().mockReturnValue({ width: 1280, height: 720 })
  };
  
  return {
    getTracks: vi.fn().mockReturnValue([mockTrack]),
    getVideoTracks: vi.fn().mockReturnValue([mockTrack])
  } as unknown as MediaStream;
};

describe('CameraManager', () => {
  let cameraManager: CameraManager;
  let originalMediaDevices: MediaDevices;

  beforeEach(() => {
    cameraManager = new CameraManager();
    originalMediaDevices = navigator.mediaDevices;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true
    });
  });

  describe('requestCamera - 成功场景', () => {
    it('should successfully request camera with default config (1280x720)', async () => {
      const mockStream = createMockMediaStream();
      
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(true);
      expect(result.stream).toBe(mockStream);
      expect(result.error).toBeUndefined();
      
      // Verify correct constraints were passed
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
    });

    it('should use custom config when provided', async () => {
      const customManager = new CameraManager({
        width: 1920,
        height: 1080,
        facingMode: 'environment'
      });
      
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await customManager.requestCamera();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      });
    });
  });

  describe('requestCamera - 错误处理', () => {
    it('should handle permission denied error', async () => {
      const mockError = new DOMException('Permission denied', 'NotAllowedError');
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('permission_denied');
      expect(result.errorMessage).toContain('需要摄像头权限');
    });

    it('should handle device not found error', async () => {
      const mockError = new DOMException('No device found', 'NotFoundError');
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('device_not_found');
      expect(result.errorMessage).toContain('未检测到摄像头设备');
    });

    it('should handle overconstrained error', async () => {
      const mockError = new DOMException('Constraints not satisfied', 'OverconstrainedError');
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('overconstrained');
      expect(result.errorMessage).toContain('不支持请求的分辨率');
    });

    it('should handle not readable error (camera in use)', async () => {
      const mockError = new DOMException('Could not start video source', 'NotReadableError');
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('not_readable');
      expect(result.errorMessage).toContain('被其他应用占用');
    });

    it('should handle unknown errors', async () => {
      const mockError = new DOMException('Unknown error', 'SomeUnknownError');
      const mockGetUserMedia = vi.fn().mockRejectedValue(mockError);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      const result = await cameraManager.requestCamera();

      expect(result.success).toBe(false);
      expect(result.error).toBe('unknown');
    });
  });

  describe('stream management', () => {
    it('should return null stream when not initialized', () => {
      expect(cameraManager.getStream()).toBeNull();
    });

    it('should return stream after successful request', async () => {
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await cameraManager.requestCamera();

      expect(cameraManager.getStream()).toBe(mockStream);
    });

    it('should stop all tracks when stop is called', async () => {
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await cameraManager.requestCamera();
      cameraManager.stop();

      const tracks = mockStream.getTracks();
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
      });
      expect(cameraManager.getStream()).toBeNull();
    });
  });

  describe('isActive', () => {
    it('should return false when no stream', () => {
      expect(cameraManager.isActive()).toBe(false);
    });

    it('should return true when stream is live', async () => {
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await cameraManager.requestCamera();

      expect(cameraManager.isActive()).toBe(true);
    });
  });

  describe('getActualResolution', () => {
    it('should return null when no stream', () => {
      expect(cameraManager.getActualResolution()).toBeNull();
    });

    it('should return actual resolution from video track', async () => {
      const mockStream = createMockMediaStream();
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await cameraManager.requestCamera();
      const resolution = cameraManager.getActualResolution();

      expect(resolution).toEqual({ width: 1280, height: 720 });
    });
  });

  describe('getErrorMessage', () => {
    it('should return empty string for successful result', () => {
      const result: CameraResult = { success: true };
      expect(CameraManager.getErrorMessage(result)).toBe('');
    });

    it('should return error message for failed result', () => {
      const result: CameraResult = {
        success: false,
        error: 'permission_denied',
        errorMessage: '需要摄像头权限才能使用手势交互功能'
      };
      expect(CameraManager.getErrorMessage(result)).toBe('需要摄像头权限才能使用手势交互功能');
    });

    it('should return default message when errorMessage is missing', () => {
      const result: CameraResult = {
        success: false,
        error: 'unknown'
      };
      expect(CameraManager.getErrorMessage(result)).toBe('摄像头访问失败');
    });
  });
});
