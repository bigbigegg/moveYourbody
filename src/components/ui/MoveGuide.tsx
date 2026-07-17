// ============================================================
// 动作指南组件
// ============================================================

import { useGameStore } from '../../store/gameStore';

export function MoveGuide() {
  const phase = useGameStore((s) => s.phase);

  if (phase !== 'active' && phase !== 'rest') return null;

  const moves = [
    { icon: '🙌', tips: '手臂尽量伸直，感受肩部发力' },
    { icon: '🦵', tips: '膝盖不要超过脚尖，背挺直' },
    { icon: '⭐', tips: '保持节奏，落地轻巧' },
    { icon: '🔄', tips: '骨盆尽量不动，感受腰腹发力' },
  ];
  const currentMoveIndex = useGameStore((s) => s.currentMoveIndex);
  const move = moves[currentMoveIndex % moves.length];
  if (!move) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
      <span className="text-sm text-gray-300">
        {move.icon} {move.tips}
      </span>
    </div>
  );
}
