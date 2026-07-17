// ============================================================
// 倒计时组件
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { playCountdownBeep } from '../../utils/audio';

export function Countdown() {
  const phase = useGameStore((s) => s.phase);
  const countdownSeconds = useGameStore((s) => s.countdownSeconds);
  const restSeconds = useGameStore((s) => s.restSeconds);
  const currentMoveName = useGameStore((s) => s.currentMoveName);
  const moveResults = useGameStore((s) => s.moveResults);

  if (phase !== 'countdown' && phase !== 'rest') return null;

  const isCountdown = phase === 'countdown';
  const seconds = isCountdown ? countdownSeconds : restSeconds;
  const displayNum = Math.ceil(seconds);

  const nextMoveIndex = moveResults.length;
  const moves = ['手臂上举', '标准深蹲', '开合跳', '躯干扭转'];
  const nextMoveName = moves[nextMoveIndex] ?? '';

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full">
      {isCountdown ? (
        <>
          <div className="text-8xl font-bold text-white" key={displayNum}>
            {displayNum}
          </div>
          <p className="text-lg text-gray-300 mt-3">{currentMoveName}</p>
          <p className="text-sm text-gray-500 mt-1">准备...</p>
        </>
      ) : (
        <>
          <p className="text-xl text-gray-300 mb-3">休息一下 ☕</p>
          <div className="text-7xl font-bold text-green-400">
            {displayNum}
          </div>
          {nextMoveName && (
            <p className="text-base text-gray-400 mt-3">
              下一个：{nextMoveName}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** 倒计时音效 */
export function useCountdownBeep() {
  const countdownSeconds = useGameStore((s) => s.countdownSeconds);
  const restSeconds = useGameStore((s) => s.restSeconds);
  const phase = useGameStore((s) => s.phase);
  const prevRef = useRef<number>(-1);

  useEffect(() => {
    const seconds = phase === 'countdown' ? countdownSeconds : restSeconds;
    const display = Math.ceil(seconds);

    if (display !== prevRef.current && seconds > 0 && display <= 3) {
      playCountdownBeep();
    }
    prevRef.current = display;
  }, [countdownSeconds, restSeconds, phase]);
}
