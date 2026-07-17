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
  depthDiff,
  distance,
  isWristAboveShoulder,
} from '../utils/geometry';

// ============================================================
// 阈值常量（可根据实测调整）
// ============================================================

/** 手臂上举：手腕需比肩膀高出的归一化距离 */
const ARM_RAISE_THRESHOLD = 0.05;

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
      // 保持进度 0-100（通过 currentAngle 传给 HUD）
      let holdProgress = 0;

      if (stage === 'down' && bothUp) {
        stage = 'up';
        holdStartTime = Date.now();
      } else if (stage === 'up') {
        if (!bothUp) {
          stage = 'down';
          holdStartTime = null;
        } else if (holdStartTime) {
          const elapsed = Date.now() - holdStartTime;
          holdProgress = Math.round(Math.min(elapsed / ARM_RAISE_HOLD_MS, 1) * 100);
          if (elapsed >= ARM_RAISE_HOLD_MS) {
            stage = 'completed';
            count++;
            detected = true;
            holdStartTime = null;
          }
        }
      } else if (stage === 'completed' && bothDown) {
        stage = 'down';
      }

      return { detected, count, currentAngle: holdProgress, stage };
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
// 规则 2：双臂侧平举 (Side Arm Raises)
// 要求：双臂向两侧平举至肩高，保持 1 秒
// ============================================================

/** 侧平举：手腕 Y 与肩膀 Y 的允许偏差 */
const SIDE_RAISE_Y_THRESHOLD = 0.08;
/** 侧平举需要保持的毫秒数 */
const SIDE_RAISE_HOLD_MS = 1000;

function createSideArmRaisesRule(): ActionRule {
  let stage: 'down' | 'up' | 'completed' = 'down';
  let count = 0;
  let holdStartTime: number | null = null;

  return {
    id: 'side_arm_raises',
    name: '双臂侧平举',
    description: '双臂向两侧平举至与肩同高，保持1秒',
    icon: '🏋️',
    targetType: 'reps',
    targetValue: 10,

    judge(pose: Pose) {
      const lw = pose[LANDMARK.LEFT_WRIST];
      const rw = pose[LANDMARK.RIGHT_WRIST];
      const ls = pose[LANDMARK.LEFT_SHOULDER];
      const rs = pose[LANDMARK.RIGHT_SHOULDER];

      // 双臂水平：手腕 Y 接近肩膀 Y
      const leftHorizontal = Math.abs(lw.y - ls.y) < SIDE_RAISE_Y_THRESHOLD;
      const rightHorizontal = Math.abs(rw.y - rs.y) < SIDE_RAISE_Y_THRESHOLD;
      // 双臂张开：左右手腕间距较大（> 肩宽 × 1.5）
      const armsWide = distance(lw, rw) > distance(ls, rs) * 1.5;
      const bothUp = leftHorizontal && rightHorizontal && armsWide;
      const bothDown = !leftHorizontal && !rightHorizontal;

      let detected = false;
      let holdProgress = 0;

      if (stage === 'down' && bothUp) {
        stage = 'up';
        holdStartTime = Date.now();
      } else if (stage === 'up') {
        if (!bothUp) {
          stage = 'down';
          holdStartTime = null;
        } else if (holdStartTime) {
          const elapsed = Date.now() - holdStartTime;
          holdProgress = Math.round(Math.min(elapsed / SIDE_RAISE_HOLD_MS, 1) * 100);
          if (elapsed >= SIDE_RAISE_HOLD_MS) {
            stage = 'completed';
            count++;
            detected = true;
            holdStartTime = null;
          }
        }
      } else if (stage === 'completed' && bothDown) {
        stage = 'down';
      }

      return { detected, count, currentAngle: holdProgress, stage };
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
// 规则 3：开合跳 (Jumping Jacks)
// 严格判定：双腿合拢+双手垂直放下 → 双腿岔开+双臂侧平举
// ============================================================

/** 开合跳：手臂水平偏差阈值 */
const JJ_ARM_HORIZONTAL = 0.10;

function createJumpingJacksRule(): ActionRule {
  let stage: 'closed' | 'open' = 'closed';
  let count = 0;

  return {
    id: 'jumping_jacks',
    name: '开合跳',
    description: '跳起时手脚张开，落地时手脚并拢',
    icon: '⭐',
    targetType: 'reps',
    targetValue: 15,

    judge(pose: Pose) {
      const lw = pose[LANDMARK.LEFT_WRIST];
      const rw = pose[LANDMARK.RIGHT_WRIST];
      const la = pose[LANDMARK.LEFT_ANKLE];
      const ra = pose[LANDMARK.RIGHT_ANKLE];
      const ls = pose[LANDMARK.LEFT_SHOULDER];
      const rs = pose[LANDMARK.RIGHT_SHOULDER];
      const lh = pose[LANDMARK.LEFT_HIP];
      const rh = pose[LANDMARK.RIGHT_HIP];

      const shoulderWidth = distance(ls, rs);
      const hipWidth = distance(lh, rh);
      const wristDist = distance(lw, rw);
      const ankleDist = distance(la, ra);

      // 手臂状态
      const armsDown =
        lw.y > ls.y + ARM_RAISE_THRESHOLD && rw.y > rs.y + ARM_RAISE_THRESHOLD;
      const armsHorizontal =
        Math.abs(lw.y - ls.y) < JJ_ARM_HORIZONTAL &&
        Math.abs(rw.y - rs.y) < JJ_ARM_HORIZONTAL &&
        wristDist > shoulderWidth * 1.5;

      // 腿部状态
      const legsTogether = ankleDist < hipWidth * JJ_CLOSED_RATIO;
      const legsApart = ankleDist > hipWidth * JJ_OPEN_RATIO;

      // 闭合：双腿合拢 + 双手垂直放下
      const isClosed = legsTogether && armsDown;
      // 张开：双腿岔开 + 双臂侧平举
      const isOpen = legsApart && armsHorizontal;

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
    targetType: 'reps',
    targetValue: 10,

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
    createSideArmRaisesRule(),
    createJumpingJacksRule(),
    createTorsoTwistsRule(),
  ];
}
