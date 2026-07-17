# Move Your Body

浏览器端 AI 体感锻炼游戏 — 打开网页，摄像头识别动作，跟随关卡完成锻炼。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `https://localhost:5173/`，允许摄像头权限，点击「开始挑战」。

## 技术栈

| 模块 | 技术 |
|:---|:---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 动作捕捉 | MediaPipe Pose (33 个关键点) |
| 音效 | Web Audio API |

## 关卡一：晨间唤醒

4 个动作，约 2 分钟完成：

| 动作 | 目标 | 检测方式 |
|:---|:---|:---|
| 🙌 手臂上举 | 10 次 | 双腕高于双肩，保持 1 秒 |
| 🦵 标准深蹲 | 10 次 | 膝关节角度 up→down→up，躯干倾斜校验 |
| ⭐ 开合跳 | 20 秒 | 手脚间距同时增大/缩小 |
| 🔄 躯干扭转 | 20 秒 | 左右肩 Z 轴差值交替 |

## 项目结构

```
src/
├── types/index.ts              # 全局类型 + 关键点索引
├── utils/
│   ├── geometry.ts             # 角度/距离计算
│   └── audio.ts                # Web Audio 封装
├── engine/
│   ├── rules.ts                # 4 个动作规则（闭包状态机）
│   ├── RuleEngine.ts           # 规则注册/判定
│   └── LevelFSM.ts             # 关卡状态机
├── store/gameStore.ts          # Zustand 全局状态
├── hooks/
│   ├── useCamera.ts            # 摄像头管理
│   ├── usePoseDetector.ts      # MediaPipe 加载与推理
│   └── useGameLoop.ts          # RAF 主循环
├── components/
│   ├── camera/CameraCanvas     # 视频 + 骨骼画布
│   ├── layout/GameLayout       # 左右分屏布局
│   └── ui/                     # 开始/倒计时/HUD/结算界面
└── App.tsx                     # 根组件
```

## 架构

```
Camera → MediaPipe Pose → RuleEngine → LevelFSM → Zustand → React UI
                                   ↑
                            rules.ts (4 个动作规则，闭包状态机)
```

- **RuleEngine**：管理动作规则，对外暴露 `judge(ruleId, pose) → ActionResult`
- **LevelFSM**：驱动关卡流程 `idle → countdown(3s) → active → rest(10s) → ... → complete`
- **GameLoop**：requestAnimationFrame 主循环，跳帧推理 + Canvas 镜像绘制
- **Store**：Zustand 集中管理游戏状态，引擎层与 UI 层解耦

## 局域网测试（手机）

配置文件中已启用 HTTPS 和局域网访问：

```ts
// vite.config.ts
server: { host: true, ... }
```

启动后用手机访问 `https://<你的IP>:5173/`，接受自签名证书即可。摄像头在 HTTPS 下正常工作。

## 注意事项

- 浏览器调用摄像头必须 HTTPS 或 localhost
- 模型文件位于 `public/models/pose_landmarker_lite.task`
- 动作规则判定使用原始坐标（非镜像），Canvas 绘制时才水平翻转
- 移动端建议限制视频分辨率 640×480，跳帧推理（每 2-3 帧检测一次）
