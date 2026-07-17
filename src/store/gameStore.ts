// ============================================================
// Zustand 游戏状态管理
// 连接引擎层（RuleEngine + LevelFSM）与 React UI 层
// ============================================================

import { create } from 'zustand';
import type { ActionResult, LevelDynamicState, LevelPhase } from '../types';
import { RuleEngine } from '../engine/RuleEngine';
import { LevelFSM } from '../engine/LevelFSM';
import { getLevelOneRuleList } from '../engine/rules';

interface GameStore extends LevelDynamicState {
  // 额外状态
  cameraReady: boolean;
  modelLoaded: boolean;
  cameraError: string | null;

  // 内部引用（不触发 re-render）
  ruleEngine: RuleEngine;
  fsm: LevelFSM | null;

  // Actions
  initLevel: () => void;
  startLevel: () => void;
  /** 每帧调用，deltaTime 秒 */
  tick: (deltaTime: number) => void;
  /** 动作完成一次 */
  onRepCompleted: (result: ActionResult) => void;
  /** 更新姿态数据（HUD 展示用） */
  updatePoseData: (angle: number, stage: string) => void;
  /** 设置摄像头状态 */
  setCameraReady: (ready: boolean) => void;
  setModelLoaded: (loaded: boolean) => void;
  setCameraError: (error: string | null) => void;
  /** 完全重置 */
  reset: () => void;
}

const initialDynamicState: LevelDynamicState = {
  phase: 'idle' as LevelPhase,
  currentMoveIndex: 0,
  countdownSeconds: 0,
  restSeconds: 0,
  activeTimeLeft: 0,
  currentReps: 0,
  currentAngle: 0,
  currentStage: '',
  moveResults: [],
  currentMoveName: '',
};

export const useGameStore = create<GameStore>((set, get) => ({
  // ---- 初始状态 ----
  ...initialDynamicState,
  cameraReady: false,
  modelLoaded: false,
  cameraError: null,
  ruleEngine: new RuleEngine(),
  fsm: null,

  // ---- Actions ----

  initLevel: () => {
    console.log('[store] initLevel 开始');
    const { ruleEngine } = get();
    ruleEngine.resetAll();

    const rules = getLevelOneRuleList();
    console.log('[store] 注册规则:', rules.map(r => r.name));
    rules.forEach((rule) => ruleEngine.register(rule));

    const fsm = new LevelFSM(rules, {}, (state: LevelDynamicState) => {
      console.log('[store] FSM 状态变更:', state.phase);
      set({ ...state });
    });

    set({ fsm, ...initialDynamicState });
    console.log('[store] initLevel 完成, fsm:', !!fsm);
  },

  startLevel: () => {
    const { fsm } = get();
    console.log('[store] startLevel 被调用, fsm 存在:', !!fsm);
    if (fsm) {
      fsm.start();
      console.log('[store] fsm.start() 已调用, 当前 phase:', fsm.getState().phase);
    } else {
      console.warn('[store] fsm 为空，无法开始');
    }
  },

  tick: (deltaTime: number) => {
    const { fsm } = get();
    if (fsm) {
      fsm.tick(deltaTime);
    }
  },

  onRepCompleted: (result: ActionResult) => {
    const { fsm } = get();
    fsm?.onRepCompleted(result);
  },

  updatePoseData: (angle: number, stage: string) => {
    const { fsm } = get();
    fsm?.updatePoseData(angle, stage);
    // 同步到 store 以便 UI 响应式更新
    set({ currentAngle: angle, currentStage: stage });
  },

  setCameraReady: (ready: boolean) => set({ cameraReady: ready }),
  setModelLoaded: (loaded: boolean) => set({ modelLoaded: loaded }),
  setCameraError: (error: string | null) => set({ cameraError: error }),

  reset: () => {
    const { ruleEngine } = get();
    ruleEngine.resetAll();
    set({ ...initialDynamicState, moveResults: [] });
  },
}));
