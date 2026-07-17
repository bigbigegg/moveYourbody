// ============================================================
// 结算界面
// 双手上举 2 秒重新挑战
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { playSuccess } from '../../utils/audio';
import { useEffect } from 'react';
import { GesturePrompt } from './GesturePrompt';

export function ResultScreen() {
  const phase = useGameStore((s) => s.phase);
  const moveResults = useGameStore((s) => s.moveResults);

  if (phase !== 'complete') return null;

  useEffect(() => {
    playSuccess();
  }, []);

  const passedCount = moveResults.filter((r) => r.passed).length;
  const totalCount = moveResults.length;

  let stars = 0;
  if (totalCount > 0) {
    if (passedCount === totalCount) stars = 3;
    else if (passedCount >= totalCount * 0.75) stars = 2;
    else if (passedCount >= totalCount * 0.5) stars = 1;
  }

  const starEmoji = ['😅', '⭐', '⭐⭐', '🌟🌟🌟'];

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full px-4">
      <h1 className="text-5xl font-bold mb-3">🎉 关卡完成！</h1>
      <div className="text-5xl mb-4">{starEmoji[stars]}</div>

      {stars === 3 ? (
        <p className="text-green-400 text-2xl mb-5">全部达标！太棒了！</p>
      ) : (
        <p className="text-yellow-400 text-2xl mb-5">
          {passedCount}/{totalCount} 达标，继续加油！
        </p>
      )}

      {/* 各动作结果 */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {moveResults.map((result, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-5 py-3 text-left text-lg border ${
              result.passed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <span className="text-xl">{result.passed ? '✅' : '❌'}</span>
            <span className="font-medium text-white flex-1">{result.moveName}</span>
            <span className="text-gray-400">
              {result.completed}/{result.target}
            </span>
          </div>
        ))}
      </div>

      {/* 手势提示（放大） */}
      <GesturePrompt action="重新挑战" large />
    </div>
  );
}
