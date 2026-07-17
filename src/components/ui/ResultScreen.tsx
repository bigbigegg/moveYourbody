// ============================================================
// 结算界面
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { playSuccess } from '../../utils/audio';
import { useEffect } from 'react';

export function ResultScreen() {
  const phase = useGameStore((s) => s.phase);
  const moveResults = useGameStore((s) => s.moveResults);
  const reset = useGameStore((s) => s.reset);

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

  const handleRestart = () => {
    reset();
    // 重新初始化关卡
    const { initLevel } = useGameStore.getState();
    initLevel();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full">
      <h1 className="text-2xl font-bold mb-2">🎉 关卡完成！</h1>
      <div className="text-3xl mb-3">{starEmoji[stars]}</div>

      {stars === 3 ? (
        <p className="text-green-400 mb-4">全部达标！太棒了！</p>
      ) : (
        <p className="text-yellow-400 mb-4">
          {passedCount}/{totalCount} 达标，继续加油！
        </p>
      )}

      {/* 各动作结果 */}
      <div className="w-full max-w-xs space-y-1.5 mb-5">
        {moveResults.map((result, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm border ${
              result.passed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <span>{result.passed ? '✅' : '❌'}</span>
            <span className="font-medium text-white flex-1">{result.moveName}</span>
            <span className="text-gray-400 text-xs">
              {result.completed}/{result.target}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleRestart}
        className="w-full max-w-xs py-3 rounded-xl text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95 transition-all duration-300"
      >
        重新挑战
      </button>
    </div>
  );
}
