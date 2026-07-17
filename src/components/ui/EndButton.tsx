// ============================================================
// 结束按钮 — 画面正下方
// ============================================================

import { useGameStore } from '../../store/gameStore';

export function EndButton() {
  const phase = useGameStore((s) => s.phase);

  // 仅在运动/倒计时/休息时显示
  if (phase === 'idle' || phase === 'complete') return null;

  const handleEnd = () => {
    const { fsm } = useGameStore.getState();
    if (fsm) {
      // 记录当前动作结果后直接结束
      fsm.forceComplete();
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <button
        onClick={handleEnd}
        className="px-6 py-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium backdrop-blur-sm border border-red-400/30 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        结束
      </button>
    </div>
  );
}
