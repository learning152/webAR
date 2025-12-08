# WebAR 粒子互动系统

基于 Three.js 和 MediaPipe Hands 的 WebAR 粒子互动系统，使用 React + TypeScript 构建。

## 项目结构

```
src/
├── components/     # React 组件（ParticleCanvas、GestureSimulator、UIControls）
├── engines/        # 核心引擎（Three.js、物理引擎、手势识别、交互管理）
├── shapes/         # 形状生成器
├── config/         # 配置文件（形态配置、优化配置）
├── utils/          # 工具函数（摄像头管理、性能监控、库加载）
└── test/           # 测试配置和工具
```

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **3D 渲染**: Three.js
- **手势识别**: MediaPipe Hands
- **测试框架**: Vitest + fast-check（属性测试）
- **CDN**: unpkg.com
- **IDE**: kiro

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 预览生产构建
npm run preview
```

## 功能特性

### 核心功能
- 16,000 个粒子的实时渲染
- 基于物理的粒子运动模拟
- 6 种手势识别和形态变换（球体、立方体、螺旋、波浪、心形、星形）
- 挥手风暴交互
- 深度推拉反馈
- 爆炸过渡特效

### 手势模拟器（降级模式）
当摄像头不可用时，系统自动启用手势模拟器，提供完整的交互体验：

- **形态切换**: 点击按钮在 6 种粒子形态间切换
- **旋转控制**: 使用方向键（↑↓←→）旋转粒子场景，支持组合键同时旋转
- **缩放控制**: 滑块控制缩放比例，支持 1x/3x/5x 倍数切换
- **自动降级**: 摄像头初始化失败时自动显示模拟器面板
- **手动切换**: 可随时手动打开/关闭模拟器
- **优先级控制**: 模拟器激活时暂停摄像头手势检测，关闭后自动恢复

### 摄像头功能
- 非阻塞式摄像头初始化
- 摄像头重试功能
- 实时手势识别与粒子交互

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari (需测试)

## 测试覆盖

项目使用 Vitest + fast-check 进行属性测试，覆盖：
- 形态配置默认值回退
- 方向键旋转变换正确性
- 缩放滑块映射正确性
- 形态按钮数量一致性
- 手动控制优先级逻辑
