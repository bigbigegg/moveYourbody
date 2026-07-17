// ============================================================
// 游戏布局：左右各占半屏，无留白
// ============================================================

import { type ReactNode, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

interface GameLayoutProps {
  cameraPanel: ReactNode;
  children: ReactNode;
}

export function GameLayout({ cameraPanel, children }: GameLayoutProps) {
  const shakeKey = useGameStore((s) => s.shakeKey);
  const containerRef = useRef<HTMLDivElement>(null);

  // 震动时短暂添加 shake 类，不移除 DOM
  useEffect(() => {
    if (shakeKey === 0) return; // 初始状态不触发
    const el = containerRef.current;
    if (!el) return;
    el.classList.add('shake');
    const timer = setTimeout(() => el.classList.remove('shake'), 400);
    return () => clearTimeout(timer);
  }, [shakeKey]);

  return (
    <div ref={containerRef} className="w-screen h-screen bg-black flex overflow-hidden">
      {/* 左侧：摄像头预览 — 半屏 */}
      <div className="w-1/2 h-full flex items-center justify-center bg-black p-2">
        {cameraPanel}
      </div>

      {/* 右侧：游戏 UI — 半屏 */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center bg-zinc-950 p-4">
        {children}
      </div>
    </div>
  );
}
