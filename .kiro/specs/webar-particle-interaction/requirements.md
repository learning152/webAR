# 需求文档

## 简介

本系统是一个基于 Three.js 和 MediaPipe Hands 的 WebAR 粒子互动系统，使用 React 脚手架搭建。系统通过摄像头捕捉用户手势，实时渲染 16,000 个粒子，并根据不同手势变形为多种形状，同时支持挥手风暴交互和深度推拉反馈，提供极致丝滑的物理交互体验。

## 术语表

- **粒子系统 (Particle System)**: 由 16,000 个独立粒子组成的可视化系统，每个粒子具有位置、速度和加速度属性
- **MediaPipe Hands**: Google 开发的实时手部追踪库，用于检测和追踪手部关键点
- **Three.js**: 基于 WebGL 的 3D 图形库，用于渲染粒子和 3D 场景
- **手势状态 (Gesture State)**: 系统识别的特定手部姿态，包括张手、剪刀手、握拳、食指、竖大拇指、比心、手指比心
- **物理模型 (Physics Model)**: 基于速度和加速度的粒子运动计算系统，确保自然流畅的运动效果
- **爆炸过渡特效 (Explosion Transition)**: 手势切换时粒子从当前形状爆炸散开再重组为新形状的视觉效果
- **挥手风暴 (Hand Wave Storm)**: 检测快速手部移动并物理吹散粒子的交互效果
- **深度推拉反馈 (Depth Push-Pull Feedback)**: 根据手掌在画面中的占比实时缩放粒子系统的交互机制
- **unpkg 源**: 基于 npm 的 CDN 服务，用于加载外部库以确保资源可用性
- **行星状态 (Planet State)**: 张手手势对应的粒子形状，呈现球体行星外观，具有金蓝色渐变
- **一箭穿心 (Arrow Through Heart)**: 手指比心手势触发的特效，粉色粒子形成心形并有箭矢穿过

## 需求

### 需求 1

**用户故事:** 作为用户，我希望系统能够初始化并渲染粒子系统，以便我能看到基础的视觉效果

#### 验收标准

1. WHEN 应用启动 THEN 粒子系统 SHALL 使用 unpkg 源加载 Three.js 库
2. WHEN Three.js 加载完成 THEN 粒子系统 SHALL 创建包含 16,000 个粒子的场景
3. WHEN 粒子被创建 THEN 每个粒子 SHALL 初始化为青色流体外观
4. WHEN 粒子系统初始化 THEN 每个粒子 SHALL 具有位置、速度和加速度属性
5. WHEN 渲染循环启动 THEN 粒子系统 SHALL 以每秒 60 帧的速率更新和渲染

### 需求 2

**用户故事:** 作为用户，我希望系统能够捕捉我的手部动作，以便进行后续的手势识别

#### 验收标准

1. WHEN 应用启动 THEN 粒子系统 SHALL 使用 unpkg 源加载 MediaPipe Hands 库
2. WHEN MediaPipe Hands 加载完成 THEN 粒子系统 SHALL 请求用户摄像头权限
3. WHEN 摄像头权限被授予 THEN 粒子系统 SHALL 启动视频流捕捉
4. WHEN 视频流活跃 THEN MediaPipe Hands SHALL 实时检测手部关键点
5. WHEN 手部关键点被检测到 THEN 粒子系统 SHALL 提取手部位置、手势类型和手掌占比数据

### 需求 3

**用户故事:** 作为用户，我希望粒子能够根据物理规律运动，以便获得自然流畅的视觉体验

#### 验收标准

1. WHEN 粒子系统更新 THEN 每个粒子 SHALL 根据当前速度更新位置
2. WHEN 粒子系统更新 THEN 每个粒子 SHALL 根据加速度更新速度
3. WHEN 粒子受到外力作用 THEN 粒子系统 SHALL 计算并应用加速度变化
4. WHEN 粒子移动 THEN 粒子系统 SHALL NOT 使用线性插值进行位置更新
5. WHEN 粒子达到目标位置 THEN 粒子系统 SHALL 应用阻尼力使粒子平滑减速

### 需求 4

**用户故事:** 作为用户，我希望张开手掌时粒子变形为行星状态，以便体验第一种手势交互

#### 验收标准

1. WHEN 系统检测到张手手势 THEN 粒子系统 SHALL 计算行星球体的目标位置
2. WHEN 粒子移动到行星形状 THEN 每个粒子 SHALL 应用金蓝色渐变着色
3. WHEN 手部在画面中移动 THEN 行星 SHALL 跟随手部中心位置移动
4. WHEN 手部旋转或倾斜 THEN 行星 SHALL 相应旋转和倾斜
5. WHEN 手势从其他状态切换到张手 THEN 粒子系统 SHALL 触发爆炸过渡特效

