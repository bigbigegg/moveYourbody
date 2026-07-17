// ============================================================
// HUD 组件：运动中的数据面板（右侧）
// ============================================================

import { useGameStore } from '../../store/gameStore';

export function HUD() {
  const phase = useGameStore((s) => s.phase);
  const currentMoveName = useGameStore((s) => s.currentMoveName);
  const currentReps = useGameStore((s) => s.currentReps);
  const currentAngle = useGameStore((s) => s.currentAngle);
  const currentStage = useGameStore((s) => s.currentStage);
  const activeTimeLeft = useGameStore((s) => s.activeTimeLeft);
  const currentMoveIndex = useGameStore((s) => s.currentMoveIndex);

  if (phase !== 'active') return null;

  const moveTargets = [
    { type: 'reps' as const, target: 10 },
    { type: 'reps' as const, target: 10 },
    { type: 'reps' as const, target: 15 },
    { type: 'reps' as const, target: 10 },
  ];
  const currentTarget = moveTargets[currentMoveIndex] ?? moveTargets[0];
  const isReps = currentTarget.type === 'reps';

  const progress = isReps
    ? Math.min(currentReps / currentTarget.target, 1)
    : activeTimeLeft > 0
      ? 1 - activeTimeLeft / currentTarget.target
      : 1;

  const stageLabel: Record<string, string> = {
    up: '站立',
    down: '蹲下',
    closed: '并拢',
    open: '张开',
    neutral: '中立',
    left: '左转',
    right: '右转',
  };

  return (
    <div className="flex flex-col items-center justify-center w-full text-center">
      {/* 动作序号 */}
      <p className="text-lg text-gray-500 mb-1">动作 {currentMoveIndex + 1}/4</p>

      {/* 动作名称 */}
      <h2 className="text-4xl font-bold text-white mb-4">{currentMoveName}</h2>

      {/* 计数 */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 justify-center">
          <span className="text-7xl font-mono font-bold text-green-400">
            {currentReps}
          </span>
          <span className="text-2xl text-gray-400">/ {currentTarget.target}</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-sm h-3 bg-white/20 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 手臂上举 / 侧平举：保持进度环 */}
      {(currentMoveIndex === 0 || currentMoveIndex === 1) && (
        <HoldProgressRing progress={currentAngle} />
      )}

      {/* 当前状态 */}
      <div className="bg-white/10 rounded-full px-6 py-2.5 border border-white/10">
        <span className="text-xl font-medium text-white">
          {stageLabel[currentStage] || currentStage || '准备'}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 保持进度环
// ============================================================

function HoldProgressRing({ progress }: { progress: number }) {
  const pct = Math.min(progress, 100);
  const size = 100;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 mb-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={pct >= 100 ? '#22c55e' : '#3b82f6'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-150"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base text-gray-400">
            {pct >= 100 ? '✅' : `${pct}%`}
          </span>
        </div>
      </div>
      <p className="text-base text-gray-400">
        {pct >= 100 ? '完成！' : '保持'}
      </p>
    </div>
  );
}
