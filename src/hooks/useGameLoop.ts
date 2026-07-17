// ============================================================
// 游戏主循环 Hook（RAF）
// 串联：视频帧 → 姿态检测 → 规则判定 → 状态更新 → Canvas 绘制
//
// 关键设计：
// 1. 跳帧推理：skipFrames 控制每 N 帧推理一次
// 2. 镜像翻转：Canvas 绘制时 ctx.scale(-1, 1)，但规则判定用原始坐标
// 3. deltaTime clamp 到 1 秒，防止切后台后跳帧
// 4. 用户离开摄像头 > 3 秒时停止计数
// ============================================================

import { useCallback, useRef } from 'react';
import type { Pose } from '../types';
import { useGameStore } from '../store/gameStore';
import { initAudio } from '../utils/audio';

interface UseGameLoopOptions {
  /** 每 N 帧执行一次姿态检测（移动端建议 2-3） */
  skipFrames: number;
}

interface UseGameLoopReturn {
  isRunning: boolean;
  start: () => void;
  stop: () => void;
}

/** 用户连续离开摄像头多少秒后显示提示 */
const MISSING_TIMEOUT = 3;

export function useGameLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  detectFn: React.MutableRefObject<(() => Pose | null) | null>,
  options: UseGameLoopOptions = { skipFrames: 2 },
): UseGameLoopReturn {
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const missingSinceRef = useRef<number | null>(null);
  const gestureHoldRef = useRef<number>(0);

  const store = useGameStore;

  const loop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    // 计算 deltaTime（秒），clamp 到 [0, 1] 防止切后台跳帧
    if (lastTimestampRef.current === 0) {
      lastTimestampRef.current = timestamp;
    }
    const deltaTime = Math.min((timestamp - lastTimestampRef.current) / 1000, 1.0);
    lastTimestampRef.current = timestamp;

    // 驱动 FSM 计时器
    store.getState().tick(deltaTime);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    // 同步 Canvas 尺寸与视频
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    frameCountRef.current++;

    // ---- Canvas 绘制（每帧都做） ----
    ctx.save();

    // 镜像翻转（前置摄像头照镜子效果）
    if (canvas.width > 0 && canvas.height > 0) {
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    // ---- 姿态检测（跳帧，所有阶段都检测） ----
    const phase = store.getState().phase;
    const shouldDetect = frameCountRef.current % options.skipFrames === 0;

    if (shouldDetect && detectFn.current) {
      const pose = detectFn.current();

      if (pose) {
        missingSinceRef.current = null;

        // ---- 手势检测（idle / complete 阶段） ----
        if (phase === 'idle' || phase === 'complete') {
          const lw = pose[15], rw = pose[16], ls = pose[11], rs = pose[12];
          const leftUp = lw && ls ? lw.y < ls.y - 0.05 : false;
          const rightUp = rw && rs ? rw.y < rs.y - 0.05 : false;
          const bothUp = leftUp && rightUp;

          gestureHoldRef.current = bothUp
            ? (gestureHoldRef.current ?? 0) + deltaTime
            : 0;

          // 保持 2 秒确认
          const progress = Math.min(gestureHoldRef.current / 2.0, 1.0);
          store.getState().setGestureProgress(progress);

          if (progress >= 1.0) {
            gestureHoldRef.current = 0;
            store.getState().setGestureProgress(0);
            // 触发对应操作
            if (phase === 'idle') {
              initAudio();
              store.getState().startLevel();
            } else {
              store.getState().reset();
              store.getState().initLevel();
            }
          }
        }

        if (phase === 'active') {
          const { ruleEngine } = store.getState();
          const { fsm } = store.getState();
          const state = fsm?.getState();
          if (!state) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          // 获取当前动作对应的规则 ID
          const rules = ruleEngine.getRuleIds();
          const currentRuleId = rules[state.currentMoveIndex];
          if (currentRuleId) {
            const result = ruleEngine.judge(currentRuleId, pose);

            // 更新 HUD 数据
            store.getState().updatePoseData(
              result.currentAngle ?? 0,
              result.stage ?? '',
            );

            // 每 60 帧输出一次调试信息
            if (frameCountRef.current % 60 === 0) {
              const lw = pose[15], rw = pose[16], ls = pose[11], rs = pose[12];
              console.log('[GameLoop] 手腕Y:', lw?.y?.toFixed(3), rw?.y?.toFixed(3),
                '肩膀Y:', ls?.y?.toFixed(3), rs?.y?.toFixed(3),
                'stage:', result.stage, 'count:', result.count);
            }

            // 动作完成通知
            if (result.detected) {
              console.log('[GameLoop] ✅ 动作完成! count:', result.count, 'stage:', result.stage);
              store.getState().onRepCompleted(result);
            }
          }
        }

        // 绘制骨骼（镜像翻转后绘制）
        // 注意：这里用 DrawingUtils 需要先翻转 canvas
        // DrawingUtils 需要 canvas context 来绘制
        ctx.save();
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
        }

        // 绘制关键点和连线
        drawSkeleton(ctx, pose, canvas.width, canvas.height);

        ctx.restore();
      } else {
        // 没有检测到人
        if (missingSinceRef.current === null) {
          missingSinceRef.current = timestamp;
        }

        const missingDuration = (timestamp - missingSinceRef.current) / 1000;
        if (missingDuration > MISSING_TIMEOUT && phase === 'active') {
          // 绘制提示文字
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.max(20, canvas.width / 20)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('请回到摄像头前', canvas.width / 2, canvas.height / 2);
          ctx.restore();
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef, canvasRef, detectFn, options.skipFrames]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    lastTimestampRef.current = 0;
    frameCountRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  return { isRunning: isRunningRef.current, start, stop };
}

// ============================================================
// 简易骨骼绘制（不依赖 DrawingUtils 实例）
// ============================================================

/** MediaPipe 骨骼连接线定义（部分） */
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // 肩部
  [11, 23], [12, 24], // 躯干
  [23, 24], // 髋部
  [11, 13], [13, 15], // 左臂
  [12, 14], [14, 16], // 右臂
  [23, 25], [25, 27], // 左腿
  [24, 26], [26, 28], // 右腿
];

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  width: number,
  height: number,
): void {
  if (pose.length === 0) return;

  // 绘制连接线
  ctx.strokeStyle = '#00FF88';
  ctx.lineWidth = Math.max(2, width / 320);
  ctx.lineCap = 'round';

  for (const [from, to] of POSE_CONNECTIONS) {
    const p1 = pose[from];
    const p2 = pose[to];
    if (!p1 || !p2) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  // 绘制关键点
  ctx.fillStyle = '#FF3366';
  for (let i = 0; i < pose.length; i++) {
    const p = pose[i];
    if (!p) continue;
    const r = i <= 10 ? Math.max(3, width / 200) : Math.max(4, width / 160);

    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, r, 0, 2 * Math.PI);
    ctx.fill();
  }
}
