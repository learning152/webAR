/**
 * LibraryLoader - 动态加载外部库的工具类
 * 支持从 unpkg CDN 加载 Three.js 和 MediaPipe Hands
 */

export type LibraryName = 'Three.js' | 'MediaPipe Hands';

export interface LoadResult {
  success: boolean;
  library: LibraryName;
  error?: string;
}

export class LibraryLoader {
  private loadedScripts: Set<string> = new Set();

  /**
   * 加载 Three.js 库
   */
  async loadThreeJS(): Promise<LoadResult> {
    const url = 'https://unpkg.com/three@0.150.0/build/three.min.js';
    
    try {
      await this.loadScript(url);
      
      // 验证 Three.js 是否成功加载
      if (typeof (window as any).THREE === 'undefined') {
        throw new Error('Three.js 加载失败：库未在全局作用域中找到');
      }
      
      return {
        success: true,
        library: 'Three.js'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        library: 'Three.js',
        error: errorMessage
      };
    }
  }

  /**
   * 加载 MediaPipe Hands 库
   */
  async loadMediaPipeHands(): Promise<LoadResult> {
    const handsUrl = 'https://unpkg.com/@mediapipe/hands@0.4.1646424915/hands.js';
    const cameraUtilsUrl = 'https://unpkg.com/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';
    
    try {
      // 先加载 camera_utils（依赖）
      await this.loadScript(cameraUtilsUrl);
      
      // 再加载 hands
      await this.loadScript(handsUrl);
      
      // 验证 MediaPipe Hands 是否成功加载
      if (typeof (window as any).Hands === 'undefined') {
        throw new Error('MediaPipe Hands 加载失败：库未在全局作用域中找到');
      }
      
      return {
        success: true,
        library: 'MediaPipe Hands'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        library: 'MediaPipe Hands',
        error: errorMessage
      };
    }
  }

  /**
   * 加载所有必需的库
   */
  async loadAllLibraries(): Promise<LoadResult[]> {
    const results: LoadResult[] = [];
    
    // 加载 Three.js
    const threeResult = await this.loadThreeJS();
    results.push(threeResult);
    
    // 加载 MediaPipe Hands
    const mediaPipeResult = await this.loadMediaPipeHands();
    results.push(mediaPipeResult);
    
    return results;
  }

  /**
   * 检查所有库是否已加载
   */
  areAllLibrariesLoaded(): boolean {
    const hasThree = typeof (window as any).THREE !== 'undefined';
    const hasMediaPipe = typeof (window as any).Hands !== 'undefined';
    return hasThree && hasMediaPipe;
  }

  /**
   * 动态加载脚本的核心方法
   */
  private loadScript(url: string): Promise<void> {
    // 如果已经加载过，直接返回
    if (this.loadedScripts.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // 检查脚本是否已经存在于 DOM 中
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        this.loadedScripts.add(url);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = () => {
        this.loadedScripts.add(url);
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`脚本加载失败: ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * 获取用户友好的错误消息
   */
  static getErrorMessage(result: LoadResult): string {
    if (result.success) {
      return '';
    }

    const baseMessage = `无法加载 ${result.library}`;
    
    if (result.error?.includes('脚本加载失败')) {
      return `${baseMessage}，请检查网络连接或刷新页面重试`;
    }
    
    if (result.error?.includes('未在全局作用域中找到')) {
      return `${baseMessage}，库文件可能已损坏，请刷新页面重试`;
    }
    
    return `${baseMessage}: ${result.error}`;
  }
}
