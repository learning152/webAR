/**
 * ThreeEngine - Three.js 渲染引擎
 * 负责初始化和管理 Three.js 场景、相机、渲染器和粒子系统
 */

// 声明全局 THREE 对象（从 unpkg CDN 加载）
declare global {
  interface Window {
    THREE: any;
  }
}

export class ThreeEngine {
  private scene: any = null;
  private camera: any = null;
  private renderer: any = null;
  private geometry: any = null;
  private material: any = null;
  private points: any = null;
  private container: HTMLElement | null = null;
  private animationId: number | null = null;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  /**
   * 初始化 Three.js 场景
   * @param container - 渲染容器 DOM 元素
   * @param particleCount - 粒子数量（默认 16000）
   */
  public initialize(container: HTMLElement, particleCount: number = 16000): void {
    if (!window.THREE) {
      throw new Error('Three.js 未加载，请先加载 Three.js 库');
    }

    this.container = container;
    const THREE = window.THREE;

    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a); // Slightly lighter than pure black for contrast

    // 创建相机 (optimized for better view)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      70, // FOV (reduced from 75 for less distortion)
      width / height, // 宽高比
      0.1, // 近裁剪面
      1000 // 远裁剪面
    );
    this.camera.position.z = 6; // Increased from 5 for better view

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // 创建粒子几何体
    this.geometry = new THREE.BufferGeometry();

    // 初始化位置、颜色和大小数组
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // 初始化粒子位置、颜色（青色）和大小（5种不同大小）
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      // 随机初始位置
      positions[idx] = (Math.random() - 0.5) * 2;
      positions[idx + 1] = (Math.random() - 0.5) * 2;
      positions[idx + 2] = (Math.random() - 0.5) * 2;
      
      // 青色 (0, 1, 1)
      colors[idx] = 0;
      colors[idx + 1] = 1;
      colors[idx + 2] = 1;
      
      // 5种不同大小的粒子，增加视觉多样性
      const sizeType = i % 5;
      const baseSizes = [0.04, 0.06, 0.08, 0.05, 0.07];
      sizes[i] = baseSizes[sizeType] * (0.8 + Math.random() * 0.4);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 创建自定义着色器材质支持不同大小的粒子
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        pointMultiplier: { value: window.devicePixelRatio * 100 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // 创建圆形粒子
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // 添加发光效果
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    // 创建粒子系统
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    // 监听 WebGL 上下文丢失和恢复事件
    this.setupContextHandlers();
  }

  /**
   * 设置 WebGL 上下文丢失和恢复的事件处理器
   */
  private setupContextHandlers(): void {
    if (!this.renderer || !this.renderer.domElement) return;

    this.contextLostHandler = (event: Event) => {
      event.preventDefault();
      console.error('WebGL 上下文丢失');
      
      // 停止渲染循环
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    };

    this.contextRestoredHandler = () => {
      console.log('WebGL 上下文恢复');
      // 上下文恢复后，Three.js 会自动重新初始化资源
    };

    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.contextRestoredHandler);
  }

  /**
   * 渲染场景
   */
  public render(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      console.warn('ThreeEngine 未初始化，无法渲染');
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 更新粒子位置
   * @param positions - 新的位置数据 Float32Array
   */
  public updatePositions(positions: Float32Array): void {
    if (!this.geometry) {
      console.warn('几何体未初始化');
      return;
    }

    const positionAttribute = this.geometry.attributes.position;
    positionAttribute.array = positions;
    positionAttribute.needsUpdate = true;
  }

  /**
   * 更新粒子颜色
   * @param colors - 新的颜色数据 Float32Array
   */
  public updateColors(colors: Float32Array): void {
    if (!this.geometry) {
      console.warn('几何体未初始化');
      return;
    }

    const colorAttribute = this.geometry.attributes.color;
    colorAttribute.array = colors;
    colorAttribute.needsUpdate = true;
  }

  /**
   * 更新粒子大小
   * @param sizes - 新的大小数据 Float32Array
   */
  public updateSizes(sizes: Float32Array): void {
    if (!this.geometry) {
      console.warn('几何体未初始化');
      return;
    }

    const sizeAttribute = this.geometry.attributes.size;
    if (sizeAttribute) {
      sizeAttribute.array = sizes;
      sizeAttribute.needsUpdate = true;
    }
  }

  /**
   * 处理窗口大小变化
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  public resize(width: number, height: number): void {
    if (!this.camera || !this.renderer) {
      console.warn('相机或渲染器未初始化');
      return;
    }

    // 更新相机宽高比
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // 更新渲染器大小
    this.renderer.setSize(width, height);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 移除事件监听器
    if (this.renderer && this.renderer.domElement) {
      if (this.contextLostHandler) {
        this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
      }
      if (this.contextRestoredHandler) {
        this.renderer.domElement.removeEventListener('webglcontextrestored', this.contextRestoredHandler);
      }
    }

    // 停止动画循环
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // 清理几何体
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    // 清理材质
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    // 清理渲染器
    if (this.renderer) {
      // 从 DOM 中移除 canvas
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
      
      this.renderer.dispose();
      this.renderer = null;
    }

    // 清理场景
    if (this.scene) {
      // 移除所有对象
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }

    this.camera = null;
    this.points = null;
    this.container = null;
    this.contextLostHandler = null;
    this.contextRestoredHandler = null;
  }

  /**
   * 获取场景对象（用于测试）
   */
  public getScene(): any {
    return this.scene;
  }

  /**
   * 获取相机对象（用于测试）
   */
  public getCamera(): any {
    return this.camera;
  }

  /**
   * 获取渲染器对象（用于测试）
   */
  public getRenderer(): any {
    return this.renderer;
  }

  /**
   * 获取粒子几何体（用于测试）
   */
  public getGeometry(): any {
    return this.geometry;
  }

  /**
   * 获取粒子材质（用于测试）
   */
  public getMaterial(): any {
    return this.material;
  }

  /**
   * 获取粒子系统对象（用于测试）
   */
  public getPoints(): any {
    return this.points;
  }

  /**
   * 设置场景旋转
   * @param rotation - 旋转角度 { x, y, z } (弧度)
   */
  public setSceneRotation(rotation: { x: number; y: number; z: number }): void {
    if (!this.points) {
      console.warn('粒子系统未初始化');
      return;
    }

    this.points.rotation.x = rotation.x;
    this.points.rotation.y = rotation.y;
    this.points.rotation.z = rotation.z;
  }

  /**
   * 增量旋转场景
   * @param delta - 旋转增量 { x, y, z } (弧度)
   */
  public addSceneRotation(delta: { x: number; y: number; z: number }): void {
    if (!this.points) {
      console.warn('粒子系统未初始化');
      return;
    }

    this.points.rotation.x += delta.x;
    this.points.rotation.y += delta.y;
    this.points.rotation.z += delta.z;
  }

  /**
   * 获取当前场景旋转
   * @returns 当前旋转角度 { x, y, z } (弧度)
   */
  public getSceneRotation(): { x: number; y: number; z: number } {
    if (!this.points) {
      console.warn('粒子系统未初始化');
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: this.points.rotation.x,
      y: this.points.rotation.y,
      z: this.points.rotation.z
    };
  }

  /**
   * 设置场景缩放
   * @param scale - 缩放比例 (0.1 到 10.0)
   */
  public setSceneScale(scale: number): void {
    if (!this.points) {
      console.warn('粒子系统未初始化');
      return;
    }

    // 限制缩放范围在 0.1 到 10.0 之间，支持更大的缩放效果
    const clampedScale = Math.max(0.1, Math.min(10.0, scale));

    this.points.scale.set(clampedScale, clampedScale, clampedScale);
  }

  /**
   * 获取当前场景缩放
   * @returns 当前缩放比例
   */
  public getSceneScale(): number {
    if (!this.points) {
      console.warn('粒子系统未初始化');
      return 1.0;
    }

    // 返回 x 轴的缩放值（假设 xyz 缩放相同）
    return this.points.scale.x;
  }
}
