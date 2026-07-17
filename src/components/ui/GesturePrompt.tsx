// ============================================================
// 手势提示组件
// 显示"双手上举 2 秒"的视觉提示和进度环
// ============================================================

import { useGameStore } from '../../store/gameStore';

interface GesturePromptProps {
  action: string;
  large?: boolean;
}

export function GesturePrompt({ action, large = false }: GesturePromptProps) {
  const progress = useGameStore((s) => s.gestureProgress);
  const cameraReady = useGameStore((s) => s.cameraReady);
  const modelLoaded = useGameStore((s) => s.modelLoaded);

  if (!cameraReady || !modelLoaded) return null;

  const size = large ? 160 : 100;
  const strokeWidth = large ? 10 : 7;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 进度环 */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={progress >= 1 ? '#22c55e' : '#3b82f6'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-150"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={large ? 'text-6xl' : 'text-4xl'}>
            {progress >= 1 ? '✅' : '🙌'}
          </span>
        </div>
      </div>

      {/* 提示文字 */}
      <div className="text-center">
        <p className={`font-medium ${large ? 'text-2xl text-white' : 'text-lg text-white'}`}>
          {progress >= 1 ? `已确认：${action}` : `双手上举保持 2 秒`}
        </p>
        <p className={`mt-1 ${large ? 'text-lg text-gray-400' : 'text-base text-gray-500'}`}>
          {progress >= 1 ? '' : `→ ${action}`}
        </p>
      </div>
    </div>
  );
}
