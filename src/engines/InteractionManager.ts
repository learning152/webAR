/**
 * InteractionManager - 交互管理器
 * 管理挥手风暴、深度推拉反馈和爆炸过渡特效等交互机制
 */

import { PhysicsEngine } from './PhysicsEngine';
import { HandData, GestureType } from './GestureEngine';
import { ShapeGenerator, ShapeType, Vector3 } from '../shapes/ShapeGenerator';

/**
 * 挥手风暴配置参数
 */
export interface WaveStormConfig {
  velocityThreshold: number;    // 速度阈值（触发挥手风暴的最小速度）
  forceStrength: number;         // 风暴力强度
  influenceRadius: number;       // 影响半径
}

/**
 * 深度推拉配置参数
 */
export interface DepthScaleConfig {
  minScale: number;              // 最小缩放比例
  maxScale: number;              // 最大缩放比例
  smoothing: number;             // 缩放平滑系数
}

/**
 * 爆炸过渡配置参数
 */
export interface ExplosionTransitionConfig {
  explosionStrength: number;     // 爆炸力强度
  explosionDuration: number;     // 爆炸持续时间（秒）
}

/**
 * 手指比心散开配置参数
 */
export interface FingerHeartSpreadConfig {
  colorTransitionDuration: number;  // 颜色过渡持续时间（秒）
  spreadStrength: number;           // 散开力强度
}

/**
 * 交互管理器配置
 */
export interface InteractionManagerConfig {
  waveStorm: WaveStormConfig;
  depthScale: DepthScaleConfig;
  explosionTransition: ExplosionTransitionConfig;
  fingerHeartSpread: FingerHeartSpreadConfig;
}

const DEFAULT_CONFIG: InteractionManagerConfig = {
  waveStorm: {
    velocityThreshold: 4.0,      // 速度阈值 (reduced for easier triggering)
    forceStrength: 10.0,         // 风暴力强度 (increased for more impact)
    influenceRadius: 2.5         // 影响半径 (increased for wider effect)
  },
  depthScale: {
    minScale: 0.6,               // 最小缩放 (increased for better visibility)
    maxScale: 2.5,               // 最大缩放 (increased for more dramatic effect)
    smoothing: 0.15              // 平滑系数 (increased for smoother transitions)
  },
  explosionTransition: {
    explosionStrength: 7.0,      // 爆炸力强度 (increased for more dramatic effect)
    explosionDuration: 0.4       // 爆炸持续时间 (increased for smoother transitions)
  },
  fingerHeartSpread: {
    colorTransitionDuration: 0.6, // 颜色过渡持续时间 (increased for smoother color transition)
    spreadStrength: 8.0           // 散开力强度 (increased for more dramatic spread)
  }
};

/**
 * InteractionManager - 交互管理器类
 */
export class InteractionManager {
  private config: InteractionManagerConfig;
  private physicsEngine: PhysicsEngine | null = null;
  private shapeGenerator: ShapeGenerator;
  private currentScale: number = 1.0;
  private isTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private pendingShapeType: ShapeType | null = null;
  
  // 手指比心散开状态
  private isFingerHeartSpreading: boolean = false;
  private fingerHeartSpreadTimer: number = 0;
  
  constructor(config: Partial<InteractionManagerConfig> = {}) {
    this.config = {
      waveStorm: { ...DEFAULT_CONFIG.waveStorm, ...config.waveStorm },
      depthScale: { ...DEFAULT_CONFIG.depthScale, ...config.depthScale },
      explosionTransition: { ...DEFAULT_CONFIG.explosionTransition, ...config.explosionTransition },
      fingerHeartSpread: { ...DEFAULT_CONFIG.fingerHeartSpread, ...config.fingerHeartSpread }
    };
    this.shapeGenerator = new ShapeGenerator();
  }
  
  /**
   * 设置物理引擎引用
   * @param physicsEngine - 物理引擎实例
   */
  public setPhysicsEngine(physicsEngine: PhysicsEngine): void {
    this.physicsEngine = physicsEngine;
  }
  