### 需求 5

**用户故事:** 作为用户，我希望做出剪刀手时粒子变形为"我是ai"文字，以便体验第二种手势交互

#### 验收标准

1. WHEN 系统检测到剪刀手手势 THEN 粒子系统 SHALL 使用 Canvas API 生成"我是ai"文字的像素数据
2. WHEN 文字像素数据生成 THEN 粒子系统 SHALL 将粒子分配到文字形状的采样点
3. WHEN 粒子移动到文字形状 THEN 粒子系统 SHALL 保持青色外观
4. WHEN 手势从其他状态切换到剪刀手 THEN 粒子系统 SHALL 触发爆炸过渡特效
5. WHEN 文字形状显示 THEN 粒子系统 SHALL 确保文字清晰可读

### 需求 6

**用户故事:** 作为用户，我希望握拳时粒子变形为圆环，以便体验第三种手势交互

#### 验收标准

1. WHEN 系统检测到握拳手势 THEN 粒子系统 SHALL 计算圆环（环面）的目标位置
2. WHEN 粒子移动到圆环形状 THEN 粒子系统 SHALL 保持青色外观
3. WHEN 圆环形状形成 THEN 粒子系统 SHALL 确保圆环具有适当的内外半径比例
4. WHEN 手势从其他状态切换到握拳 THEN 粒子系统 SHALL 触发爆炸过渡特效
5. WHEN 圆环显示 THEN 粒子 SHALL 均匀分布在环面上

### 需求 7

**用户故事:** 作为用户，我希望伸出食指时粒子变形为星形，以便体验第四种手势交互

#### 验收标准

1. WHEN 系统检测到食指手势 THEN 粒子系统 SHALL 计算五角星的目标位置
2. WHEN 粒子移动到星形 THEN 粒子系统 SHALL 保持青色外观
3. WHEN 星形形成 THEN 粒子系统 SHALL 确保五个尖角清晰可见
4. WHEN 手势从其他状态切换到食指 THEN 粒子系统 SHALL 触发爆炸过渡特效
5. WHEN 星形显示 THEN 粒子 SHALL 沿星形轮廓和内部均匀分布

### 需求 8

**用户故事:** 作为用户，我希望竖大拇指时粒子变形为爱心，以便体验第五种手势交互

#### 验收标准

1. WHEN 系统检测到竖大拇指手势 THEN 粒子系统 SHALL 计算心形的目标位置
2. WHEN 粒子移动到爱心形状 THEN 粒子系统 SHALL 保持青色外观
3. WHEN 爱心形状形成 THEN 粒子系统 SHALL 确保心形曲线平滑自然
4. WHEN 手势从其他状态切换到竖大拇指 THEN 粒子系统 SHALL 触发爆炸过渡特效
5. WHEN 爱心显示 THEN 粒子 SHALL 填充整个心形区域

### 需求 9

**用户故事:** 作为用户，我希望手指比心时出现粉色一箭穿心特效，以便体验第六种手势交互

#### 验收标准

1. WHEN 系统检测到手指比心手势 THEN 粒子系统 SHALL 将粒子颜色变更为粉色
2. WHEN 手指比心手势被识别 THEN 粒子系统 SHALL 形成心形并生成箭矢穿过效果
3. WHEN 箭矢特效显示 THEN 粒子系统 SHALL 动画展示箭矢从一侧穿入心形并从另一侧穿出
4. WHEN 手指从比心张开 THEN 粒子系统 SHALL 将粉色粒子爆炸散开
5. WHEN 粒子散开后 THEN 粒子系统 SHALL 恢复青色并返回默认状态

### 需求 10

**用户故事:** 作为用户，我希望手势切换时有爆炸过渡特效，以便获得流畅的视觉反馈

#### 验收标准

1. WHEN 手势状态改变 THEN 粒子系统 SHALL 检测到状态切换事件
2. WHEN 状态切换被检测到 THEN 粒子系统 SHALL 对所有粒子施加向外的爆炸力
3. WHEN 爆炸力被施加 THEN 每个粒子 SHALL 根据其与中心的方向获得径向加速度
4. WHEN 粒子爆炸扩散 THEN 粒子系统 SHALL 在扩散过程中计算新形状的目标位置
5. WHEN 粒子达到最大扩散距离 THEN 粒子系统 SHALL 施加向新目标位置的吸引力使粒子重组

### 需求 11

**用户故事:** 作为用户，我希望快速挥手时粒子被物理吹散，以便体验挥手风暴交互

#### 验收标准

