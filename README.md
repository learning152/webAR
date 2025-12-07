# WebAR 粒子互动系统

基于 Three.js 和 MediaPipe Hands 的 WebAR 粒子互动系统，使用 React + TypeScript 构建。

## 项目结构

```
src/
├── components/     # React 组件
├── engines/        # 核心引擎（Three.js、物理引擎、手势识别）
├── shapes/         # 形状生成器
├── utils/          # 工具函数
└── test/           # 测试配置和工具
```

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **3D 渲染**: Three.js
- **手势识别**: MediaPipe Hands
- **测试框架**: Vitest + fast-check
- **CDN**: unpkg.com

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

- 16,000 个粒子的实时渲染
- 基于物理的粒子运动模拟
- 6 种手势识别和形态变换
- 挥手风暴交互
- 深度推拉反馈
- 爆炸过渡特效

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari (需测试)
