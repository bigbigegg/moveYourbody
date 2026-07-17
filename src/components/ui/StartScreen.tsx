// ============================================================
// 开始界面（右侧面板）
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { initAudio } from '../../utils/audio';

export function StartScreen() {
  const startLevel = useGameStore((s) => s.startLevel);
  const cameraReady = useGameStore((s) => s.cameraReady);
  const modelLoaded = useGameStore((s) => s.modelLoaded);
  const cameraError = useGameStore((s) => s.cameraError);

  const isReady = cameraReady && modelLoaded;

  const handleStart = () => {
    initAudio();
    startLevel();
  };

  const moves = [
    { name: '手臂上举', icon: '🙌', target: '10 次' },
    { name: '标准深蹲', icon: '🦵', target: '10 次' },
    { name: '开合跳', icon: '⭐', target: '20 秒' },
    { name: '躯干扭转', icon: '🔄', target: '20 秒' },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center h-full w-full">
      {/* 标题 */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-1 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
        晨间唤醒
      </h1>
      <p className="text-gray-400 text-sm mb-5">关卡一 · 4 个动作</p>

      {/* 动作列表 */}
      <div className="w-full max-w-xs space-y-2 mb-5">
        {moves.map((move, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 text-left border border-white/10"
          >
            <span className="text-xl">{move.icon}</span>
            <span className="text-sm font-medium text-white flex-1">{move.name}</span>
            <span className="text-xs text-green-400 font-mono">{move.target}</span>
          </div>
        ))}
      </div>

      {/* 错误提示 */}
      {cameraError && (
        <div className="w-full max-w-xs bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-3 text-sm text-red-300">
          {cameraError}
        </div>
      )}

      {/* 状态 */}
      {!isReady && !cameraError && (
        <div className="text-gray-400 mb-3 text-sm">
          {!cameraReady ? '正在初始化摄像头...' : '正在加载识别模型...'}
        </div>
      )}

      {/* 开始按钮 */}
      <button
        onClick={handleStart}
        disabled={!isReady}
        className={`w-full max-w-xs py-3 rounded-xl text-lg font-bold transition-all duration-300 ${
          isReady
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isReady ? '开始挑战' : '准备中...'}
      </button>
    </div>
  );
}