1. WHEN 手部位置更新 THEN 粒子系统 SHALL 计算手部移动速度
2. WHEN 手部移动速度超过阈值 THEN 粒子系统 SHALL 识别为挥手风暴事件
3. WHEN 挥手风暴被触发 THEN 粒子系统 SHALL 计算手部移动方向
4. WHEN 粒子在手部路径范围内 THEN 粒子系统 SHALL 对这些粒子施加沿手部移动方向的力
5. WHEN 风暴力被施加 THEN 粒子 SHALL 根据距离手部的远近获得不同强度的加速度

### 需求 12

**用户故事:** 作为用户，我希望手掌靠近或远离摄像头时粒子系统缩放，以便体验深度推拉反馈

#### 验收标准

1. WHEN 手部被检测到 THEN 粒子系统 SHALL 计算手掌在画面中的占比
2. WHEN 手掌占比增加 THEN 粒子系统 SHALL 增大整体缩放比例
3. WHEN 手掌占比减少 THEN 粒子系统 SHALL 减小整体缩放比例
4. WHEN 缩放比例变化 THEN 粒子系统 SHALL 平滑过渡到新的缩放值
5. WHEN 缩放应用 THEN 粒子系统 SHALL 保持粒子形状的相对比例不变

### 需求 13

**用户故事:** 作为用户，我希望系统能够准确识别不同的手势，以便触发对应的粒子变形

#### 验收标准

1. WHEN MediaPipe Hands 提供手部关键点 THEN 粒子系统 SHALL 分析手指的伸展状态
2. WHEN 五指张开 THEN 粒子系统 SHALL 识别为张手手势
3. WHEN 食指和中指伸展且其他手指收起 THEN 粒子系统 SHALL 识别为剪刀手手势
4. WHEN 所有手指收起 THEN 粒子系统 SHALL 识别为握拳手势
5. WHEN 仅食指伸展 THEN 粒子系统 SHALL 识别为食指手势
6. WHEN 仅大拇指伸展 THEN 粒子系统 SHALL 识别为竖大拇指手势
7. WHEN 食指和大拇指形成心形 THEN 粒子系统 SHALL 识别为手指比心手势

### 需求 14

**用户故事:** 作为用户，我希望系统在 React 框架下运行，以便利用现代前端开发的优势

#### 验收标准

1. WHEN 项目初始化 THEN 粒子系统 SHALL 使用 Create React App 或 Vite 创建 React 项目结构
2. WHEN React 组件挂载 THEN 粒子系统 SHALL 初始化 Three.js 场景和 MediaPipe Hands
3. WHEN 组件卸载 THEN 粒子系统 SHALL 清理 Three.js 资源和停止 MediaPipe Hands
4. WHEN 状态更新 THEN 粒子系统 SHALL 使用 React hooks 管理应用状态
5. WHEN 渲染循环运行 THEN 粒子系统 SHALL 在 React 生命周期外独立运行以保证性能

### 需求 15

**用户故事:** 作为用户，我希望所有外部库都能成功加载，以便系统正常运行

#### 验收标准

1. WHEN 应用加载外部库 THEN 粒子系统 SHALL 使用 unpkg.com 作为 CDN 源
2. WHEN Three.js 从 unpkg 加载 THEN 粒子系统 SHALL 验证库加载成功
3. WHEN MediaPipe Hands 从 unpkg 加载 THEN 粒子系统 SHALL 验证库加载成功
4. IF 库加载失败 THEN 粒子系统 SHALL 显示错误信息并提示用户
5. WHEN 所有库加载完成 THEN 粒子系统 SHALL 开始初始化流程

### 需求 16

**用户故事:** 作为用户，我希望粒子系统在行星状态下能够跟随手部旋转，以便获得更真实的交互体验

#### 验收标准

1. WHEN 行星状态激活 THEN 粒子系统 SHALL 追踪手部的三维方向向量
2. WHEN 手部旋转 THEN 粒子系统 SHALL 计算旋转角度和旋转轴
3. WHEN 旋转参数计算完成 THEN 粒子系统 SHALL 对行星应用相应的旋转变换
4. WHEN 手部倾斜 THEN 粒子系统 SHALL 对行星应用相应的倾斜变换
5. WHEN 旋转和倾斜应用 THEN 粒子系统 SHALL 保持行星形状的完整性

### 需求 17

**用户故事:** 作为开发者，我希望系统具有良好的性能，以便在各种设备上流畅运行

#### 验收标准

1. WHEN 粒子系统渲染 THEN 系统 SHALL 在主流设备上维持至少 30 帧每秒的帧率
2. WHEN 物理计算执行 THEN 粒子系统 SHALL 使用优化的算法减少计算复杂度
3. WHEN 粒子数量为 16,000 THEN 粒子系统 SHALL 使用 GPU 加速渲染
4. WHEN 手势识别运行 THEN MediaPipe Hands SHALL 不阻塞主渲染线程
5. WHEN 内存使用增长 THEN 粒子系统 SHALL 及时释放不再使用的资源
