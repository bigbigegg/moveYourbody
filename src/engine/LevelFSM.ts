// ============================================================
// 关卡状态机
// 驱动关卡流程：idle → countdown → active → rest → (循环) → complete
// 每帧由外部调用 tick(deltaTime) 驱动计时器
// ============================================================

import type { ActionRule, LevelDynamicState, LevelPhase, MoveResult } from '../types';

/** 关卡配置 */
export interface LevelConfig {
  /** 每个动作开始前的倒计时秒数 */
  countdownDuration: number;
  /** 动作之间的休息秒数 */
  restDuration: number;
}

const DEFAULT_CONFIG: LevelConfig = {
  countdownDuration: 3,
  restDuration: 10,
};

export class LevelFSM {
  private rules: ActionRule[];
  private config: LevelConfig;
  private onPhaseChange: (state: LevelDynamicState) => void;

  // 运行时状态
  private phase: LevelPhase = 'idle';
  private currentMoveIndex = 0;
  private countdownTimer = 0;
  private restTimer = 0;
  private activeTimer = 0;
  private currentReps = 0;
  private currentAngle = 0;
  private currentStage = '';
  private moveResults: MoveResult[] = [];
  private currentMove: ActionRule | null = null;

  constructor(
    rules: ActionRule[],
    config: Partial<LevelConfig> = {},
    onPhaseChange: (state: LevelDynamicState) => void,
  ) {
    this.rules = rules;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onPhaseChange = onPhaseChange;
  }

  /** 用户点击「开始」 */
  start(): void {
    if (this.rules.length === 0) {
      console.warn('[LevelFSM] 没有配置任何动作');
      return;
    }

    this.currentMoveIndex = 0;
    this.moveResults = [];
    this.currentReps = 0;
    this.currentAngle = 0;
    this.currentStage = '';

    this.transitionTo('countdown');
  }

  /**
   * 每帧调用，deltaTime 为距离上一帧的秒数
   * 自动 clamp 到 [0, 1] 防止切后台后跳帧
   */
  tick(deltaTime: number): void {
    const dt = Math.max(0, Math.min(deltaTime, 1.0));

    switch (this.phase) {
      case 'countdown':
        this.tickCountdown(dt);
        break;
      case 'active':
        this.tickActive(dt);
        break;
      case 'rest':
        this.tickRest(dt);
        break;
      case 'idle':
      case 'complete':
        // 不执行任何操作
        break;
    }
  }

  /** 动作完成一次时调用 */
  onRepCompleted(result: { count: number }): void {
    this.currentReps = result.count;

    // 计次制动作用：达到目标次数后自动进入休息
    if (
      this.currentMove &&
      this.currentMove.targetType === 'reps' &&
      this.currentReps >= this.currentMove.targetValue
    ) {
      this.finishCurrentMove();
      // finishCurrentMove 内部会 emit
    } else {
      // 同步到 Zustand
      this.emit();
    }
  }

  /** 更新当前 Pose 数据（用于 HUD 显示） */
  updatePoseData(angle: number, stage: string): void {
    this.currentAngle = angle;
    this.currentStage = stage;
  }

  /** 强制结束（用户点击结束按钮） */
  forceComplete(): void {
    // 记录当前动作的结果（即使未完成）
    if (this.currentMove && this.phase === 'active') {
      this.moveResults.push({
        moveId: this.currentMove.id,
        moveName: this.currentMove.name,
        completed: this.currentReps,
        target: this.currentMove.targetValue,
        passed: this.currentReps >= this.currentMove.targetValue,
      });
    }
    this.transitionTo('complete');
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private prevCountdownDisplay = -1;
  private prevRestDisplay = -1;

  private tickCountdown(dt: number): void {
    this.countdownTimer -= dt;
    // 仅在显示数字变化时同步到 UI（避免每帧 re-render）
    const display = Math.ceil(this.countdownTimer);
    if (display !== this.prevCountdownDisplay) {
      this.prevCountdownDisplay = display;
      this.emit();
    }
    if (this.countdownTimer <= 0) {
      this.countdownTimer = 0;
      this.transitionTo('active');
    }
  }

  private tickActive(dt: number): void {
    // 计时制动作用：倒计时
    if (this.currentMove && this.currentMove.targetType === 'time') {
      this.activeTimer -= dt;
      // 每秒同步一次（ceil 变化时）
      const display = Math.ceil(this.activeTimer);
      if (display !== this._prevActiveDisplay) {
        this._prevActiveDisplay = display;
        this.emit();
      }
      if (this.activeTimer <= 0) {
        this.activeTimer = 0;
        this.finishCurrentMove();
      }
    }
  }
  private _prevActiveDisplay = -1;

  private tickRest(dt: number): void {
    this.restTimer -= dt;
    const display = Math.ceil(this.restTimer);
    if (display !== this.prevRestDisplay) {
      this.prevRestDisplay = display;
      this.emit();
    }
    if (this.restTimer <= 0) {
      this.restTimer = 0;
      if (this.currentMoveIndex >= this.rules.length) {
        this.transitionTo('complete');
      } else {
        // 休息后直接进入下一个动作，不再倒计时
        this.transitionTo('active');
      }
    }
  }

  private transitionTo(phase: LevelPhase): void {
    this.phase = phase;

    switch (phase) {
      case 'countdown':
        this.countdownTimer = this.config.countdownDuration;
        this.prevCountdownDisplay = -1;
        // 重置当前动作规则
        this.rules[this.currentMoveIndex].reset();
        this.currentReps = 0;
        this.currentAngle = 0;
        this.currentStage = '';
        break;

      case 'active':
        this.currentMove = this.rules[this.currentMoveIndex];
        this.activeTimer = this.currentMove.targetType === 'time'
          ? this.currentMove.targetValue
          : 0;
        this._prevActiveDisplay = -1;
        break;

      case 'rest':
        this.restTimer = this.config.restDuration;
        this.prevRestDisplay = -1;
        break;

      case 'complete': {
        // 确保最后一个动作的结果被记录
        // （计次制动作用在 finishCurrentMove 中已记录，这里做兜底）
        this.currentMove = null;
        break;
      }

      case 'idle':
        break;
    }

    this.emit();
  }

  private finishCurrentMove(): void {
    if (!this.currentMove) return;

    const passed = this.currentReps >= this.currentMove.targetValue;
    this.moveResults.push({
      moveId: this.currentMove.id,
      moveName: this.currentMove.name,
      completed: this.currentReps,
      target: this.currentMove.targetValue,
      passed,
    });

    this.currentMoveIndex++;
    this.currentReps = 0;
    this.currentAngle = 0;
    this.currentStage = '';

    // 判断是否所有动作已完成
    if (this.currentMoveIndex >= this.rules.length) {
      this.transitionTo('complete');
    } else {
      this.transitionTo('rest');
    }
  }

  /** 推送当前状态给外部回调 */
  private emit(): void {
    this.onPhaseChange(this.getState());
  }

  // ============================================================
  // 状态读取（供外部同步到 Zustand）
  // ============================================================

  getState(): LevelDynamicState {
    return {
      phase: this.phase,
      currentMoveIndex: this.currentMoveIndex,
      countdownSeconds: this.countdownTimer,
      restSeconds: this.restTimer,
      activeTimeLeft: this.activeTimer,
      currentReps: this.currentReps,
      currentAngle: this.currentAngle,
      currentStage: this.currentStage,
      moveResults: [...this.moveResults],
      currentMoveName: this.currentMove?.name ?? '',
    };
  }

  /** 销毁，清理回调引用 */
  destroy(): void {
    // 清理闭包引用，防止内存泄漏
  }
}
