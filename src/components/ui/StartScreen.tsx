// ============================================================
// 开始界面（右侧面板）
// 双手上举 2 秒开始
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { GesturePrompt } from './GesturePrompt';

export function StartScreen() {
  const cameraReady = useGameStore((s) => s.cameraReady);
  const modelLoaded = useGameStore((s) => s.modelLoaded);
  const cameraError = useGameStore((s) => s.cameraError);

  const isReady = cameraReady && modelLoaded;

  const moves = [
    { name: '手臂上举', icon: '🙌', target: '10 次' },
    { name: '双臂侧平举', icon: '🏋️', target: '10 次' },
    { name: '开合跳', icon: '⭐', target: '15 次' },
    { name: '躯干扭转', icon: '🔄', target: '10 次' },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full px-4">
      {/* 标题 */}
      <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
        晨间唤醒
      </h1>
      <p className="text-gray-400 text-xl mb-6">关卡一 · 4 个动作</p>

      {/* 动作列表 */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        {moves.map((move, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-3 text-left border border-white/10"
          >
            <span className="text-3xl">{move.icon}</span>
            <span className="text-xl font-medium text-white flex-1">{move.name}</span>
            <span className="text-lg text-green-400 font-mono">{move.target}</span>
          </div>
        ))}
      </div>

      {/* 错误提示 */}
      {cameraError && (
        <div className="w-full max-w-sm bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4 text-lg text-red-300">
          {cameraError}
        </div>
      )}

      {/* 状态 */}
      {!isReady && !cameraError && (
        <div className="text-gray-400 mb-4 text-lg">
          {!cameraReady ? '正在初始化摄像头...' : '正在加载识别模型...'}
        </div>
      )}

      {/* 手势提示（放大） */}
      {isReady && <GesturePrompt action="开始挑战" large />}
    </div>
  );
}
