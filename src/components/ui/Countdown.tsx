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
  const moves = ['手臂上举', '双臂侧平举', '开合跳', '躯干扭转'];
  const nextMoveName = moves[nextMoveIndex] ?? '';

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full">
      {isCountdown ? (
        <>
          <div className="text-[10rem] font-bold text-white leading-none" key={displayNum}>
            {displayNum}
          </div>
          <p className="text-2xl text-gray-300 mt-4">{currentMoveName}</p>
          <p className="text-lg text-gray-500 mt-2">准备...</p>
        </>
      ) : (
        <>
          <p className="text-2xl text-gray-300 mb-4">休息一下 ☕</p>
          <div className="text-9xl font-bold text-green-400">
            {displayNum}
          </div>
          {nextMoveName && (
            <p className="text-xl text-gray-400 mt-4">
              下一个：{nextMoveName}
            </p>
          )}
        </>
      )}
    </div>
  );
}

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
