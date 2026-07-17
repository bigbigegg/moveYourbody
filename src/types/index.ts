// ============================================================
// 全局类型定义
// ============================================================

/** MediaPipe 归一化关键点 (x, y, z 均在 0-1 范围) */
export interface Keypoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** 33 个关键点的人体姿态 */
export type Pose = Keypoint[];

/** MediaPipe Pose 关键点索引 */
export const LANDMARK = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type LandmarkIndex = (typeof LANDMARK)[keyof typeof LANDMARK];

/** 动作判定结果 */
export interface ActionResult {
  /** 本轮是否检测到一次完整动作 */
  detected: boolean;
  /** 累计完成次数 */
  count: number;
  /** 当前关节角度（用于 UI 展示） */
  currentAngle?: number;
  /** 状态机当前阶段 */
  stage?: string;
}

/** 动作目标类型 */
export type TargetType = 'reps' | 'time';

/** 动作规则接口 */
export interface ActionRule {
  /** 唯一标识 */
  id: string;
  /** 动作名称 */
  name: string;
  /** 动作描述 */
  description: string;
  /** 图标（emoji） */
  icon: string;
  /** 目标类型：计次制 或 计时制 */
  targetType: TargetType;
  /** 目标值：次数 或 秒数 */
  targetValue: number;
  /** 核心判定函数：输入 Pose，输出判定结果 */
  judge: (pose: Pose) => ActionResult;
  /** 获取当前进度（用于 HUD 显示） */
  getProgress: () => { count: number; stage: string; angle?: number };
  /** 重置内部状态（切换动作时调用） */
  reset: () => void;
}

/** 关卡阶段 */
export type LevelPhase =
  | 'idle'       // 未开始
  | 'countdown'  // 准备倒计时
  | 'active'     // 运动中
  | 'rest'       // 休息
  | 'complete';  // 全部完成

/** 单个动作的完成结果 */
export interface MoveResult {
  moveId: string;
  moveName: string;
  completed: number;
  target: number;
  passed: boolean;
}

/** 关卡动态状态（所有可变的运行时数据） */
export interface LevelDynamicState {
  phase: LevelPhase;
  currentMoveIndex: number;
  countdownSeconds: number;
  restSeconds: number;
  activeTimeLeft: number;
  currentReps: number;
  currentAngle: number;
  currentStage: string;
  moveResults: MoveResult[];
  currentMoveName: string;
}
