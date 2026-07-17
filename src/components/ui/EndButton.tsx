// ============================================================
// 结束按钮 — 右侧面板底部
// ============================================================

import { useGameStore } from '../../store/gameStore';

export function EndButton() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'idle' || phase === 'complete') return null;

  const handleEnd = () => {
    const { fsm } = useGameStore.getState();
    if (fsm) {
      fsm.forceComplete();
    }
  };

  return (
    <div className="w-full flex justify-center pb-4">
      <button
        onClick={handleEnd}
        className="px-8 py-3 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xl font-medium backdrop-blur-sm border border-red-400/30 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        结束
      </button>
    </div>
  );
}
