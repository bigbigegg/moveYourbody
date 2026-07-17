// ============================================================
// 关卡一：4 个动作规则
// 每个规则用闭包维护内部状态机，返回 ActionRule 对象
//
// 重要：规则判定使用 MediaPipe 原始坐标（非镜像翻转后的坐标）
// 所有阈值定义为文件顶部常量，便于调参
// ============================================================

import type { ActionRule, Pose } from '../types';
import { LANDMARK } from '../types';
import {
  calculateAngle,
  calculateTorsoLeanAngle,
  depthDiff,
  distance,
  isWristAboveShoulder,
} from '../utils/geometry';

// ============================================================
// 阈值常量（可根据实测调整）
// ============================================================

/** 手臂上举：手腕需比肩膀高出的归一化距离 */
const ARM_RAISE_THRESHOLD = 0.05;

/** 深蹲：膝关节角度大于此值视为站立 */
const SQUAT_UP_ANGLE = 140;
/** 深蹲：膝关节角度小于此值视为蹲下 */
const SQUAT_DOWN_ANGLE = 100;
/** 深蹲：躯干前倾角度超过此值视为弯腰代偿，不计数 */
const SQUAT_TORSO_LEAN_MAX = 30;

/** 开合跳：闭合状态下手脚间距倍率上限（相对于肩宽/骨盆宽） */
const JJ_CLOSED_RATIO = 1.2;
/** 开合跳：张开状态下手脚间距倍率下限 */
const JJ_OPEN_RATIO = 1.8;

/** 躯干扭转：Z 轴差值绝对值大于此值视为扭转 */
const TWIST_THRESHOLD = 0.05;

// ============================================================
// 规则 1：手臂上举 (Arm Raises)
// 要求：双臂同时上举，保持 1 秒后算 1 次
// 状态机：down → up(计时) → completed → down
// ============================================================

/** 双臂上举需要保持的毫秒数 */
const ARM_RAISE_HOLD_MS = 1000;

function createArmRaisesRule(): ActionRule {
  let stage: 'down' | 'up' | 'completed' = 'down';
  let count = 0;
  let holdStartTime: number | null = null;

  return {
    id: 'arm_raises',
    name: '手臂上举',
    description: '双臂同时举过头顶，保持1秒',
    icon: '🙌',
    targetType: 'reps',
    targetValue: 10,

    judge(pose: Pose) {
      const leftWrist = pose[LANDMARK.LEFT_WRIST];
      const rightWrist = pose[LANDMARK.RIGHT_WRIST];
      const leftShoulder = pose[LANDMARK.LEFT_SHOULDER];
      const rightShoulder = pose[LANDMARK.RIGHT_SHOULDER];

      const leftUp = isWristAboveShoulder(leftWrist, leftShoulder, ARM_RAISE_THRESHOLD);
      const rightUp = isWristAboveShoulder(rightWrist, rightShoulder, ARM_RAISE_THRESHOLD);
      const bothUp = leftUp && rightUp;
      const bothDown = !leftUp && !rightUp;

      let detected = false;

      if (stage === 'down' && bothUp) {
        // 双臂同时上举 → 开始计时
        stage = 'up';
        holdStartTime = Date.now();
      } else if (stage === 'up') {
        if (!bothUp) {
          // 手臂放下了，重置
          stage = 'down';
          holdStartTime = null;
        } else if (holdStartTime && Date.now() - holdStartTime >= ARM_RAISE_HOLD_MS) {
          // 保持 1 秒 → 完成 1 次
          stage = 'completed';
          count++;
          detected = true;
          holdStartTime = null;
        }
      } else if (stage === 'completed' && bothDown) {
        // 手臂放下 → 准备下一次
        stage = 'down';
      }

      return { detected, count, stage };
    },

    getProgress() {
      return { count, stage };
    },

    reset() {
      stage = 'down';
      count = 0;
      holdStartTime = null;
    },
  };
}

// ============================================================
// 规则 2：标准深蹲 (Squats)
// ============================================================

function createSquatsRule(): ActionRule {
  let stage: 'up' | 'down' = 'up';
  let count = 0;
  let currentAngle = 180;
  let firstDetection = true;

  return {
    id: 'squats',
    name: '标准深蹲',
    description: '双脚与肩同宽，臀部向后坐，膝盖弯曲下蹲',
    icon: '🦵',
    targetType: 'reps',
    targetValue: 10,

    judge(pose: Pose) {
      const hip = pose[LANDMARK.RIGHT_HIP];
      const knee = pose[LANDMARK.RIGHT_KNEE];
      const ankle = pose[LANDMARK.RIGHT_ANKLE];
      const leftShoulder = pose[LANDMARK.LEFT_SHOULDER];
      const rightShoulder = pose[LANDMARK.RIGHT_SHOULDER];
      const leftHip = pose[LANDMARK.LEFT_HIP];
      const rightHip = pose[LANDMARK.RIGHT_HIP];

      currentAngle = calculateAngle(hip, knee, ankle);

      // 检查躯干是否过度前倾（弯腰代偿）
      const torsoLean = calculateTorsoLeanAngle(
        leftShoulder, rightShoulder, leftHip, rightHip,
      );
      const isGoodForm = torsoLean < SQUAT_TORSO_LEAN_MAX;

      let detected = false;

      // 首次检测：如果用户一开始就蹲着，先进入 down 状态
      if (firstDetection && currentAngle < SQUAT_DOWN_ANGLE) {
        stage = 'down';
      }
      firstDetection = false;

      if (currentAngle > SQUAT_UP_ANGLE && stage === 'down' && isGoodForm) {
        // 蹲下后站起，且姿势标准
        stage = 'up';
        count++;
        detected = true;
      } else if (currentAngle < SQUAT_DOWN_ANGLE && stage === 'up') {
        // 从站立到蹲下
        stage = 'down';
      }
      // 如果姿势不标准（弯腰），只更新角度不计数
      // 如果角度回到 up 范围且当前是 down，但不满足 isGoodForm，不计数

      return { detected, count, currentAngle, stage };
    },

    getProgress() {
      return { count, stage, angle: currentAngle };
    },

    reset() {
      stage = 'up';
      count = 0;
      currentAngle = 180;
      firstDetection = true;
    },
  };
}

