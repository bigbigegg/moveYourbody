// ============================================================
// 动作指南 — 右侧面板底部
// ============================================================

import { useGameStore } from '../../store/gameStore';

export function MoveGuide() {
  const phase = useGameStore((s) => s.phase);
  const currentMoveIndex = useGameStore((s) => s.currentMoveIndex);

  if (phase !== 'active') return null;

  const moves = [
    { icon: '🙌', tips: '双臂上举，保持 1 秒' },
    { icon: '🏋️', tips: '手臂伸直向两侧展开，保持水平' },
    { icon: '⭐', tips: '保持节奏，手脚同时开合' },
    { icon: '🔄', tips: '骨盆不动，上半身左右扭转' },
  ];
  const move = moves[currentMoveIndex % moves.length];
  if (!move) return null;

  return (
    <div className="mt-auto pb-4 pt-2 w-full flex justify-center">
      <div className="bg-white/10 rounded-xl px-6 py-3 border border-white/10">
        <span className="text-2xl text-white">
          {move.icon} <span className="font-medium">{move.tips}</span>
        </span>
      </div>
    </div>
  );
}
