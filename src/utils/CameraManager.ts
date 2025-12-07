/**
 * CameraManager - 摄像头管理器
 * 负责请求摄像头权限、管理视频流和处理相关错误
 */

export type CameraErrorType = 
  | 'permission_denied'
  | 'device_not_found'
  | 'overconstrained'
  | 'not_readable'
  | 'unknown';

export interface CameraResult {
  success: boolean;
  stream?: MediaStream;
  error?: CameraErrorType;
  errorMessage?: string;
}

export interface CameraConfig {
  width: number;
  height: number;
  facingMode?: 'user' | 'environment';
}

const DEFAULT_CONFIG: CameraConfig = {
  width: 1280,
  height: 720,
  facingMode: 'user'
};

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: CameraConfig;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 请求摄像头权限并获取视频流
   * @returns CameraResult 包含成功状态和视频流或错误信息
   */
  async requestCamera(): Promise<CameraResult> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          facingMode: this.config.facingMode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;

      return {
        success: true,
        stream
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 处理摄像头相关错误
   */
  private handleError(error: unknown): CameraResult {
    const err = error as DOMException;
    
    let errorType: CameraErrorType = 'unknown';
    let errorMessage = '摄像头访问失败，请检查设备设置';

    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        errorType = 'permission_denied';
        errorMessage = '需要摄像头权限才能使用手势交互功能';
        break;
      
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        errorType = 'device_not_found';
        errorMessage = '未检测到摄像头设备';
        break;
      
      case 'OverconstrainedError':
        errorType = 'overconstrained';
        errorMessage = '摄像头不支持请求的分辨率，正在尝试其他配置';
        break;
      
      case 'NotReadableError':
      case 'TrackStartError':
        errorType = 'not_readable';
        errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用';
        break;
      
      default:
        errorType = 'unknown';
        errorMessage = err.message || '摄像头访问失败，请检查设备设置';
    }

    console.error(`摄像头错误 [${errorType}]:`, errorMessage);

    return {
      success: false,
      error: errorType,
      errorMessage
    };
  }

  /**
   * 将视频流绑定到 video 元素
   * @param videoElement - HTML video 元素
   */
  async attachToVideoElement(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.stream) {
      console.warn('没有可用的视频流，请先调用 requestCamera()');
      return false;
    }

    try {
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;
      videoElement.playsInline = true;
      
      await videoElement.play();
      return true;
    } catch (error) {
      console.error('视频播放失败:', error);
      return false;
    }
  }

  /**
   * 获取当前视频流
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * 获取视频流的实际分辨率
   */
  getActualResolution(): { width: number; height: number } | null {
    if (!this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0
    };
  }

  /**
   * 检查摄像头是否正在运行
   */
  isActive(): boolean {
    if (!this.stream) {
      return false;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.readyState === 'live' : false;
  }

  /**
   * 停止摄像头并释放资源
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  static getErrorMessage(result: CameraResult): string {
    if (result.success) {
      return '';
    }

    return result.errorMessage || '摄像头访问失败';
  }
}
