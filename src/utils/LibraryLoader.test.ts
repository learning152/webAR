import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LibraryLoader } from './LibraryLoader';

describe('LibraryLoader', () => {
  let loader: LibraryLoader;

  beforeEach(() => {
    loader = new LibraryLoader();
    
    // 清理之前的脚本标签
    document.querySelectorAll('script').forEach(script => {
      if (script.src.includes('unpkg.com')) {
        script.remove();
      }
    });
    
    // 清理全局对象
    delete (window as any).THREE;
    delete (window as any).Hands;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('成功加载场景', () => {
    it('should successfully load Three.js when script loads correctly', async () => {
      // 模拟 Three.js 加载成功
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          // 模拟脚本加载成功
          setTimeout(() => {
            (window as any).THREE = { version: '0.150.0' };
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadThreeJS();

      expect(result.success).toBe(true);
      expect(result.library).toBe('Three.js');
      expect(result.error).toBeUndefined();
      expect((window as any).THREE).toBeDefined();
    });

    it('should successfully load MediaPipe Hands when scripts load correctly', async () => {
      // 模拟 MediaPipe Hands 加载成功
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            // 模拟两个脚本都加载成功
            (window as any).Hands = { version: '0.4' };
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadMediaPipeHands();

      expect(result.success).toBe(true);
      expect(result.library).toBe('MediaPipe Hands');
      expect(result.error).toBeUndefined();
      expect((window as any).Hands).toBeDefined();
    });

    it('should load all libraries successfully', async () => {
      // 模拟所有库加载成功
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            const src = (element as HTMLScriptElement).src;
            if (src.includes('three')) {
              (window as any).THREE = { version: '0.150.0' };
            } else if (src.includes('hands') || src.includes('camera_utils')) {
              (window as any).Hands = { version: '0.4' };
            }
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      const results = await loader.loadAllLibraries();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].library).toBe('Three.js');
      expect(results[1].success).toBe(true);
      expect(results[1].library).toBe('MediaPipe Hands');
    });
  });

  describe('加载失败错误处理', () => {
    it('should handle Three.js script loading failure', async () => {
      // 模拟脚本加载失败
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            element.dispatchEvent(new Event('error'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadThreeJS();

      expect(result.success).toBe(false);
      expect(result.library).toBe('Three.js');
      expect(result.error).toContain('脚本加载失败');
    });

    it('should handle MediaPipe Hands script loading failure', async () => {
      // 模拟脚本加载失败
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            element.dispatchEvent(new Event('error'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadMediaPipeHands();

      expect(result.success).toBe(false);
      expect(result.library).toBe('MediaPipe Hands');
      expect(result.error).toContain('脚本加载失败');
    });

    it('should return error message for network failures', async () => {
      const result = {
        success: false,
        library: 'Three.js' as const,
        error: '脚本加载失败: https://unpkg.com/three@0.150.0/build/three.min.js'
      };

      const errorMessage = LibraryLoader.getErrorMessage(result);

      expect(errorMessage).toContain('无法加载 Three.js');
      expect(errorMessage).toContain('请检查网络连接或刷新页面重试');
    });
  });

  describe('库验证逻辑', () => {
    it('should fail validation when Three.js is not in global scope', async () => {
      // 模拟脚本加载但库未注册到全局
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            // 不设置 window.THREE
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadThreeJS();

      expect(result.success).toBe(false);
      expect(result.error).toContain('未在全局作用域中找到');
    });

    it('should fail validation when MediaPipe Hands is not in global scope', async () => {
      // 模拟脚本加载但库未注册到全局
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          setTimeout(() => {
            // 不设置 window.Hands
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      const result = await loader.loadMediaPipeHands();

      expect(result.success).toBe(false);
      expect(result.error).toContain('未在全局作用域中找到');
    });

    it('should correctly check if all libraries are loaded', () => {
      // 初始状态：未加载
      expect(loader.areAllLibrariesLoaded()).toBe(false);

      // 只加载 Three.js
      (window as any).THREE = { version: '0.150.0' };
      expect(loader.areAllLibrariesLoaded()).toBe(false);

      // 加载 MediaPipe Hands
      (window as any).Hands = { version: '0.4' };
      expect(loader.areAllLibrariesLoaded()).toBe(true);
    });

    it('should not reload scripts that are already loaded', async () => {
      // 第一次加载
      const originalCreateElement = document.createElement.bind(document);
      let scriptCreationCount = 0;
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'script') {
          scriptCreationCount++;
          setTimeout(() => {
            (window as any).THREE = { version: '0.150.0' };
            element.dispatchEvent(new Event('load'));
          }, 0);
        }
        return element;
      });

      await loader.loadThreeJS();
      const firstCount = scriptCreationCount;

      // 第二次加载（应该跳过）
      await loader.loadThreeJS();
      const secondCount = scriptCreationCount;

      expect(secondCount).toBe(firstCount); // 没有创建新的脚本标签
    });

    it('should provide user-friendly error messages', () => {
      const networkError = {
        success: false,
        library: 'Three.js' as const,
        error: '脚本加载失败: https://unpkg.com/three'
      };

      const validationError = {
        success: false,
        library: 'MediaPipe Hands' as const,
        error: 'MediaPipe Hands 加载失败：库未在全局作用域中找到'
      };

      const genericError = {
        success: false,
        library: 'Three.js' as const,
        error: '未知错误'
      };

      expect(LibraryLoader.getErrorMessage(networkError)).toContain('请检查网络连接');
      expect(LibraryLoader.getErrorMessage(validationError)).toContain('库文件可能已损坏');
      expect(LibraryLoader.getErrorMessage(genericError)).toContain('未知错误');
    });
  });
});
