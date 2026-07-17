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
    { type: 'time' as const, target: 20 },
    { type: 'time' as const, target: 20 },
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
    <div className="flex flex-col items-center justify-center h-full w-full text-center">
      {/* 动作序号 */}
      <p className="text-sm text-gray-500 mb-1">动作 {currentMoveIndex + 1}/4</p>

      {/* 动作名称 */}
      <h2 className="text-2xl font-bold text-white mb-3">{currentMoveName}</h2>

      {/* 计数 / 倒计时 */}
      <div className="mb-3">
        {isReps ? (
          <div className="flex items-baseline gap-1 justify-center">
            <span className="text-5xl font-mono font-bold text-green-400">
              {currentReps}
            </span>
            <span className="text-xl text-gray-400">/ {currentTarget.target}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-mono font-bold text-blue-400">
                {Math.ceil(activeTimeLeft)}
              </span>
              <span className="text-xl text-gray-400">秒</span>
            </div>
            <span className="text-sm text-gray-500">完成 {currentReps} 次</span>
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-xs h-2 bg-white/20 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 膝关节角度（深蹲时显示） */}
      {currentMoveIndex === 1 && (
        <p className="text-sm text-gray-400 mb-2">
          膝关节角度：<span className="text-yellow-400 font-mono font-bold">{Math.round(currentAngle)}°</span>
        </p>
      )}

      {/* 当前状态 */}
      <div className="bg-white/10 rounded-full px-4 py-1.5 border border-white/10">
        <span className="text-base font-medium text-white">
          {stageLabel[currentStage] || currentStage || '准备'}
        </span>
      </div>
    </div>
  );
}