// ============================================================
// 规则 3：开合跳 (Jumping Jacks)
// ============================================================

function createJumpingJacksRule(): ActionRule {
  let stage: 'closed' | 'open' = 'closed';
  let count = 0;

  return {
    id: 'jumping_jacks',
    name: '开合跳',
    description: '跳起时手脚张开，落地时手脚并拢',
    icon: '⭐',
    targetType: 'time',
    targetValue: 20, // 20 秒

    judge(pose: Pose) {
      const leftWrist = pose[LANDMARK.LEFT_WRIST];
      const rightWrist = pose[LANDMARK.RIGHT_WRIST];
      const leftAnkle = pose[LANDMARK.LEFT_ANKLE];
      const rightAnkle = pose[LANDMARK.RIGHT_ANKLE];
      const leftShoulder = pose[LANDMARK.LEFT_SHOULDER];
      const rightShoulder = pose[LANDMARK.RIGHT_SHOULDER];
      const leftHip = pose[LANDMARK.LEFT_HIP];
      const rightHip = pose[LANDMARK.RIGHT_HIP];

      const shoulderWidth = distance(leftShoulder, rightShoulder);
      const hipWidth = distance(leftHip, rightHip);
      const wristDist = distance(leftWrist, rightWrist);
      const ankleDist = distance(leftAnkle, rightAnkle);

      const isOpen =
        wristDist > shoulderWidth * JJ_OPEN_RATIO &&
        ankleDist > hipWidth * JJ_OPEN_RATIO;
      const isClosed =
        wristDist < shoulderWidth * JJ_CLOSED_RATIO &&
        ankleDist < hipWidth * JJ_CLOSED_RATIO;

      let detected = false;

      if (stage === 'closed' && isOpen) {
        stage = 'open';
      } else if (stage === 'open' && isClosed) {
        stage = 'closed';
        count++;
        detected = true;
      }

      return { detected, count, stage };
    },

    getProgress() {
      return { count, stage };
    },

    reset() {
      stage = 'closed';
      count = 0;
    },
  };
}

// ============================================================
// 规则 4：躯干扭转 (Torso Twists)
// ============================================================

function createTorsoTwistsRule(): ActionRule {
  let stage: 'neutral' | 'left' | 'right' = 'neutral';
  let count = 0;
  /** 上次完成的方向，用于强制交替 */
  let lastSide: 'left' | 'right' | null = null;

  return {
    id: 'torso_twists',
    name: '躯干扭转',
    description: '保持下半身稳定，上半身左右扭转',
    icon: '🔄',
    targetType: 'time',
    targetValue: 20, // 20 秒

    judge(pose: Pose) {
      const leftShoulder = pose[LANDMARK.LEFT_SHOULDER];
      const rightShoulder = pose[LANDMARK.RIGHT_SHOULDER];

      const dz = depthDiff(leftShoulder, rightShoulder);
      // dz > 0: 左肩在右肩后面 → 身体左转
      // dz < 0: 右肩在左肩后面 → 身体右转

      let detected = false;

      if (Math.abs(dz) < TWIST_THRESHOLD) {
        // 回到中立位
        if (stage === 'left' || stage === 'right') {
          // 从中立位到扭转再回到中立位，计一次
          // 但需要确保是交替的（不能连续两次同方向）
          const completedSide = stage;
          if (lastSide === null || lastSide !== completedSide) {
            count++;
            detected = true;
            lastSide = completedSide;
          }
        }
        stage = 'neutral';
      } else if (dz > TWIST_THRESHOLD && stage === 'neutral') {
        stage = 'left'; // 身体左转
      } else if (dz < -TWIST_THRESHOLD && stage === 'neutral') {
        stage = 'right'; // 身体右转
      }

      return { detected, count, currentAngle: dz, stage };
    },

    getProgress() {
      return { count, stage, angle: 0 };
    },

    reset() {
      stage = 'neutral';
      count = 0;
      lastSide = null;
    },
  };
}

// ============================================================
// 导出
// ============================================================

/** 创建关卡一的所有动作规则 */
export function createLevelOneRules(): Map<string, ActionRule> {
  const rules = new Map<string, ActionRule>();
  const ruleList = [
    createArmRaisesRule(),
    createSquatsRule(),
    createJumpingJacksRule(),
    createTorsoTwistsRule(),
  ];
  for (const rule of ruleList) {
    rules.set(rule.id, rule);
  }
  return rules;
}

/** 按顺序获取关卡一的动作规则（用于关卡流程） */
export function getLevelOneRuleList(): ActionRule[] {
  return [
    createArmRaisesRule(),
    createSquatsRule(),
    createJumpingJacksRule(),
    createTorsoTwistsRule(),
  ];
}