  /**
   * 检测是否触发挥手风暴
   * 当手部移动速度超过阈值时返回 true
   * 
   * @param velocity - 手部移动速度向量
   * @returns 是否触发挥手风暴
   */
  public checkWaveStorm(velocity: { x: number; y: number; z: number }): boolean {
    // 计算速度的大小（模）
    const speed = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
    );
    
    // 检查速度是否超过阈值
    return speed > this.config.waveStorm.velocityThreshold;
  }
  
  /**
   * 施加挥手风暴力
   * 对范围内的粒子施加沿手部移动方向的力，力的强度随距离衰减
   * 
   * @param handCenter - 手部中心位置
   * @param direction - 手部移动方向（已归一化）
   */
  public applyWaveForce(
    handCenter: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number }
  ): void {
    if (!this.physicsEngine) {
      console.warn('物理引擎未设置，无法施加挥手风暴力');
      return;
    }
    
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const count = particleData.getCount();
    const radius = this.config.waveStorm.influenceRadius;
    const baseStrength = this.config.waveStorm.forceStrength;
    const mass = particleData.mass;
    
    // 归一化方向向量（确保是单位向量）
    const dirLength = Math.sqrt(
      direction.x * direction.x +
      direction.y * direction.y +
      direction.z * direction.z
    );
    
    const normalizedDir = {
      x: dirLength > 0.001 ? direction.x / dirLength : 0,
      y: dirLength > 0.001 ? direction.y / dirLength : 0,
      z: dirLength > 0.001 ? direction.z / dirLength : 0
    };
    
    // 对每个粒子检查是否在影响范围内
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // 获取粒子位置
      const px = particleData.positions[idx];
      const py = particleData.positions[idx + 1];
      const pz = particleData.positions[idx + 2];
      
      // 计算粒子到手部中心的距离
      const dx = px - handCenter.x;
      const dy = py - handCenter.y;
      const dz = pz - handCenter.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // 检查是否在影响半径内
      if (distance <= radius) {
        // 计算距离衰减因子（距离越远，力越小）
        // 使用线性衰减：factor = 1 - (distance / radius)
        const attenuationFactor = 1.0 - (distance / radius);
        
        // 计算实际力强度
        const strength = baseStrength * attenuationFactor;
        
        // 计算力向量（沿手部移动方向）
        const fx = normalizedDir.x * strength;
        const fy = normalizedDir.y * strength;
        const fz = normalizedDir.z * strength;
        
        // 应用力为加速度（F = ma，所以 a = F/m）
        particleData.accelerations[idx] += fx / mass;
        particleData.accelerations[idx + 1] += fy / mass;
        particleData.accelerations[idx + 2] += fz / mass;
      }
    }
  }
  
  /**
   * 更新缩放比例
   * 根据手掌画面占比计算并平滑过渡到新的缩放值
   * 
   * @param areaRatio - 手掌画面占比（0-1）
   */
  public updateScale(areaRatio: number): void {
    // 将手掌占比映射到缩放范围
    // 假设占比 0.05 对应最小缩放，0.3 对应最大缩放
    const minAreaRatio = 0.05;
    const maxAreaRatio = 0.3;
    
    // 限制 areaRatio 在有效范围内
    const clampedRatio = Math.max(minAreaRatio, Math.min(maxAreaRatio, areaRatio));
    
    // 线性映射到缩放范围
    const normalizedRatio = (clampedRatio - minAreaRatio) / (maxAreaRatio - minAreaRatio);
    const targetScale = this.config.depthScale.minScale +
      normalizedRatio * (this.config.depthScale.maxScale - this.config.depthScale.minScale);
    
    // 平滑过渡到目标缩放
    const smoothing = this.config.depthScale.smoothing;
    this.currentScale = this.currentScale * (1 - smoothing) + targetScale * smoothing;
  }
  
  /**
   * 获取当前缩放比例
   */
  public getCurrentScale(): number {
    return this.currentScale;
  }
  
  /**
   * 触发状态转换时的爆炸过渡特效
   * 先触发爆炸扩散，然后在爆炸持续时间后更新目标形状，使粒子重组
   * 
   * @param toShape - 目标形状类型
   * @param center - 爆炸中心位置（可选，默认为原点）
   */
  public triggerTransition(toShape: ShapeType, center?: { x: number; y: number; z: number }): void {
    if (!this.physicsEngine) {
      console.warn('物理引擎未设置，无法触发爆炸过渡');
      return;
    }
    
    // 更新 PhysicsEngine 的当前形态类型
    this.physicsEngine.setCurrentShapeType(toShape);
    
    // 触发爆炸效果
    this.physicsEngine.triggerExplosion(center);
    
    // 标记正在过渡
    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.pendingShapeType = toShape;
  }
  
  /**
   * 更新过渡状态
   * 在爆炸扩散后更新目标形状位置
   * 
   * @param deltaTime - 时间增量（秒）
   */
  public updateTransition(deltaTime: number): void {
    if (!this.isTransitioning || !this.pendingShapeType) {
      return;
    }
    
    this.transitionTimer += deltaTime;
    
    // 当爆炸持续时间结束时，更新目标形状
    if (this.transitionTimer >= this.config.explosionTransition.explosionDuration) {
      this.updateTargetShape(this.pendingShapeType);
      
      // 重置过渡状态
      this.isTransitioning = false;
      this.transitionTimer = 0;
      this.pendingShapeType = null;
    }
  }
  
  /**
   * 更新粒子系统的目标形状
   * 
   * @param shapeType - 目标形状类型
   */
  private updateTargetShape(shapeType: ShapeType): void {
    if (!this.physicsEngine) {
      return;
    }
    
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const count = particleData.getCount();
    let positions: Vector3[] = [];
    
    // 根据形状类型生成目标位置（使用体积采样方法）
    switch (shapeType) {
      case ShapeType.PLANET: {
        const particles = this.shapeGenerator.generatePlanetVolume(count, 3.5); // 使用体积采样
        positions = particles.map(p => p.position);
        // 更新颜色
        for (let i = 0; i < count && i < particles.length; i++) {
          const idx = i * 3;
          particleData.colors[idx] = particles[i].color.r;
          particleData.colors[idx + 1] = particles[i].color.g;
          particleData.colors[idx + 2] = particles[i].color.b;
        }
        break;
      }
      case ShapeType.TEXT:
        positions = this.shapeGenerator.generateText("我是ai", count);
        // 应用霓虹多彩配色
        this.applyDiverseColors(ShapeType.TEXT);
        break;
      case ShapeType.TORUS: {
        const particles = this.shapeGenerator.generateTorusVolume(count, 3.5, 1.2); // 使用体积采样
        positions = particles.map(p => p.position);
        // 应用彩虹渐变配色
        this.applyDiverseColors(ShapeType.TORUS);
        break;
      }
      case ShapeType.STAR: {
        const particles = this.shapeGenerator.generateStarVolume(count, 3.5, 1.4); // 使用体积采样
        positions = particles.map(p => p.position);
        // 应用金色系配色
        this.applyDiverseColors(ShapeType.STAR);
        break;
      }
      case ShapeType.HEART: {
        const particles = this.shapeGenerator.generateHeartVolume(count, 1.8); // 使用体积采样
        positions = particles.map(p => p.position);
        // 应用红粉色系配色
        this.applyDiverseColors(ShapeType.HEART);
        break;
      }
      case ShapeType.ARROW_HEART: {
        const particles = this.shapeGenerator.generateArrowHeartVolume(count, 1.8); // 使用体积采样
        positions = particles.map(p => p.position);
        // 更新颜色为固定的粉色 (1.0, 0.5, 0.75)
        for (let i = 0; i < count && i < particles.length; i++) {
          const idx = i * 3;
          particleData.colors[idx] = 1.0;
          particleData.colors[idx + 1] = 0.5;
          particleData.colors[idx + 2] = 0.75;
        }
        break;
      }
      default:
        console.warn(`未知的形状类型: ${shapeType}`);
        return;
    }
    
    // 更新目标位置
    for (let i = 0; i < count && i < positions.length; i++) {
      const idx = i * 3;
      particleData.targetPositions[idx] = positions[i].x;
      particleData.targetPositions[idx + 1] = positions[i].y;
      particleData.targetPositions[idx + 2] = positions[i].z;
    }
  }
  
  /**
   * 重置粒子颜色为青色
   */
  private resetToCyanColor(): void {
    if (!this.physicsEngine) {
      return;
    }
    
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const count = particleData.getCount();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      particleData.colors[idx] = 0;     // r
      particleData.colors[idx + 1] = 1; // g (cyan)
      particleData.colors[idx + 2] = 1; // b (cyan)
    }
  }
  
  /**
   * 为粒子应用多样化颜色
   * 5种不同的颜色类型，每种颜色代表不同的粒子类型
   * @param shapeType - 形态类型，不同形态使用不同的配色方案
   */
  private applyDiverseColors(shapeType: ShapeType): void {
    if (!this.physicsEngine) {
      return;
    }
    
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const count = particleData.getCount();
    
    // 定义5种粒子颜色配色方案（根据形态不同）
    type ColorPalette = Array<{ r: number; g: number; b: number }>;
    
    let palette: ColorPalette;
    
    switch (shapeType) {
      case ShapeType.TEXT:
        // 文字：霓虹色系 - 青、紫、蓝、绿、白
        palette = [
          { r: 0, g: 1, b: 1 },       // 青色
          { r: 0.8, g: 0.2, b: 1 },   // 紫色
          { r: 0.2, g: 0.6, b: 1 },   // 蓝色
          { r: 0.2, g: 1, b: 0.6 },   // 绿色
          { r: 0.9, g: 0.95, b: 1 },  // 白色
        ];
        break;
      case ShapeType.TORUS:
        // 圆环：彩虹渐变色系
        palette = [
          { r: 1, g: 0.3, b: 0.3 },   // 红色
          { r: 1, g: 0.7, b: 0.2 },   // 橙色
          { r: 0.2, g: 1, b: 0.5 },   // 绿色
          { r: 0.3, g: 0.7, b: 1 },   // 蓝色
          { r: 0.8, g: 0.3, b: 1 },   // 紫色
        ];
        break;
      case ShapeType.STAR:
        // 星形：金色系 - 金、黄、橙、白、淡金
        palette = [
          { r: 1, g: 0.85, b: 0.2 },  // 金色
          { r: 1, g: 1, b: 0.4 },     // 亮黄
          { r: 1, g: 0.6, b: 0.2 },   // 橙色
          { r: 1, g: 0.95, b: 0.8 },  // 白金
          { r: 0.9, g: 0.75, b: 0.4 },// 淡金
        ];
        break;
      case ShapeType.HEART:
        // 爱心：红粉色系
        palette = [
          { r: 1, g: 0.2, b: 0.4 },   // 红色
          { r: 1, g: 0.5, b: 0.6 },   // 粉红
          { r: 1, g: 0.3, b: 0.5 },   // 玫红
          { r: 1, g: 0.7, b: 0.8 },   // 浅粉
          { r: 0.9, g: 0.4, b: 0.6 }, // 深粉
        ];
        break;
      default:
        // 默认青色系
        palette = [
          { r: 0, g: 1, b: 1 },
          { r: 0.2, g: 0.8, b: 1 },
          { r: 0, g: 0.9, b: 0.9 },
          { r: 0.3, g: 1, b: 0.9 },
          { r: 0.1, g: 0.7, b: 1 },
        ];
    }
    
    // 为每个粒子分配颜色（基于粒子索引分配不同类型）
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // 使用粒子索引决定颜色类型，添加一些随机性
      const colorIndex = (i + Math.floor(Math.random() * 2)) % 5;
      const color = palette[colorIndex];
      
      // 添加轻微的颜色变化增加多样性
      const variation = 0.1;
      particleData.colors[idx] = Math.min(1, Math.max(0, color.r + (Math.random() - 0.5) * variation));
      particleData.colors[idx + 1] = Math.min(1, Math.max(0, color.g + (Math.random() - 0.5) * variation));
      particleData.colors[idx + 2] = Math.min(1, Math.max(0, color.b + (Math.random() - 0.5) * variation));
    }
  }
  
  /**
   * 检测是否从手指比心转换到张手
   * 用于触发粉色粒子散开效果
   * 
   * @param previousGesture - 前一个手势状态
   * @param currentGesture - 当前手势状态
   * @returns 是否为手指比心到张手的转换
   */
  public isFingerHeartToOpenHand(previousGesture: GestureType, currentGesture: GestureType): boolean {
    return previousGesture === GestureType.FINGER_HEART && currentGesture === GestureType.OPEN_HAND;
  }
  
  /**
   * 触发手指比心散开效果
   * 粉色粒子爆炸散开，然后颜色逐渐恢复为青色
   * 
   * @param center - 爆炸中心位置（可选，默认为原点）
   */
  public triggerFingerHeartSpread(center?: { x: number; y: number; z: number }): void {
    if (!this.physicsEngine) {
      console.warn('物理引擎未设置，无法触发手指比心散开效果');
      return;
    }
    
    // 触发爆炸效果（使用散开力强度）
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const explosionCenter = center || { x: 0, y: 0, z: 0 };
    const strength = this.config.fingerHeartSpread.spreadStrength;
    const count = particleData.getCount();
    const mass = particleData.mass;
    
    // 对所有粒子施加径向外力
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // 获取粒子位置
      const px = particleData.positions[idx];
      const py = particleData.positions[idx + 1];
      const pz = particleData.positions[idx + 2];
      
      // 计算从爆炸中心到粒子的方向
      const dx = px - explosionCenter.x;
      const dy = py - explosionCenter.y;
      const dz = pz - explosionCenter.z;
      
      // 计算距离
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // 归一化方向（避免除以零）
      const invDist = dist > 0.001 ? 1.0 / dist : 1.0;
      const ndx = dx * invDist;
      const ndy = dy * invDist;
      const ndz = dz * invDist;
      
      // 施加径向外力
      const fx = ndx * strength;
      const fy = ndy * strength;
      const fz = ndz * strength;
      
      // 应用为加速度
      particleData.accelerations[idx] += fx / mass;
      particleData.accelerations[idx + 1] += fy / mass;
      particleData.accelerations[idx + 2] += fz / mass;
    }
    
    // 标记正在进行手指比心散开
    this.isFingerHeartSpreading = true;
    this.fingerHeartSpreadTimer = 0;
  }
  
  /**
   * 更新手指比心散开状态
   * 处理颜色从粉色到青色的过渡
   * 
   * @param deltaTime - 时间增量（秒）
   */
  public updateFingerHeartSpread(deltaTime: number): void {
    if (!this.isFingerHeartSpreading) {
      return;
    }
    
    this.fingerHeartSpreadTimer += deltaTime;
    
    const duration = this.config.fingerHeartSpread.colorTransitionDuration;
    const progress = Math.min(this.fingerHeartSpreadTimer / duration, 1.0);
    
    // 更新粒子颜色：从粉色 (1.0, 0.4, 0.7) 过渡到青色 (0, 1, 1)
    this.updateColorTransition(progress);
    
    // 检查是否完成
    if (progress >= 1.0) {
      this.isFingerHeartSpreading = false;
      this.fingerHeartSpreadTimer = 0;
    }
  }
  
  /**
   * 更新颜色过渡
   * 从粉色线性插值到青色
   * 
   * @param progress - 过渡进度（0.0 到 1.0）
   */
  private updateColorTransition(progress: number): void {
    if (!this.physicsEngine) {
      return;
    }
    
    const particleData = this.physicsEngine.getParticleData();
    if (!particleData) {
      return;
    }
    
    const count = particleData.getCount();
    
    // 粉色 (1.0, 0.5, 0.75) -> 青色 (0, 1, 1) - brighter pink for better visibility
    const pinkR = 1.0, pinkG = 0.5, pinkB = 0.75;
    const cyanR = 0, cyanG = 1, cyanB = 1;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // 线性插值
      particleData.colors[idx] = pinkR + (cyanR - pinkR) * progress;
      particleData.colors[idx + 1] = pinkG + (cyanG - pinkG) * progress;
      particleData.colors[idx + 2] = pinkB + (cyanB - pinkB) * progress;
    }
  }
  
  /**
   * 检查是否正在进行手指比心散开
   */
  public isInFingerHeartSpread(): boolean {
    return this.isFingerHeartSpreading;
  }
  
  /**
   * 获取手指比心散开进度（0.0 到 1.0）
   */
  public getFingerHeartSpreadProgress(): number {
    if (!this.isFingerHeartSpreading) {
      return 1.0;
    }
    
    return Math.min(this.fingerHeartSpreadTimer / this.config.fingerHeartSpread.colorTransitionDuration, 1.0);
  }
  
  /**
   * 处理手势状态变化
   * 检测从手指比心到张手的转换并触发散开效果
   * 
   * @param previousGesture - 前一个手势状态
   * @param currentGesture - 当前手势状态
   * @param center - 爆炸中心位置（可选）
   */
  public handleGestureChange(
    previousGesture: GestureType,
    currentGesture: GestureType,
    center?: { x: number; y: number; z: number }
  ): void {
    // 检测从手指比心到张手的转换
    if (this.isFingerHeartToOpenHand(previousGesture, currentGesture)) {
      this.triggerFingerHeartSpread(center);
    }
  }
  
  /**
   * 处理手部数据更新
   * 检测并应用挥手风暴和深度推拉效果
   * 
   * @param handData - 手部数据
   * @param deltaTime - 时间增量（秒）
   */
  public update(handData: HandData | null, deltaTime: number): void {
    // 更新过渡状态
    this.updateTransition(deltaTime);
    
    // 更新手指比心散开状态
    this.updateFingerHeartSpread(deltaTime);
    
    if (!handData) {
      return;
    }
    
    // 检测挥手风暴
    if (this.checkWaveStorm(handData.velocity)) {
      // 施加风暴力
      this.applyWaveForce(handData.center, handData.velocity);
    }
    
    // 更新深度缩放
    this.updateScale(handData.areaRatio);
  }
  
  /**
   * 获取配置
   */
  public getConfig(): InteractionManagerConfig {
    return {
      waveStorm: { ...this.config.waveStorm },
      depthScale: { ...this.config.depthScale },
      explosionTransition: { ...this.config.explosionTransition },
      fingerHeartSpread: { ...this.config.fingerHeartSpread }
    };
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<InteractionManagerConfig>): void {
    if (config.waveStorm) {
      this.config.waveStorm = { ...this.config.waveStorm, ...config.waveStorm };
    }
    if (config.depthScale) {
      this.config.depthScale = { ...this.config.depthScale, ...config.depthScale };
    }
    if (config.explosionTransition) {
      this.config.explosionTransition = { ...this.config.explosionTransition, ...config.explosionTransition };
    }
    if (config.fingerHeartSpread) {
      this.config.fingerHeartSpread = { ...this.config.fingerHeartSpread, ...config.fingerHeartSpread };
    }
  }
  
  /**
   * 检查是否正在过渡
   */
  public isInTransition(): boolean {
    return this.isTransitioning;
  }
  
  /**
   * 获取过渡进度（0.0 到 1.0）
   */
  public getTransitionProgress(): number {
    if (!this.isTransitioning) {
      return 1.0;
    }
    
    return Math.min(this.transitionTimer / this.config.explosionTransition.explosionDuration, 1.0);
  }
}
