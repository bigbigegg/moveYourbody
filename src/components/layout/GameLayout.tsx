// ============================================================
// 游戏布局：左右各占半屏，无留白
// ============================================================

import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';

interface GameLayoutProps {
  cameraPanel: ReactNode;
  children: ReactNode;
}

export function GameLayout({ cameraPanel, children }: GameLayoutProps) {
  const shakeKey = useGameStore((s) => s.shakeKey);

  return (
    <div key={shakeKey} className="w-screen h-screen bg-black flex overflow-hidden shake">
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
