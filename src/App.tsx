// ============================================================
// App 根组件
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useCamera } from './hooks/useCamera';
import { usePoseDetector } from './hooks/usePoseDetector';
import { useGameLoop } from './hooks/useGameLoop';
import { GameLayout } from './components/layout/GameLayout';
import { CameraCanvas } from './components/camera/CameraCanvas';
import { StartScreen } from './components/ui/StartScreen';
import { Countdown, useCountdownBeep } from './components/ui/Countdown';
import { HUD } from './components/ui/HUD';
import { MoveGuide } from './components/ui/MoveGuide';
import { ResultScreen } from './components/ui/ResultScreen';
import { EndButton } from './components/ui/EndButton';
import { ParticleOverlay } from './components/effects/ParticleOverlay';
import type { Pose } from './types';

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectFnRef = useRef<(() => Pose | null) | null>(null);

  // ---- Store ----
  const phase = useGameStore((s) => s.phase);
  const initLevel = useGameStore((s) => s.initLevel);
  const setCameraReady = useGameStore((s) => s.setCameraReady);
  const setModelLoaded = useGameStore((s) => s.setModelLoaded);
  const setCameraError = useGameStore((s) => s.setCameraError);

  // ---- Hooks ----
  const camera = useCamera(videoRef);
  const poseDetector = usePoseDetector(videoRef);
  const gameLoop = useGameLoop(videoRef, canvasRef, detectFnRef, { skipFrames: 2 });

  useCountdownBeep();

  // 同步 detect 函数到 ref
  useEffect(() => {
    detectFnRef.current = poseDetector.detect;
  }, [poseDetector.detect]);

  // ---- 初始化关卡 ----
  useEffect(() => {
    initLevel();
  }, []); // eslint-disable-line

  // ---- 摄像头 + 模型初始化（仅一次） ----
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const init = async () => {
      await camera.startCamera();
      await poseDetector.loadModel();
    };
    init();
  }, []); // eslint-disable-line

  // ---- 同步状态到 store ----
  useEffect(() => {
    setCameraReady(camera.isReady);
  }, [camera.isReady, setCameraReady]);

  useEffect(() => {
    if (camera.error) setCameraError(camera.error);
  }, [camera.error, setCameraError]);

  useEffect(() => {
    setModelLoaded(poseDetector.isLoaded);
  }, [poseDetector.isLoaded, setModelLoaded]);

  // ---- 启动游戏循环 ----
  const loopStarted = useRef(false);
  useEffect(() => {
    if (camera.isReady && poseDetector.isLoaded && !loopStarted.current) {
      loopStarted.current = true;
      gameLoop.start();
    }
  }, [camera.isReady, poseDetector.isLoaded, gameLoop]);

  // ---- 页面可见性处理 ----
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        gameLoop.stop();
      } else if (phase !== 'idle' && phase !== 'complete') {
        gameLoop.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [gameLoop, phase]);

  // ---- 渲染 ----

  return (
    <GameLayout cameraPanel={<CameraCanvas videoRef={videoRef} canvasRef={canvasRef} />}>
      <ParticleOverlay />
      {phase === 'idle' && <StartScreen />}
      {(phase === 'countdown' || phase === 'rest') && (
        <>
          <Countdown />
          <EndButton />
        </>
      )}
      {phase === 'active' && (
        <>
          <HUD />
          <MoveGuide />
          <EndButton />
        </>
      )}
      {phase === 'complete' && <ResultScreen />}
    </GameLayout>
  );
}

export default App;
