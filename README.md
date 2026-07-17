# Move Your Body

浏览器端 AI 体感锻炼游戏 — 打开网页，摄像头识别动作，无需鼠标键盘，肢体手势即可交互。

## 快速开始

```bash
npm install
npm run dev
# 或
./start.sh
```

浏览器打开 `https://localhost:5173/`，允许摄像头权限，双手上举保持 2 秒即可开始。

## 技术栈

| 模块 | 技术 |
|:---|:---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 动作捕捉 | MediaPipe Pose (33 个关键点) |
| 音效 | Web Audio API |
| HTTPS | @vitejs/plugin-basic-ssl |

## 关卡一：晨间唤醒

4 个动作，全部计次制：

| 动作 | 目标 | 检测方式 |
|:---|:---|:---|
| 🙌 手臂上举 | 10 次 | 双腕高于双肩，保持 1 秒 |
| 🏋️ 双臂侧平举 | 10 次 | 双臂水平展开至肩高，保持 1 秒 |
| ⭐ 开合跳 | 15 次 | 手脚间距同时增大/缩小 |
| 🔄 躯干扭转 | 10 次 | 左右肩 Z 轴差值交替 |

## 交互方式

| 操作 | 手势 |
|:---|:---|
| 开始挑战 | 双手上举保持 2 秒 |
| 重新挑战 | 双手上举保持 2 秒 |
| 提前结束 | 点击画面右下「结束」按钮 |

无需鼠标点击，全程通过肢体动作完成交互。

## 项目结构

```
src/
├── types/index.ts              # 全局类型 + 33 个关键点索引
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
│   └── useGameLoop.ts          # RAF 主循环 + 手势检测
├── components/
│   ├── camera/CameraCanvas     # 视频 + 骨骼画布
│   ├── layout/GameLayout       # 左右分屏布局
│   └── ui/
│       ├── StartScreen         # 开始界面（手势触发）
│       ├── Countdown           # 3-2-1 倒计时 / 休息倒计时
│       ├── HUD                 # 运动数据面板（计数/进度/保持环）
│       ├── MoveGuide           # 动作指南（底部）
│       ├── GesturePrompt       # 手势进度环提示
│       ├── EndButton           # 结束按钮
│       └── ResultScreen        # 结算界面（星级评定）
└── App.tsx                     # 根组件
```

## 架构

```
Camera → MediaPipe Pose → RuleEngine → LevelFSM → Zustand → React UI
                ↑                              ↑
        手势检测（idle/complete）        rules.ts (动作规则，闭包状态机)
```

- **RuleEngine**：管理动作规则，对外暴露 `judge(ruleId, pose) → ActionResult`
- **LevelFSM**：驱动关卡流程 `idle → countdown(3s) → active → rest(10s) → ... → complete`
- **GameLoop**：requestAnimationFrame 主循环，跳帧推理 + Canvas 镜像绘制 + 手势检测
- **Store**：Zustand 集中管理游戏状态，引擎层与 UI 层解耦

## 局域网测试（手机）

配置文件已启用 HTTPS 和局域网访问：

```bash
npm run dev
```

启动后用手机访问 `https://<你的IP>:5173/`，接受自签名证书即可。摄像头在 HTTPS 下正常工作。

## 注意事项

- 浏览器调用摄像头必须 HTTPS 或 localhost
- 模型文件位于 `public/models/pose_landmarker_lite.task`
- 动作规则判定使用原始坐标（非镜像），Canvas 绘制时才水平翻转
- 移动端建议限制视频分辨率 640×480，跳帧推理（每 2 帧检测一次）
