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
  private particleCount: number = 0;
  
  // Particle shape geometries (5 types)
  private particleGeometries: any[] = [];
  private instancedMeshes: any[] = [];

  /**
   * 创建5种不同的粒子几何体
   * 0: 球体 (Sphere)
   * 1: 立方体 (Box)
   * 2: 四面体 (Tetrahedron)
   * 3: 八面体 (Octahedron)
   * 4: 圆环 (Torus)
   */
  private createParticleGeometries(): void {
    if (!window.THREE) return;
    
    const THREE = window.THREE;
    const baseSize = 0.05;
    
    // 0: Sphere
    this.particleGeometries[0] = new THREE.SphereGeometry(baseSize, 8, 8);
    
    // 1: Box
    this.particleGeometries[1] = new THREE.BoxGeometry(baseSize * 1.5, baseSize * 1.5, baseSize * 1.5);
    
    // 2: Tetrahedron
    this.particleGeometries[2] = new THREE.TetrahedronGeometry(baseSize * 1.2);
    
    // 3: Octahedron
    this.particleGeometries[3] = new THREE.OctahedronGeometry(baseSize * 1.2);
    
    // 4: Torus (small ring)
    this.particleGeometries[4] = new THREE.TorusGeometry(baseSize * 0.8, baseSize * 0.3, 8, 12);
  }

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
    this.particleCount = particleCount;
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
   * 更新粒子系统使用 ParticleAttributes 数组
   * 支持不同的粒子大小、形状和颜色
   * 
   * 此方法使用实例化网格（InstancedMesh）来渲染不同形状的粒子，
   * 相比点精灵系统提供更丰富的视觉效果。
   * 
   * 支持的形状类型：
   * - 0: 球体 (Sphere)
   * - 1: 立方体 (Box)
   * - 2: 四面体 (Tetrahedron)
   * - 3: 八面体 (Octahedron)
   * - 4: 圆环 (Torus)
   * 
   * @param particles - ParticleAttributes 数组，每个粒子包含：
   *   - position: { x, y, z } - 3D位置
   *   - color: { r, g, b } - RGB颜色 (0-1范围)
   *   - size: number - 大小倍数 (0.5-2.0)
   *   - shapeType: number - 形状类型索引 (0-4)
   * 
   * @example
   * ```typescript
   * const particles = [
   *   { position: { x: 0, y: 0, z: 0 }, color: { r: 1, g: 0, b: 0 }, size: 1.0, shapeType: 0 },
   *   { position: { x: 1, y: 1, z: 1 }, color: { r: 0, g: 1, b: 0 }, size: 1.5, shapeType: 1 }
   * ];
   * engine.updateParticlesWithAttributes(particles);
   * ```
   */
  public updateParticlesWithAttributes(particles: Array<{ position: { x: number; y: number; z: number }; color: { r: number; g: number; b: number }; size: number; shapeType: number }>): void {
    if (!this.scene || !window.THREE) {
      console.warn('场景未初始化或 Three.js 未加载');
      return;
    }

    const THREE = window.THREE;

    // 创建粒子几何体（如果还没有创建）
    if (this.particleGeometries.length === 0) {
      this.createParticleGeometries();
    }

    // 清理旧的实例化网格
    this.clearInstancedMeshes();

    // 按 shapeType 分组粒子
    const particlesByShape: Map<number, typeof particles> = new Map();
    for (let i = 0; i < 5; i++) {
      particlesByShape.set(i, []);
    }

    particles.forEach(particle => {
      const shapeType = Math.floor(particle.shapeType) % 5; // 确保在 0-4 范围内
      particlesByShape.get(shapeType)!.push(particle);
    });

    // 为每种形状类型创建实例化网格
    particlesByShape.forEach((shapeParticles, shapeType) => {
      if (shapeParticles.length === 0) return;

      const geometry = this.particleGeometries[shapeType];
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9
      });

      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        shapeParticles.length
      );

      // 设置每个实例的变换矩阵和颜色
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();

      shapeParticles.forEach((particle, index) => {
        // 设置位置和缩放
        matrix.makeScale(particle.size, particle.size, particle.size);
        matrix.setPosition(particle.position.x, particle.position.y, particle.position.z);
        instancedMesh.setMatrixAt(index, matrix);

        // 设置颜色
        color.setRGB(particle.color.r, particle.color.g, particle.color.b);
        instancedMesh.setColorAt(index, color);
      });

      // 标记需要更新
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }

      // 添加到场景
      this.scene.add(instancedMesh);
      this.instancedMeshes.push(instancedMesh);
    });

    // 隐藏旧的点精灵系统（如果存在）
    if (this.points) {
      this.points.visible = false;
    }
  }

  /**
   * 清理实例化网格
   */
  private clearInstancedMeshes(): void {
    if (!this.scene) return;

    this.instancedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });

    this.instancedMeshes = [];
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

    // 清理实例化网格
    this.clearInstancedMeshes();

    // 清理粒子几何体
    this.particleGeometries.forEach(geom => {
      if (geom) geom.dispose();
    });
    this.particleGeometries = [];

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
   * 获取当前粒子数量
   * @returns 当前粒子数量
   */
  public getParticleCount(): number {
    return this.particleCount;
  }

  /**
   * 重新初始化粒子系统（动态调整粒子数量）
   * 保持当前的旋转和缩放状态
   * @param newCount - 新的粒子数量
   */
  public reinitializeParticles(newCount: number): void {
    // 跳过相同数量的重新初始化
    if (newCount === this.particleCount) {
      return;
    }

    if (!window.THREE || !this.scene || !this.points) {
      console.warn('ThreeEngine 未初始化，无法重新初始化粒子');
      return;
    }

    const THREE = window.THREE;

    // 1. 保存当前旋转和缩放状态
    const savedRotation = {
      x: this.points.rotation.x,
      y: this.points.rotation.y,
      z: this.points.rotation.z
    };
    const savedScale = this.points.scale.x;

    // 2. 从场景中移除旧的粒子系统
    this.scene.remove(this.points);

    // 3. 释放旧的几何体
    if (this.geometry) {
      this.geometry.dispose();
    }

    // 4. 创建新的几何体和缓冲区
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(newCount * 3);
    const colors = new Float32Array(newCount * 3);
    const sizes = new Float32Array(newCount);

    // 初始化粒子位置、颜色和大小
    for (let i = 0; i < newCount; i++) {
      const idx = i * 3;
      
      // 随机初始位置
      positions[idx] = (Math.random() - 0.5) * 2;
      positions[idx + 1] = (Math.random() - 0.5) * 2;
      positions[idx + 2] = (Math.random() - 0.5) * 2;
      
      // 青色 (0, 1, 1)
      colors[idx] = 0;
      colors[idx + 1] = 1;
      colors[idx + 2] = 1;
      
      // 5种不同大小的粒子
      const sizeType = i % 5;
      const baseSizes = [0.04, 0.06, 0.08, 0.05, 0.07];
      sizes[i] = baseSizes[sizeType] * (0.8 + Math.random() * 0.4);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 5. 创建新的粒子系统（复用材质）
    this.points = new THREE.Points(this.geometry, this.material);

    // 6. 恢复旋转和缩放状态
    this.points.rotation.x = savedRotation.x;
    this.points.rotation.y = savedRotation.y;
    this.points.rotation.z = savedRotation.z;
    this.points.scale.set(savedScale, savedScale, savedScale);

    // 7. 添加到场景
    this.scene.add(this.points);

    // 8. 更新粒子数量
    this.particleCount = newCount;
  }

  /**
   * 设置场景旋转
   * @param rotation - 旋转角度 { x, y, z } (弧度)
   */
  public setSceneRotation(rotation: { x: number; y: number; z: number }): void {
    // 应用到点精灵系统
    if (this.points) {
      this.points.rotation.x = rotation.x;
      this.points.rotation.y = rotation.y;
      this.points.rotation.z = rotation.z;
    }

    // 应用到实例化网格
    this.instancedMeshes.forEach(mesh => {
      mesh.rotation.x = rotation.x;
      mesh.rotation.y = rotation.y;
      mesh.rotation.z = rotation.z;
    });
  }

  /**
   * 增量旋转场景
   * @param delta - 旋转增量 { x, y, z } (弧度)
   */
  public addSceneRotation(delta: { x: number; y: number; z: number }): void {
    // 应用到点精灵系统
    if (this.points) {
      this.points.rotation.x += delta.x;
      this.points.rotation.y += delta.y;
      this.points.rotation.z += delta.z;
    }

    // 应用到实例化网格
    this.instancedMeshes.forEach(mesh => {
      mesh.rotation.x += delta.x;
      mesh.rotation.y += delta.y;
      mesh.rotation.z += delta.z;
    });
  }

  /**
   * 获取当前场景旋转
   * @returns 当前旋转角度 { x, y, z } (弧度)
   */
  public getSceneRotation(): { x: number; y: number; z: number } {
    // 优先从实例化网格获取
    if (this.instancedMeshes.length > 0) {
      const mesh = this.instancedMeshes[0];
      return {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z
      };
    }

    // 否则从点精灵系统获取
    if (this.points) {
      return {
        x: this.points.rotation.x,
        y: this.points.rotation.y,
        z: this.points.rotation.z
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * 设置场景缩放
   * @param scale - 缩放比例 (0.1 到 10.0)
   */
  public setSceneScale(scale: number): void {
    // 限制缩放范围在 0.1 到 10.0 之间，支持更大的缩放效果
    const clampedScale = Math.max(0.1, Math.min(10.0, scale));

    // 应用到点精灵系统
    if (this.points) {
      this.points.scale.set(clampedScale, clampedScale, clampedScale);
    }

    // 应用到实例化网格
    this.instancedMeshes.forEach(mesh => {
      mesh.scale.set(clampedScale, clampedScale, clampedScale);
    });
  }

  /**
   * 获取当前场景缩放
   * @returns 当前缩放比例
   */
  public getSceneScale(): number {
    // 优先从实例化网格获取
    if (this.instancedMeshes.length > 0) {
      return this.instancedMeshes[0].scale.x;
    }

    // 否则从点精灵系统获取
    if (this.points) {
      return this.points.scale.x;
    }

    return 1.0;
  }
}
