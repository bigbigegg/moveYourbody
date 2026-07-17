// ============================================================
// MediaPipe Pose 检测 Hook
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { Pose } from '../types';

interface UsePoseDetectorReturn {
  isLoaded: boolean;
  error: string | null;
  detect: () => Pose | null;
  loadModel: () => Promise<void>;
}

export function usePoseDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
): UsePoseDetectorReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return; // 已加载
    setError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      landmarkerRef.current = landmarker;
      setIsLoaded(true);
      console.log('[usePoseDetector] MediaPipe 模型加载完成');
    } catch (err: any) {
      const message = `模型加载失败: ${err.message}`;
      setError(message);
      console.error('[usePoseDetector]', err);
      throw err; // 让调用方知道加载失败
    }
  }, []);

  const detect = useCallback((): Pose | null => {
    if (!landmarkerRef.current || !videoRef.current) return null;

    const video = videoRef.current;
    if (video.readyState < 2) return null;

    try {
      const result = landmarkerRef.current.detectForVideo(
        video,
        performance.now(),
      );

      if (result.landmarks && result.landmarks.length > 0) {
        return result.landmarks[0] as Pose;
      }
      return null;
    } catch {
      return null;
    }
  }, [videoRef]);

  return { isLoaded, error, detect, loadModel };
}
